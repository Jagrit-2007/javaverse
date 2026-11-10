import { NextRequest } from 'next/server';
import { prisma } from '@javaverse/db';
import { signupSchema } from '@javaverse/schemas';
import { canonicalizeEmail, hashPassword, checkPasswordBreach } from '@javaverse/security';
import { validateCsrf } from '@/lib/csrf';
import { checkRateLimit, getClientIp } from '@/lib/rateLimiter';
import {
  LOCAL_ACCOUNT_LIMIT,
  ACCOUNT_CREATION_ADVISORY_LOCK_ID,
  generateSessionTokens,
  createSessionRow,
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
  // 1. CSRF validation
  const csrfResult = validateCsrf(request, { flow: 'signup' });
  if (!csrfResult.valid) {
    return jsonError('CSRF_ERROR', csrfResult.reason || 'Invalid CSRF token', 403);
  }

  // 2. IP Rate limit
  const clientIp = getClientIp(request.headers);
  const ipRl = await checkRateLimit({
    prefix: 'signup_ip',
    identifier: clientIp,
    maxRequests: 10,
    windowSeconds: 900,
    failClosed: true,
  });
  if (!ipRl.allowed) {
    return jsonError(
      'RATE_LIMIT_EXCEEDED',
      'Too many registration attempts. Please try again later.',
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

  const parsed = signupSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(
      'VALIDATION_ERROR',
      parsed.error.issues[0]?.message || 'Invalid registration parameters',
      400,
      parsed.error.issues,
    );
  }

  const { displayName, email, password } = parsed.data;
  const canonicalEmail = canonicalizeEmail(email);

  // 4. Account/Email Rate limit
  const acctRl = await checkRateLimit({
    prefix: 'signup_account',
    identifier: canonicalEmail,
    maxRequests: 5,
    windowSeconds: 900,
    failClosed: true,
  });
  if (!acctRl.allowed) {
    return jsonError(
      'RATE_LIMIT_EXCEEDED',
      'Too many registration attempts for this email address. Please try again later.',
      429,
    );
  }

  // 5. Password breach check
  const breach = await checkPasswordBreach(password, env.HIBP_ENFORCEMENT_MODE);
  if (breach.breached) {
    return jsonError(
      'PASSWORD_BREACHED',
      'This password appears in known security breaches. Please choose a different password.',
      400,
    );
  }

  // 6. Hash password
  const passwordHash = await hashPassword(password);
  const { rawToken, tokenDigest, publicId } = generateSessionTokens();

  let createdUser: { id: string; email: string; displayName: string | null };

  // 7. Atomic transaction with PostgreSQL advisory lock for serialized concurrency protection
  try {
    createdUser = await prisma.$transaction(async (tx) => {
      // a. Acquire transaction-scoped advisory lock
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(${ACCOUNT_CREATION_ADVISORY_LOCK_ID})`;

      // b. Check active local account limit
      const activeCount = await tx.user.count({
        where: { status: { not: 'DELETED' } },
      });
      if (activeCount >= LOCAL_ACCOUNT_LIMIT) {
        throw new Error('ACCOUNT_LIMIT_REACHED');
      }

      // c. Check duplicate normalized email
      const existingUser = await tx.user.findUnique({
        where: { email: canonicalEmail },
      });
      if (existingUser && existingUser.status !== 'DELETED') {
        throw new Error('USER_EXISTS');
      }

      // d. Create new user as standard learner
      const user = await tx.user.create({
        data: {
          email: canonicalEmail,
          passwordHash,
          status: 'ACTIVE',
          displayName: displayName && displayName.trim().length > 0 ? displayName.trim() : null,
          emailVerifiedAt: new Date(),
        },
      });

      // e. Create session row
      await createSessionRow({
        userId: user.id,
        tokenDigest,
        publicId,
        isMfaVerified: false,
        tx,
      });

      // f. Record audit log
      await recordAuditEvent({
        action: 'auth.user_registered',
        actorType: 'USER',
        actorUserId: user.id,
        targetUserId: user.id,
        clientIp,
        tx,
      });

      return {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
      };
    });
  } catch (err) {
    const msg = (err as Error).message;
    if (msg === 'ACCOUNT_LIMIT_REACHED') {
      return jsonError(
        'ACCOUNT_LIMIT_REACHED',
        'This local JavaVerse installation has reached its limit of 5 accounts. Existing users can still sign in.',
        409,
      );
    }
    if (msg === 'USER_EXISTS') {
      return jsonError('USER_EXISTS', 'An account with this email address already exists.', 409);
    }
    return jsonError('REGISTRATION_FAILED', 'Failed to create account. Please try again.', 500);
  }

  // 8. Set session cookie and return safe user response (omit internal role from response)
  const response = jsonOk(
    {
      user: {
        id: createdUser.id,
        email: createdUser.email,
        displayName: getSafeDisplayName(createdUser),
      },
    },
    { status: 201 },
  );

  const sessionCookie = buildCookieHeader(SESSION_COOKIE_NAME, rawToken, {
    maxAge: SESSION_MAX_AGE_SECONDS,
    path: '/',
    httpOnly: true,
    sameSite: 'lax',
  });
  response.headers.set('Set-Cookie', sessionCookie);

  return response;
}
