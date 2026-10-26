import { randomBytes } from 'node:crypto';
import { existsSync, writeFileSync, renameSync, chmodSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = resolve(__dirname, '..');

const force = process.argv.includes('--force');
const targetFiles = [
  resolve(rootDir, '.env.local'),
  resolve(rootDir, 'apps/web/.env.local'),
  resolve(rootDir, 'apps/worker/.env.local'),
  resolve(rootDir, 'packages/db/.env.local'),
  resolve(rootDir, 'packages/db/.env'),
];

const mainTarget = targetFiles[0];
if (existsSync(mainTarget) && !force) {
  console.log('Notice: .env.local already exists. Use --force to regenerate.');
  process.exit(0);
}

function generateSecret() {
  return randomBytes(32).toString('hex');
}

const sessionSecret = generateSecret();
const cursorSecret = generateSecret();
const sandboxSecret = generateSecret();

const content = `# Generated local development configuration
NODE_ENV=development
PORT=3000

DATABASE_URL=postgresql://javaverse:javaverse@127.0.0.1:5432/javaverse?schema=public
REDIS_QUEUE_URL=redis://127.0.0.1:6379
REDIS_CACHE_URL=redis://127.0.0.1:6380

SESSION_SECRET=${sessionSecret}
CURSOR_SIGNING_SECRET=${cursorSecret}
SANDBOX_SHARED_SECRET=${sandboxSecret}

MAX_USERS=5
REGISTRATION_MODE=invite_only

AI_PROVIDER_PRIMARY=mock
AI_PROVIDER_EMBED=disabled

SANDBOX_PROVIDER=mock

S3_ENDPOINT=http://127.0.0.1:9000
S3_REGION=us-east-1
S3_BUCKET=javaverse-uploads
S3_ACCESS_KEY=minioadmin
S3_SECRET_KEY=minioadmin

SMTP_HOST=127.0.0.1
SMTP_PORT=1025
SMTP_FROM=noreply@javaverse.local

CLAMAV_HOST=127.0.0.1
CLAMAV_PORT=3310
CLAMAV_ENABLED=false
`;

for (const targetPath of targetFiles) {
  try {
    const tmpPath = `${targetPath}.tmp.${Date.now()}`;
    writeFileSync(tmpPath, content, { mode: 0o600 });
    renameSync(tmpPath, targetPath);
    try {
      chmodSync(targetPath, 0o600);
    } catch {
      // Ignore if chmod not supported on filesystem
    }
  } catch (err) {
    console.error(`Failed to write env file to ${targetPath}:`, err.message);
  }
}

console.log('Secure local environment files generated with restrictive (0600) permissions.');
