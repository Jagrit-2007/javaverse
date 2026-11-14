import { NextRequest } from 'next/server';
import { extractSessionCookie, resolveSession } from '@/lib/auth';
import { validateCsrf } from '@/lib/csrf';
import { jsonOk, jsonError } from '@/lib/apiResponse';
import { proposeKbCandidate } from '@/lib/kb';

/**
 * POST /api/v1/kb/candidates
 * Propose a verified analysis as a Knowledge Base candidate.
 * Requires user consent and sandbox verification status 'VERIFIED'.
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

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return jsonError('BAD_REQUEST', 'Invalid JSON body', 400);
  }

  const analysisId = body?.analysisId;
  if (!analysisId || typeof analysisId !== 'string') {
    return jsonError('VALIDATION_ERROR', 'analysisId is required', 400);
  }

  try {
    const candidate = await proposeKbCandidate(analysisId, auth.user.id);
    return jsonOk({ candidate }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to propose candidate';
    if (message.includes('Consent required')) {
      return jsonError('CONSENT_REQUIRED', message, 403);
    }
    if (message.includes('must be verified')) {
      return jsonError('VERIFICATION_REQUIRED', message, 400);
    }
    return jsonError('INTERNAL_ERROR', message, 500);
  }
}
