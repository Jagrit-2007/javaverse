import { describe, it, expect } from 'vitest';
import { hashToken, timingSafeCompare } from '../src/tokens';

describe('Token hashing & comparison', () => {
  const secret = 'test-secret-key-32-characters-long!';
  const token = 'sample-random-token-value';

  it('generates consistent HMAC-SHA-256 hashes for same domain and input', () => {
    const hash1 = hashToken(token, secret, 'invitation');
    const hash2 = hashToken(token, secret, 'invitation');
    expect(hash1).toBe(hash2);
    expect(hash1).toHaveLength(64);
  });

  it('produces different hashes across different domains (domain separation)', () => {
    const inviteHash = hashToken(token, secret, 'invitation');
    const resetHash = hashToken(token, secret, 'password_reset');
    const bootstrapHash = hashToken(token, secret, 'owner_bootstrap');

    expect(inviteHash).not.toBe(resetHash);
    expect(inviteHash).not.toBe(bootstrapHash);
    expect(resetHash).not.toBe(bootstrapHash);
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
});
