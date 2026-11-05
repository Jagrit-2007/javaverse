import { NextRequest } from 'next/server';
import { prisma } from '@javaverse/db';
import { bootstrapFinalizeSchema } from '@javaverse/schemas';
import {
  deriveTokenDigest,
  decryptTotpSecret,
  encryptTotpSecret,
  validateTotpCode,
  generateRecoveryCodes,
  hashPassword,
  checkPasswordBreach,
  canonicalizeEmail,
} from '@javaverse/security';
import { getServerKeys } from '@/lib/keys';
import { getRedisCacheClient } from '@/lib/redis';
import { validateCsrf } from '@/lib/csrf';
import { checkRateLimit, getClientIp } from '@/lib/rateLimiter';
import {
  generateSessionTokens,
  buildCookieHeader,
  SESSION_COOKIE_NAME,
  SESSION_MAX_AGE_SECONDS,
  getSafeDisplayName,
} from '@/lib/auth';
import { recordAuditEvent } from '@/lib/audit';
import { sendOwnerVerificationEmail } from '@/lib/email';
import { jsonOk, jsonError } from '@/lib/apiResponse';
import { env } from '@/env';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  // 1. CSRF validation
  const csrfResult = validateCsrf(request, { flow: 'bootstrap' });
  if (!csrfResult.valid) {
    return jsonError('CSRF_ERROR', csrfResult.reason || 'Invalid CSRF token', 403);
  }

  // 2. IP Rate limit
  const clientIp = getClientIp(request.headers);
  const rl = await checkRateLimit({
    prefix: 'bootstrap_finalize_ip',
    identifier: clientIp,
    maxRequests: 5,
    windowSeconds: 900,
    failClosed: true,
  });
  if (!rl.allowed) {
    return jsonError('RATE_LIMIT_EXCEEDED', 'Too many attempts. Please try again later.', 429);
  }

  // 3. Schema validation
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError('INVALID_REQUEST', 'Invalid JSON payload', 400);
  }

  const parsed = bootstrapFinalizeSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(
      'VALIDATION_ERROR',
      'Invalid registration parameters',
      400,
      parsed.error.issues,
    );
  }

  const { ticketId, email, password, displayName, totpCode } = parsed.data;
  const canonicalEmail = canonicalizeEmail(email);

  // 4. Breach check on password
  const breachResult = await checkPasswordBreach(password, env.HIBP_ENFORCEMENT_MODE);
  if (breachResult.breached) {
    return jsonError(
      'PASSWORD_BREACHED',
      'This password appears in known security breaches. Please choose a different password.',
      400,
    );
  }

  const keys = getServerKeys();
  const ticketDigest = deriveTokenDigest(
    ticketId.trim(),
    'bootstrap_ticket',
    keys.authTokenHmacKey,
  );
  const redisKey = `bootstrap:ticket:${ticketDigest}`;
  const redis = getRedisCacheClient();

  // 5. Read encrypted ticket WITHOUT consuming it (Mandatory Correction 6)
  const encryptedTicket = await redis.get(redisKey);
  if (!encryptedTicket) {
    return jsonError(
      'EXPIRED_TICKET',
      'Enrollment ticket is invalid or expired. Please restart bootstrap.',
      400,
    );
  }

  let ticketData: { rawToken: string; totpSecret: string; attempts: number };
  try {
    const decrypted = decryptTotpSecret(encryptedTicket, keys.totpAesKey, 'bootstrap:ticket');
    ticketData = JSON.parse(decrypted);
  } catch {
    return jsonError('INVALID_TICKET', 'Failed to authenticate ticket payload', 400);
  }

  // Check ticket attempt limit
  if (ticketData.attempts >= 5) {
    await redis.del(redisKey);
    return jsonError(
      'TICKET_EXHAUSTED',
      'Too many invalid TOTP attempts. Enrollment ticket has been invalidated.',
      429,
    );
  }

  // 6. Verify TOTP code against decrypted secret
  const totpVerification = validateTotpCode({
    secret: ticketData.totpSecret,
    token: totpCode,
    window: 1,
  });

  if (!totpVerification.valid || totpVerification.timestep === null) {
    ticketData.attempts += 1;
    const updatedPayload = JSON.stringify(ticketData);
    const reEncrypted = encryptTotpSecret(updatedPayload, keys.totpAesKey, 'bootstrap:ticket');
    const ttl = await redis.ttl(redisKey);
    if (ttl > 0) {
      await redis.set(redisKey, reEncrypted, 'EX', ttl);
    }
    return jsonError(
      'INVALID_TOTP',
      'Invalid TOTP code. Please check your authenticator app.',
      400,
    );
  }

  // 7. Atomically compare-and-delete the ticket (Mandatory Correction 6)
  const compareAndDeleteScript = `
    if redis.call("get", KEYS[1]) == ARGV[1] then
      return redis.call("del", KEYS[1])
    else
      return 0
    end
  `;
  const deleted = await redis.eval(compareAndDeleteScript, 1, redisKey, encryptedTicket);
  if (deleted !== 1) {
    return jsonError(
      'CONCURRENT_CONFLICT',
      'Ticket was already processed or invalidated concurrently',
      409,
    );
  }

  // 8. Hash password
  const passwordHash = await hashPassword(password);

  // 9. Generate raw session token in server memory & recovery codes
  const {
    rawToken: rawSessionToken,
    tokenDigest: sessionDigest,
    publicId: sessionPublicId,
  } = generateSessionTokens();
  const { rawCodes, hashedCodes } = generateRecoveryCodes(keys.authTokenHmacKey, 10);

  const rawBootstrapToken = ticketData.rawToken;
  const bootstrapTokenHash = deriveTokenDigest(
    rawBootstrapToken,
    'owner_bootstrap',
    keys.authTokenHmacKey,
  );
  const now = new Date();
  const sessionExpiresAt = new Date(now.getTime() + SESSION_MAX_AGE_SECONDS * 1000);

  let createdUser: { id: string; email: string; role: string; displayName: string | null };

  // 10. Execute atomic database transaction (Mandatory Correction 5, 7, 10)
  try {
    createdUser = await prisma.$transaction(async (tx) => {
      // a. Atomically consume bootstrap token with UPDATE ... RETURNING (Mandatory Correction 7)
      const consumedTokens = await tx.$queryRaw<{ id: string }[]>`
        UPDATE "email_tokens"
        SET "used_at" = ${now}
        WHERE "token_hash" = ${bootstrapTokenHash}
          AND "purpose" = 'OWNER_BOOTSTRAP'
          AND "delivery_channel" = 'TERMINAL'
          AND "used_at" IS NULL
          AND "expires_at" > ${now}
        RETURNING "id"
      `;

      if (!consumedTokens || consumedTokens.length !== 1) {
        throw new Error('Bootstrap token already consumed or expired');
      }

      // b. Verify zero non-deleted owners
      const existingOwnerCount = await tx.user.count({
        where: {
          role: 'OWNER',
          status: { not: 'DELETED' },
        },
      });
      if (existingOwnerCount > 0) {
        throw new Error('An OWNER already exists');
      }

      // c. Create OWNER user (email unverified until VERIFY_EMAIL succeeds, Mandatory Correction 11)
      const user = await tx.user.create({
        data: {
          email: canonicalEmail,
          passwordHash,
          role: 'OWNER',
          status: 'ACTIVE',
          displayName: displayName || null,
          emailVerifiedAt: null,
        },
      });

      // d. Store encrypted TOTP secret & verified timestep in mfa_totp
      const encryptedSecret = encryptTotpSecret(ticketData.totpSecret, keys.totpAesKey, user.id);
      await tx.mfaTotp.create({
        data: {
          userId: user.id,
          secretCiphertext: encryptedSecret,
          lastUsedTimestep: BigInt(totpVerification.timestep!),
        },
      });

      // e. Store recovery code digests
      for (const codeHash of hashedCodes) {
        await tx.recoveryCode.create({
          data: {
            userId: user.id,
            codeHash,
          },
        });
      }

      // f. Create session row (Mandatory Correction 1, 5)
      await tx.session.create({
        data: {
          id: sessionDigest,
          publicId: sessionPublicId,
          userId: user.id,
          createdAt: now,
          lastSeenAt: now,
          expiresAt: sessionExpiresAt,
          reauthAt: now,
          mfaVerifiedAt: now,
        },
      });

      // g. Write audit events inside transaction
      await recordAuditEvent({
        action: 'auth.owner_bootstrapped',
        actorType: 'USER',
        actorUserId: user.id,
        actorRoleAtTime: 'OWNER',
        targetUserId: user.id,
        clientIp,
        metadata: { delivery_channel: 'TERMINAL' },
        tx,
      });

      return {
        id: user.id,
        email: user.email,
        role: user.role,
        displayName: user.displayName,
      };
    });
  } catch (err) {
    // If transaction fails, no session cookie or raw recovery code may be returned (Mandatory Correction 5)
    return jsonError('BOOTSTRAP_TRANSACTION_FAILED', (err as Error).message, 409);
  }

  // 11. Create email verification token and send verification email
  try {
    const rawVerifyToken = generateSessionTokens().rawToken;
    const verifyDigest = deriveTokenDigest(
      rawVerifyToken,
      'email_verification',
      keys.authTokenHmacKey,
    );
    await prisma.emailToken.create({
      data: {
        tokenHash: verifyDigest,
        purpose: 'VERIFY_EMAIL',
        deliveryChannel: 'EMAIL',
        subjectUserId: createdUser.id,
        subjectEmail: createdUser.email,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
      },
    });
    // Async email delivery
    sendOwnerVerificationEmail({ email: createdUser.email, token: rawVerifyToken }).catch((err) => {
      console.error('Failed to send verification email:', err);
    });
  } catch (err) {
    console.error('Failed to create verification token:', err);
  }

  // 12. Only now set the session cookie and return raw recovery codes exactly once (Mandatory Correction 5)
  const response = jsonOk({
    recoveryCodes: rawCodes,
    user: {
      id: createdUser.id,
      email: createdUser.email,
      role: createdUser.role,
      displayName: getSafeDisplayName(createdUser),
    },
  });

  const sessionCookie = buildCookieHeader(SESSION_COOKIE_NAME, rawSessionToken, {
    maxAge: SESSION_MAX_AGE_SECONDS,
    path: '/',
    httpOnly: true,
    sameSite: 'lax',
  });
  response.headers.set('Set-Cookie', sessionCookie);

  return response;
}
