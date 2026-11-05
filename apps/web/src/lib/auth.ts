import { NextRequest } from 'next/server';
import { prisma, type User, type Session, type Prisma } from '@javaverse/db';
import {
  generateRandomToken,
  deriveTokenDigest,
  encryptTotpSecret,
  decryptTotpSecret,
} from '@javaverse/security';
import { getServerKeys } from './keys';
import { getRedisCacheClient } from './redis';

export const SESSION_COOKIE_NAME =
  process.env.NODE_ENV === 'production' ? '__Host-javaverse_session' : 'javaverse_session';

export const MFA_TICKET_COOKIE_NAME =
  process.env.NODE_ENV === 'production' ? '__Host-javaverse_mfa_ticket' : 'javaverse_mfa_ticket';

export const SESSION_MAX_AGE_SECONDS = 7 * 24 * 60 * 60; // 7 days absolute
export const SESSION_IDLE_TIMEOUT_MS = 24 * 60 * 60 * 1000; // 24 hours idle
export const SESSION_TOUCH_THRESHOLD_MS = 5 * 60 * 1000; // 5 minutes touch interval
export const REAUTH_TIMEOUT_MS = 15 * 60 * 1000; // 15 minutes
export const MFA_TICKET_TTL_SECONDS = 5 * 60; // 5 minutes

export interface SessionContext {
  session: Session;
  user: User;
}

/**
 * Returns generic display name according to Part S rules:
 * - If user has displayName: return it.
 * - Otherwise: generic fallback "Owner" or "Learner".
 * - Never derives display name from email local part.
 */
export function getSafeDisplayName(user: { displayName?: string | null; role: string }): string {
  if (user.displayName && user.displayName.trim().length > 0) {
    return user.displayName.trim();
  }
  return user.role === 'OWNER' ? 'Owner' : 'Learner';
}

/**
 * Formats a Set-Cookie header value with security attributes.
 */
export function buildCookieHeader(
  name: string,
  value: string,
  options: {
    maxAge?: number;
    path?: string;
    httpOnly?: boolean;
    secure?: boolean;
    sameSite?: 'lax' | 'strict' | 'none';
  } = {},
): string {
  const parts: string[] = [`${name}=${value}`];
  const isProd = process.env.NODE_ENV === 'production';
  const path = options.path || '/';
  parts.push(`Path=${path}`);

  if (options.maxAge !== undefined) {
    parts.push(`Max-Age=${options.maxAge}`);
  }

  if (options.httpOnly !== false) {
    parts.push('HttpOnly');
  }

  if (options.secure ?? isProd) {
    parts.push('Secure');
  }

  const sameSite = options.sameSite || 'lax';
  parts.push(`SameSite=${sameSite.charAt(0).toUpperCase() + sameSite.slice(1)}`);

  return parts.join('; ');
}

/**
 * Formats a deletion cookie (Max-Age=0).
 */
export function buildDeleteCookieHeader(name: string, path: string = '/'): string {
  return buildCookieHeader(name, '', { maxAge: 0, path });
}

/**
 * Generates a fresh raw session token, its token digest, and UUID.
 */
export function generateSessionTokens(): {
  rawToken: string;
  tokenDigest: string;
  publicId: string;
} {
  const keys = getServerKeys();
  const rawToken = generateRandomToken(32);
  const tokenDigest = deriveTokenDigest(rawToken, 'session', keys.authTokenHmacKey);
  const publicId = crypto.randomUUID();
  return { rawToken, tokenDigest, publicId };
}

/**
 * Creates a database session row inside or outside an existing transaction.
 */
export async function createSessionRow(params: {
  userId: string;
  tokenDigest: string;
  publicId: string;
  isMfaVerified?: boolean;
  tx?: Prisma.TransactionClient;
}): Promise<Session> {
  const client = params.tx || prisma;
  const now = new Date();
  const expiresAt = new Date(now.getTime() + SESSION_MAX_AGE_SECONDS * 1000);

  return client.session.create({
    data: {
      id: params.tokenDigest,
      userId: params.userId,
      publicId: params.publicId,
      createdAt: now,
      lastSeenAt: now,
      expiresAt,
      reauthAt: now,
      mfaVerifiedAt: params.isMfaVerified ? now : null,
    },
  });
}

/**
 * Extracts raw session token from request cookies.
 */
