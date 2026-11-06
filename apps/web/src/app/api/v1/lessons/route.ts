import { NextRequest } from 'next/server';
import { jsonOk, jsonError } from '@/lib/apiResponse';
import { getLessonsList } from '@/lib/lessons';

/**
 * GET /api/v1/lessons
 * List all published curriculum lessons, with optional ?track= filter.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const track = searchParams.get('track') || undefined;

    const lessons = await getLessonsList(track);
    return jsonOk({ lessons });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to fetch lessons';
    return jsonError('INTERNAL_ERROR', message, 500);
  }
}
