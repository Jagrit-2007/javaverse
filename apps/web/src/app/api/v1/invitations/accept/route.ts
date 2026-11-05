import { NextRequest } from 'next/server';
import { prisma } from '@javaverse/db';
import { acceptInvitationSchema } from '@javaverse/schemas';
import { deriveTokenDigest, hashPassword, checkPasswordBreach } from '@javaverse/security';
import { getServerKeys } from '@/lib/keys';
import { validateCsrf } from '@/lib/csrf';
import { checkRateLimit, getClientIp } from '@/lib/rateLimiter';
import {
  generateSessionTokens,
  buildCookieHeader,
  SESSION_COOKIE_NAME,
  SESSION_MAX_AGE_SECONDS,
  getSafeDisplayName,
} from '@/lib/auth';
import { recordAuditEvent } from '@/lib/audit';
import { jsonOk, jsonError } from '@/lib/apiResponse';
import { env } from '@/env';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const csrfResult = validateCsrf(request, { flow: 'invite' });
  if (!csrfResult.valid) {
    return jsonError('CSRF_ERROR', csrfResult.reason || 'Invalid CSRF token', 403);
  }

  const clientIp = getClientIp(request.headers);
  const rl = await checkRateLimit({
    prefix: 'invitation_accept_ip',
    identifier: clientIp,
    maxRequests: 5,
    windowSeconds: 900,
    failClosed: true,
  });
  if (!rl.allowed) {
    return jsonError('RATE_LIMIT_EXCEEDED', 'Too many attempts. Please try again later.', 429);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError('INVALID_REQUEST', 'Invalid JSON payload', 400);
  }

  const parsed = acceptInvitationSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError('VALIDATION_ERROR', 'Invalid acceptance parameters', 400, parsed.error.issues);
  }

  const { token, password, displayName } = parsed.data;

  // Breach check on password
  const breach = await checkPasswordBreach(password, env.HIBP_ENFORCEMENT_MODE);
  if (breach.breached) {
    return jsonError(
      'PASSWORD_BREACHED',
      'This password appears in known security breaches. Please choose a different password.',
      400,
    );
  }

  const keys = getServerKeys();
  const tokenHash = deriveTokenDigest(token.trim(), 'invitation', keys.authTokenHmacKey);
  const now = new Date();
  const passwordHash = await hashPassword(password);
  const { rawToken, tokenDigest, publicId } = generateSessionTokens();
  const sessionExpiresAt = new Date(now.getTime() + SESSION_MAX_AGE_SECONDS * 1000);

  let newUser: { id: string; email: string; role: string; displayName: string | null };

  try {
    newUser = await prisma.$transaction(async (tx) => {
      // 1. Find and validate invitation
      const invitation = await tx.invitation.findFirst({
        where: {
          tokenHash,
          status: 'PENDING',
          expiresAt: { gt: now },
        },
      });

      if (!invitation) {
        throw new Error('INVALID_INVITATION');
      }

      // 2. Recheck active seat capacity inside transaction
      const activeUsers = await tx.user.count({
        where: { status: { not: 'DELETED' } },
      });
      if (activeUsers >= env.MAX_USERS) {
        throw new Error('SEAT_LIMIT_REACHED');
      }

      // 3. Ensure email is not already taken
      const existingUser = await tx.user.findUnique({
        where: { email: invitation.emailNormalized },
      });
      if (existingUser && existingUser.status !== 'DELETED') {
        throw new Error('USER_EXISTS');
      }

      // 4. Mark invitation accepted
      await tx.invitation.update({
        where: { id: invitation.id },
        data: { status: 'ACCEPTED' },
      });

      // 5. Create MEMBER user (Mandatory Correction 12: Invitation acceptance marks MEMBER email verified)
      const user = await tx.user.create({
        data: {
          email: invitation.emailNormalized,
          passwordHash,
          role: 'MEMBER',
          status: 'ACTIVE',
          displayName: displayName || null,
          emailVerifiedAt: now, // Verified via token inbox possession proof
        },
      });

      // 6. Create initial session row
      await tx.session.create({
        data: {
          id: tokenDigest,
          publicId,
          userId: user.id,
          createdAt: now,
          lastSeenAt: now,
          expiresAt: sessionExpiresAt,
          reauthAt: now,
          mfaVerifiedAt: null,
        },
      });

      // 7. Audit log
      await recordAuditEvent({
        action: 'auth.invitation_accepted',
        actorType: 'USER',
        actorUserId: user.id,
        actorRoleAtTime: 'MEMBER',
        targetUserId: user.id,
        clientIp,
        metadata: { invitation_id: invitation.id },
        tx,
      });

      return {
        id: user.id,
        email: user.email,
        role: user.role,
        displayName: user.displayName,
      };
    });
  } catch (err) {
    const msg = (err as Error).message;
    if (msg === 'INVALID_INVITATION') {
      return jsonError('INVALID_INVITATION', 'The invitation link is invalid or has expired', 400);
    }
    if (msg === 'SEAT_LIMIT_REACHED') {
      return jsonError('SEAT_LIMIT_REACHED', 'Workspace seat limit has been reached', 409);
    }
    if (msg === 'USER_EXISTS') {
      return jsonError('USER_EXISTS', 'A user with this email address already exists', 409);
    }
    return jsonError('ACCEPTANCE_FAILED', 'Failed to accept invitation. Please try again.', 500);
  }

  const response = jsonOk({
    user: {
      id: newUser.id,
      email: newUser.email,
      role: newUser.role,
      displayName: getSafeDisplayName(newUser),
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
