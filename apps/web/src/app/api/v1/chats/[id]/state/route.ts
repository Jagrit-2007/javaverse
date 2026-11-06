import { NextRequest } from 'next/server';
import { extractSessionCookie, resolveSession } from '@/lib/auth';
import { validateCsrf } from '@/lib/csrf';
import { jsonOk, jsonError } from '@/lib/apiResponse';
import { saveChatState, ChatNotFoundError } from '@/lib/chats';

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * PUT /api/v1/chats/[id]/state
 * Autosaves the client UI state (active tab, scroll position, editor text, visualization step, unsent drafts).
 */
export async function PUT(request: NextRequest, context: RouteContext) {
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

  let body: { uiState?: Record<string, unknown> } = {};
  try {
    body = await request.json();
  } catch {
    return jsonError('INVALID_JSON', 'Request body must be valid JSON', 400);
  }

  if (!body.uiState || typeof body.uiState !== 'object') {
    return jsonError('INVALID_INPUT', 'uiState object is required', 400);
  }

  try {
    const updatedState = await saveChatState(id, auth.user.id, body.uiState);
    return jsonOk({ state: updatedState });
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
    const message = err instanceof Error ? err.message : 'Failed to save chat state';
    return jsonError('INTERNAL_ERROR', message, 500);
  }
}
