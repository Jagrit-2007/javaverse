import { NextRequest } from 'next/server';
import { extractSessionCookie, resolveSession } from '@/lib/auth';
import { validateCsrf } from '@/lib/csrf';
import { jsonOk, jsonError } from '@/lib/apiResponse';
import { reviewFlashcard } from '@/lib/progress';
import { FlashcardReviewRequestSchema } from '@javaverse/schemas';

/**
 * POST /api/v1/flashcards/[id]/review
 * Evaluates flashcard review using SM-2 algorithm
 */
export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
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

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError('BAD_REQUEST', 'Invalid JSON body', 400);
  }

  const parsed = FlashcardReviewRequestSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError('VALIDATION_ERROR', 'Rating must be an integer between 0 and 5', 400);
  }

  try {
    const result = await reviewFlashcard(auth.user.id, id, parsed.data.rating);
    return jsonOk(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Review failed';
    return jsonError('INTERNAL_ERROR', message, 500);
  }
}
