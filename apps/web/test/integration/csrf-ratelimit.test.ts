import { describe, it, expect } from 'vitest';
import { NextRequest } from 'next/server';
import { validateCsrf, createCsrfToken } from '@/lib/csrf';
import { checkRateLimit, resetRateLimit } from '@/lib/rateLimiter';
import { getRedisCacheClient } from '@/lib/redis';

describe('CSRF Protection & Rate Limiting (including Redis Outage)', () => {
  describe('CSRF Validation', () => {
    it('accepts state-changing requests with matching Origin and valid flow token', () => {
      const token = createCsrfToken({ flow: 'login' });
      const req = new NextRequest('http://localhost:3000/api/v1/auth/login', {
        method: 'POST',
        headers: {
          origin: 'http://localhost:3000',
          'x-csrf-token': token,
        },
      });

      const result = validateCsrf(req, { flow: 'login' });
      expect(result.valid).toBe(true);
    });

    it('rejects state-changing requests with cross-origin Origin header', () => {
      const token = createCsrfToken({ flow: 'login' });
      const req = new NextRequest('http://localhost:3000/api/v1/auth/login', {
        method: 'POST',
        headers: {
          origin: 'https://attacker-evil.com',
          'x-csrf-token': token,
        },
      });

      const result = validateCsrf(req, { flow: 'login' });
      expect(result.valid).toBe(false);
      expect(result.reason).toContain('Origin');
    });

    it('rejects state-changing requests with missing or forged x-csrf-token header', () => {
      const req = new NextRequest('http://localhost:3000/api/v1/auth/login', {
        method: 'POST',
        headers: {
          origin: 'http://localhost:3000',
          'x-csrf-token': 'forged.signature.123',
        },
      });

      const result = validateCsrf(req, { flow: 'login' });
      expect(result.valid).toBe(false);
    });

    it('rejects flow token used for a different flow context', () => {
      const loginToken = createCsrfToken({ flow: 'login' });
      const req = new NextRequest('http://localhost:3000/api/v1/auth/signup', {
        method: 'POST',
        headers: {
          origin: 'http://localhost:3000',
          'x-csrf-token': loginToken,
        },
      });

      const result = validateCsrf(req, { flow: 'signup' });
      expect(result.valid).toBe(false);
    });
  });

  describe('Rate Limiter & Outage Behavior', () => {
    it('enforces token bucket limit and returns retry details', async () => {
      const testIdentifier = 'test_ip_ratelimit_1';
      await resetRateLimit('test_prefix', testIdentifier);

      // Max 3 requests in 60s
      const r1 = await checkRateLimit({
        prefix: 'test_prefix',
        identifier: testIdentifier,
        maxRequests: 3,
        windowSeconds: 60,
      });
      expect(r1.allowed).toBe(true);
      expect(r1.remaining).toBe(2);

      const r2 = await checkRateLimit({
        prefix: 'test_prefix',
        identifier: testIdentifier,
        maxRequests: 3,
        windowSeconds: 60,
      });
      expect(r2.allowed).toBe(true);
      expect(r2.remaining).toBe(1);

      const r3 = await checkRateLimit({
        prefix: 'test_prefix',
        identifier: testIdentifier,
        maxRequests: 3,
        windowSeconds: 60,
      });
      expect(r3.allowed).toBe(true);
      expect(r3.remaining).toBe(0);

      // 4th request must be rejected
      const r4 = await checkRateLimit({
        prefix: 'test_prefix',
        identifier: testIdentifier,
        maxRequests: 3,
        windowSeconds: 60,
      });
      expect(r4.allowed).toBe(false);
      expect(r4.remaining).toBe(0);

      await resetRateLimit('test_prefix', testIdentifier);
    });

    it('fails closed on sensitive auth actions when Redis throws an outage error', async () => {
      const redis = getRedisCacheClient();
      const originalPipeline = redis.pipeline.bind(redis);

      try {
        // Simulate Redis outage by mocking pipeline to throw
        redis.pipeline = () => {
          throw new Error('Connection refused: Redis cache outage');
        };

        // 1. Sensitive action: failClosed = true (e.g. login, MFA)
        const sensitiveResult = await checkRateLimit({
          prefix: 'login_sensitive',
          identifier: '198.51.100.1',
          maxRequests: 5,
          windowSeconds: 900,
          failClosed: true,
        });

        // Must reject to prevent bypassing rate limits during outage!
        expect(sensitiveResult.allowed).toBe(false);
        expect(sensitiveResult.remaining).toBe(0);

        // 2. Non-sensitive action: failClosed = false (e.g. resend verification)
        const nonSensitiveResult = await checkRateLimit({
          prefix: 'resend_verification',
          identifier: '198.51.100.1',
          maxRequests: 3,
          windowSeconds: 3600,
          failClosed: false,
        });

        // Must fail open to allow user recovery
        expect(nonSensitiveResult.allowed).toBe(true);
      } finally {
        // Restore Redis client pipeline
        redis.pipeline = originalPipeline;
      }
    });
  });
});
