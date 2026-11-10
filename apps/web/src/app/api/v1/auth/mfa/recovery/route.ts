import { NextRequest } from 'next/server';
import { prisma } from '@javaverse/db';
import { mfaRecoverySchema } from '@javaverse/schemas';
import { hashRecoveryCode } from '@javaverse/security';
import { getServerKeys } from '@/lib/keys';
import { validateCsrf } from '@/lib/csrf';
import { checkRateLimit, getClientIp } from '@/lib/rateLimiter';
import {
  consumeMfaTicket,
  generateSessionTokens,
  createSessionRow,
  buildCookieHeader,
  buildDeleteCookieHeader,
  SESSION_COOKIE_NAME,
  MFA_TICKET_COOKIE_NAME,
  SESSION_MAX_AGE_SECONDS,
  getSafeDisplayName,
} from '@/lib/auth';
import { recordAuditEvent } from '@/lib/audit';
import { jsonOk, jsonError } from '@/lib/apiResponse';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  // 1. CSRF validation
  const csrfResult = validateCsrf(request, { flow: 'mfa' });
  if (!csrfResult.valid) {
    return jsonError('CSRF_ERROR', csrfResult.reason || 'Invalid CSRF token', 403);
  }

  // 2. IP Rate limit
  const clientIp = getClientIp(request.headers);
  const rl = await checkRateLimit({
    prefix: 'mfa_recovery',
    identifier: clientIp,
    maxRequests: 3,
    windowSeconds: 900,
    failClosed: true,
  });
  if (!rl.allowed) {
    return jsonError(
      'RATE_LIMIT_EXCEEDED',
      'Too many recovery attempts. Please try again later.',
      429,
    );
  }

  // 3. Schema validation
  let body: { recoveryCode?: string; ticketId?: string } = {};
  try {
    body = await request.json();
  } catch {
    return jsonError('INVALID_REQUEST', 'Invalid JSON payload', 400);
  }

  const parsed = mfaRecoverySchema.safeParse(body);
  if (!parsed.success) {
    return jsonError('VALIDATION_ERROR', 'Recovery code is required', 400, parsed.error.issues);
  }

  // 4. Retrieve and consume MFA ticket
  let ticketId = body.ticketId;
  if (!ticketId) {
    const cookie = request.cookies.get(MFA_TICKET_COOKIE_NAME);
    ticketId = cookie?.value;
  }

  if (!ticketId) {
    return jsonError('MISSING_MFA_TICKET', 'MFA session ticket not provided or expired', 401);
  }

  const mfaSession = await consumeMfaTicket(ticketId);
  if (!mfaSession) {
    return jsonError('INVALID_MFA_TICKET', 'MFA session has expired. Please sign in again.', 401);
  }

  // 5. Query user
  const user = await prisma.user.findUnique({
    where: { id: mfaSession.userId },
  });

  if (!user || user.status !== 'ACTIVE') {
    return jsonError('INVALID_USER', 'User account unavailable', 401);
  }

  // 6. Verify recovery code
  const keys = getServerKeys();
  const codeHash = hashRecoveryCode(parsed.data.recoveryCode, keys.authTokenHmacKey);

  const matchedRecoveryCode = await prisma.recoveryCode.findFirst({
    where: {
      userId: user.id,
      codeHash,
      usedAt: null,
    },
  });

  if (!matchedRecoveryCode) {
    await recordAuditEvent({
      action: 'auth.mfa_recovery_failed',
      actorType: 'USER',
      actorUserId: user.id,
      targetUserId: user.id,
      clientIp,
      metadata: { reason: 'invalid_recovery_code' },
    });
    return jsonError('INVALID_RECOVERY_CODE', 'Invalid or already used recovery code', 401);
  }

  // 7. Atomically mark recovery code as used
  await prisma.recoveryCode.update({
    where: { id: matchedRecoveryCode.id },
    data: { usedAt: new Date() },
  });

  // 8. Issue full 7-day session with isMfaVerified = true
  const { rawToken, tokenDigest, publicId } = generateSessionTokens();
  await createSessionRow({
    userId: user.id,
    tokenDigest,
    publicId,
    isMfaVerified: true,
  });

  await recordAuditEvent({
    action: 'auth.mfa_recovery_success',
    actorType: 'USER',
    actorUserId: user.id,
    targetUserId: user.id,
    clientIp,
  });

  const response = jsonOk({
    user: {
      id: user.id,
      email: user.email,
      displayName: getSafeDisplayName(user),
    },
  });

  const sessionCookie = buildCookieHeader(SESSION_COOKIE_NAME, rawToken, {
    maxAge: SESSION_MAX_AGE_SECONDS,
    path: '/',
    httpOnly: true,
    sameSite: 'lax',
  });
  const deleteMfaCookie = buildDeleteCookieHeader(MFA_TICKET_COOKIE_NAME, '/');

  response.headers.set('Set-Cookie', sessionCookie);
  response.headers.append('Set-Cookie', deleteMfaCookie);

  return response;
}
