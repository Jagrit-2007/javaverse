import { NextRequest } from 'next/server';
import { extractSessionCookie, resolveSession } from '@/lib/auth';
import { jsonOk, jsonError } from '@/lib/apiResponse';
import { searchKnowledgeBase } from '@/lib/kb';
import { KbSearchQuerySchema } from '@javaverse/schemas';

/**
 * GET /api/v1/kb/search
 * Search published knowledge base and curriculum lessons using PostgreSQL full-text search
 */
export async function GET(request: NextRequest) {
  const sessionToken = extractSessionCookie(request);
  const auth = await resolveSession(sessionToken);

  if (!auth) {
    return jsonError('UNAUTHORIZED', 'Authentication required', 401);
  }

  const { searchParams } = new URL(request.url);
  const q = searchParams.get('q') || '';
  const topic = searchParams.get('topic') || undefined;
  const limit = searchParams.get('limit') || '5';

  const parsed = KbSearchQuerySchema.safeParse({ q, topic, limit });
  if (!parsed.success) {
    return jsonError(
      'VALIDATION_ERROR',
      parsed.error.issues[0]?.message || 'Invalid search parameters',
      400,
    );
  }

  try {
    const sources = await searchKnowledgeBase(parsed.data.q, {
      topic: parsed.data.topic,
      limit: parsed.data.limit,
    });

    return jsonOk({ sources });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Knowledge base search failed';
    return jsonError('INTERNAL_ERROR', message, 500);
  }
}
