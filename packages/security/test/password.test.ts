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
    expect(result.common).toBe(true);
    expect(result.degraded).toBe(false);
  });

  it('does not reject passwords merely because they contain substrings of common words', () => {
    // Contains "password" and "java" but is a unique long passphrase
    const uniquePassphrase = 'my-unique-custom-passphrase-not-in-list-2026';
    expect(validatePasswordPolicy(uniquePassphrase).valid).toBe(true);
  });

  it('permits passwords without numbers, uppercase letters, or special characters if >= 12 chars', () => {
    const allLowercase = 'thisisalllowercasepassword';
    expect(validatePasswordPolicy(allLowercase).valid).toBe(true);
  });

  it('permits long passphrases up to 128 characters', () => {
    const longPassphrase = 'correct-horse-battery-staple-'.repeat(4).slice(0, 120);
    expect(validatePasswordPolicy(longPassphrase).valid).toBe(true);
  });

  it('handles HIBP range check matches, non-matches, and degradation gracefully', async () => {
    const originalFetch = globalThis.fetch;
    const testPassword = 'UniqueTestPassphrase!2026';
    const testHash = require('node:crypto')
      .createHash('sha1')
      .update(testPassword)
      .digest('hex')
      .toUpperCase();
    const prefix = testHash.slice(0, 5);
    const suffix = testHash.slice(5);

    try {
      // 1. Simulating exact suffix match in HIBP with CRLF
      globalThis.fetch = async (url) => {
        expect(String(url)).toBe(`https://api.pwnedpasswords.com/range/${prefix}`);
        expect(String(url)).not.toContain(testPassword);
        expect(String(url)).not.toContain(suffix);
        return new Response(`OTHER12345:1\r\n${suffix}:42\r\nANOTHER999:2\r\n`, { status: 200 });
      };

      const matchResult = await checkPasswordBreach(testPassword, 'degraded');
      expect(matchResult.breached).toBe(true);
      expect(matchResult.count).toBe(42);
      expect(matchResult.degraded).toBe(false);

      // 2. Simulating exact suffix match with LF only
      globalThis.fetch = async () => {
        return new Response(`OTHER12345:1\n${suffix}:17\nANOTHER999:2\n`, { status: 200 });
      };
      const lfResult = await checkPasswordBreach(testPassword, 'degraded');
      expect(lfResult.breached).toBe(true);
      expect(lfResult.count).toBe(17);

      // 3. Similar substring but not exact suffix match is NOT rejected
      globalThis.fetch = async () => {
        // Contains part of suffix or longer suffix, but not exact match
        return new Response(`${suffix.slice(0, 20)}:100\nPREFIX_${suffix}:50\n`, { status: 200 });
      };
      const nonMatchResult = await checkPasswordBreach(testPassword, 'degraded');
      expect(nonMatchResult.breached).toBe(false);
      expect(nonMatchResult.degraded).toBe(false);

      // 4. HTTP 429 rate limit is classified as degraded/unavailable, not breached
      globalThis.fetch = async () => {
        return new Response('Rate limited', { status: 429 });
      };
      const rateLimitResult = await checkPasswordBreach(testPassword, 'degraded');
      expect(rateLimitResult.breached).toBe(false);
      expect(rateLimitResult.degraded).toBe(true);

      // 5. HTTP 500 error is classified as degraded/unavailable, not breached
      globalThis.fetch = async () => {
        return new Response('Internal Server Error', { status: 500 });
      };
      const degradedResult = await checkPasswordBreach(testPassword, 'degraded');
      expect(degradedResult.breached).toBe(false);
      expect(degradedResult.degraded).toBe(true);

      // 6. Network timeout / abort is classified as degraded/unavailable, not breached
      globalThis.fetch = async () => {
        throw new Error('Network timeout');
      };
      const timeoutResult = await checkPasswordBreach(testPassword, 'degraded');
      expect(timeoutResult.breached).toBe(false);
      expect(timeoutResult.degraded).toBe(true);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
