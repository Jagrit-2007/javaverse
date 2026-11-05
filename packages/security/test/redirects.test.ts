import { describe, it, expect } from 'vitest';
import { sanitizeReturnUrl } from '../src/redirects';

describe('Safe Return URL Sanitizer', () => {
  it('allows safe /dashboard relative paths', () => {
    expect(sanitizeReturnUrl('/dashboard')).toBe('/dashboard');
    expect(sanitizeReturnUrl('/dashboard/learn')).toBe('/dashboard/learn');
    expect(sanitizeReturnUrl('/dashboard/settings/security')).toBe('/dashboard/settings/security');
  });

  it('rejects external URLs, protocol-relative paths, and backslash bypasses', () => {
    expect(sanitizeReturnUrl('https://evil.com')).toBe('/dashboard');
    expect(sanitizeReturnUrl('//evil.com/path')).toBe('/dashboard');
    expect(sanitizeReturnUrl('/\\evil.com')).toBe('/dashboard');
    expect(sanitizeReturnUrl('javascript:alert(1)')).toBe('/dashboard');
    expect(sanitizeReturnUrl('/unauthorized')).toBe('/dashboard');
    expect(sanitizeReturnUrl('')).toBe('/dashboard');
    expect(sanitizeReturnUrl(null)).toBe('/dashboard');
  });
});
