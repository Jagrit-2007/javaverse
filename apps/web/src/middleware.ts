import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { buildDynamicNonceCsp, buildStaticCsp, generateCspNonce } from '@javaverse/security/csp';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. Health and readiness probe preservation: bypass CSP & correlation mutation
  if (pathname.startsWith('/api/v1/health') || pathname.startsWith('/api/v1/readiness')) {
    return NextResponse.next();
  }

  // 2. Legacy / inactive route redirects to single-account model equivalents
  if (pathname === '/auth/bootstrap' || pathname === '/auth/invite') {
    return NextResponse.redirect(new URL('/auth/signup', request.url));
  }
  if (pathname === '/admin' || pathname.startsWith('/dashboard/admin')) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  // 3. Correlation ID tracking (preserving Phase 1 behavior)
  const existingId = request.headers.get('x-correlation-id');
  const correlationId =
    existingId && /^[a-zA-Z0-9-]{16,64}$/.test(existingId) ? existingId : crypto.randomUUID();

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-correlation-id', correlationId);

  const isDev = process.env.NODE_ENV === 'development';
  const isDashboardRoute = pathname.startsWith('/dashboard');

  // 4. Dashboard route protection: redirect unauthenticated requests to /auth/login
  const hasSessionCookie =
    request.cookies.has('__Host-javaverse_session') || request.cookies.has('javaverse_session');

  if (isDashboardRoute && !hasSessionCookie) {
    if (process.env.E2E_FIXTURES_ENABLED !== 'true') {
      const loginUrl = new URL('/auth/login', request.url);
      // Safe relative return URL
      loginUrl.searchParams.set('returnUrl', pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  let cspHeaderValue: string;
  if (isDashboardRoute || isDev) {
    // Dynamic cryptographic nonce for authenticated dashboard shell or development mode
    const nonce = generateCspNonce();
    cspHeaderValue = buildDynamicNonceCsp(nonce, isDev);
    requestHeaders.set('x-nonce', nonce);
  } else {
    // Static verified hash-based CSP for public marketing & auth routes in production
    const envHashes = process.env.STATIC_SCRIPT_HASHES;
    const staticHashes = envHashes ? envHashes.split(' ') : undefined;
    cspHeaderValue = buildStaticCsp(staticHashes);
  }

  requestHeaders.set('Content-Security-Policy', cspHeaderValue);

  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });

  // Attach response headers
  response.headers.set('x-correlation-id', correlationId);
  response.headers.set('Content-Security-Policy', cspHeaderValue);

  if (isDashboardRoute) {
    // Prevent client/CDN caching of dynamic dashboard views
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  }

  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|icon.svg).*)'],
};
