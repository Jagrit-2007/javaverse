import { describe, it, expect } from 'vitest';
import {
  hashPassword,
  verifyPassword,
  verifyDummyPassword,
  validatePasswordPolicy,
  checkPasswordBreach,
} from '../src/password';

describe('Password Security Primitives', () => {
  const goodPassword = 'CorrectHorseBatteryStaple123!';

  it('hashes and verifies passwords using Argon2id', async () => {
    const hash = await hashPassword(goodPassword);
    expect(hash.startsWith('$argon2id$')).toBe(true);
    expect(hash).not.toBe(goodPassword);
    expect(hash).not.toContain(goodPassword);

    const isValid = await verifyPassword(goodPassword, hash);
    expect(isValid).toBe(true);

    const isInvalid = await verifyPassword('WrongPassword123!', hash);
    expect(isInvalid).toBe(false);

    const isCaseVariantInvalid = await verifyPassword(goodPassword.toLowerCase(), hash);
    expect(isCaseVariantInvalid).toBe(false);
  });

  it('verifies dummy password constant without errors', async () => {
    const result = await verifyDummyPassword('anyCandidatePassword');
    expect(result).toBe(false);
  });

  it('enforces password length and policy constraints', () => {
    // Too short (<12)
    expect(validatePasswordPolicy('short').valid).toBe(false);

    // Too long (>128)
    const longPw = 'A'.repeat(129);
    expect(validatePasswordPolicy(longPw).valid).toBe(false);

    // Common password from blocklist
    expect(validatePasswordPolicy('password12345').valid).toBe(false);
    expect(validatePasswordPolicy('qwertyuiop12').valid).toBe(false);

    // Whitespace policy: internal spaces allowed, leading/trailing rejected
    const leadingSpace = validatePasswordPolicy(` ${goodPassword}`);
    expect(leadingSpace.valid).toBe(false);
    expect(leadingSpace.reason).toBe('Password cannot begin or end with whitespace.');

    const trailingSpace = validatePasswordPolicy(`${goodPassword} `);
    expect(trailingSpace.valid).toBe(false);
    expect(trailingSpace.reason).toBe('Password cannot begin or end with whitespace.');

    const leadingTab = validatePasswordPolicy(`\t${goodPassword}`);
    expect(leadingTab.valid).toBe(false);
    expect(leadingTab.reason).toBe('Password cannot begin or end with whitespace.');

    const internalSpacePw = 'Correct Horse Battery Staple 123!';
    expect(validatePasswordPolicy(internalSpacePw).valid).toBe(true);

    // Valid
    expect(validatePasswordPolicy(goodPassword).valid).toBe(true);
  });

  it('detects common passwords locally during breach checks without network calls', async () => {
    const result = await checkPasswordBreach('password');
    expect(result.breached).toBe(true);
    expect(result.degraded).toBe(false);
  });
});
