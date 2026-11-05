import { NextRequest } from 'next/server';
import { prisma } from '@javaverse/db';
import { getSessionFromRequest } from '@/lib/auth';
import { jsonOk, jsonError } from '@/lib/apiResponse';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const sessionCtx = await getSessionFromRequest(request);
  if (!sessionCtx) {
    return jsonError('UNAUTHORIZED', 'Authentication required', 401);
  }

  const now = new Date();
  const sessions = await prisma.session.findMany({
    where: {
      userId: sessionCtx.user.id,
      revokedAt: null,
      expiresAt: { gt: now },
    },
    orderBy: { lastSeenAt: 'desc' },
  });

  const sessionList = sessions.map((s) => ({
    publicId: s.publicId,
    createdAt: s.createdAt.toISOString(),
    lastSeenAt: s.lastSeenAt.toISOString(),
    isCurrent: s.id === sessionCtx.session.id,
  }));

  return jsonOk({ sessions: sessionList });
}
