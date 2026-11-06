import { NextRequest } from 'next/server';
import { extractSessionCookie, resolveSession } from '@/lib/auth';
import { validateCsrf } from '@/lib/csrf';
import { jsonOk, jsonError } from '@/lib/apiResponse';
import { getLibraryItems, saveLibraryItem } from '@/lib/library';
import { SaveLibraryItemRequestSchema } from '@javaverse/schemas';

/**
 * GET /api/v1/library
 * Query params: q (search query), tag
 */
export async function GET(request: NextRequest) {
  const sessionToken = extractSessionCookie(request);
  const auth = await resolveSession(sessionToken);

  if (!auth) {
    return jsonError('UNAUTHORIZED', 'Authentication required', 401);
  }

  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q') || undefined;
  const tag = searchParams.get('tag') || undefined;

  try {
    const items = await getLibraryItems(auth.user.id, query, tag);
    return jsonOk({ items });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to fetch library items';
    return jsonError('INTERNAL_ERROR', message, 500);
  }
}

/**
 * POST /api/v1/library
 * Save or update bookmark, notes, and tags
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

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError('BAD_REQUEST', 'Invalid JSON body', 400);
  }

  const parsed = SaveLibraryItemRequestSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError('VALIDATION_ERROR', 'Invalid library item payload', 400);
  }

  try {
    const item = await saveLibraryItem(auth.user.id, parsed.data);
    return jsonOk({ item });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to save library item';
    return jsonError('INTERNAL_ERROR', message, 500);
  }
}
