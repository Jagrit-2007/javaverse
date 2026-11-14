import { NextRequest } from 'next/server';
import { extractSessionCookie, resolveSession } from '@/lib/auth';
import { jsonOk, jsonError } from '@/lib/apiResponse';
import { getPracticeProblemsList } from '@/lib/practice';

/**
 * GET /api/v1/practice
 * Query params: topic, difficulty, status
 */
export async function GET(request: NextRequest) {
  const sessionToken = extractSessionCookie(request);
  const auth = await resolveSession(sessionToken);

  const { searchParams } = new URL(request.url);
  const topic = searchParams.get('topic') || undefined;
  const difficulty = searchParams.get('difficulty') || undefined;
  const status = searchParams.get('status') || undefined;

  try {
    const problems = await getPracticeProblemsList(auth?.user.id, topic, difficulty, status);

    return jsonOk({ problems });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to fetch practice problems';
    return jsonError('INTERNAL_ERROR', message, 500);
  }
}
