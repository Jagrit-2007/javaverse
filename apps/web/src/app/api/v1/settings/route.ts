import { NextRequest } from 'next/server';
import { extractSessionCookie, resolveSession } from '@/lib/auth';
import { validateCsrf } from '@/lib/csrf';
import { jsonOk, jsonError } from '@/lib/apiResponse';
import { getUserSettings, updateUserSettings } from '@/lib/settings';
import { UpdateUserSettingsRequestSchema } from '@javaverse/schemas';

/**
 * GET /api/v1/settings
 */
export async function GET(request: NextRequest) {
  const sessionToken = extractSessionCookie(request);
  const auth = await resolveSession(sessionToken);

  if (!auth) {
    return jsonError('UNAUTHORIZED', 'Authentication required', 401);
  }

  try {
    const settings = await getUserSettings(auth.user.id);
    return jsonOk({ settings });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to fetch settings';
    return jsonError('INTERNAL_ERROR', message, 500);
  }
}

/**
 * PATCH /api/v1/settings
 */
export async function PATCH(request: NextRequest) {
  const sessionToken = extractSessionCookie(request);
  const auth = await resolveSession(sessionToken);

  if (!auth) {
    return jsonError('UNAUTHORIZED', 'Authentication required', 401);
  }

  const csrf = validateCsrf(request, { sessionId: auth.session.publicId });
  if (!csrf.valid) {
    return jsonError('CSRF_ERROR', csrf.reason || 'Invalid CSRF token', 403);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError('BAD_REQUEST', 'Invalid JSON body', 400);
  }

  const parsed = UpdateUserSettingsRequestSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError('VALIDATION_ERROR', 'Invalid settings update format', 400);
  }

  try {
    const updated = await updateUserSettings(auth.user.id, parsed.data);
    return jsonOk({ settings: updated });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to update settings';
    return jsonError('INTERNAL_ERROR', message, 500);
  }
}
