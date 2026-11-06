import { NextRequest } from 'next/server';
import { extractSessionCookie, resolveSession } from '@/lib/auth';
import { validateCsrf } from '@/lib/csrf';
import { jsonOk, jsonError } from '@/lib/apiResponse';
import { listUserChats, createChatInFirstFreeSlot, ChatLimitReachedError } from '@/lib/chats';

/**
 * GET /api/v1/chats
 * Lists up to 3 persistent chat slots for the authenticated user.
 */
export async function GET(request: NextRequest) {
  const sessionToken = extractSessionCookie(request);
  const auth = await resolveSession(sessionToken);

  if (!auth) {
    return jsonError('UNAUTHORIZED', 'Authentication required', 401);
  }

  try {
    const chats = await listUserChats(auth.user.id);
    return jsonOk({ chats });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to list chats';
    return jsonError('INTERNAL_ERROR', message, 500);
  }
}

/**
 * POST /api/v1/chats
 * Creates a new chat in the first available slot (1..3).
 * Returns HTTP 409 CHAT_LIMIT_REACHED if all 3 slots are occupied.
 */
export async function POST(request: NextRequest) {
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
    const text = await request.text();
    if (text) {
      body = JSON.parse(text);
    }
  } catch {
    // Empty body is acceptable
  }

  try {
    const newChat = await createChatInFirstFreeSlot(auth.user.id, body.title);
    return jsonOk({ chat: newChat }, { status: 201 });
  } catch (err) {
    if (
      err instanceof ChatLimitReachedError ||
      (typeof err === 'object' &&
        err !== null &&
        'code' in err &&
        (err as { code: string }).code === 'CHAT_LIMIT_REACHED')
    ) {
      return jsonError(
        'CHAT_LIMIT_REACHED',
        'Maximum 3 active chats allowed. Delete a chat to open a new one.',
        409,
      );
    }
    const message = err instanceof Error ? err.message : 'Failed to create chat';
    return jsonError('INTERNAL_ERROR', message, 500);
  }
}
