import { NextRequest } from 'next/server';
import { extractSessionCookie, resolveSession } from '@/lib/auth';
import { validateCsrf } from '@/lib/csrf';
import { jsonOk, jsonError } from '@/lib/apiResponse';
import { retryChatJob, ChatNotFoundError } from '@/lib/chats';

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/v1/chats/[id]/retry
 * Retries the latest question analysis for the chat.
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

  const correlationId = request.headers.get('x-correlation-id') || crypto.randomUUID();

  try {
    const job = await retryChatJob(id, auth.user.id, correlationId);
    return jsonOk({ jobId: job.id, message: 'Retry initiated.' }, { status: 202 });
  } catch (err) {
    if (
      err instanceof ChatNotFoundError ||
      (typeof err === 'object' &&
        err !== null &&
        'code' in err &&
        (err as { code: string }).code === 'CHAT_NOT_FOUND')
    ) {
      return jsonError('NOT_FOUND', 'Chat not found or access denied', 404);
    }
    const message = err instanceof Error ? err.message : 'Failed to retry question';
    return jsonError('BAD_REQUEST', message, 400);
  }
}
