import { NextRequest } from 'next/server';
import { getSessionFromRequest } from '@/lib/auth';
import { createCsrfToken } from '@/lib/csrf';
import { jsonOk } from '@/lib/apiResponse';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const flow = url.searchParams.get('flow') || 'general';

  // Check if session exists
  const sessionCtx = await getSessionFromRequest(request);
  let csrfToken: string;

  if (sessionCtx?.session) {
    csrfToken = createCsrfToken({ sessionId: sessionCtx.session.publicId });
  } else {
    csrfToken = createCsrfToken({ flow });
  }

  return jsonOk({ csrfToken });
}
