import { NextRequest } from 'next/server';
import { extractSessionCookie, resolveSession } from '@/lib/auth';
import { validateCsrf } from '@/lib/csrf';
import { checkRateLimit } from '@/lib/rateLimiter';
import { jsonOk, jsonError } from '@/lib/apiResponse';
import { runPlaygroundCode } from '@/lib/lessons';
import { ExecuteCodeSchema } from '@javaverse/schemas';

/**
 * POST /api/v1/sandbox/execute
 * Direct interactive playground execution running code inside the isolated container runner.
 */
export async function POST(request: NextRequest) {
  const sessionToken = extractSessionCookie(request);
  const auth = await resolveSession(sessionToken);

  if (!auth) {
    return jsonError('UNAUTHORIZED', 'Authentication required to execute code', 401);
  }

  const csrf = validateCsrf(request, { sessionId: auth.session.publicId });
  if (!csrf.valid) {
    return jsonError('CSRF_ERROR', csrf.reason || 'Invalid CSRF token', 403);
  }

  // Rate limit: 20 executions per 60s window per user
  const rl = await checkRateLimit({
    prefix: 'sandbox_execute',
    identifier: auth.user.id,
    maxRequests: 20,
    windowSeconds: 60,
  });

  if (!rl.allowed) {
    return jsonError(
      'RATE_LIMIT_EXCEEDED',
      'Too many code execution requests. Please wait a moment.',
      429,
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError('BAD_REQUEST', 'Invalid JSON payload', 400);
  }

  const parsed = ExecuteCodeSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(
      'VALIDATION_ERROR',
      'Invalid execution payload: code must be between 1 and 65536 characters',
      400,
    );
  }

  try {
    const result = await runPlaygroundCode(parsed.data.code, parsed.data.javaVersion);
    return jsonOk({ result });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Code execution failed';
    return jsonError('INTERNAL_ERROR', message, 500);
  }
}
