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
    expect(hash).toContain('$argon2id$');

    const isValid = await verifyPassword(goodPassword, hash);
    expect(isValid).toBe(true);

    const isInvalid = await verifyPassword('WrongPassword123!', hash);
    expect(isInvalid).toBe(false);
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

    // Valid
    expect(validatePasswordPolicy(goodPassword).valid).toBe(true);
  });

  it('detects common passwords locally during breach checks without network calls', async () => {
    const result = await checkPasswordBreach('password');
    expect(result.breached).toBe(true);
    expect(result.degraded).toBe(false);
  });
});
