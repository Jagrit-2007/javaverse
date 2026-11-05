import { describe, it, expect } from 'vitest';
import {
  generateSingleRecoveryCode,
  normalizeRecoveryCode,
  hashRecoveryCode,
  generateRecoveryCodes,
} from '../src/recovery';
import { timingSafeCompare } from '../src/tokens';

describe('Recovery Codes', () => {
  const authKey = 'test-auth-token-hmac-key-at-least-32-chars';

  it('generates recovery codes formatted in 4 groups of 4 Crockford Base32 characters', () => {
    const code = generateSingleRecoveryCode();
    expect(code).toMatch(/^[0-9A-Z]{4}-[0-9A-Z]{4}-[0-9A-Z]{4}-[0-9A-Z]{4}$/);
    // Ensure no ambiguous characters
    expect(code).not.toMatch(/[ILOUilou]/);
  });

  it('normalizes recovery codes accurately by upper-casing and stripping hyphens', () => {
    expect(normalizeRecoveryCode('abcd-efgh-jkmn-pqrs')).toBe('ABCDEFGHJKMNPQRS');
    expect(normalizeRecoveryCode('ABCD-EFGH-JKMN-PQRS')).toBe('ABCDEFGHJKMNPQRS');
    expect(normalizeRecoveryCode('  1234 - 5678 - 9abc - defg  ')).toBe('123456789ABCDEFG');
  });

  it('generates 10 distinct recovery codes with matching HMAC hashes', () => {
    const { rawCodes, hashedCodes } = generateRecoveryCodes(authKey, 10);
    expect(rawCodes).toHaveLength(10);
    expect(hashedCodes).toHaveLength(10);

    const rawSet = new Set(rawCodes);
    expect(rawSet.size).toBe(10);

    for (let i = 0; i < 10; i++) {
      const rawCode = rawCodes[i]!;
      const hashedCode = hashedCodes[i]!;
      const computedHash = hashRecoveryCode(rawCode, authKey);
      expect(timingSafeCompare(computedHash, hashedCode)).toBe(true);
    }
  });
});
