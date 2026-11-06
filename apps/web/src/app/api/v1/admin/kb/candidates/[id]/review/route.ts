import { NextRequest } from 'next/server';
import { requireOwnerAuth } from '@/lib/adminAuth';
import { validateCsrf } from '@/lib/csrf';
import { jsonOk, jsonError } from '@/lib/apiResponse';
import { reviewKbCandidate } from '@/lib/kb';
import { KbCandidateActionSchema } from '@javaverse/schemas';

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const auth = await requireOwnerAuth(request);
  if (!auth.ok) {
    return jsonError(auth.status === 403 ? 'FORBIDDEN' : 'UNAUTHORIZED', auth.error, auth.status);
  }

  const csrf = validateCsrf(request, { sessionId: auth.sessionId });
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

  const parsed = KbCandidateActionSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(
      'VALIDATION_ERROR',
      parsed.error.issues[0]?.message || 'Invalid review action',
      400,
    );
  }

  try {
    const candidate = await reviewKbCandidate({
      candidateId: id,
      reviewerUserId: auth.user.id,
      action: parsed.data.action,
      title: parsed.data.title,
      topic: parsed.data.topic,
      subtopics: parsed.data.subtopics,
      anonymizedQuestion: parsed.data.anonymizedQuestion,
      verifiedSolution: parsed.data.verifiedSolution,
      explanation: parsed.data.explanation,
      rejectionReason: parsed.data.rejectionReason,
    });

    return jsonOk({ candidate });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Review action failed';
    return jsonError('INTERNAL_ERROR', message, 500);
  }
}
