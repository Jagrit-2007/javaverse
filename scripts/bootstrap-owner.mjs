import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PrismaClient } from '../packages/db/node_modules/@prisma/client/index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

// Load .env.local if present
const envLocalPath = path.join(rootDir, '.env.local');
if (fs.existsSync(envLocalPath)) {
  const content = fs.readFileSync(envLocalPath, 'utf-8');
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx !== -1) {
      const key = trimmed.slice(0, eqIdx).trim();
      const val = trimmed.slice(eqIdx + 1).trim();
      if (!process.env[key]) {
        process.env[key] = val;
      }
    }
  }
}

const masterSecret = process.env.APP_MASTER_KEY || process.env.SESSION_SECRET;
if (!masterSecret || masterSecret.length < 32) {
  console.error('Error: APP_MASTER_KEY or SESSION_SECRET must be at least 32 characters');
  process.exit(1);
}

// Derive authTokenHmacKey using HKDF-SHA256
const ikm = Buffer.from(masterSecret, 'utf-8');
const salt = Buffer.from('javaverse:key_hierarchy:salt:v1', 'utf-8');
const authTokenHmacKey = Buffer.from(
  crypto.hkdfSync('sha256', ikm, salt, Buffer.from('javaverse:auth_tokens:v1', 'utf-8'), 32),
);

const prisma = new PrismaClient({
  datasources: {
    db: {
      url:
        process.env.DATABASE_URL ||
        'postgresql://javaverse:javaverse@127.0.0.1:5432/javaverse?schema=public',
    },
  },
});

const ADVISORY_LOCK_ID = 5341415641; // 'JAVAOWNR'

async function bootstrapOwner() {
  try {
    // 1. Acquire PostgreSQL advisory lock
    const lockResult =
      await prisma.$queryRaw`SELECT pg_try_advisory_lock(${ADVISORY_LOCK_ID}) as locked`;
    const isLocked = lockResult[0]?.locked;
    if (!isLocked) {
      console.error('Error: Another bootstrap ceremony is currently in progress. Please wait.');
      process.exit(1);
    }

    try {
      // 2. Recheck that no active non-deleted OWNER exists
      const existingOwner = await prisma.user.findFirst({
        where: {
          role: 'OWNER',
          status: { not: 'DELETED' },
        },
      });

      if (existingOwner) {
        console.error('Error: An OWNER account already exists. Bootstrap is disabled.');
        process.exit(1);
      }

      // 3. Revoke any existing unconsumed bootstrap tokens
      await prisma.emailToken.updateMany({
        where: {
          purpose: 'OWNER_BOOTSTRAP',
          usedAt: null,
        },
        data: {
          usedAt: new Date(),
        },
      });

      // 4. Generate 256-bit random bearer bootstrap token
      const rawToken = crypto.randomBytes(32).toString('hex');
      const tokenHash = crypto
        .createHmac('sha256', authTokenHmacKey)
        .update(`owner_bootstrap:${rawToken}`)
        .digest('hex');

      // 5. Store in email_tokens with deliveryChannel = TERMINAL, valid for 1 hour
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
      await prisma.emailToken.create({
        data: {
          tokenHash,
          deliveryChannel: 'TERMINAL',
          purpose: 'OWNER_BOOTSTRAP',
          expiresAt,
        },
      });

      // 6. Print to terminal
      console.log('\n======================================================================');
      console.log('                 JavaVerse OWNER Bootstrap Token');
      console.log('======================================================================');
      console.log('\nA one-time OWNER enrollment token has been generated:\n');
      console.log(`  Token: ${rawToken}\n`);
      console.log('Navigate to:');
      console.log(`  ${process.env.APP_URL || 'http://localhost:3000'}/auth/bootstrap\n`);
      console.log('This token is valid for 1 hour. It must be entered into the web form.');
      console.log('TOTP MFA enrollment is mandatory to finalize the OWNER account.');
      console.log('======================================================================\n');
    } finally {
      // Always release advisory lock
      await prisma.$queryRaw`SELECT pg_advisory_unlock(${ADVISORY_LOCK_ID})`;
    }
  } catch (err) {
    console.error('Bootstrap failed:', err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

bootstrapOwner();
