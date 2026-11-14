import { NextRequest } from 'next/server';
import { prisma } from '@javaverse/db';
import { resetPasswordSchema } from '@javaverse/schemas';
import { deriveTokenDigest, hashPassword, checkPasswordBreach } from '@javaverse/security';
import { getServerKeys } from '@/lib/keys';
import { validateCsrf } from '@/lib/csrf';
import { checkRateLimit, getClientIp } from '@/lib/rateLimiter';
import { recordAuditEvent } from '@/lib/audit';
import { jsonOk, jsonError } from '@/lib/apiResponse';
import { env } from '@/env';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const csrfResult = validateCsrf(request, { flow: 'reset_password' });
  if (!csrfResult.valid) {
    return jsonError('CSRF_ERROR', csrfResult.reason || 'Invalid CSRF token', 403);
  }

  const clientIp = getClientIp(request.headers);
  const rl = await checkRateLimit({
    prefix: 'reset_password_ip',
    identifier: clientIp,
    maxRequests: 5,
    windowSeconds: 900,
    failClosed: true,
  });
  if (!rl.allowed) {
    return jsonError(
      'RATE_LIMIT_EXCEEDED',
      'Too many password reset attempts. Please try again later.',
      429,
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError('INVALID_REQUEST', 'Invalid JSON payload', 400);
  }

  const parsed = resetPasswordSchema.safeParse(body);
  if (!parsed.success) {
    const primaryError = parsed.error.issues[0]?.message || 'Invalid reset parameters';
    return jsonError('VALIDATION_ERROR', primaryError, 400, parsed.error.issues);
  }

  const { token, password } = parsed.data;

  // Breach check
  const breach = await checkPasswordBreach(password, env.HIBP_ENFORCEMENT_MODE);
  if (breach.common) {
    return jsonError(
      'PASSWORD_COMMON',
      breach.message || 'This password is too common. Choose a longer, less predictable password.',
      400,
    );
  }
  if (breach.breached) {
    return jsonError(
      'PASSWORD_BREACHED',
      breach.message ||
        'This password appears in a known breach list. Choose a different password or use a password manager to generate one.',
      400,
    );
  }
  if (breach.degraded) {
    await recordAuditEvent({
      action: 'auth.breach_check_degraded',
      actorType: 'SYSTEM',
      anonymousId: clientIp,
      clientIp,
      metadata: { provider: 'hibp', reason: 'unavailable', degraded: true },
    });
  }

  const keys = getServerKeys();
  const tokenHash = deriveTokenDigest(token.trim(), 'password_reset', keys.authTokenHmacKey);
  const now = new Date();

  // Atomically consume token
  const tokenRecord = await prisma.emailToken.findFirst({
    where: {
      tokenHash,
      purpose: 'RESET_PASSWORD',
      usedAt: null,
      expiresAt: { gt: now },
    },
  });

  if (!tokenRecord || !tokenRecord.subjectUserId) {
    return jsonError('INVALID_TOKEN', 'The password reset link is invalid or has expired', 400);
  }

  const passwordHash = await hashPassword(password);

  // Update token, user password, and revoke all active sessions in transaction
  await prisma.$transaction(async (tx) => {
    await tx.emailToken.update({
      where: { id: tokenRecord.id },
      data: { usedAt: now },
    });

    await tx.user.update({
      where: { id: tokenRecord.subjectUserId! },
      data: { passwordHash },
    });

    // Revoke all existing sessions
    await tx.session.updateMany({
      where: {
        userId: tokenRecord.subjectUserId!,
        revokedAt: null,
      },
      data: { revokedAt: now },
    });

    await recordAuditEvent({
      action: 'auth.password_reset_completed',
      actorType: 'USER',
      actorUserId: tokenRecord.subjectUserId,
      targetUserId: tokenRecord.subjectUserId,
      clientIp,
      tx,
    });
  });

  return jsonOk({ success: true });
}
