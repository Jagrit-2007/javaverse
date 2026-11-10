import { NextRequest } from 'next/server';
import { prisma } from '@javaverse/db';
import { validateCsrf } from '@/lib/csrf';
import { getSessionFromRequest, buildDeleteCookieHeader, SESSION_COOKIE_NAME } from '@/lib/auth';
import { recordAuditEvent } from '@/lib/audit';
import { jsonOk, jsonError } from '@/lib/apiResponse';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const sessionCtx = await getSessionFromRequest(request);

  if (sessionCtx?.session) {
    const csrfResult = validateCsrf(request, { sessionId: sessionCtx.session.publicId });
    if (!csrfResult.valid) {
      return jsonError('CSRF_ERROR', csrfResult.reason || 'Invalid CSRF token', 403);
    }

    await prisma.session.update({
      where: { id: sessionCtx.session.id },
      data: { revokedAt: new Date() },
    });

    await recordAuditEvent({
      action: 'auth.logout',
      actorType: 'USER',
      actorUserId: sessionCtx.user.id,
      targetUserId: sessionCtx.user.id,
    });
  }

  const response = jsonOk({ success: true });
  response.headers.set('Set-Cookie', buildDeleteCookieHeader(SESSION_COOKIE_NAME));
  return response;
}
