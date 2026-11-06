import type { BrowserContext } from '@playwright/test';
import { prisma } from '@javaverse/db';
import { deriveTokenDigest, deriveKeyHierarchy, generateRandomToken } from '@javaverse/security';
import { createSessionRow } from '@/lib/auth';

export async function authenticateAsOwner(context: BrowserContext) {
  const masterKey =
    process.env.APP_MASTER_KEY ||
    process.env.SESSION_SECRET ||
    '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
  const keys = deriveKeyHierarchy(masterKey);

  const email = `test-e2e-owner-${Date.now()}-${Math.random().toString(36).substring(2)}@example.com`;
  const owner = await prisma.user.create({
    data: {
      email,
      displayName: 'E2E Test Owner',
      role: 'OWNER',
      status: 'ACTIVE',
    },
  });

  const rawToken = generateRandomToken(32);
  const tokenDigest = deriveTokenDigest(rawToken, 'session', keys.authTokenHmacKey);
  const publicId = crypto.randomUUID();

  await createSessionRow({
    userId: owner.id,
    tokenDigest,
    publicId,
    isMfaVerified: true,
  });

  const cookieName =
    process.env.NODE_ENV === 'production' ? '__Host-javaverse_session' : 'javaverse_session';

  await context.addCookies([
    {
      name: cookieName,
      value: rawToken,
      url: 'http://localhost:3000',
      httpOnly: true,
      sameSite: 'Lax',
    },
  ]);

  return { owner, rawToken, publicId };
}
