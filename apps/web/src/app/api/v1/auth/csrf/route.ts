import { NextRequest } from 'next/server';
import { getSessionFromRequest, buildCookieHeader } from '@/lib/auth';
import { createCsrfToken, getCsrfCookieName } from '@/lib/csrf';
import { jsonOk } from '@/lib/apiResponse';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const flowParam = url.searchParams.get('flow');

  let csrfToken: string;
  let cookieToSet: { name: string; value: string } | null = null;

  if (flowParam && flowParam !== 'session' && flowParam !== 'general') {
    // Explicit pre-auth flow requested (e.g. signup, login, forgot_password, reset_password, mfa)
    csrfToken = createCsrfToken({ flow: flowParam });
    const parts = csrfToken.split('.');
    if (parts.length === 4 && parts[0]) {
      cookieToSet = {
        name: getCsrfCookieName(flowParam),
        value: parts[0],
      };
    }
  } else {
    // Check if session exists for generic/session token
    const sessionCtx = await getSessionFromRequest(request);
    if (sessionCtx?.session) {
      csrfToken = createCsrfToken({ sessionId: sessionCtx.session.publicId });
    } else {
      const flow = flowParam || 'general';
      csrfToken = createCsrfToken({ flow });
      const parts = csrfToken.split('.');
      if (parts.length === 4 && parts[0]) {
        cookieToSet = {
          name: getCsrfCookieName(flow),
          value: parts[0],
        };
      }
    }
  }

  const response = jsonOk({ csrfToken });
  response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
  response.headers.set('Pragma', 'no-cache');

  if (cookieToSet) {
    const isProd = process.env.NODE_ENV === 'production';
    const cookieHeader = buildCookieHeader(cookieToSet.name, cookieToSet.value, {
      path: '/',
      maxAge: 1800, // 30 minutes, matches pre-auth token TTL
      httpOnly: true,
      sameSite: 'lax',
      secure: isProd,
    });
    response.headers.set('Set-Cookie', cookieHeader);
  }

  return response;
}
