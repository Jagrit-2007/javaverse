import type { BrowserContext } from '@playwright/test';
import { prisma } from '@javaverse/db';
import { deriveTokenDigest, deriveKeyHierarchy, generateRandomToken } from '@javaverse/security';
import { createSessionRow } from '@/lib/auth';

export async function authenticateAsLearner(context: BrowserContext) {
  const masterKey =
    process.env.APP_MASTER_KEY ||
    process.env.SESSION_SECRET ||
    '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
  const keys = deriveKeyHierarchy(masterKey);

  const email = `test-e2e-user-${Date.now()}-${Math.random().toString(36).substring(2)}@example.com`;
  const user = await prisma.user.create({
    data: {
      email,
      displayName: 'E2E Test User',
      status: 'ACTIVE',
    },
  });

  const rawToken = generateRandomToken(32);
  const tokenDigest = deriveTokenDigest(rawToken, 'session', keys.authTokenHmacKey);
  const publicId = crypto.randomUUID();

  await createSessionRow({
    userId: user.id,
    tokenDigest,
    publicId,
    isMfaVerified: true,
  });

  await context.addCookies([
    {
      name: 'javaverse_session',
      value: rawToken,
      domain: 'localhost',
      path: '/',
      httpOnly: true,
      sameSite: 'Lax',
    },
  ]);

  return { user, rawToken, publicId, sessionCookie: `javaverse_session=${rawToken}` };
}
