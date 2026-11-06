import { NextRequest } from 'next/server';
import { extractSessionCookie, resolveSession } from '@/lib/auth';
import { jsonOk, jsonError } from '@/lib/apiResponse';
import { getPracticeProblemBySlug } from '@/lib/practice';

/**
 * GET /api/v1/practice/[slug]
 * Returns problem details with sample tests only. Hidden tests and solution code are strictly omitted.
 */
export async function GET(request: NextRequest, context: { params: Promise<{ slug: string }> }) {
  const sessionToken = extractSessionCookie(request);
  const auth = await resolveSession(sessionToken);

  const { slug } = await context.params;
  const problem = await getPracticeProblemBySlug(slug, auth?.user.id);

  if (!problem) {
    return jsonError('NOT_FOUND', `Practice problem '${slug}' not found`, 404);
  }

  return jsonOk({ problem });
}
