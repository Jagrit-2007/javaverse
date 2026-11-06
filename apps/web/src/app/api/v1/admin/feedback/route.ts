import { NextRequest } from 'next/server';
import { requireOwnerAuth } from '@/lib/adminAuth';
import { jsonOk, jsonError } from '@/lib/apiResponse';
import { listFeedbackReports } from '@/lib/feedback';

export async function GET(request: NextRequest) {
  const auth = await requireOwnerAuth(request);
  if (!auth.ok) {
    return jsonError(auth.status === 403 ? 'FORBIDDEN' : 'UNAUTHORIZED', auth.error, auth.status);
  }

  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status') || undefined;
  const limit = parseInt(searchParams.get('limit') || '50', 10);

  try {
    const reports = await listFeedbackReports({
      ...(status ? { status } : {}),
      limit,
    });
    return jsonOk({ reports });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to list feedback reports';
    return jsonError('INTERNAL_ERROR', message, 500);
  }
}
