import { NextRequest } from 'next/server';
import { extractSessionCookie, resolveSession } from '@/lib/auth';
import { validateCsrf } from '@/lib/csrf';
import { jsonOk, jsonError } from '@/lib/apiResponse';
import { submitPracticeCode } from '@/lib/practice';
import { SubmitProblemRequestSchema } from '@javaverse/schemas';

/**
 * POST /api/v1/practice/[slug]/submit
 * Evaluates code against sample and hidden tests, creates submission, awards XP & badges
 */
export async function POST(request: NextRequest, context: { params: Promise<{ slug: string }> }) {
  const sessionToken = extractSessionCookie(request);
  const auth = await resolveSession(sessionToken);

  if (!auth) {
    return jsonError('UNAUTHORIZED', 'Authentication required to submit solution', 401);
  }

  const csrf = validateCsrf(request, { sessionId: auth.session.publicId });
  if (!csrf.valid) {
    return jsonError('CSRF_ERROR', csrf.reason || 'Invalid CSRF token', 403);
  }

  const { slug } = await context.params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError('BAD_REQUEST', 'Invalid JSON body', 400);
  }

  const parsed = SubmitProblemRequestSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError('VALIDATION_ERROR', 'Invalid request: code is required', 400);
  }

  try {
    const response = await submitPracticeCode(auth.user.id, slug, parsed.data.code);
    return jsonOk(response);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Submission failed';
    return jsonError('INTERNAL_ERROR', message, 500);
  }
}
