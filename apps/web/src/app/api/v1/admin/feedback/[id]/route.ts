import { NextRequest } from 'next/server';
import { requireOwnerAuth } from '@/lib/adminAuth';
import { validateCsrf } from '@/lib/csrf';
import { jsonOk, jsonError } from '@/lib/apiResponse';
import { resolveFeedbackReport } from '@/lib/feedback';

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const auth = await requireOwnerAuth(request);
  if (!auth.ok) {
    return jsonError(auth.status === 403 ? 'FORBIDDEN' : 'UNAUTHORIZED', auth.error, auth.status);
  }

  const csrf = validateCsrf(request, { sessionId: auth.sessionId });
  if (!csrf.valid && process.env.E2E_FIXTURES_ENABLED !== 'true') {
    return jsonError('CSRF_ERROR', csrf.reason || 'Invalid CSRF token', 403);
  }

  const { id } = await context.params;

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return jsonError('BAD_REQUEST', 'Invalid JSON body', 400);
  }

  const resolution = body?.resolution;
  if (resolution !== 'RESOLVED' && resolution !== 'DISMISSED') {
    return jsonError('VALIDATION_ERROR', 'resolution must be RESOLVED or DISMISSED', 400);
  }

  try {
    const report = await resolveFeedbackReport({
      reportId: id,
      reviewerUserId: auth.user.id,
      resolution,
    });

    return jsonOk({ report });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to update feedback report';
    return jsonError('INTERNAL_ERROR', message, 500);
  }
}
