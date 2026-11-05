import { NextRequest } from 'next/server';
import { prisma } from '@javaverse/db';
import { validateCsrf } from '@/lib/csrf';
import {
  getSessionFromRequest,
  isReauthenticated,
  buildDeleteCookieHeader,
  SESSION_COOKIE_NAME,
} from '@/lib/auth';
import { recordAuditEvent } from '@/lib/audit';
import { jsonOk, jsonError } from '@/lib/apiResponse';

export const dynamic = 'force-dynamic';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ publicId: string }> },
) {
  const sessionCtx = await getSessionFromRequest(request);
  if (!sessionCtx) {
    return jsonError('UNAUTHORIZED', 'Authentication required', 401);
  }

  const { publicId } = await params;
  if (!publicId) {
    return jsonError('INVALID_REQUEST', 'Session public ID is required', 400);
  }

  const csrfResult = validateCsrf(request, { sessionId: sessionCtx.session.publicId });
  if (!csrfResult.valid) {
    return jsonError('CSRF_ERROR', csrfResult.reason || 'Invalid CSRF token', 403);
  }

  // Mandatory Correction 16: Revoking current session behaves as logout
  if (publicId === sessionCtx.session.publicId) {
    await prisma.session.update({
      where: { id: sessionCtx.session.id },
      data: { revokedAt: new Date() },
    });

    await recordAuditEvent({
      action: 'auth.logout',
      actorType: 'USER',
      actorUserId: sessionCtx.user.id,
      actorRoleAtTime: sessionCtx.user.role,
      targetUserId: sessionCtx.user.id,
    });

    const response = jsonOk({ revoked: true, isCurrent: true });
    response.headers.set('Set-Cookie', buildDeleteCookieHeader(SESSION_COOKIE_NAME));
    return response;
  }

  // Mandatory Correction 16: Revoking another session requires recent reauthentication
  if (!isReauthenticated(sessionCtx.session)) {
    return jsonError(
      'REAUTH_REQUIRED',
      'Recent reauthentication is required to revoke another session',
      403,
    );
  }

  const result = await prisma.session.updateMany({
    where: {
      publicId,
      userId: sessionCtx.user.id,
      revokedAt: null,
    },
    data: { revokedAt: new Date() },
  });

  if (result.count === 0) {
    return jsonError('SESSION_NOT_FOUND', 'Session not found or already revoked', 404);
  }

  await recordAuditEvent({
    action: 'auth.session_revoked',
    actorType: 'USER',
    actorUserId: sessionCtx.user.id,
    actorRoleAtTime: sessionCtx.user.role,
    targetUserId: sessionCtx.user.id,
    metadata: { revoked_session_public_id: publicId },
  });

  return jsonOk({ revoked: true, isCurrent: false });
}
