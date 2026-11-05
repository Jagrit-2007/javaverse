import { NextRequest } from 'next/server';
import { prisma } from '@javaverse/db';
import { verifyEmailSchema } from '@javaverse/schemas';
import { deriveTokenDigest } from '@javaverse/security';
import { getServerKeys } from '@/lib/keys';
import { validateCsrf } from '@/lib/csrf';
import { checkRateLimit, getClientIp } from '@/lib/rateLimiter';
import { recordAuditEvent } from '@/lib/audit';
import { jsonOk, jsonError } from '@/lib/apiResponse';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const csrfResult = validateCsrf(request, { flow: 'verify_email' });
  if (!csrfResult.valid) {
    return jsonError('CSRF_ERROR', csrfResult.reason || 'Invalid CSRF token', 403);
  }

  const clientIp = getClientIp(request.headers);
  const rl = await checkRateLimit({
    prefix: 'verify_email_ip',
    identifier: clientIp,
    maxRequests: 5,
    windowSeconds: 900,
    failClosed: true,
  });
  if (!rl.allowed) {
    return jsonError(
      'RATE_LIMIT_EXCEEDED',
      'Too many verification attempts. Please try again later.',
      429,
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError('INVALID_REQUEST', 'Invalid JSON payload', 400);
  }

  const parsed = verifyEmailSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(
      'VALIDATION_ERROR',
      'Verification token is required',
      400,
      parsed.error.issues,
    );
  }

  const keys = getServerKeys();
  const tokenHash = deriveTokenDigest(
    parsed.data.token.trim(),
    'email_verification',
    keys.authTokenHmacKey,
  );
  const now = new Date();

  const tokenRecord = await prisma.emailToken.findFirst({
    where: {
      tokenHash,
      purpose: 'VERIFY_EMAIL',
      usedAt: null,
      expiresAt: { gt: now },
    },
  });

  if (!tokenRecord || !tokenRecord.subjectUserId) {
    return jsonError('INVALID_TOKEN', 'The email verification link is invalid or has expired', 400);
  }

  await prisma.$transaction(async (tx) => {
    await tx.emailToken.update({
      where: { id: tokenRecord.id },
      data: { usedAt: now },
    });

    await tx.user.update({
      where: { id: tokenRecord.subjectUserId! },
      data: { emailVerifiedAt: now },
    });

    await recordAuditEvent({
      action: 'auth.email_verified',
      actorType: 'USER',
      actorUserId: tokenRecord.subjectUserId,
      targetUserId: tokenRecord.subjectUserId,
      clientIp,
      tx,
    });
  });

  return jsonOk({ verified: true });
}
