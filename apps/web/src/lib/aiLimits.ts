import { getRedisCacheClient } from './redis';
import { env } from '../env';
import type { Redis } from 'ioredis';

export interface AiLimitCheckResult {
  allowed: boolean;
  status?: number;
  code?: string;
  message?: string;
  retryAfterSeconds?: number;
  isMock?: boolean;
  acquiredConcurrency?: boolean;
}

export interface CheckAiLimitsOptions {
  userId: string;
  provider?: string;
  externalAiEnabled?: boolean;
  dailyLimit?: number;
  maxConcurrency?: number;
  dateKey?: string;
  redisClient?: Redis;
}

/**
 * Calculates remaining seconds until midnight UTC.
 */
export function getSecondsUntilMidnightUtc(): number {
  const now = new Date();
  const tomorrowUtc = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1, 0, 0, 0, 0),
  );
  return Math.max(1, Math.ceil((tomorrowUtc.getTime() - now.getTime()) / 1000));
}

/**
 * Checks and acquires external AI rate limit, duplicate-click lock, and concurrency slot.
 *
 * Safe defaults:
 * - EXTERNAL_AI_DAILY_REQUEST_LIMIT_PER_USER: 50 requests/day per account
 *   Reason: Prevents runaway API billing on pay-per-token providers while allowing extensive daily learning sessions.
 * - EXTERNAL_AI_MAX_CONCURRENCY: 2 concurrent external requests installation-wide
 *   Reason: Prevents exceeding provider tier rate limits (RPM/TPM) and protects local server network resources.
 *
 * Local Mock mode (provider === 'mock') completely bypasses all external AI limits by design.
 */
export async function checkAndAcquireAiLimits(
  options: CheckAiLimitsOptions,
): Promise<AiLimitCheckResult> {
  const provider = options.provider ?? env.AI_PROVIDER_PRIMARY;
  const externalAiEnabled = options.externalAiEnabled ?? env.EXTERNAL_AI_ENABLED;
  const dailyLimit = options.dailyLimit ?? env.EXTERNAL_AI_DAILY_REQUEST_LIMIT_PER_USER;
  const maxConcurrency = options.maxConcurrency ?? env.EXTERNAL_AI_MAX_CONCURRENCY;
  const userId = options.userId;

  // 1. Local Mock mode is free, local, and unaffected by external AI limits
  if (provider === 'mock') {
    return { allowed: true, isMock: true };
  }

  // 2. If external AI is disabled installation-wide, reject cleanly
  if (!externalAiEnabled) {
    return {
      allowed: false,
      status: 403,
      code: 'EXTERNAL_AI_DISABLED',
      message: 'External AI features are not enabled on this installation.',
    };
  }

  const redis = options.redisClient ?? getRedisCacheClient();
  const today = options.dateKey ?? new Date().toISOString().slice(0, 10);

  // 3. Duplicate-click idempotency lock (3-second window)
  const lockKey = `ai:submit:lock:${userId}`;
  const lockAcquired = await redis.set(lockKey, '1', 'EX', 3, 'NX');
  if (!lockAcquired) {
    return {
      allowed: false,
      status: 429,
      code: 'DUPLICATE_SUBMISSION',
      message: 'A request is already in progress. Please wait.',
      retryAfterSeconds: 3,
    };
  }

  // 4. Installation-wide external concurrency limit (distinct key from user limits)
  const concurrencyKey = 'ai:concurrency:global';
  const currentConcurrency = await redis.incr(concurrencyKey);
  // Ensure concurrency key has bounded TTL in case of unexpected worker disconnect
  if (currentConcurrency === 1) {
    await redis.expire(concurrencyKey, 300);
  }

  if (currentConcurrency > maxConcurrency) {
    await redis.decr(concurrencyKey);
    await redis.del(lockKey);
    return {
      allowed: false,
      status: 429,
      code: 'CONCURRENCY_LIMIT_EXCEEDED',
      message:
        'Installation external AI concurrency limit reached. Please wait a few moments for active requests to finish.',
      retryAfterSeconds: 5,
    };
  }

  // 5. Per-user daily request limit (isolated by userId and UTC calendar day)
  const dailyKey = `ai:limit:daily:${userId}:${today}`;
  const dailyCount = await redis.incr(dailyKey);
  if (dailyCount === 1) {
    // TTL bounded to seconds until UTC midnight + 1 hour buffer
    const ttlSeconds = Math.max(3600, getSecondsUntilMidnightUtc() + 3600);
    await redis.expire(dailyKey, ttlSeconds);
  }

  if (dailyCount > dailyLimit) {
    // Release acquired concurrency slot and lock since quota is exhausted
    await redis.decr(concurrencyKey);
    await redis.del(lockKey);

    const retryAfter = getSecondsUntilMidnightUtc();
    const hours = Math.ceil(retryAfter / 3600);
    return {
      allowed: false,
      status: 429,
      code: 'DAILY_LIMIT_EXCEEDED',
      message: `Daily external AI request limit reached for this account (${dailyLimit} requests/day). Limit resets at midnight UTC (in ~${hours}h).`,
      retryAfterSeconds: retryAfter,
    };
  }

  return {
    allowed: true,
    isMock: false,
    acquiredConcurrency: true,
  };
}

/**
 * Decrements the daily count for a user if a request failed before actual provider dispatch.
 */
export async function refundAiDailyQuota(
  userId: string,
  dateKey?: string,
  redisClient?: Redis,
): Promise<void> {
  try {
    const redis = redisClient ?? getRedisCacheClient();
    const today = dateKey ?? new Date().toISOString().slice(0, 10);
    const dailyKey = `ai:limit:daily:${userId}:${today}`;
    const val = await redis.decr(dailyKey);
    if (val < 0) {
      await redis.set(dailyKey, '0');
    }
  } catch {
    // Non-fatal
  }
}

/**
 * Releases the global external AI concurrency slot when an external AI job finishes or fails.
 */
export async function releaseAiConcurrencySlot(redisClient?: Redis): Promise<void> {
  try {
    const redis = redisClient ?? getRedisCacheClient();
    const concurrencyKey = 'ai:concurrency:global';
    const val = await redis.decr(concurrencyKey);
    if (val < 0) {
      await redis.set(concurrencyKey, '0');
    }
  } catch {
    // Non-fatal cleanup
  }
}

/**
 * Clears the duplicate-click lock early if needed.
 */
export async function releaseAiSubmitLock(userId: string, redisClient?: Redis): Promise<void> {
  try {
    const redis = redisClient ?? getRedisCacheClient();
    await redis.del(`ai:submit:lock:${userId}`);
  } catch {
    // Non-fatal cleanup
  }
}
