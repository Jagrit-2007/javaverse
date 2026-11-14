import { NextRequest } from 'next/server';
import { prisma } from '@javaverse/db';
import { forgotPasswordSchema } from '@javaverse/schemas';
import {
  canonicalizeEmail,
  generateRandomToken,
  deriveTokenDigest,
  verifyDummyPassword,
} from '@javaverse/security';
import { getServerKeys } from '@/lib/keys';
import { validateCsrf } from '@/lib/csrf';
import { checkRateLimit, getClientIp } from '@/lib/rateLimiter';
import { sendPasswordResetEmail } from '@/lib/email';
import { recordAuditEvent } from '@/lib/audit';
import { jsonOk, jsonError } from '@/lib/apiResponse';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const csrfResult = validateCsrf(request, { flow: 'forgot_password' });
  if (!csrfResult.valid) {
    return jsonError('CSRF_ERROR', csrfResult.reason || 'Invalid CSRF token', 403);
  }

  const clientIp = getClientIp(request.headers);
  const rl = await checkRateLimit({
    prefix: 'forgot_password_ip',
    identifier: clientIp,
    maxRequests: 3,
    windowSeconds: 3600,
    failClosed: true,
  });
  if (!rl.allowed) {
    return jsonError(
      'RATE_LIMIT_EXCEEDED',
      'Too many password reset requests. Please try again later.',
      429,
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError('INVALID_REQUEST', 'Invalid JSON payload', 400);
  }

  const parsed = forgotPasswordSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(
      'VALIDATION_ERROR',
      'Valid email address is required',
      400,
      parsed.error.issues,
    );
  }

  const canonicalEmail = canonicalizeEmail(parsed.data.email);
  const user = await prisma.user.findUnique({
    where: { email: canonicalEmail },
  });

  if (user && user.status === 'ACTIVE') {
    const keys = getServerKeys();
    const rawToken = generateRandomToken(32);
    const tokenHash = deriveTokenDigest(rawToken, 'password_reset', keys.authTokenHmacKey);

    // Invalidate prior reset tokens
    await prisma.emailToken.updateMany({
      where: {
        subjectUserId: user.id,
        purpose: 'RESET_PASSWORD',
        usedAt: null,
      },
      data: { usedAt: new Date() },
    });

    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    await prisma.emailToken.create({
      data: {
        tokenHash,
        deliveryChannel: 'EMAIL',
        purpose: 'RESET_PASSWORD',
        subjectUserId: user.id,
        subjectEmail: user.email,
        expiresAt,
      },
    });

    sendPasswordResetEmail({ email: user.email, token: rawToken }).catch((err) => {
      console.error('Failed to send password reset email:', err);
    });

    await recordAuditEvent({
      action: 'auth.password_reset_requested',
      actorType: 'USER',
      actorUserId: user.id,
      targetUserId: user.id,
      clientIp,
    });
  } else {
    // Constant-time operation to prevent enumeration
    await verifyDummyPassword('dummy-password-value');
  }

  return jsonOk({
    message: 'If an account exists with this email, a password reset link has been sent.',
  });
}
