import { describe, it, expect } from 'vitest';
import { sanitizeErrorMessage, PINO_REDACT_PATHS } from '../src/redaction';

describe('Redaction & sanitization', () => {
  it('strips credentials embedded in database URLs', () => {
    const raw = 'Error connecting to postgresql://javaverse:superSecretPass123@127.0.0.1:5432/db';
    const sanitized = sanitizeErrorMessage(raw);
    expect(sanitized).not.toContain('superSecretPass123');
    expect(sanitized).toBe(
      'Error connecting to postgresql://javaverse:[REDACTED]@127.0.0.1:5432/db',
    );
  });

  it('includes required sensitive paths in PINO_REDACT_PATHS', () => {
    expect(PINO_REDACT_PATHS).toContain('*.password');
    expect(PINO_REDACT_PATHS).toContain('*.token');
    expect(PINO_REDACT_PATHS).toContain('*.secret');
    expect(PINO_REDACT_PATHS).toContain('*.headers.authorization');
    expect(PINO_REDACT_PATHS).toContain('*.headers.cookie');
  });
});
