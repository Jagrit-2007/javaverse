import { NextRequest } from 'next/server';
import { extractSessionCookie, resolveSession } from '@/lib/auth';
import { validateCsrf } from '@/lib/csrf';
import { jsonOk, jsonError } from '@/lib/apiResponse';
import { generateUserDataExport } from '@/lib/settings';

/**
 * POST /api/v1/settings/export
 * Downloads the user's data package (GDPR compliance)
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

  try {
    const exportData = await generateUserDataExport(auth.user.id);
    return jsonOk({ export: exportData });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Export failed';
    return jsonError('INTERNAL_ERROR', message, 500);
  }
}
