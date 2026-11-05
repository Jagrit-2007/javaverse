import { getRedisCacheClient } from './redis';
import { getServerKeys } from './keys';
import { deriveRateLimitKey, extractClientIp, normalizeIpAddress } from '@javaverse/security';
import { env } from '../env';

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAfterSeconds: number;
}

export interface CheckRateLimitOptions {
  prefix: string;
  identifier: string;
  maxRequests: number;
  windowSeconds: number;
  failClosed?: boolean;
}

/**
 * Check rate limit using Redis Cache.
 * Key is derived with HMAC to preserve privacy and prevent brute-force key scanning.
 */
export async function checkRateLimit(options: CheckRateLimitOptions): Promise<RateLimitResult> {
  const { prefix, identifier, maxRequests, windowSeconds, failClosed = false } = options;
  const keys = getServerKeys();
  const redisKey = deriveRateLimitKey(prefix, identifier, keys.rateLimitHmacKey);

  try {
    const redis = getRedisCacheClient();
    const pipeline = redis.pipeline();
    pipeline.incr(redisKey);
    pipeline.ttl(redisKey);
    const results = await pipeline.exec();

    if (!results || results.length < 2) {
      throw new Error('Redis pipeline failed');
    }

    const [incrErr, count] = results[0] as [Error | null, number];
    const [, ttl] = results[1] as [Error | null, number];

    if (incrErr) throw incrErr;

    // If key has no TTL (ttl == -1), set it now
    let remainingTtl = typeof ttl === 'number' && ttl > 0 ? ttl : windowSeconds;
    if (ttl === -1) {
      await redis.expire(redisKey, windowSeconds);
      remainingTtl = windowSeconds;
    }

    const currentCount = typeof count === 'number' ? count : 1;
    const allowed = currentCount <= maxRequests;
    const remaining = Math.max(0, maxRequests - currentCount);

    return {
      allowed,
      remaining,
      resetAfterSeconds: remainingTtl,
    };
  } catch (error) {
    console.error(`Rate limiter failure for ${prefix}:`, error);

    if (failClosed) {
      return {
        allowed: false,
        remaining: 0,
        resetAfterSeconds: windowSeconds,
      };
    }

    // Fail open for non-sensitive actions
    return {
      allowed: true,
      remaining: 1,
      resetAfterSeconds: 0,
    };
  }
}

/**
 * Reset rate limit counter (e.g. after successful login/verification).
 */
export async function resetRateLimit(prefix: string, identifier: string): Promise<void> {
  const keys = getServerKeys();
  const redisKey = deriveRateLimitKey(prefix, identifier, keys.rateLimitHmacKey);
  try {
    const redis = getRedisCacheClient();
    await redis.del(redisKey);
  } catch (err) {
    console.error(`Failed to reset rate limit for ${prefix}:`, err);
  }
}

/**
 * Extracts and normalizes the client IP from Next.js request headers.
 */
export function getClientIp(headers: Headers, remoteAddress?: string): string {
  const xForwardedFor = headers.get('x-forwarded-for') || undefined;
  const directIp = remoteAddress || headers.get('x-real-ip') || '127.0.0.1';
  const trustedProxies = env.TRUSTED_PROXY_IPS ? env.TRUSTED_PROXY_IPS.split(',') : [];

  const rawIp = extractClientIp(directIp, xForwardedFor, trustedProxies);
  return normalizeIpAddress(rawIp);
}
