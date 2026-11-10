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

export async function POST(request: NextRequest) {
  const sessionCtx = await getSessionFromRequest(request);
  if (!sessionCtx) {
    return jsonError('UNAUTHORIZED', 'Authentication required', 401);
  }

  const csrfResult = validateCsrf(request, { sessionId: sessionCtx.session.publicId });
  if (!csrfResult.valid) {
    return jsonError('CSRF_ERROR', csrfResult.reason || 'Invalid CSRF token', 403);
  }

  // Require recent reauthentication
  if (!isReauthenticated(sessionCtx.session)) {
    return jsonError(
      'REAUTH_REQUIRED',
      'Recent reauthentication is required to terminate all sessions',
      403,
    );
  }

  await prisma.session.updateMany({
    where: {
      userId: sessionCtx.user.id,
      revokedAt: null,
    },
    data: { revokedAt: new Date() },
  });

  await recordAuditEvent({
    action: 'auth.logout_all',
    actorType: 'USER',
    actorUserId: sessionCtx.user.id,
    targetUserId: sessionCtx.user.id,
  });

  const response = jsonOk({ success: true });
  response.headers.set('Set-Cookie', buildDeleteCookieHeader(SESSION_COOKIE_NAME));
  return response;
}
