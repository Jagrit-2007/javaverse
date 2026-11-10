import { NextRequest } from 'next/server';
import { extractSessionCookie, resolveSession } from '@/lib/auth';
import { validateCsrf } from '@/lib/csrf';
import { jsonOk, jsonError } from '@/lib/apiResponse';
import { postUserMessage, ChatNotFoundError, ActiveJobInProgressError } from '@/lib/chats';
import {
  checkAndAcquireAiLimits,
  releaseAiConcurrencySlot,
  releaseAiSubmitLock,
  refundAiDailyQuota,
} from '@/lib/aiLimits';
import { prisma } from '@javaverse/db';

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/v1/chats/[id]/messages
 */
export async function GET(request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  const sessionToken = extractSessionCookie(request);
  const auth = await resolveSession(sessionToken);

  if (!auth) {
    return jsonError('UNAUTHORIZED', 'Authentication required', 401);
  }

  // Verify ownership
  const chat = await prisma.chat.findFirst({
    where: { id, userId: auth.user.id },
  });

  if (!chat) {
    return jsonError('NOT_FOUND', 'Chat not found or access denied', 404);
  }

  const messages = await prisma.message.findMany({
    where: { chatId: id },
    orderBy: { createdAt: 'asc' },
    include: {
      analysis: true,
      attachments: true,
    },
  });

  return jsonOk({ messages });
}

/**
 * POST /api/v1/chats/[id]/messages
 */
export async function POST(request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  const sessionToken = extractSessionCookie(request);
  const auth = await resolveSession(sessionToken);

  if (!auth) {
    return jsonError('UNAUTHORIZED', 'Authentication required', 401);
  }

  const csrf = validateCsrf(request, { sessionId: auth.session.publicId });
  if (!csrf.valid) {
    return jsonError('CSRF_ERROR', csrf.reason || 'Invalid CSRF token', 403);
  }

  let body: { content?: string; attachmentIds?: string[] } = {};
  try {
    body = await request.json();
  } catch {
    return jsonError('INVALID_JSON', 'Request body must be valid JSON', 400);
  }

  if (!body.content || typeof body.content !== 'string' || body.content.trim().length === 0) {
    return jsonError('INVALID_INPUT', 'Message content is required', 400);
  }

  const limitCheck = await checkAndAcquireAiLimits({ userId: auth.user.id });
  if (!limitCheck.allowed) {
    const res = jsonError(
      limitCheck.code || 'RATE_LIMIT_EXCEEDED',
      limitCheck.message || 'Request limit exceeded.',
      (limitCheck.status || 429) as 400 | 401 | 403 | 404 | 409 | 422 | 429 | 500 | 503,
    );
    if (limitCheck.retryAfterSeconds) {
      res.headers.set('Retry-After', String(limitCheck.retryAfterSeconds));
    }
    return res;
  }

  const correlationId = request.headers.get('x-correlation-id') || crypto.randomUUID();

  try {
    const result = await postUserMessage({
      chatId: id,
      userId: auth.user.id,
      content: body.content,
      correlationId,
      ...(body.attachmentIds ? { attachmentIds: body.attachmentIds } : {}),
    });

    return jsonOk(
      {
        message: result.userMessage,
        assistantMessage: result.assistantMessage,
        jobId: result.job.id,
      },
      { status: 202 },
    );
  } catch (err) {
    if (limitCheck.acquiredConcurrency) {
      await releaseAiConcurrencySlot();
      await releaseAiSubmitLock(auth.user.id);
      await refundAiDailyQuota(auth.user.id);
    }
    if (
      err instanceof ActiveJobInProgressError ||
      (typeof err === 'object' &&
        err !== null &&
        'code' in err &&
        (err as { code: string }).code === 'ACTIVE_JOB_IN_PROGRESS')
    ) {
      const message =
        err instanceof Error ? err.message : 'A question analysis is already in progress.';
      return jsonError('ACTIVE_JOB_IN_PROGRESS', message, 409);
    }
    if (
      err instanceof ChatNotFoundError ||
      (typeof err === 'object' &&
        err !== null &&
        'code' in err &&
        (err as { code: string }).code === 'CHAT_NOT_FOUND')
    ) {
      return jsonError('NOT_FOUND', 'Chat not found or access denied', 404);
    }
    const message = err instanceof Error ? err.message : 'Failed to submit message';
    return jsonError('BAD_REQUEST', message, 400);
  }
}
