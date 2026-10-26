import { NextResponse } from 'next/server';
import { prisma } from '@javaverse/db';
import { getRedisQueueClient, getRedisCacheClient } from '@/lib/redis';

export const dynamic = 'force-dynamic';

export async function GET() {
  const checks: {
    database: 'ok' | 'failed';
    redisQueue: 'ok' | 'failed';
    redisCache?: 'ok' | 'degraded' | 'failed';
  } = {
    database: 'failed',
    redisQueue: 'failed',
  };

  // 1. PostgreSQL check (critical dependency)
  try {
    await prisma.$queryRaw`SELECT 1`;
    checks.database = 'ok';
  } catch {
    checks.database = 'failed';
  }

  // 2. Redis Queue check (critical dependency)
  try {
    const queueClient = getRedisQueueClient();
    const pong = await queueClient.ping();
    if (pong === 'PONG') {
      checks.redisQueue = 'ok';
    } else {
      checks.redisQueue = 'failed';
    }
  } catch {
    checks.redisQueue = 'failed';
  }

  // 3. Redis Cache check (non-critical in Phase 1)
  try {
    const cacheClient = getRedisCacheClient();
    const pong = await cacheClient.ping();
    if (pong === 'PONG') {
      checks.redisCache = 'ok';
    } else {
      checks.redisCache = 'degraded';
    }
  } catch {
    checks.redisCache = 'degraded';
  }

  const isCriticalHealthy = checks.database === 'ok' && checks.redisQueue === 'ok';
  const statusCode = isCriticalHealthy ? 200 : 503;
  const status = isCriticalHealthy
    ? checks.redisCache === 'degraded'
      ? 'degraded'
      : 'ready'
    : 'unhealthy';

  return NextResponse.json(
    {
      data: {
        status,
        checks,
        timestamp: new Date().toISOString(),
      },
    },
    { status: statusCode },
  );
}
