import { describe, it, expect } from 'vitest';
import { validateEnv, ConfigValidationError } from '../src/env';

describe('Environment validation', () => {
  const validBaseEnv = {
    NODE_ENV: 'development',
    PORT: '3000',
    DATABASE_URL: 'postgresql://javaverse:javaverse@127.0.0.1:5432/javaverse?schema=public',
    REDIS_QUEUE_URL: 'redis://127.0.0.1:6379',
    REDIS_CACHE_URL: 'redis://127.0.0.1:6380',
    SESSION_SECRET: '0123456789abcdef0123456789abcdef',
    CURSOR_SIGNING_SECRET: '0123456789abcdef0123456789abcdef',
    SANDBOX_SHARED_SECRET: '0123456789abcdef0123456789abcdef',
    AI_PROVIDER_PRIMARY: 'mock',
    SANDBOX_PROVIDER: 'mock',
  };

  it('passes with valid development environment and mock providers', () => {
    const config = validateEnv(validBaseEnv);
    expect(config.NODE_ENV).toBe('development');
    expect(config.AI_PROVIDER_PRIMARY).toBe('mock');
    expect(config.SANDBOX_PROVIDER).toBe('mock');
  });

  it('rejects non-mock AI provider in Phase 1', () => {
    expect(() =>
      validateEnv({
        ...validBaseEnv,
        AI_PROVIDER_PRIMARY: 'anthropic',
      }),
    ).toThrow(ConfigValidationError);
  });

  it('rejects non-mock sandbox provider in Phase 1', () => {
    expect(() =>
      validateEnv({
        ...validBaseEnv,
        SANDBOX_PROVIDER: 'container_runner',
      }),
    ).toThrow(ConfigValidationError);
  });

  it('rejects placeholder secrets in production', () => {
    expect(() =>
      validateEnv({
        ...validBaseEnv,
        NODE_ENV: 'production',
        SESSION_SECRET: 'replace_with_32_byte_random_hex_for_session',
      }),
    ).toThrow(ConfigValidationError);
  });

  it('rejects localhost URLs in production unless explicitly permitted', () => {
    expect(() =>
      validateEnv({
        ...validBaseEnv,
        NODE_ENV: 'production',
      }),
    ).toThrow(ConfigValidationError);
  });

  it('allows localhost URLs in production when ALLOW_LOCAL_SERVICES_IN_PRODUCTION is set', () => {
    const config = validateEnv({
      ...validBaseEnv,
      NODE_ENV: 'production',
      ALLOW_LOCAL_SERVICES_IN_PRODUCTION: 'true',
    });
    expect(config.NODE_ENV).toBe('production');
  });
});
