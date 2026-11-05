import { describe, it, expect } from 'vitest';
import { deriveKeyHierarchy } from '../src/keys';

describe('HKDF Key Hierarchy', () => {
  const masterSecret = 'super-secret-master-key-at-least-32-chars-long';

  it('derives distinct 32-byte subkeys for each security purpose', () => {
    const keys = deriveKeyHierarchy(masterSecret);

    expect(keys.sessionTokenHmacKey).toHaveLength(32);
    expect(keys.authTokenHmacKey).toHaveLength(32);
    expect(keys.mfaEncryptionKey).toHaveLength(32);
    expect(keys.csrfSigningKey).toHaveLength(32);
    expect(keys.rateLimitKey).toHaveLength(32);
    expect(keys.auditPseudonymKey).toHaveLength(32);

    // Ensure all subkeys are distinct from each other
    const keySet = new Set([
      keys.sessionTokenHmacKey.toString('hex'),
      keys.authTokenHmacKey.toString('hex'),
      keys.mfaEncryptionKey.toString('hex'),
      keys.csrfSigningKey.toString('hex'),
      keys.rateLimitKey.toString('hex'),
      keys.auditPseudonymKey.toString('hex'),
    ]);

    expect(keySet.size).toBe(6);
  });

  it('rejects master secrets shorter than 32 characters', () => {
    expect(() => deriveKeyHierarchy('too-short')).toThrow(
      'Master secret must be at least 32 characters',
    );
  });

  it('produces deterministic keys for the same master secret', () => {
    const keys1 = deriveKeyHierarchy(masterSecret);
    const keys2 = deriveKeyHierarchy(masterSecret);

    expect(keys1.mfaEncryptionKey.equals(keys2.mfaEncryptionKey)).toBe(true);
    expect(keys1.csrfSigningKey.equals(keys2.csrfSigningKey)).toBe(true);
  });
});
