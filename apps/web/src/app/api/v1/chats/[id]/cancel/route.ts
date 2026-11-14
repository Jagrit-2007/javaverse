import { NextRequest } from 'next/server';
import { extractSessionCookie, resolveSession } from '@/lib/auth';
import { validateCsrf } from '@/lib/csrf';
import { jsonOk, jsonError } from '@/lib/apiResponse';
import { cancelChatJob } from '@/lib/chats';

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/v1/chats/[id]/cancel
 * Cancels active background processing for the chat.
 */
export async function POST(request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  const sessionToken = extractSessionCookie(request);
  const auth = await resolveSession(sessionToken);

  if (!auth) {
    return jsonError('UNAUTHORIZED', 'Authentication required', 401);
  }

  const csrf = validateCsrf(request, { sessionId: auth.session.publicId });
  if (!csrf.valid) {
    return jsonError('CSRF_ERROR', csrf.reason || 'Invalid CSRF token', 403);
  }

  try {
    await cancelChatJob(id, auth.user.id);
    return jsonOk({ success: true, message: 'Job cancelled.' });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to cancel job';
    return jsonError('INTERNAL_ERROR', message, 500);
  }
}
