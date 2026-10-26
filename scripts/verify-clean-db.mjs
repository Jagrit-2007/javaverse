import { execSync } from 'node:child_process';
import { PrismaClient } from '../packages/db/node_modules/@prisma/client/index.js';

const TEST_DB_NAME = 'javaverse_clean_verify_test';
const BASE_HOST = '127.0.0.1:5432';
const TEST_DB_URL = `postgresql://javaverse:javaverse@${BASE_HOST}/${TEST_DB_NAME}?schema=public`;

// Safety guard: Never run against production or non-local database
if (process.env.NODE_ENV === 'production') {
  console.error('Refusing to run clean-db verification in production environment');
  process.exit(1);
}

if (!TEST_DB_URL.includes('127.0.0.1') && !TEST_DB_URL.includes('localhost')) {
  console.error('Refusing to run clean-db verification on non-local database');
  process.exit(1);
}

console.log(`Starting isolated clean database verification on ${TEST_DB_NAME}...`);

try {
  // 1. Create clean database using container psql
  console.log('1. Recreating clean test database...');
  execSync(
    `docker exec javaverse-postgres psql -U javaverse -d postgres -c "DROP DATABASE IF EXISTS ${TEST_DB_NAME} WITH (FORCE);"`,
    { stdio: 'inherit' },
  );
  execSync(
    `docker exec javaverse-postgres psql -U javaverse -d postgres -c "CREATE DATABASE ${TEST_DB_NAME};"`,
    { stdio: 'inherit' },
  );

  // Initialize extensions in clean database
  execSync(
    `docker exec javaverse-postgres psql -U javaverse -d ${TEST_DB_NAME} -c "CREATE EXTENSION IF NOT EXISTS citext; CREATE EXTENSION IF NOT EXISTS vector;"`,
    { stdio: 'inherit' },
  );

  // 2. Run migrate:deploy
  console.log('2. Running prisma migrate:deploy against clean test database...');
  execSync(`pnpm --filter @javaverse/db prisma migrate deploy`, {
    env: { ...process.env, DATABASE_URL: TEST_DB_URL },
    stdio: 'inherit',
  });

  // 3. Test deterministic seed execution TWICE
  console.log('3. Running deterministic seed (first run)...');
  execSync(`pnpm --filter @javaverse/db prisma db seed`, {
    env: { ...process.env, DATABASE_URL: TEST_DB_URL },
    stdio: 'inherit',
  });

  console.log('4. Running deterministic seed (second run for idempotency verification)...');
  execSync(`pnpm --filter @javaverse/db prisma db seed`, {
    env: { ...process.env, DATABASE_URL: TEST_DB_URL },
    stdio: 'inherit',
  });

  // 5. Connect and verify constraints
  console.log('5. Verifying database constraints and invariants...');
  const prisma = new PrismaClient({
    datasources: { db: { url: TEST_DB_URL } },
  });

  // Check deployment_limits singleton row
  const count = await prisma.deploymentLimits.count();
  if (count !== 1) {
    throw new Error(`Expected exactly 1 deployment_limits row, found ${count}`);
  }

  const limits = await prisma.deploymentLimits.findUnique({ where: { id: 1 } });
  if (!limits || limits.maxUsers !== 5) {
    throw new Error(`Invalid deployment_limits state: ${JSON.stringify(limits)}`);
  }

  // Verify at-most-one active OWNER constraint
  const owner1 = await prisma.user.create({
    data: {
      email: 'owner1@javaverse.local',
      role: 'OWNER',
      status: 'ACTIVE',
    },
  });

  let secondOwnerFailed = false;
  try {
    await prisma.user.create({
      data: {
        email: 'owner2@javaverse.local',
        role: 'OWNER',
        status: 'ACTIVE',
      },
    });
  } catch {
    secondOwnerFailed = true;
    console.log('  Confirmed: Single active OWNER constraint prevented second OWNER');
  }

  if (!secondOwnerFailed) {
    throw new Error('Invariant violation: Second active OWNER was permitted');
  }

  // Verify chat slot constraint (between 1 and 3)
  let invalidSlotFailed = false;
  try {
    await prisma.chat.create({
      data: {
        userId: owner1.id,
        slot: 4,
        title: 'Invalid Slot',
      },
    });
  } catch {
    invalidSlotFailed = true;
    console.log('  Confirmed: Chat slot CHECK constraint prevented slot 4');
  }

  if (!invalidSlotFailed) {
    throw new Error('Invariant violation: Chat slot > 3 was permitted');
  }

  await prisma.$disconnect();

  // 6. Cleanup test database
  console.log('6. Cleaning up test database...');
  execSync(
    `docker exec javaverse-postgres psql -U javaverse -d postgres -c "DROP DATABASE IF EXISTS ${TEST_DB_NAME} WITH (FORCE);"`,
    { stdio: 'inherit' },
  );

  console.log('CLEAN DATABASE VERIFICATION SUCCESSFUL!');
} catch (error) {
  console.error('Clean database verification failed:', error);
  process.exit(1);
}
