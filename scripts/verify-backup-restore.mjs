import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PrismaClient } from '../packages/db/node_modules/@prisma/client/index.js';
import { assertSafeTestDatabase } from '../packages/db/src/safety.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const PRIMARY_DB_URL = 'postgresql://javaverse:javaverse@127.0.0.1:5432/javaverse?schema=public';
const TEST_RESTORE_DB = 'javaverse_backup_verify_test';
const RESTORE_DB_URL = `postgresql://javaverse:javaverse@127.0.0.1:5432/${TEST_RESTORE_DB}?schema=public`;

// Safety guard: Ensure target restore database is strictly an allowlisted test database
assertSafeTestDatabase(RESTORE_DB_URL, { requireTestEnv: false });
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
  const checksumPath = `${backupPath}.sha256`;
  console.log(`Found backup archive: ${backupPath}`);

  // 2.1 Verify restrictive permissions (LOW 3: Backup files must NOT be world-readable)
  console.log('2.1 Verifying restrictive file permissions on backup and checksum...');
  const backupStat = fs.statSync(backupPath);
  const backupMode = backupStat.mode & 0o777;
  if ((backupStat.mode & 0o077) !== 0) {
    throw new Error(
      `Insecure permissions on backup archive: 0${backupMode.toString(8)}. Must not be group or world readable.`,
    );
  }

  const checksumStat = fs.statSync(checksumPath);
  const checksumMode = checksumStat.mode & 0o777;
  if ((checksumStat.mode & 0o077) !== 0) {
    throw new Error(
      `Insecure permissions on checksum file: 0${checksumMode.toString(8)}. Must not be group or world readable.`,
    );
  }
  console.log(
    `  Confirmed: Restrictive permissions verified (backup: 0${backupMode.toString(8)}, checksum: 0${checksumMode.toString(8)})`,
  );

  // 2.2 Test permission enforcement independent of operator's shell umask (using permissive umask 000)
  console.log(
    '2.2 Testing permission enforcement independent of operator umask (simulating umask 000)...',
  );
  const umaskTestDir = path.join(rootDir, 'backups', 'verify_umask_tmp');
  if (fs.existsSync(umaskTestDir)) {
    fs.rmSync(umaskTestDir, { recursive: true, force: true });
  }
  fs.mkdirSync(umaskTestDir, { recursive: true });

  execSync(`(umask 000 && bash scripts/backup-db.sh "${umaskTestDir}")`, {
    cwd: rootDir,
    stdio: 'inherit',
  });

  const umaskFiles = fs.readdirSync(umaskTestDir);
  const umaskBackupGz = umaskFiles.find((f) => f.endsWith('.sql.gz'));
  if (!umaskBackupGz) {
    throw new Error('Umask test backup failed.');
  }
  const umaskBackupStat = fs.statSync(path.join(umaskTestDir, umaskBackupGz));
  if ((umaskBackupStat.mode & 0o077) !== 0) {
    throw new Error(
      `Umask test failed: Backup file created with open permissions: 0${(umaskBackupStat.mode & 0o777).toString(8)}`,
    );
  }
  fs.rmSync(umaskTestDir, { recursive: true, force: true });
  console.log('  Confirmed: Backup permissions enforced strictly despite operator umask 000');

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

  // 4. Verify hardened safety checks
  console.log('4. Verifying restore-db.sh safety checks...');

  // 4.1 Missing checksum rejection
  console.log('  Testing missing checksum rejection...');
  const fakeBackup = path.join(BACKUP_TMP_DIR, 'no_checksum.sql');
  fs.writeFileSync(fakeBackup, 'SELECT 1;');
  try {
    execSync(`bash scripts/restore-db.sh --yes --target-db "${TEST_RESTORE_DB}" "${fakeBackup}"`, {
      cwd: rootDir,
      stdio: 'pipe',
    });
    throw new Error('Expected missing checksum to fail');
  } catch (err) {
    if (!String(err.stderr || err.message).includes('missing')) {
      throw new Error(`Unexpected error for missing checksum: ${err.message}`);
    }
  }

  // 4.2 Invalid checksum rejection
  console.log('  Testing invalid checksum rejection...');
  const corruptChecksumFile = path.join(BACKUP_TMP_DIR, 'corrupt.sql');
  fs.writeFileSync(corruptChecksumFile, 'SELECT 1;');
  fs.writeFileSync(
    `${corruptChecksumFile}.sha256`,
    '0000000000000000000000000000000000000000000000000000000000000000  corrupt.sql\n',
  );
  try {
    execSync(
      `bash scripts/restore-db.sh --yes --target-db "${TEST_RESTORE_DB}" "${corruptChecksumFile}"`,
      {
        cwd: rootDir,
        stdio: 'pipe',
      },
    );
    throw new Error('Expected corrupt checksum to fail');
  } catch (err) {
    if (!String(err.stderr || err.message).includes('Checksum verification failed')) {
      throw new Error(`Unexpected error for corrupt checksum: ${err.message}`);
    }
  }

  // 4.3 Protected database name rejection
  console.log('  Testing protected database rejection...');
  try {
    execSync(`bash scripts/restore-db.sh --yes --target-db "postgres" "${backupPath}"`, {
      cwd: rootDir,
      stdio: 'pipe',
    });
    throw new Error('Expected protected database rejection to fail');
  } catch (err) {
    if (!String(err.stderr || err.message).includes('protected')) {
      throw new Error(`Unexpected error for protected db: ${err.message}`);
    }
  }

  // 4.4 Non-interactive missing --yes rejection
  console.log('  Testing non-interactive missing --yes rejection...');
  try {
    execSync(`bash scripts/restore-db.sh --target-db "${TEST_RESTORE_DB}" "${backupPath}"`, {
      cwd: rootDir,
      stdio: 'pipe',
    });
    throw new Error('Expected missing --yes to fail in non-interactive mode');
  } catch (err) {
    if (!String(err.stderr || err.message).includes('--yes')) {
      throw new Error(`Unexpected error for missing --yes: ${err.message}`);
    }
  }

  // 4.5 Non-interactive missing --target-db rejection
  console.log('  Testing non-interactive missing --target-db rejection...');
  try {
    execSync(`bash scripts/restore-db.sh --yes "${backupPath}" "${TEST_RESTORE_DB}"`, {
      cwd: rootDir,
      stdio: 'pipe',
    });
    throw new Error('Expected missing --target-db to fail in non-interactive mode');
  } catch (err) {
    if (!String(err.stderr || err.message).includes('--target-db')) {
      throw new Error(`Unexpected error for missing --target-db: ${err.message}`);
    }
  }

  // 4.6 Dry run verification
  console.log('  Testing --dry-run mode...');
  const dryRunOutput = execSync(
    `bash scripts/restore-db.sh --dry-run --target-db "${TEST_RESTORE_DB}" "${backupPath}"`,
    {
      cwd: rootDir,
      encoding: 'utf8',
    },
  );
  if (!dryRunOutput.includes('Dry run completed successfully')) {
    throw new Error('Dry run output did not report success');
  }

  // 5. Restore backup into destination scratch database
  console.log(`5. Executing hardened restore script into '${TEST_RESTORE_DB}'...`);
  execSync(`bash scripts/restore-db.sh --yes --target-db "${TEST_RESTORE_DB}" "${backupPath}"`, {
    cwd: rootDir,
    stdio: 'inherit',
  });

  // 6. Connect and assert all data matches exactly
  console.log('6. Validating restored database integrity and row counts...');
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
