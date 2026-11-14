import dotenv from 'dotenv';
import { fileURLToPath } from 'node:url';
import { dirname, resolve, join } from 'node:path';
import fs from 'node:fs';
import { validateEnv, ConfigValidationError, type Env } from '@javaverse/schemas';
import { createLogger } from '@javaverse/observability';
import { verifyDatabaseStartupGuard } from '@javaverse/db';

/**
 * Deterministically locates repository root by walking up until pnpm-workspace.yaml is found.
 * Guaranteed to resolve the true root regardless of whether process.cwd() is repo root or apps/worker,
 * and never accidentally resolves apps/.env.local.
 */
function findRepoRoot(startDir: string): string {
  let curr = startDir;
  while (curr !== dirname(curr)) {
    if (fs.existsSync(join(curr, 'pnpm-workspace.yaml'))) {
      return curr;
    }
    curr = dirname(curr);
  }
  return process.cwd();
}

const currentFileDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = findRepoRoot(currentFileDir);

const envLocalPath = resolve(repoRoot, '.env.local');
const envPath = resolve(repoRoot, '.env');

// Environment precedence:
// 1. Injected process environment (preserved; dotenv does not overwrite by default)
// 2. Approved repository .env.local for local development
// 3. Approved repository .env fallback
if (fs.existsSync(envLocalPath)) {
  dotenv.config({ path: envLocalPath });
}
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
}

const logger = createLogger({ service: 'worker' });

let env: Env;

try {
  env = validateEnv(process.env);
  verifyDatabaseStartupGuard('worker', env.DATABASE_URL, {
    nodeEnv: env.NODE_ENV,
    logger,
  });
} catch (error) {
  if (error instanceof ConfigValidationError) {
    logger.fatal(
      { issues: error.issues },
      'Failed to bootstrap worker application due to invalid environment',
    );
  } else {
    logger.fatal({ err: error }, 'Unexpected error during environment validation');
  }
  process.exit(1);
}

export { env };
