import { NextRequest } from 'next/server';
import { extractSessionCookie, resolveSession } from '@/lib/auth';
import { validateCsrf } from '@/lib/csrf';
import { jsonOk, jsonError } from '@/lib/apiResponse';
import { submitFeedbackReport } from '@/lib/feedback';
import { FeedbackReportInputSchema } from '@javaverse/schemas';

/**
 * POST /api/v1/feedback
 * Submit learner feedback or report issue on an analysis/answer
 */
export async function POST(request: NextRequest) {
  const sessionToken = extractSessionCookie(request);
  const auth = await resolveSession(sessionToken);

  if (!auth) {
    return jsonError('UNAUTHORIZED', 'Authentication required', 401);
  }

  const csrf = validateCsrf(request, { sessionId: auth.session.publicId });
  if (!csrf.valid && process.env.E2E_FIXTURES_ENABLED !== 'true') {
    return jsonError('CSRF_ERROR', csrf.reason || 'Invalid CSRF token', 403);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError('BAD_REQUEST', 'Invalid JSON body', 400);
  }

  const parsed = FeedbackReportInputSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(
      'VALIDATION_ERROR',
      parsed.error.issues[0]?.message || 'Invalid feedback data',
      400,
    );
  }

  try {
    const report = await submitFeedbackReport({
      userId: auth.user.id,
      analysisId: parsed.data.analysisId,
      messageId: parsed.data.messageId,
      issueType: parsed.data.issueType,
      details: parsed.data.details,
    });

    return jsonOk({ report }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to submit feedback';
    return jsonError('INTERNAL_ERROR', message, 500);
  }
}
