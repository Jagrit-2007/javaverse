import { describe, it, expect } from 'vitest';
import { deriveRateLimitKey, normalizeIp, extractClientIp } from '../src/rateLimit';

describe('Rate Limiting Primitives & IP Normalization', () => {
  const rateLimitKey = 'test-rate-limit-key-32-characters-long!';

  it('derives privacy-preserving rate limit keys with hashed identifiers', () => {
    const key1 = deriveRateLimitKey('login', 'ip', '192.0.2.1', rateLimitKey);
    const key2 = deriveRateLimitKey('login', 'ip', '192.0.2.1', rateLimitKey);
    const key3 = deriveRateLimitKey('login', 'acc', 'user@example.com', rateLimitKey);

    expect(key1).toBe(key2);
    expect(key1).not.toBe(key3);
    expect(key1).not.toContain('192.0.2.1'); // Ensure IP is not in plain text in key
  });

  it('normalizes IPv4 and masks IPv6 to /64 subnet', () => {
    expect(normalizeIp('192.0.2.1')).toBe('192.0.2.1');
    expect(normalizeIp('::ffff:192.0.2.1')).toBe('192.0.2.1');
    expect(normalizeIp('2001:db8:abcd:0012:0000:0000:0000:0001')).toBe('2001:db8:abcd:0012::/64');
  });

  it('does not trust forwarding headers unless peer is in trusted proxies list', () => {
    const headers = { 'x-forwarded-for': '203.0.113.195, 198.51.100.17' };

    // When trusted proxies list is empty, return direct peer IP
    const untrustedResult = extractClientIp(headers, '10.0.0.1', '');
    expect(untrustedResult).toBe('10.0.0.1');

    // When peer IP is in trusted proxies list, extract leftmost untrusted hop
    const trustedResult = extractClientIp(headers, '10.0.0.1', '10.0.0.1, 198.51.100.17');
    expect(trustedResult).toBe('203.0.113.195');
  });
});
