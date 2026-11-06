import { NextRequest } from 'next/server';
import { extractSessionCookie, resolveSession } from '@/lib/auth';
import { jsonOk, jsonError } from '@/lib/apiResponse';
import { getDueFlashcards } from '@/lib/progress';

/**
 * GET /api/v1/flashcards
 * Returns flashcards due for spaced repetition review
 */
export async function GET(request: NextRequest) {
  const sessionToken = extractSessionCookie(request);
  const auth = await resolveSession(sessionToken);

  if (!auth) {
    return jsonError('UNAUTHORIZED', 'Authentication required', 401);
  }

  try {
    const flashcards = await getDueFlashcards(auth.user.id);
    return jsonOk({ flashcards });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to fetch flashcards';
    return jsonError('INTERNAL_ERROR', message, 500);
  }
}
