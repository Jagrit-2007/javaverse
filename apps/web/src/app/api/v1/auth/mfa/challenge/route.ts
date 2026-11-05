import { NextRequest } from 'next/server';
import { prisma } from '@javaverse/db';
import { mfaChallengeSchema } from '@javaverse/schemas';
import { decryptTotpSecret, validateTotpCode } from '@javaverse/security';
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
    prefix: 'mfa_challenge',
    identifier: clientIp,
    maxRequests: 5,
    windowSeconds: 300,
    failClosed: true,
  });
  if (!rl.allowed) {
    return jsonError('RATE_LIMIT_EXCEEDED', 'Too many MFA attempts. Please try again later.', 429);
  }

  // 3. Schema validation
  let body: { code?: string; ticketId?: string } = {};
  try {
    body = await request.json();
  } catch {
    return jsonError('INVALID_REQUEST', 'Invalid JSON payload', 400);
  }

  const parsed = mfaChallengeSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError('VALIDATION_ERROR', 'Invalid TOTP code format', 400, parsed.error.issues);
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

  // 5. Query user & MFA secret
  const user = await prisma.user.findUnique({
    where: { id: mfaSession.userId },
    include: { mfaTotp: true },
  });

  if (!user || !user.mfaTotp || user.status !== 'ACTIVE') {
    return jsonError('INVALID_USER', 'User account unavailable or MFA not configured', 401);
  }

  const keys = getServerKeys();
  let totpSecret: string;
  try {
    totpSecret = decryptTotpSecret(user.mfaTotp.secretCiphertext, keys.totpAesKey, user.id);
  } catch {
    return jsonError('DECRYPTION_FAILED', 'Failed to decrypt MFA secret', 500);
  }

  // 6. Verify TOTP code with replay check
  const verification = validateTotpCode({
    secret: totpSecret,
    token: parsed.data.code,
    lastUsedTimestep: user.mfaTotp.lastUsedTimestep,
    window: 1,
  });

  if (!verification.valid || verification.timestep === null) {
    await recordAuditEvent({
      action: 'auth.mfa_failed',
      actorType: 'USER',
      actorUserId: user.id,
      actorRoleAtTime: user.role,
      targetUserId: user.id,
      clientIp,
      metadata: { reason: 'invalid_totp_code' },
    });
    return jsonError(
      'INVALID_TOTP',
      'Invalid TOTP code. Please check your authenticator app.',
      401,
    );
  }

  // 7. Update lastUsedTimestep to prevent replay attack
  await prisma.mfaTotp.update({
    where: { userId: user.id },
    data: { lastUsedTimestep: BigInt(verification.timestep) },
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
    action: 'auth.mfa_success',
    actorType: 'USER',
    actorUserId: user.id,
    actorRoleAtTime: user.role,
    targetUserId: user.id,
    clientIp,
  });

  const response = jsonOk({
    user: {
      id: user.id,
      email: user.email,
      role: user.role,
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
