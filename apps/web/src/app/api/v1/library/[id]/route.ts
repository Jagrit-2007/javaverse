import { NextRequest } from 'next/server';
import { extractSessionCookie, resolveSession } from '@/lib/auth';
import { validateCsrf } from '@/lib/csrf';
import { jsonOk, jsonError } from '@/lib/apiResponse';
import { deleteLibraryItem } from '@/lib/library';

/**
 * DELETE /api/v1/library/[id]
 */
export async function DELETE(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const sessionToken = extractSessionCookie(request);
  const auth = await resolveSession(sessionToken);

  if (!auth) {
    return jsonError('UNAUTHORIZED', 'Authentication required', 401);
  }

  const csrf = validateCsrf(request, { sessionId: auth.session.publicId });
  if (!csrf.valid) {
    return jsonError('CSRF_ERROR', csrf.reason || 'Invalid CSRF token', 403);
  }

  const { id } = await context.params;

  try {
    const success = await deleteLibraryItem(auth.user.id, id);
    return jsonOk({ success });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to delete item';
    return jsonError('INTERNAL_ERROR', message, 500);
  }
}
