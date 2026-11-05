import { NextResponse } from 'next/server';

export function jsonOk<T>(data: T, init?: ResponseInit): NextResponse<{ data: T }> {
  const response = NextResponse.json({ data }, init);
  response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');
  return response;
}

export function jsonError(
  code: string,
  message: string,
  status = 400,
  details?: unknown,
): NextResponse<{ error: { code: string; message: string; details?: unknown } }> {
  const response = NextResponse.json(
    {
      error: {
        code,
        message,
        ...(details ? { details } : {}),
      },
    },
    { status },
  );
  response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');
  return response;
}
