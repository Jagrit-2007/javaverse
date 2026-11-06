import { NextRequest } from 'next/server';
import { prisma } from '@javaverse/db';
import { requireOwnerAuth } from '@/lib/adminAuth';
import { jsonOk, jsonError } from '@/lib/apiResponse';
import { getRedisQueueClient, getRedisCacheClient } from '@/lib/redis';
import { checkStorageHealth } from '@/lib/storage';
import { getSandboxClient } from '@javaverse/sandbox';

export async function GET(request: NextRequest) {
  const auth = await requireOwnerAuth(request);
  if (!auth.ok) {
    return jsonError(auth.status === 403 ? 'FORBIDDEN' : 'UNAUTHORIZED', auth.error, auth.status);
  }

  const health: Record<string, 'HEALTHY' | 'DEGRADED' | 'DOWN'> = {
    postgres: 'DOWN',
    redisQueue: 'DOWN',
    redisCache: 'DOWN',
    storage: 'DOWN',
    sandbox: 'DOWN',
  };

  // 1. PostgreSQL
  try {
    await prisma.$queryRaw`SELECT 1`;
    health.postgres = 'HEALTHY';
  } catch {
    health.postgres = 'DOWN';
  }

  // 2. Redis Queue
  try {
    const queueClient = getRedisQueueClient();
    const pong = await queueClient.ping();
    health.redisQueue = pong === 'PONG' ? 'HEALTHY' : 'DEGRADED';
  } catch {
    health.redisQueue = 'DOWN';
  }

  // 3. Redis Cache
  try {
    const cacheClient = getRedisCacheClient();
    const pong = await cacheClient.ping();
    health.redisCache = pong === 'PONG' ? 'HEALTHY' : 'DEGRADED';
  } catch {
    health.redisCache = 'DOWN';
  }

  // 4. Object Storage
  try {
    const isHealthy = await checkStorageHealth();
    health.storage = isHealthy ? 'HEALTHY' : 'DEGRADED';
  } catch {
    health.storage = 'DOWN';
  }

  // 5. Sandbox Runner
  try {
    const sandbox = getSandboxClient();
    health.sandbox = sandbox ? 'HEALTHY' : 'DEGRADED';
  } catch {
    health.sandbox = 'DOWN';
  }

  return jsonOk({ health });
}