export function extractSessionCookie(request: NextRequest | Headers): string | null {
  let cookieHeader: string | null = null;
  if ('cookies' in request && typeof request.cookies?.get === 'function') {
    const cookie = request.cookies.get(SESSION_COOKIE_NAME);
    if (cookie?.value) return cookie.value;
  } else if ('get' in request && typeof request.get === 'function') {
    cookieHeader = request.get('cookie');
  }

  if (!cookieHeader) return null;

  const cookies = cookieHeader.split(';').map((c) => c.trim());
  for (const c of cookies) {
    if (c.startsWith(`${SESSION_COOKIE_NAME}=`)) {
      return c.substring(SESSION_COOKIE_NAME.length + 1);
    }
  }

  return null;
}

/**
 * Resolves session and user from raw session token, enforcing idle and absolute expiry.
 */
export async function resolveSession(rawToken: string | null): Promise<SessionContext | null> {
  if (!rawToken || rawToken.trim().length === 0) {
    return null;
  }

  const keys = getServerKeys();
  const tokenDigest = deriveTokenDigest(rawToken.trim(), 'session', keys.authTokenHmacKey);

  const session = await prisma.session.findUnique({
    where: { id: tokenDigest },
    include: { user: true },
  });

  if (!session) return null;
  if (session.revokedAt !== null) return null;
  if (session.user.status !== 'ACTIVE') return null;

  const now = Date.now();

  // 1. Check absolute expiry
  if (session.expiresAt.getTime() <= now) {
    return null;
  }

  // 2. Check 24-hour idle expiry
  const idleMs = now - session.lastSeenAt.getTime();
  if (idleMs > SESSION_IDLE_TIMEOUT_MS) {
    return null;
  }

  // 3. Conditional touch: update last_seen_at only if > 5 minutes passed.
  // CRITICAL: Touching last_seen_at must NEVER extend expires_at!
  if (idleMs > SESSION_TOUCH_THRESHOLD_MS) {
    try {
      const updated = await prisma.session.update({
        where: { id: session.id },
        data: { lastSeenAt: new Date(now) },
      });
      session.lastSeenAt = updated.lastSeenAt;
    } catch {
      // Non-fatal if touch fails
    }
  }

  return { session, user: session.user };
}

/**
 * Resolves session from NextRequest.
 */
export async function getSessionFromRequest(request: NextRequest): Promise<SessionContext | null> {
  const token = extractSessionCookie(request);
  return resolveSession(token);
}

/**
 * Check if the session is recently reauthenticated (within 15 minutes).
 */
export function isReauthenticated(session: Session): boolean {
  if (!session.reauthAt) return false;
  return Date.now() - session.reauthAt.getTime() < REAUTH_TIMEOUT_MS;
}

/**
 * Create a short-lived restricted MFA ticket in Redis for partial authentication.
 */
export async function createMfaTicket(userId: string): Promise<string> {
  const keys = getServerKeys();
  const ticketId = generateRandomToken(32);
  const ticketDigest = deriveTokenDigest(ticketId, 'mfa_ticket', keys.authTokenHmacKey);
  const redisKey = `mfa:ticket:${ticketDigest}`;

  const payload = JSON.stringify({ userId, createdAt: Date.now() });
  const encryptedPayload = encryptTotpSecret(payload, keys.totpAesKey, 'mfa:ticket');

  const redis = getRedisCacheClient();
  await redis.set(redisKey, encryptedPayload, 'EX', MFA_TICKET_TTL_SECONDS);

  return ticketId;
}

export const storeMfaTicket = createMfaTicket;

/**
 * Validates and consumes the short-lived MFA ticket from Redis.
 */
export async function consumeMfaTicket(ticketId: string): Promise<{ userId: string } | null> {
  if (!ticketId) return null;
  const keys = getServerKeys();
  const ticketDigest = deriveTokenDigest(ticketId, 'mfa_ticket', keys.authTokenHmacKey);
  const redisKey = `mfa:ticket:${ticketDigest}`;

  const redis = getRedisCacheClient();
  const encryptedPayload = await redis.getdel(redisKey);
  if (!encryptedPayload) return null;

  try {
    const decrypted = decryptTotpSecret(encryptedPayload, keys.totpAesKey, 'mfa:ticket');
    const parsed = JSON.parse(decrypted) as { userId: string; createdAt: number };
    return { userId: parsed.userId };
  } catch {
    return null;
  }
}
