import { createHmac, randomBytes } from 'node:crypto';
import { timingSafeCompare } from './tokens';

export type PreAuthFlow = 'login' | 'bootstrap' | 'invite' | 'generic';

export function generateSessionCsrfToken(
  sessionPublicId: string,
  key: Buffer | string,
  issuedAt = Math.floor(Date.now() / 1000),
): string {
  const keyBuffer = Buffer.isBuffer(key) ? key : Buffer.from(key, 'utf-8');
  const signature = createHmac('sha256', keyBuffer)
    .update(`${sessionPublicId}:${issuedAt}`)
    .digest('hex');
  return `${signature}.${issuedAt}`;
}

export function verifySessionCsrfToken(
  token: string,
  sessionPublicId: string,
  key: Buffer | string,
  maxAgeSeconds = 86400, // 24 hours
): boolean {
  if (!token || !sessionPublicId || typeof token !== 'string') return false;
  const parts = token.split('.');
  if (parts.length !== 2) return false;

  const signature = parts[0];
  const issuedAtStr = parts[1];
  if (!signature || !issuedAtStr) return false;

  const issuedAt = parseInt(issuedAtStr, 10);
  if (isNaN(issuedAt)) return false;

  const now = Math.floor(Date.now() / 1000);
  if (now - issuedAt > maxAgeSeconds || issuedAt > now + 60) {
    return false;
  }

  const expectedSignature = createHmac(
    'sha256',
    Buffer.isBuffer(key) ? key : Buffer.from(key, 'utf-8'),
  )
    .update(`${sessionPublicId}:${issuedAt}`)
    .digest('hex');

  return timingSafeCompare(signature, expectedSignature);
}

export function generatePreAuthCsrfToken(
  flow: string,
  key: Buffer | string,
  ttlSeconds = 1800, // 30 minutes
): string {
  const nonce = randomBytes(16).toString('hex');
  const expiresAt = Math.floor(Date.now() / 1000) + ttlSeconds;
  const keyBuffer = Buffer.isBuffer(key) ? key : Buffer.from(key, 'utf-8');

  const signature = createHmac('sha256', keyBuffer)
    .update(`${nonce}:${flow}:${expiresAt}`)
    .digest('hex');

  return `${nonce}.${flow}.${expiresAt}.${signature}`;
}

export function verifyPreAuthCsrfToken(
  token: string,
  expectedFlow: string,
  key: Buffer | string,
): boolean {
  if (!token || typeof token !== 'string') return false;
  const parts = token.split('.');
  if (parts.length !== 4) return false;

  const nonce = parts[0];
  const flow = parts[1];
  const expiresAtStr = parts[2];
  const signature = parts[3];

  if (!nonce || !flow || !expiresAtStr || !signature) return false;
  if (flow !== expectedFlow && expectedFlow !== 'generic') return false;

  const expiresAt = parseInt(expiresAtStr, 10);
  if (isNaN(expiresAt)) return false;

  const now = Math.floor(Date.now() / 1000);
  if (now > expiresAt) return false;

  const keyBuffer = Buffer.isBuffer(key) ? key : Buffer.from(key, 'utf-8');
  const expectedSignature = createHmac('sha256', keyBuffer)
    .update(`${nonce}:${flow}:${expiresAt}`)
    .digest('hex');

  return timingSafeCompare(signature, expectedSignature);
}

export const generateFlowCsrfToken = generatePreAuthCsrfToken;
export const verifyFlowCsrfToken = verifyPreAuthCsrfToken;

export function validateOrigin(
  origin: string | null | undefined,
  referer: string | null | undefined,
  appUrl: string,
): boolean {
  let expectedOrigin: string;
  try {
    expectedOrigin = new URL(appUrl).origin;
  } catch {
    return false;
  }

  if (origin) {
    try {
      return new URL(origin).origin === expectedOrigin;
    } catch {
      return false;
    }
  }

  if (referer) {
    try {
      return new URL(referer).origin === expectedOrigin;
    } catch {
      return false;
    }
  }

  return false;
}

export const validateOriginOrReferer = validateOrigin;
