import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  assertSafeTestDatabase,
  getDatabaseNameFromUrl,
  FORBIDDEN_TEST_DATABASES,
} from '@javaverse/db';

describe('Database Safety Guard: assertSafeTestDatabase (Section 1)', () => {
  const originalEnv = process.env.NODE_ENV;

  beforeEach(() => {
    (process.env as Record<string, string | undefined>).NODE_ENV = 'test';
  });

  afterEach(() => {
    (process.env as Record<string, string | undefined>).NODE_ENV = originalEnv;
  });

  it('allows javaverse_test', () => {
    const url = 'postgresql://javaverse:javaverse@127.0.0.1:5432/javaverse_test?schema=public';
    const dbName = assertSafeTestDatabase(url);
    expect(dbName).toBe('javaverse_test');
  });

  it('allows javaverse_clean_verify', () => {
    const url =
      'postgresql://javaverse:javaverse@127.0.0.1:5432/javaverse_clean_verify?schema=public';
    const dbName = assertSafeTestDatabase(url);
    expect(dbName).toBe('javaverse_clean_verify');
  });

  it('allows javaverse_backup_verify_test', () => {
    const url =
      'postgresql://javaverse:javaverse@127.0.0.1:5432/javaverse_backup_verify_test?schema=public';
    const dbName = assertSafeTestDatabase(url);
    expect(dbName).toBe('javaverse_backup_verify_test');
  });

  it('rejects the development database javaverse', () => {
    const devUrl = 'postgresql://javaverse:javaverse@127.0.0.1:5432/javaverse?schema=public';
    expect(() => assertSafeTestDatabase(devUrl)).toThrow(
      /CRITICAL DATA-SAFETY VIOLATION.*Refusing destructive operation against protected database: "javaverse"/,
    );
  });

  it('rejects postgres system database', () => {
    const pgUrl = 'postgresql://javaverse:javaverse@127.0.0.1:5432/postgres?schema=public';
    expect(() => assertSafeTestDatabase(pgUrl)).toThrow(
      /CRITICAL DATA-SAFETY VIOLATION.*Refusing destructive operation against protected database: "postgres"/,
    );
  });

  it('rejects other production/forbidden databases', () => {
    for (const forbidden of FORBIDDEN_TEST_DATABASES) {
      const url = `postgresql://user:pass@db.local:5432/${forbidden}`;
      expect(() => assertSafeTestDatabase(url)).toThrow(/CRITICAL DATA-SAFETY VIOLATION/);
    }
  });

  it('rejects arbitrary non-allowlisted database names', () => {
    const customUrl = 'postgresql://javaverse:javaverse@127.0.0.1:5432/my_random_db';
    expect(() => assertSafeTestDatabase(customUrl)).toThrow(
      /is not in the allowlist of safe test databases/,
    );
  });

  it('rejects malformed database URLs', () => {
    expect(() => assertSafeTestDatabase('not-a-valid-url')).toThrow(/malformed database URL/);
    expect(() => getDatabaseNameFromUrl('http://[invalid')).toThrow(/malformed database URL/);
  });

  it('rejects missing or empty database names', () => {
    expect(() => assertSafeTestDatabase('postgresql://javaverse:pass@127.0.0.1:5432/')).toThrow(
      /empty or missing database name/,
    );
    expect(() => assertSafeTestDatabase('postgresql://javaverse:pass@127.0.0.1:5432')).toThrow(
      /empty or missing database name/,
    );
    expect(() => assertSafeTestDatabase('')).toThrow(/missing database URL/);

    const orig = process.env.DATABASE_URL;
    try {
      delete process.env.DATABASE_URL;
      expect(() => assertSafeTestDatabase(undefined)).toThrow(/missing database URL/);
    } finally {
      process.env.DATABASE_URL = orig;
    }
  });

  it('enforces NODE_ENV="test" when requireTestEnv is true', () => {
    (process.env as Record<string, string | undefined>).NODE_ENV = 'development';
    const testUrl = 'postgresql://javaverse:javaverse@127.0.0.1:5432/javaverse_test?schema=public';
    expect(() => assertSafeTestDatabase(testUrl, { requireTestEnv: true })).toThrow(
      /Destructive test operations require NODE_ENV="test", currently "development"/,
    );

    // Can be bypassed explicitly when requested by verification scripts
    const db = assertSafeTestDatabase(testUrl, { requireTestEnv: false });
    expect(db).toBe('javaverse_test');
  });
});
