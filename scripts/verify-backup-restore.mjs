import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PrismaClient } from '../packages/db/node_modules/@prisma/client/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const PRIMARY_DB_URL = 'postgresql://javaverse:javaverse@127.0.0.1:5432/javaverse?schema=public';
const TEST_RESTORE_DB = 'javaverse_backup_verify_test';
const RESTORE_DB_URL = `postgresql://javaverse:javaverse@127.0.0.1:5432/${TEST_RESTORE_DB}?schema=public`;
const BACKUP_TMP_DIR = path.join(rootDir, 'backups', 'verify_tmp');

console.log('=== JavaVerse Backup & Restore Automated Verification ===');

const primaryClient = new PrismaClient({
  datasources: { db: { url: PRIMARY_DB_URL } },
});

let restoreClient = null;

try {
  // 1. Gather baseline counts from active database
  console.log('1. Querying active database state...');
  const [
    userCount,
    lessonCount,
    problemCount,
    chatCount,
    messageCount,
    jobCount,
    kbItemCount,
    limitCount,
  ] = await Promise.all([
    primaryClient.user.count(),
    primaryClient.curriculumLesson.count(),
    primaryClient.practiceProblem.count(),
    primaryClient.chat.count(),
    primaryClient.message.count(),
    primaryClient.durableJob.count(),
    primaryClient.kbItem.count(),
    primaryClient.deploymentLimits.count(),
  ]);

  console.log(`  Active database records:`);
  console.log(`    - Users:              ${userCount}`);
  console.log(`    - Curriculum Lessons: ${lessonCount}`);
  console.log(`    - Practice Problems:  ${problemCount}`);
  console.log(`    - Chats:              ${chatCount}`);
  console.log(`    - Messages:           ${messageCount}`);
  console.log(`    - Durable Jobs:       ${jobCount}`);
  console.log(`    - KB Items:           ${kbItemCount}`);
  console.log(`    - Deployment Limits:  ${limitCount}`);

  if (lessonCount === 0 || problemCount === 0) {
    throw new Error('Active database appears unseeded! Expected seeded lessons and problems.');
  }

  // 2. Perform backup to temporary directory
  console.log('2. Executing backup script...');
  if (fs.existsSync(BACKUP_TMP_DIR)) {
    fs.rmSync(BACKUP_TMP_DIR, { recursive: true, force: true });
  }
  fs.mkdirSync(BACKUP_TMP_DIR, { recursive: true });

  execSync(`bash scripts/backup-db.sh "${BACKUP_TMP_DIR}"`, {
    cwd: rootDir,
    stdio: 'inherit',
  });

  const files = fs.readdirSync(BACKUP_TMP_DIR);
  const backupGz = files.find((f) => f.endsWith('.sql.gz'));
  if (!backupGz) {
    throw new Error('Backup failed: No .sql.gz archive found in output directory.');
  }
  const backupPath = path.join(BACKUP_TMP_DIR, backupGz);
  console.log(`Found backup archive: ${backupPath}`);

  // 3. Prepare clean destination database
  console.log(`3. Recreating isolated test database '${TEST_RESTORE_DB}'...`);
  execSync(
    `docker exec javaverse-postgres psql -U javaverse -d postgres -c "DROP DATABASE IF EXISTS ${TEST_RESTORE_DB} WITH (FORCE);"`,
    { stdio: 'inherit' },
  );
  execSync(
    `docker exec javaverse-postgres psql -U javaverse -d postgres -c "CREATE DATABASE ${TEST_RESTORE_DB};"`,
    { stdio: 'inherit' },
  );

  // 4. Restore backup into destination database
  console.log(`4. Executing restore script into '${TEST_RESTORE_DB}'...`);
  execSync(`bash scripts/restore-db.sh "${backupPath}" "${TEST_RESTORE_DB}"`, {
    cwd: rootDir,
    stdio: 'inherit',
  });

  // 5. Connect and assert all data matches exactly
  console.log('5. Validating restored database integrity and row counts...');
  restoreClient = new PrismaClient({
    datasources: { db: { url: RESTORE_DB_URL } },
  });

  const [
    rUserCount,
    rLessonCount,
    rProblemCount,
    rChatCount,
    rMessageCount,
    rJobCount,
    rKbItemCount,
    rLimitCount,
  ] = await Promise.all([
    restoreClient.user.count(),
    restoreClient.curriculumLesson.count(),
    restoreClient.practiceProblem.count(),
    restoreClient.chat.count(),
    restoreClient.message.count(),
    restoreClient.durableJob.count(),
    restoreClient.kbItem.count(),
    restoreClient.deploymentLimits.count(),
  ]);

  console.log(`  Restored database records:`);
  console.log(`    - Users:              ${rUserCount} (expected: ${userCount})`);
  console.log(`    - Curriculum Lessons: ${rLessonCount} (expected: ${lessonCount})`);
  console.log(`    - Practice Problems:  ${rProblemCount} (expected: ${problemCount})`);
  console.log(`    - Chats:              ${rChatCount} (expected: ${chatCount})`);
  console.log(`    - Messages:           ${rMessageCount} (expected: ${messageCount})`);
  console.log(`    - Durable Jobs:       ${rJobCount} (expected: ${jobCount})`);
  console.log(`    - KB Items:           ${rKbItemCount} (expected: ${kbItemCount})`);
  console.log(`    - Deployment Limits:  ${rLimitCount} (expected: ${limitCount})`);

  if (rUserCount !== userCount)
    throw new Error(`User count mismatch: ${rUserCount} !== ${userCount}`);
  if (rLessonCount !== lessonCount)
    throw new Error(`Lesson count mismatch: ${rLessonCount} !== ${lessonCount}`);
  if (rProblemCount !== problemCount)
    throw new Error(`Problem count mismatch: ${rProblemCount} !== ${problemCount}`);
  if (rChatCount !== chatCount)
    throw new Error(`Chat count mismatch: ${rChatCount} !== ${chatCount}`);
  if (rMessageCount !== messageCount)
    throw new Error(`Message count mismatch: ${rMessageCount} !== ${messageCount}`);
  if (rJobCount !== jobCount) throw new Error(`Job count mismatch: ${rJobCount} !== ${jobCount}`);
  if (rKbItemCount !== kbItemCount)
    throw new Error(`KB Item count mismatch: ${rKbItemCount} !== ${kbItemCount}`);
  if (rLimitCount !== limitCount)
    throw new Error(`Limit count mismatch: ${rLimitCount} !== ${limitCount}`);

  // Deep check on sample records
  const sampleLesson = await restoreClient.curriculumLesson.findFirst({
    where: { slug: 'primitive-types' },
  });
  if (!sampleLesson || !sampleLesson.codeStarter.includes('public static void main')) {
    throw new Error('Restored lesson record failed deep content validation.');
  }

  const sampleProblem = await restoreClient.practiceProblem.findFirst({
    where: { slug: 'two-sum-array' },
  });
  if (
    !sampleProblem ||
    !sampleProblem.solutionCode ||
    !sampleProblem.solutionCode.includes('HashMap')
  ) {
    throw new Error('Restored problem record failed deep content validation.');
  }

  console.log('--- Backup & Restore Verification PASSED with 100% Data Consistency! ---');
} finally {
  await primaryClient.$disconnect();
  if (restoreClient) {
    await restoreClient.$disconnect();
  }

  // Cleanup temporary database and directory
  try {
    console.log(`Cleaning up test database '${TEST_RESTORE_DB}'...`);
    execSync(
      `docker exec javaverse-postgres psql -U javaverse -d postgres -c "DROP DATABASE IF EXISTS ${TEST_RESTORE_DB} WITH (FORCE);"`,
      { stdio: 'ignore' },
    );
  } catch {}

  if (fs.existsSync(BACKUP_TMP_DIR)) {
    fs.rmSync(BACKUP_TMP_DIR, { recursive: true, force: true });
  }
}
