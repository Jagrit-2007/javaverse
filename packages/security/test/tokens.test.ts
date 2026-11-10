import { describe, it, expect } from 'vitest';
import {
  generateRandomToken,
  hashToken,
  timingSafeCompare,
  verifyTokenDigest,
} from '../src/tokens';

describe('Token hashing & comparison', () => {
  const secret = 'test-secret-key-32-characters-long!';
  const fallbackSecret = 'previous-secret-key-32-characters!';
  const token = 'sample-random-token-value';

  it('generates consistent HMAC-SHA-256 hashes for same purpose and input', () => {
    const hash1 = hashToken(token, secret, 'email_verification');
    const hash2 = hashToken(token, secret, 'email_verification');
    expect(hash1).toBe(hash2);
    expect(hash1).toHaveLength(64);
  });

  it('produces different hashes across different purposes (domain separation)', () => {
    const emailHash = hashToken(token, secret, 'email_verification');
    const resetHash = hashToken(token, secret, 'password_reset');
    const sessionHash = hashToken(token, secret, 'session');

    expect(emailHash).not.toBe(resetHash);
    expect(emailHash).not.toBe(sessionHash);
    expect(resetHash).not.toBe(sessionHash);
  });

  it('generates random tokens of specified byte length', () => {
    const tok = generateRandomToken(32);
    expect(tok).toHaveLength(64); // 32 bytes in hex = 64 chars
  });

  it('compares identical hashes accurately with timingSafeCompare', () => {
    const hash = hashToken(token, secret, 'session');
    expect(timingSafeCompare(hash, hash)).toBe(true);
  });

  it('rejects mismatched or invalid hashes with timingSafeCompare', () => {
    const hash1 = hashToken(token, secret, 'session');
    const hash2 = hashToken('different-token', secret, 'session');
    expect(timingSafeCompare(hash1, hash2)).toBe(false);
    expect(timingSafeCompare(hash1, 'invalid')).toBe(false);
  });

  it('verifies candidate tokens against primary and fallback keys for key rotation', () => {
    const oldHash = hashToken(token, fallbackSecret, 'password_reset');
    const currentHash = hashToken(token, secret, 'password_reset');

    // Matches primary
    const res1 = verifyTokenDigest(token, currentHash, secret, 'password_reset', fallbackSecret);
    expect(res1.valid).toBe(true);
    expect(res1.requiresRehash).toBe(false);

    // Matches fallback
    const res2 = verifyTokenDigest(token, oldHash, secret, 'password_reset', fallbackSecret);
    expect(res2.valid).toBe(true);
    expect(res2.requiresRehash).toBe(true);

    // Mismatched token
    const res3 = verifyTokenDigest(
      'wrong-token',
      currentHash,
      secret,
      'password_reset',
      fallbackSecret,
    );
    expect(res3.valid).toBe(false);
  });
});
