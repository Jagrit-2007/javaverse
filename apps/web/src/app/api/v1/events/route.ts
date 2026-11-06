import { NextRequest } from 'next/server';
import { extractSessionCookie, resolveSession } from '@/lib/auth';
import { jsonError } from '@/lib/apiResponse';
import { handleUserEventStream } from '@/lib/events';

/**
 * GET /api/v1/events
 * Primary authenticated user-level Server-Sent Events stream for all 3 chat slots.
 * Supports Last-Event-ID header and query param for reconnect and replay.
 */
export async function GET(request: NextRequest) {
  const sessionToken = extractSessionCookie(request);
  const auth = await resolveSession(sessionToken);

  if (!auth) {
    return jsonError('UNAUTHORIZED', 'Authentication required', 401);
  }

  return handleUserEventStream(request, auth.user.id);
}
