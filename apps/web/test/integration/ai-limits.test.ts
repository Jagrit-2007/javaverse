import { describe, it, expect, beforeEach } from 'vitest';
import {
  checkAndAcquireAiLimits,
  releaseAiConcurrencySlot,
  releaseAiSubmitLock,
} from '@/lib/aiLimits';
import { getRedisCacheClient } from '@/lib/redis';

describe('AI Limits & Guardrails (Part 5)', () => {
  const redis = getRedisCacheClient();
  const testUserA = 'test-user-limit-a';
  const testUserB = 'test-user-limit-b';
  const testDate = '2026-11-09';

  beforeEach(async () => {
    // Clean up Redis keys used for testing
    await redis.del(`ai:submit:lock:${testUserA}`);
    await redis.del(`ai:submit:lock:${testUserB}`);
    await redis.del(`ai:limit:daily:${testUserA}:${testDate}`);
    await redis.del(`ai:limit:daily:${testUserB}:${testDate}`);
    await redis.del('ai:concurrency:global');
  });

  it('1. Local Mock mode completely bypasses external limits', async () => {
    const result = await checkAndAcquireAiLimits({
      userId: testUserA,
      provider: 'mock',
      externalAiEnabled: false,
      dailyLimit: 2,
    });

    expect(result.allowed).toBe(true);
    expect(result.isMock).toBe(true);
  });

  it('2. External AI disabled returns 403 error', async () => {
    const result = await checkAndAcquireAiLimits({
      userId: testUserA,
      provider: 'gemini',
      externalAiEnabled: false,
    });

    expect(result.allowed).toBe(false);
    expect(result.status).toBe(403);
    expect(result.code).toBe('EXTERNAL_AI_DISABLED');
  });

  it('3. Request allowed when limit is below daily threshold', async () => {
    const result = await checkAndAcquireAiLimits({
      userId: testUserA,
      provider: 'gemini',
      externalAiEnabled: true,
      dailyLimit: 3,
      dateKey: testDate,
    });

    expect(result.allowed).toBe(true);
    expect(result.acquiredConcurrency).toBe(true);
  });

  it('4. Daily threshold reached rejects subsequent requests with 429', async () => {
    const dailyLimit = 2;

    // First request
    const req1 = await checkAndAcquireAiLimits({
      userId: testUserA,
      provider: 'gemini',
      externalAiEnabled: true,
      dailyLimit,
      dateKey: testDate,
    });
    expect(req1.allowed).toBe(true);
    await releaseAiSubmitLock(testUserA);
    await releaseAiConcurrencySlot();

    // Second request (reaches threshold)
    const req2 = await checkAndAcquireAiLimits({
      userId: testUserA,
      provider: 'gemini',
      externalAiEnabled: true,
      dailyLimit,
      dateKey: testDate,
    });
    expect(req2.allowed).toBe(true);
    await releaseAiSubmitLock(testUserA);
    await releaseAiConcurrencySlot();

    // Third request (exceeds threshold)
    const req3 = await checkAndAcquireAiLimits({
      userId: testUserA,
      provider: 'gemini',
      externalAiEnabled: true,
      dailyLimit,
      dateKey: testDate,
    });
    expect(req3.allowed).toBe(false);
    expect(req3.status).toBe(429);
    expect(req3.code).toBe('DAILY_LIMIT_EXCEEDED');
  });

  it('5. Daily limit resets on next day window', async () => {
    const dailyLimit = 1;

    // Use up today's quota
    const reqToday = await checkAndAcquireAiLimits({
      userId: testUserA,
      provider: 'gemini',
      externalAiEnabled: true,
      dailyLimit,
      dateKey: testDate,
    });
    expect(reqToday.allowed).toBe(true);
    await releaseAiSubmitLock(testUserA);
    await releaseAiConcurrencySlot();

    // Tomorrow's window has fresh quota
    const tomorrowDate = '2026-11-10';
    const reqTomorrow = await checkAndAcquireAiLimits({
      userId: testUserA,
      provider: 'gemini',
      externalAiEnabled: true,
      dailyLimit,
      dateKey: tomorrowDate,
    });
    expect(reqTomorrow.allowed).toBe(true);
  });

  it('6. Two-user isolation: User A reaching limit does not block User B', async () => {
    const dailyLimit = 1;

    // User A consumes daily quota
    const userAResult1 = await checkAndAcquireAiLimits({
      userId: testUserA,
      provider: 'gemini',
      externalAiEnabled: true,
      dailyLimit,
      dateKey: testDate,
    });
    expect(userAResult1.allowed).toBe(true);
    await releaseAiSubmitLock(testUserA);
    await releaseAiConcurrencySlot();

    // User A blocked
    const userAResult2 = await checkAndAcquireAiLimits({
      userId: testUserA,
      provider: 'gemini',
      externalAiEnabled: true,
      dailyLimit,
      dateKey: testDate,
    });
    expect(userAResult2.allowed).toBe(false);
    expect(userAResult2.code).toBe('DAILY_LIMIT_EXCEEDED');

    // User B is isolated and allowed
    const userBResult = await checkAndAcquireAiLimits({
      userId: testUserB,
      provider: 'gemini',
      externalAiEnabled: true,
      dailyLimit,
      dateKey: testDate,
    });
    expect(userBResult.allowed).toBe(true);
  });

  it('7. Installation-wide external concurrency limit enforcement', async () => {
    const maxConcurrency = 1;

    // Slot 1 acquired by User A
    const req1 = await checkAndAcquireAiLimits({
      userId: testUserA,
      provider: 'anthropic',
      externalAiEnabled: true,
      maxConcurrency,
      dateKey: testDate,
    });
    expect(req1.allowed).toBe(true);

    // Slot 2 attempted by User B while Slot 1 is still occupied
    const req2 = await checkAndAcquireAiLimits({
      userId: testUserB,
      provider: 'anthropic',
      externalAiEnabled: true,
      maxConcurrency,
      dateKey: testDate,
    });
    expect(req2.allowed).toBe(false);
    expect(req2.status).toBe(429);
    expect(req2.code).toBe('CONCURRENCY_LIMIT_EXCEEDED');

    // After releasing Slot 1, User B is admitted
    await releaseAiConcurrencySlot();
    await releaseAiSubmitLock(testUserB);

    const req3 = await checkAndAcquireAiLimits({
      userId: testUserB,
      provider: 'anthropic',
      externalAiEnabled: true,
      maxConcurrency,
      dateKey: testDate,
    });
    expect(req3.allowed).toBe(true);
  });

  it('8. Duplicate clicks rejected via idempotency submit lock', async () => {
    // Fast duplicate click for same user within lock window
    const firstClick = await checkAndAcquireAiLimits({
      userId: testUserA,
      provider: 'gemini',
      externalAiEnabled: true,
      dateKey: testDate,
    });
    expect(firstClick.allowed).toBe(true);

    // Immediate second click without releasing lock
    const duplicateClick = await checkAndAcquireAiLimits({
      userId: testUserA,
      provider: 'gemini',
      externalAiEnabled: true,
      dateKey: testDate,
    });
    expect(duplicateClick.allowed).toBe(false);
    expect(duplicateClick.status).toBe(429);
    expect(duplicateClick.code).toBe('DUPLICATE_SUBMISSION');
    expect(duplicateClick.retryAfterSeconds).toBe(3);
  });

  it('9. Daily keys and concurrency keys have bounded TTLs', async () => {
    await checkAndAcquireAiLimits({
      userId: testUserA,
      provider: 'gemini',
      externalAiEnabled: true,
      dateKey: testDate,
    });

    const dailyTtl = await redis.ttl(`ai:limit:daily:${testUserA}:${testDate}`);
    expect(dailyTtl).toBeGreaterThan(0);
    expect(dailyTtl).toBeLessThanOrEqual(90000);

    const concurrencyTtl = await redis.ttl('ai:concurrency:global');
    expect(concurrencyTtl).toBeGreaterThan(0);
    expect(concurrencyTtl).toBeLessThanOrEqual(300);
  });

  it('10. Safely communicates when learner may retry on daily limit exceeded', async () => {
    const res = await checkAndAcquireAiLimits({
      userId: testUserA,
      provider: 'gemini',
      externalAiEnabled: true,
      dailyLimit: 0, // Immediately exceeded
      dateKey: testDate,
    });

    expect(res.allowed).toBe(false);
    expect(res.status).toBe(429);
    expect(res.code).toBe('DAILY_LIMIT_EXCEEDED');
    expect(res.retryAfterSeconds).toBeDefined();
    expect(res.retryAfterSeconds).toBeGreaterThan(0);
    expect(res.message).toContain('Limit resets at midnight UTC');
  });
});
