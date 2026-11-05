import { NextRequest } from 'next/server';
import { prisma } from '@javaverse/db';
import { loginSchema } from '@javaverse/schemas';
import { verifyPassword, verifyDummyPassword, canonicalizeEmail } from '@javaverse/security';
import { validateCsrf } from '@/lib/csrf';
import { checkRateLimit, getClientIp } from '@/lib/rateLimiter';
import {
  storeMfaTicket,
  generateSessionTokens,
  createSessionRow,
  buildCookieHeader,
  SESSION_COOKIE_NAME,
  MFA_TICKET_COOKIE_NAME,
  SESSION_MAX_AGE_SECONDS,
  MFA_TICKET_TTL_SECONDS,
  getSafeDisplayName,
} from '@/lib/auth';
import { recordAuditEvent } from '@/lib/audit';
import { jsonOk, jsonError } from '@/lib/apiResponse';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  // 1. CSRF validation
  const csrfResult = validateCsrf(request, { flow: 'login' });
  if (!csrfResult.valid) {
    return jsonError('CSRF_ERROR', csrfResult.reason || 'Invalid CSRF token', 403);
  }

  // 2. IP Rate limit
  const clientIp = getClientIp(request.headers);
  const ipRl = await checkRateLimit({
    prefix: 'login_ip',
    identifier: clientIp,
    maxRequests: 10,
    windowSeconds: 900,
    failClosed: true,
  });
  if (!ipRl.allowed) {
    return jsonError(
      'RATE_LIMIT_EXCEEDED',
      'Too many login attempts. Please try again later.',
      429,
    );
  }

  // 3. Schema validation
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError('INVALID_REQUEST', 'Invalid JSON payload', 400);
  }

  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError('VALIDATION_ERROR', 'Invalid login parameters', 400, parsed.error.issues);
  }

  const { email, password } = parsed.data;
  const canonicalEmail = canonicalizeEmail(email);

  // 4. Account Rate limit
  const acctRl = await checkRateLimit({
    prefix: 'login_account',
    identifier: canonicalEmail,
    maxRequests: 5,
    windowSeconds: 900,
    failClosed: true,
  });
  if (!acctRl.allowed) {
    return jsonError(
      'RATE_LIMIT_EXCEEDED',
      'Too many login attempts for this account. Please try again later.',
      429,
    );
  }

  // 5. Query user
  const user = await prisma.user.findUnique({
    where: { email: canonicalEmail },
  });

  // 6. Timing-safe password verification
  let passwordValid = false;
  if (user && user.passwordHash) {
    passwordValid = await verifyPassword(password, user.passwordHash);
  } else {
    // Constant time dummy evaluation to prevent enumeration
    await verifyDummyPassword(password);
  }

  if (!user || !passwordValid || user.status !== 'ACTIVE') {
    await recordAuditEvent({
      action: 'auth.login_failed',
      actorType: 'ANONYMOUS',
      anonymousId: clientIp,
      clientIp,
      metadata: { reason: 'invalid_credentials' },
    });
    return jsonError('INVALID_CREDENTIALS', 'Invalid email or password', 401);
  }

  // 7. Check role: If OWNER, require MFA (Mandatory Correction 15)
  if (user.role === 'OWNER') {
    const ticketId = await storeMfaTicket(user.id);
    const mfaCookie = buildCookieHeader(MFA_TICKET_COOKIE_NAME, ticketId, {
      maxAge: MFA_TICKET_TTL_SECONDS,
      path: '/',
      httpOnly: true,
      sameSite: 'lax',
    });

    const response = jsonOk({
      mfaRequired: true,
      ticketId, // Also provided in payload for headless / mobile clients
    });
    response.headers.set('Set-Cookie', mfaCookie);
    return response;
  }

  // 8. If MEMBER: full session issuance
  const { rawToken, tokenDigest, publicId } = generateSessionTokens();
  await createSessionRow({
    userId: user.id,
    tokenDigest,
    publicId,
    isMfaVerified: false,
  });

  await recordAuditEvent({
    action: 'auth.login_success',
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
  response.headers.set('Set-Cookie', sessionCookie);

  return response;
}
