import { NextRequest } from 'next/server';
import { extractSessionCookie, resolveSession } from '@/lib/auth';
import { validateCsrf } from '@/lib/csrf';
import { jsonOk, jsonError } from '@/lib/apiResponse';
import { getChatById, updateChat, deleteChatAndFreeSlot, ChatNotFoundError } from '@/lib/chats';

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/v1/chats/[id]
 */
export async function GET(request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  const sessionToken = extractSessionCookie(request);
  const auth = await resolveSession(sessionToken);

  if (!auth) {
    return jsonError('UNAUTHORIZED', 'Authentication required', 401);
  }

  try {
    const data = await getChatById(id, auth.user.id);
    return jsonOk(data);
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
    const message = err instanceof Error ? err.message : 'Failed to fetch chat';
    return jsonError('INTERNAL_ERROR', message, 500);
  }
}

/**
 * PATCH /api/v1/chats/[id]
 */
export async function PATCH(request: NextRequest, context: RouteContext) {
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

  let body: { title?: string } = {};
  try {
    body = await request.json();
  } catch {
    return jsonError('INVALID_JSON', 'Request body must be valid JSON', 400);
  }

  try {
    const updated = await updateChat(id, auth.user.id, body);
    return jsonOk({ chat: updated });
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
    const message = err instanceof Error ? err.message : 'Failed to update chat';
    return jsonError('INTERNAL_ERROR', message, 500);
  }
}

/**
 * DELETE /api/v1/chats/[id]
 */
export async function DELETE(request: NextRequest, context: RouteContext) {
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
    await deleteChatAndFreeSlot(id, auth.user.id);
    return jsonOk({ success: true, message: 'Chat deleted and slot freed.' });
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
    const message = err instanceof Error ? err.message : 'Failed to delete chat';
    return jsonError('INTERNAL_ERROR', message, 500);
  }
}
