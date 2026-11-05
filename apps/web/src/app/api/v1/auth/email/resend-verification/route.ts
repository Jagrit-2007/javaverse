import { NextRequest } from 'next/server';
import { prisma } from '@javaverse/db';
import { validateCsrf } from '@/lib/csrf';
import { getSessionFromRequest, generateSessionTokens } from '@/lib/auth';
import { deriveTokenDigest } from '@javaverse/security';
import { getServerKeys } from '@/lib/keys';
import { sendOwnerVerificationEmail } from '@/lib/email';
import { checkRateLimit, getClientIp } from '@/lib/rateLimiter';
import { jsonOk, jsonError } from '@/lib/apiResponse';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const sessionCtx = await getSessionFromRequest(request);
  if (!sessionCtx) {
    return jsonError('UNAUTHORIZED', 'Authentication required', 401);
  }

  const csrfResult = validateCsrf(request, { sessionId: sessionCtx.session.publicId });
  if (!csrfResult.valid) {
    return jsonError('CSRF_ERROR', csrfResult.reason || 'Invalid CSRF token', 403);
  }

  if (sessionCtx.user.emailVerifiedAt !== null) {
    return jsonOk({ alreadyVerified: true });
  }

  const clientIp = getClientIp(request.headers);
  const rl = await checkRateLimit({
    prefix: 'resend_verification_ip',
    identifier: clientIp,
    maxRequests: 3,
    windowSeconds: 3600,
    failClosed: false, // Non-sensitive action fail-open
  });
  if (!rl.allowed) {
    return jsonError('RATE_LIMIT_EXCEEDED', 'Too many requests. Please try again later.', 429);
  }

  const keys = getServerKeys();
  const rawToken = generateSessionTokens().rawToken;
  const tokenHash = deriveTokenDigest(rawToken, 'email_verification', keys.authTokenHmacKey);

  await prisma.emailToken.updateMany({
    where: {
      subjectUserId: sessionCtx.user.id,
      purpose: 'VERIFY_EMAIL',
      usedAt: null,
    },
    data: { usedAt: new Date() },
  });

  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
  await prisma.emailToken.create({
    data: {
      tokenHash,
      purpose: 'VERIFY_EMAIL',
      deliveryChannel: 'EMAIL',
      subjectUserId: sessionCtx.user.id,
      subjectEmail: sessionCtx.user.email,
      expiresAt,
    },
  });

  sendOwnerVerificationEmail({ email: sessionCtx.user.email, token: rawToken }).catch((err) => {
    console.error('Failed to send verification email:', err);
  });

  return jsonOk({ sent: true });
}
