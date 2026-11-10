import { describe, it, expect, beforeEach } from 'vitest';
import { prisma, assertSafeTestDatabase } from '@javaverse/db';
import {
  generateSessionTokens,
  createSessionRow,
  resolveSession,
  isReauthenticated,
  SESSION_MAX_AGE_SECONDS,
  SESSION_IDLE_TIMEOUT_MS,
} from '@/lib/auth';

describe('Session Lifecycle, Idle Expiry & Touch Invariants', () => {
  let testUser: { id: string; email: string };

  beforeEach(async () => {
    assertSafeTestDatabase(process.env.DATABASE_URL);
    await prisma.session.deleteMany();
    await prisma.user.deleteMany();

    testUser = await prisma.user.create({
      data: {
        email: 'session-test@example.com',
        status: 'ACTIVE',
      },
    });
  });

  it('rejects session when 24-hour idle timeout is exceeded', async () => {
    const { rawToken, tokenDigest, publicId } = generateSessionTokens();
    const now = Date.now();

    // Create session last seen 25 hours ago
    const idleTime = new Date(now - (SESSION_IDLE_TIMEOUT_MS + 3600 * 1000));
    await prisma.session.create({
      data: {
        id: tokenDigest,
        userId: testUser.id,
        publicId,
        createdAt: idleTime,
        lastSeenAt: idleTime,
        expiresAt: new Date(now + 6 * 24 * 3600 * 1000), // Within 7-day absolute window
      },
    });

    const resolved = await resolveSession(rawToken);
    expect(resolved).toBeNull();
  });

  it('preserves fixed absolute expires_at invariant during conditional touch', async () => {
    const { rawToken, tokenDigest, publicId } = generateSessionTokens();
    const now = Date.now();

    // Create session last seen 10 minutes ago (> 5m touch threshold, < 24h idle)
    const initialCreated = new Date(now - 10 * 60 * 1000);
    const fixedExpiresAt = new Date(now + SESSION_MAX_AGE_SECONDS * 1000);

    const initialSession = await prisma.session.create({
      data: {
        id: tokenDigest,
        userId: testUser.id,
        publicId,
        createdAt: initialCreated,
        lastSeenAt: initialCreated,
        expiresAt: fixedExpiresAt,
      },
    });

    // Resolve session -> triggers conditional touch
    const resolved = await resolveSession(rawToken);
    expect(resolved).not.toBeNull();

    // Query DB to inspect lastSeenAt and expiresAt
    const updatedSession = await prisma.session.findUnique({
      where: { id: initialSession.id },
    });

    expect(updatedSession).not.toBeNull();
    // lastSeenAt must be updated to current time
    expect(updatedSession!.lastSeenAt.getTime()).toBeGreaterThan(initialCreated.getTime());
    // CRITICAL: expiresAt must remain exactly unchanged!
    expect(updatedSession!.expiresAt.getTime()).toBe(fixedExpiresAt.getTime());
  });

  it('rejects session when absolute 7-day expiry has passed even if touched recently', async () => {
    const { rawToken, tokenDigest, publicId } = generateSessionTokens();
    const now = Date.now();

    // Session whose absolute expiresAt was 1 minute ago, but touched 1 minute ago
    const pastExpiry = new Date(now - 60 * 1000);
    await prisma.session.create({
      data: {
        id: tokenDigest,
        userId: testUser.id,
        publicId,
        createdAt: new Date(now - 7 * 24 * 3600 * 1000),
        lastSeenAt: pastExpiry,
        expiresAt: pastExpiry,
      },
    });

    const resolved = await resolveSession(rawToken);
    expect(resolved).toBeNull();
  });

  it('differentiates current session logout from other session revocation requiring reauthentication', async () => {
    const s1 = generateSessionTokens();
    const s2 = generateSessionTokens();

    const session1 = await createSessionRow({
      userId: testUser.id,
      tokenDigest: s1.tokenDigest,
      publicId: s1.publicId,
    });

    const session2 = await createSessionRow({
      userId: testUser.id,
      tokenDigest: s2.tokenDigest,
      publicId: s2.publicId,
    });
    expect(session2.publicId).toBe(s2.publicId);

    // Session 1 is recent (reauthAt is now)
    expect(isReauthenticated(session1)).toBe(true);

    // Revoke session 2 by publicId
    await prisma.session.updateMany({
      where: { publicId: s2.publicId, userId: testUser.id },
      data: { revokedAt: new Date() },
    });

    // Session 2 is now rejected
    const resolved2 = await resolveSession(s2.rawToken);
    expect(resolved2).toBeNull();

    // Session 1 remains active
    const resolved1 = await resolveSession(s1.rawToken);
    expect(resolved1).not.toBeNull();
  });
});
