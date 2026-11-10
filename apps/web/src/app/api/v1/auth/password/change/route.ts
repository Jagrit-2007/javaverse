import { NextRequest } from 'next/server';
import { prisma } from '@javaverse/db';
import { changePasswordSchema } from '@javaverse/schemas';
import { verifyPassword, hashPassword, checkPasswordBreach } from '@javaverse/security';
import { validateCsrf } from '@/lib/csrf';
import { getSessionFromRequest, isReauthenticated } from '@/lib/auth';
import { recordAuditEvent } from '@/lib/audit';
import { jsonOk, jsonError } from '@/lib/apiResponse';
import { env } from '@/env';

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

  if (!isReauthenticated(sessionCtx.session)) {
    return jsonError(
      'REAUTH_REQUIRED',
      'Recent reauthentication is required to change password',
      403,
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError('INVALID_REQUEST', 'Invalid JSON payload', 400);
  }

  const parsed = changePasswordSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError('VALIDATION_ERROR', 'Invalid password parameters', 400, parsed.error.issues);
  }

  const { currentPassword, newPassword } = parsed.data;

  if (!sessionCtx.user.passwordHash) {
    return jsonError('INVALID_STATE', 'Password not configured for this account', 400);
  }

  const currentValid = await verifyPassword(currentPassword, sessionCtx.user.passwordHash);
  if (!currentValid) {
    return jsonError('INVALID_CREDENTIALS', 'Incorrect current password', 400);
  }

  // Breach check on new password
  const breach = await checkPasswordBreach(newPassword, env.HIBP_ENFORCEMENT_MODE);
  if (breach.breached) {
    return jsonError(
      'PASSWORD_BREACHED',
      'This password appears in known security breaches. Please choose a different password.',
      400,
    );
  }

  const newHash = await hashPassword(newPassword);
  const now = new Date();

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: sessionCtx.user.id },
      data: { passwordHash: newHash },
    });

    // Revoke all other sessions except current
    await tx.session.updateMany({
      where: {
        userId: sessionCtx.user.id,
        id: { not: sessionCtx.session.id },
        revokedAt: null,
      },
      data: { revokedAt: now },
    });

    await recordAuditEvent({
      action: 'auth.password_changed',
      actorType: 'USER',
      actorUserId: sessionCtx.user.id,
      targetUserId: sessionCtx.user.id,
      tx,
    });
  });

  return jsonOk({ success: true });
}
