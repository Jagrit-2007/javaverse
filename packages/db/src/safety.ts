/**
 * Database safety guards for JavaVerse test and deployment lifecycle.
 *
 * Enforces strict isolation between local development databases (e.g. javaverse)
 * and disposable verification databases (e.g. javaverse_test, javaverse_clean_verify).
 */

export const ALLOWED_TEST_DATABASES = [
  'javaverse_test',
  'javaverse_clean_verify',
  'javaverse_backup_verify_test',
] as const;

export const FORBIDDEN_TEST_DATABASES = [
  'javaverse',
  'postgres',
  'production',
  'prod',
  'template0',
  'template1',
] as const;

/**
 * Extracts the database name from a PostgreSQL connection URL.
 * Throws if the URL is missing, invalid, or lacks a database name.
 */
export function getDatabaseNameFromUrl(databaseUrl?: string): string {
  if (!databaseUrl || typeof databaseUrl !== 'string' || !databaseUrl.trim()) {
    throw new Error('Refusing destructive database operation: missing database URL');
  }

  let parsed: URL;
  try {
    parsed = new URL(databaseUrl.trim());
  } catch {
    throw new Error('Refusing destructive database operation: malformed database URL');
  }

  const pathname = parsed.pathname || '';
  const dbName = pathname.replace(/^\/+/, '').split('?')[0]?.trim();
  if (!dbName) {
    throw new Error('Refusing destructive database operation: empty or missing database name');
  }

  return dbName;
}

export interface AssertSafeTestDatabaseOptions {
  requireTestEnv?: boolean;
}

/**
 * Asserts that the target database URL is strictly safe for destructive operations
 * (such as deleteMany, truncate, drop, migration reset, or reseed).
 *
 * @throws {Error} if the database is forbidden or not in the allowlist of test databases.
 * @returns {string} The validated test database name.
 */
export function assertSafeTestDatabase(
  databaseUrl?: string,
  options?: AssertSafeTestDatabaseOptions,
): string {
  const url = databaseUrl !== undefined ? databaseUrl : process.env.DATABASE_URL;
  const dbName = getDatabaseNameFromUrl(url);

  // 1. Explicitly reject known protected and system databases
  if ((FORBIDDEN_TEST_DATABASES as readonly string[]).includes(dbName)) {
    throw new Error(
      `CRITICAL DATA-SAFETY VIOLATION: Refusing destructive operation against protected database: "${dbName}". Destructive operations are strictly forbidden on production and development databases.`,
    );
  }

  // 2. Strict allowlist validation
  if (!(ALLOWED_TEST_DATABASES as readonly string[]).includes(dbName)) {
    throw new Error(
      `CRITICAL DATA-SAFETY VIOLATION: Database "${dbName}" is not in the allowlist of safe test databases (${ALLOWED_TEST_DATABASES.join(', ')}). Refusing destructive operation.`,
    );
  }

  // 3. Environment check
  const requireTestEnv = options?.requireTestEnv ?? true;
  if (requireTestEnv && process.env.NODE_ENV !== 'test') {
    throw new Error(
      `CRITICAL DATA-SAFETY VIOLATION: Destructive test operations require NODE_ENV="test", currently "${process.env.NODE_ENV}". Refusing destructive operation.`,
    );
  }

  return dbName;
}

export interface SafeDatabaseDiagnostics {
  dbHost: string;
  dbPort: string;
  dbName: string;
}

/**
 * Safely extracts host, port, and database name from a database URL.
 * Strictly guarantees that passwords, usernames, query parameters,
 * and full connection strings are NEVER returned or exposed.
 */
export function getSafeDatabaseDiagnostics(databaseUrl?: string): SafeDatabaseDiagnostics {
  if (!databaseUrl || typeof databaseUrl !== 'string' || !databaseUrl.trim()) {
    throw new Error('Refusing database connection diagnostics: missing database URL');
  }

  let parsed: URL;
  try {
    parsed = new URL(databaseUrl.trim());
  } catch {
    throw new Error('Refusing database connection diagnostics: malformed database URL');
  }

  const dbHost = parsed.hostname || 'localhost';
  const dbPort = parsed.port || '5432';
  const pathname = parsed.pathname || '';
  const dbName = pathname.replace(/^\/+/, '').split('?')[0]?.trim();
  if (!dbName) {
    throw new Error('Refusing database connection diagnostics: empty or missing database name');
  }

  return { dbHost, dbPort, dbName };
}

export interface VerifyStartupGuardOptions {
  nodeEnv?: string;
  logger?: {
    info: (obj: Record<string, unknown>, msg?: string) => void;
    warn: (obj: Record<string, unknown>, msg?: string) => void;
    error?: (obj: Record<string, unknown>, msg?: string) => void;
  };
}

/**
 * Startup database guard.
 * Logs safe connection diagnostics (component, host, port, dbName, mode).
 * - In test mode: fails startup if database name is not in the test allowlist.
 * - In dev mode: displays a clear warning if database name ends with '_test'.
 *
 * Never logs credentials, usernames, passwords, or full URLs.
 */
export function verifyDatabaseStartupGuard(
  component: 'web' | 'worker',
  databaseUrl?: string,
  options?: VerifyStartupGuardOptions,
): { component: string; dbHost: string; dbPort: string; dbName: string; mode: string } {
  const url = databaseUrl !== undefined ? databaseUrl : process.env.DATABASE_URL;
  const { dbHost, dbPort, dbName } = getSafeDatabaseDiagnostics(url);
  const mode = options?.nodeEnv ?? process.env.NODE_ENV ?? 'development';

  if (mode === 'test') {
    if (!(ALLOWED_TEST_DATABASES as readonly string[]).includes(dbName)) {
      throw new Error(
        `CRITICAL STARTUP GUARD: Database "${dbName}" is not an allowlisted test database (${ALLOWED_TEST_DATABASES.join(', ')}). Test mode strictly requires an isolated test database.`,
      );
    }
  } else if (mode === 'development') {
    if (dbName.endsWith('_test')) {
      const warnMsg = `WARNING: Development mode is connected to test database "${dbName}". Normal development should use a dedicated development database.`;
      if (options?.logger) {
        options.logger.warn({ component, dbHost, dbPort, dbName, mode }, warnMsg);
      } else {
        console.warn(warnMsg);
      }
    }
  }

  const infoMsg = `Database startup diagnostics: ${component} connected to ${dbName} on ${dbHost}:${dbPort} (mode: ${mode})`;
  if (options?.logger) {
    options.logger.info({ component, dbHost, dbPort, dbName, mode }, infoMsg);
  }

  return { component, dbHost, dbPort, dbName, mode };
}
