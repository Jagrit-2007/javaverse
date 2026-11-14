import { describe, it, expect } from 'vitest';
import { deriveAuditPseudonym, sanitizeAuditMetadata } from '../src/audit';

describe('Audit Logging Primitives', () => {
  const auditKey = 'test-audit-pseudonym-key-32-chars-long!';

  it('derives deterministic non-reversible pseudonyms without exposing raw UUIDs or IPs', () => {
    const rawUuid = '12345678-1234-1234-1234-123456789abc';
    const p1 = deriveAuditPseudonym('user', rawUuid, auditKey);
    const p2 = deriveAuditPseudonym('user', rawUuid, auditKey);

    expect(p1).toBe(p2);
    expect(p1.startsWith('usr_')).toBe(true);
    expect(p1).not.toContain(rawUuid);

    const ipPseudonym = deriveAuditPseudonym('ip', '192.0.2.1', auditKey);
    expect(ipPseudonym.startsWith('anon_')).toBe(true);
    expect(ipPseudonym).not.toContain('192.0.2.1');

    const sysPseudonym = deriveAuditPseudonym('system', 'cli_bootstrap', auditKey);
    expect(sysPseudonym).toBe('sys:cli_bootstrap');
  });

  it('sanitizes metadata against allowlist, stripping PII and disallowed keys', () => {
    const rawMetadata = {
      route: '/api/v1/auth/login',
      status_code: 200,
      reason: 'valid_credentials',
      rawEmail: 'secret@example.com',
      password: 'test-plain-password',
      rawToken: 'test-synthetic-raw-token-fixture',
    };

    const sanitized = sanitizeAuditMetadata(rawMetadata);
    expect(sanitized).toHaveProperty('route', '/api/v1/auth/login');
    expect(sanitized).toHaveProperty('status_code', 200);
    expect(sanitized).toHaveProperty('reason', 'valid_credentials');
    expect(sanitized).not.toHaveProperty('rawEmail');
    expect(sanitized).not.toHaveProperty('password');
    expect(sanitized).not.toHaveProperty('rawToken');
  });

  it('allows validated UUID references while rejecting malformed or credential-like values', () => {
    const validUuid1 = 'a0000000-0000-4000-8000-000000000001';

    const metadata = {
      revoked_session_public_id: validUuid1,
      // Malformed or non-UUID values for UUID fields must be stripped
      invalid_uuid_session: 'not-a-real-uuid',
      session_digest: 'd2d2d2d2d2d2d2d2d2d2d2d2d2d2d2d2d2d2d2d2d2d2d2d2d2d2d2d2d2d2d2d2',
      email: 'user@example.com',
      ip: '192.0.2.1',
    };

    const sanitized = sanitizeAuditMetadata(metadata);
    expect(sanitized).toEqual({
      revoked_session_public_id: validUuid1,
    });

    // Test non-UUID rejected on UUID key
    const nonUuidRejected = sanitizeAuditMetadata({
      revoked_session_public_id: 'invalid-non-uuid-string',
    });
    expect(nonUuidRejected).toEqual({});
  });
});
