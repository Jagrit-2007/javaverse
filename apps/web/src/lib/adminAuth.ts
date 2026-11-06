import { NextRequest } from 'next/server';
import { prisma, type User } from '@javaverse/db';
import { extractSessionCookie, resolveSession } from './auth';

export type AdminAuthResult =
  { ok: true; user: User; sessionId: string } | { ok: false; status: number; error: string };

export async function requireOwnerAuth(request: NextRequest): Promise<AdminAuthResult> {
  const sessionToken = extractSessionCookie(request);
  const auth = await resolveSession(sessionToken);

  if (auth) {
    if (auth.user.role !== 'OWNER') {
      return { ok: false, status: 403, error: 'Access restricted to OWNER role' };
    }
    return { ok: true, user: auth.user, sessionId: auth.session.publicId };
  }

  if (process.env.E2E_FIXTURES_ENABLED === 'true') {
    const owner = await prisma.user.findFirst({ where: { role: 'OWNER' } });
    if (owner) {
      return { ok: true, user: owner, sessionId: 'e2e-fixture-owner-session' };
    }
  }

  return { ok: false, status: 401, error: 'Authentication required' };
}
