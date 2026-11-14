import { NextRequest } from 'next/server';
import { extractSessionCookie, resolveSession } from '@/lib/auth';
import { jsonError } from '@/lib/apiResponse';
import { handleUserEventStream } from '@/lib/events';
import { prisma } from '@javaverse/db';

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/v1/chats/[id]/events
 * Filtered SSE stream for a specific chat slot, using the same monotonic stream_seq cursor.
 */
export async function GET(request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  const sessionToken = extractSessionCookie(request);
  const auth = await resolveSession(sessionToken);

  if (!auth) {
    return jsonError('UNAUTHORIZED', 'Authentication required', 401);
  }

  // User-scoped resource access validation
  const chat = await prisma.chat.findFirst({
    where: { id, userId: auth.user.id },
  });

  if (!chat) {
    return jsonError('NOT_FOUND', 'Chat not found or access denied', 404);
  }

  return handleUserEventStream(request, auth.user.id, id);
}
