import { NextRequest } from 'next/server';
import { getSessionFromRequest, getSafeDisplayName } from '@/lib/auth';
import { jsonOk } from '@/lib/apiResponse';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const sessionCtx = await getSessionFromRequest(request);

  if (!sessionCtx) {
    return jsonOk({ authenticated: false, user: null });
  }

  return jsonOk({
    authenticated: true,
    user: {
      id: sessionCtx.user.id,
      email: sessionCtx.user.email,
      displayName: getSafeDisplayName(sessionCtx.user),
      emailVerified: sessionCtx.user.emailVerifiedAt !== null,
      mfaVerified: sessionCtx.session.mfaVerifiedAt !== null,
    },
  });
}
