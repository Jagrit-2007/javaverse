import { NextRequest } from 'next/server';
import { jsonOk, jsonError } from '@/lib/apiResponse';
import { getLessonBySlug, toPublicLessonDetail } from '@/lib/lessons';

/**
 * GET /api/v1/lessons/[slug]
 * Returns safe public lesson detail by slug.
 */
export async function GET(_request: NextRequest, context: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await context.params;
    const lesson = await getLessonBySlug(slug);

    if (!lesson) {
      return jsonError('NOT_FOUND', `Lesson '${slug}' not found or not published`, 404);
    }

    return jsonOk({ lesson: toPublicLessonDetail(lesson) });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to fetch lesson detail';
    return jsonError('INTERNAL_ERROR', message, 500);
  }
}
