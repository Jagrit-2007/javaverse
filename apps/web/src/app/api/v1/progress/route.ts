import { NextRequest } from 'next/server';
import { extractSessionCookie, resolveSession } from '@/lib/auth';
import { jsonOk, jsonError } from '@/lib/apiResponse';
import { getUserProgressOverview } from '@/lib/progress';

/**
 * GET /api/v1/progress
 * Returns user progress overview: XP, streak, topic mastery map, badges, and due flashcard count
 */
export async function GET(request: NextRequest) {
  const sessionToken = extractSessionCookie(request);
  const auth = await resolveSession(sessionToken);

  if (!auth) {
    return jsonError('UNAUTHORIZED', 'Authentication required', 401);
  }

  try {
    const progress = await getUserProgressOverview(auth.user.id);
    return jsonOk({ progress });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to fetch progress';
    return jsonError('INTERNAL_ERROR', message, 500);
  }
}
