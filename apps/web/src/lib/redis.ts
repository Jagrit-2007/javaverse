import { Redis } from 'ioredis';
import { env } from '../env';

let redisQueueClient: Redis | null = null;
let redisCacheClient: Redis | null = null;

export function getRedisQueueClient(): Redis {
  if (!redisQueueClient) {
    redisQueueClient = new Redis(env.REDIS_QUEUE_URL, {
      maxRetriesPerRequest: 1,
      connectTimeout: 2000,
      lazyConnect: true,
    });
  }
  return redisQueueClient;
}

export function getRedisCacheClient(): Redis {
  if (!redisCacheClient) {
    redisCacheClient = new Redis(env.REDIS_CACHE_URL, {
      maxRetriesPerRequest: 1,
      connectTimeout: 2000,
      lazyConnect: true,
    });
  }
  return redisCacheClient;
}
