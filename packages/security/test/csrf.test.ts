import { describe, it, expect } from 'vitest';
import {
  generateSessionCsrfToken,
  verifySessionCsrfToken,
  generatePreAuthCsrfToken,
  verifyPreAuthCsrfToken,
  validateOrigin,
} from '../src/csrf';

describe('CSRF Protection', () => {
  const csrfKey = 'test-csrf-signing-key-32-characters-long!';
  const sessionPublicId = '11111111-2222-3333-4444-555555555555';

  it('generates and verifies session-bound CSRF tokens', () => {
    const token = generateSessionCsrfToken(sessionPublicId, csrfKey);
    expect(verifySessionCsrfToken(token, sessionPublicId, csrfKey)).toBe(true);

    // Mismatched session
    expect(verifySessionCsrfToken(token, '99999999-9999-9999-9999-999999999999', csrfKey)).toBe(
      false,
    );

    // Expired token (simulate 25 hours ago)
    const oldTimestamp = Math.floor(Date.now() / 1000) - 90000;
    const expiredToken = generateSessionCsrfToken(sessionPublicId, csrfKey, oldTimestamp);
    expect(verifySessionCsrfToken(expiredToken, sessionPublicId, csrfKey)).toBe(false);
  });

  it('generates and verifies flow-bound pre-authentication CSRF tokens', () => {
    const loginToken = generatePreAuthCsrfToken('login', csrfKey);
    expect(verifyPreAuthCsrfToken(loginToken, 'login', csrfKey)).toBe(true);

    // Wrong flow
    expect(verifyPreAuthCsrfToken(loginToken, 'bootstrap', csrfKey)).toBe(false);

    // Tampered token
    const tampered = loginToken.slice(0, -4) + '0000';
    expect(verifyPreAuthCsrfToken(tampered, 'login', csrfKey)).toBe(false);
  });

  it('validates Origin and Referer against expected host', () => {
    const appUrl = 'https://learn.javaverse.local:3000';

    expect(validateOrigin('https://learn.javaverse.local:3000', null, appUrl)).toBe(true);
    expect(validateOrigin(null, 'https://learn.javaverse.local:3000/auth/login', appUrl)).toBe(
      true,
    );

    // Untrusted origin
    expect(validateOrigin('https://evil-attacker.com', null, appUrl)).toBe(false);
    expect(validateOrigin(null, 'https://evil-attacker.com/page', appUrl)).toBe(false);

    // Sibling subdomain
    expect(validateOrigin('https://sub.javaverse.local:3000', null, appUrl)).toBe(false);
  });
});
