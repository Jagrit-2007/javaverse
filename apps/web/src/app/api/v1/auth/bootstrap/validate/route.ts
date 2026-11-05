import { NextRequest } from 'next/server';
import { prisma } from '@javaverse/db';
import { bootstrapValidateSchema } from '@javaverse/schemas';
import {
  deriveTokenDigest,
  generateRandomToken,
  generateTotpSecret,
  generateTotpUri,
  encryptTotpSecret,
} from '@javaverse/security';
import { getServerKeys } from '@/lib/keys';
import { getRedisCacheClient } from '@/lib/redis';
import { validateCsrf } from '@/lib/csrf';
import { checkRateLimit, getClientIp } from '@/lib/rateLimiter';
import { jsonOk, jsonError } from '@/lib/apiResponse';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  // 1. CSRF validation
  const csrfResult = validateCsrf(request, { flow: 'bootstrap' });
  if (!csrfResult.valid) {
    return jsonError('CSRF_ERROR', csrfResult.reason || 'Invalid CSRF token', 403);
  }

  // 2. Rate limit
  const clientIp = getClientIp(request.headers);
  const rl = await checkRateLimit({
    prefix: 'bootstrap_validate',
    identifier: clientIp,
    maxRequests: 5,
    windowSeconds: 900,
    failClosed: true,
  });
  if (!rl.allowed) {
    return jsonError(
      'RATE_LIMIT_EXCEEDED',
      'Too many bootstrap validation attempts. Please try again later.',
      429,
    );
  }

  // 3. Schema validation
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError('INVALID_REQUEST', 'Invalid JSON payload', 400);
  }

  const parsed = bootstrapValidateSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError('VALIDATION_ERROR', 'Bootstrap token is required', 400, parsed.error.issues);
  }

  // 4. Ensure no existing OWNER
  const existingOwner = await prisma.user.findFirst({
    where: { role: 'OWNER', status: { not: 'DELETED' } },
  });
  if (existingOwner) {
    return jsonError(
      'BOOTSTRAP_DISABLED',
      'An OWNER account already exists. Bootstrap is disabled.',
      403,
    );
  }

  // 5. Query valid unconsumed bootstrap token
  const keys = getServerKeys();
  const tokenHash = deriveTokenDigest(
    parsed.data.token.trim(),
    'owner_bootstrap',
    keys.authTokenHmacKey,
  );

  const tokenRecord = await prisma.emailToken.findFirst({
    where: {
      tokenHash,
      purpose: 'OWNER_BOOTSTRAP',
      deliveryChannel: 'TERMINAL',
      usedAt: null,
      expiresAt: { gt: new Date() },
    },
  });

  if (!tokenRecord) {
    return jsonError('INVALID_TOKEN', 'The bootstrap token is invalid or has expired', 400);
  }

  // 6. Generate fresh TOTP secret & enrollment ticket
  const totpSecret = generateTotpSecret();
  const ticketId = generateRandomToken(32);
  const ticketDigest = deriveTokenDigest(ticketId, 'bootstrap_ticket', keys.authTokenHmacKey);
  const redisKey = `bootstrap:ticket:${ticketDigest}`;

  // Store encrypted ticket payload in Redis
  const ticketPayload = JSON.stringify({
    rawToken: parsed.data.token.trim(),
    totpSecret,
    createdAt: Date.now(),
    attempts: 0,
  });

  const encryptedTicket = encryptTotpSecret(ticketPayload, keys.totpAesKey, 'bootstrap:ticket');
  const redis = getRedisCacheClient();
  await redis.set(redisKey, encryptedTicket, 'EX', 900); // 15 minutes TTL

  const totpUri = generateTotpUri({
    secret: totpSecret,
    account: 'owner@javaverse.local',
    issuer: 'JavaVerse',
  });

  return jsonOk({
    ticketId,
    totpSecret,
    totpUri,
  });
}
