import { NextRequest } from 'next/server';
import { prisma } from '@javaverse/db';
import { reauthSchema } from '@javaverse/schemas';
import { verifyPassword } from '@javaverse/security';
import { validateCsrf } from '@/lib/csrf';
import { getSessionFromRequest } from '@/lib/auth';
import { recordAuditEvent } from '@/lib/audit';
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

  const clientIp = getClientIp(request.headers);
  const rl = await checkRateLimit({
    prefix: 'reauth_ip',
    identifier: clientIp,
    maxRequests: 5,
    windowSeconds: 300,
    failClosed: true,
  });
  if (!rl.allowed) {
    return jsonError(
      'RATE_LIMIT_EXCEEDED',
      'Too many reauthentication attempts. Please try again later.',
      429,
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError('INVALID_REQUEST', 'Invalid JSON payload', 400);
  }

  const parsed = reauthSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError('VALIDATION_ERROR', 'Password is required', 400, parsed.error.issues);
  }

  if (!sessionCtx.user.passwordHash) {
    return jsonError(
      'INVALID_STATE',
      'Password authentication is not configured for this account',
      400,
    );
  }

  const valid = await verifyPassword(parsed.data.password, sessionCtx.user.passwordHash);
  if (!valid) {
    await recordAuditEvent({
      action: 'auth.reauth_failed',
      actorType: 'USER',
      actorUserId: sessionCtx.user.id,
      actorRoleAtTime: sessionCtx.user.role,
      targetUserId: sessionCtx.user.id,
      clientIp,
    });
    return jsonError('INVALID_CREDENTIALS', 'Incorrect password', 401);
  }

  await prisma.session.update({
    where: { id: sessionCtx.session.id },
    data: { reauthAt: new Date() },
  });

  await recordAuditEvent({
    action: 'auth.reauth_success',
    actorType: 'USER',
    actorUserId: sessionCtx.user.id,
    actorRoleAtTime: sessionCtx.user.role,
    targetUserId: sessionCtx.user.id,
    clientIp,
  });

  return jsonOk({ reauthenticated: true });
}
