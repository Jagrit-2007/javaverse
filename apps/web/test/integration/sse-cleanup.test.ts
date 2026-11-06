import { describe, it, expect } from 'vitest';
import { NextRequest } from 'next/server';
import { handleUserEventStream } from '@/lib/events';
import { getRedisCacheClient } from '@/lib/redis';

describe('SSE Connection Lifecycle & Immediate Disconnect Cleanup (MEDIUM 3)', () => {
  const userId = '00000000-0000-0000-0000-000000000001';
  const connKey = `sse:active_count:${userId}`;

  it('immediately cleans up on request.signal abort and decrements active connection count', async () => {
    const redis = getRedisCacheClient();
    await redis.del(connKey);

    const abortController = new AbortController();
    const req = new NextRequest('http://localhost:3000/api/v1/events', {
      signal: abortController.signal,
    });

    const res = await handleUserEventStream(req, userId);
    expect(res.status).toBe(200);

    // Initial connection count is 1
    const countAfterConnect = await redis.get(connKey);
    expect(countAfterConnect).toBe('1');

    // Simulate client closing the connection / tab
    abortController.abort();

    // Allow event loop to process abort listener
    await new Promise((r) => setTimeout(r, 20));

    // Connection count must immediately decrement back to 0
    const countAfterAbort = await redis.get(connKey);
    expect(Number(countAfterAbort)).toBeLessThanOrEqual(0);
  });

  it('restores reconnect capacity after disconnect', async () => {
    const redis = getRedisCacheClient();
    await redis.del(connKey);

    const controllers: AbortController[] = [];

    // Open 3 connections (reaching MAX_CONCURRENT_SSE_CONNECTIONS)
    for (let i = 0; i < 3; i++) {
      const ac = new AbortController();
      controllers.push(ac);
      const req = new NextRequest('http://localhost:3000/api/v1/events', {
        signal: ac.signal,
      });
      const res = await handleUserEventStream(req, userId);
      expect(res.status).toBe(200);
    }

    // 4th connection should be rejected with 429 SSE_CONNECTION_LIMIT_REACHED
    const ac4 = new AbortController();
    const req4 = new NextRequest('http://localhost:3000/api/v1/events', {
      signal: ac4.signal,
    });
    const res4 = await handleUserEventStream(req4, userId);
    expect(res4.status).toBe(429);

    // Disconnect one active stream
    controllers[0]?.abort();
    await new Promise((r) => setTimeout(r, 20));

    // Reconnect capacity is now restored; new connection must succeed
    const ac5 = new AbortController();
    controllers.push(ac5);
    const req5 = new NextRequest('http://localhost:3000/api/v1/events', {
      signal: ac5.signal,
    });
    const res5 = await handleUserEventStream(req5, userId);
    expect(res5.status).toBe(200);

    // Cleanup remaining
    controllers.forEach((c) => c.abort());
    await new Promise((r) => setTimeout(r, 20));
  });

  it('ensures cleanup is idempotent and decrements counter exactly once under races', async () => {
    const redis = getRedisCacheClient();
    await redis.del(connKey);

    const abortController = new AbortController();
    const req = new NextRequest('http://localhost:3000/api/v1/events', {
      signal: abortController.signal,
    });

    const res = await handleUserEventStream(req, userId);
    expect(res.status).toBe(200);

    // Initial count is 1
    expect(await redis.get(connKey)).toBe('1');

    // Simulate race between abort and stream cancellation
    const reader = res.body?.getReader();
    abortController.abort();
    if (reader) {
      await reader.cancel();
    }
    abortController.abort(); // redundant abort

    await new Promise((r) => setTimeout(r, 30));

    // Counter must be exactly 0, not negative (decremented exactly once)
    const count = await redis.get(connKey);
    expect(Number(count)).toBe(0);
  });
});

