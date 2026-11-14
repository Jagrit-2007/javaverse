import { NextRequest } from 'next/server';
import {
  validateOriginOrReferer,
  generateSessionCsrfToken,
  generateFlowCsrfToken,
  verifySessionCsrfToken,
  verifyFlowCsrfToken,
} from '@javaverse/security';
import { getServerKeys } from './keys';
import { env } from '../env';
import { getRedisCacheClient } from './redis';

export interface CsrfValidationResult {
  valid: boolean;
  reason?: string;
}

// Bounded in-memory consumed token cache for replay protection.
// The fallback supports the current single-process local runtime but does not provide cross-process or multi-instance replay tracking.
const consumedNonces = new Map<string, number>();

function cleanExpiredNonces(): void {
  const now = Math.floor(Date.now() / 1000);
  for (const [nonce, expiresAt] of consumedNonces.entries()) {
    if (now > expiresAt) {
      consumedNonces.delete(nonce);
    }
  }
}

/**
 * Reset consumed nonces (primarily for test environments).
 */
export function resetConsumedTokens(): void {
  consumedNonces.clear();
}

/**
 * Returns canonical flow-specific cookie name with host prefix in production.
 */
export function getCsrfCookieName(flow: string): string {
  const isProd = process.env.NODE_ENV === 'production';
  return isProd ? `__Host-javaverse_csrf_${flow}` : `javaverse_csrf_${flow}`;
}

/**
 * Explicitly marks a flow CSRF token as consumed (one-time use upon state-changing success).
 */
export function consumeCsrfToken(token: string | null | undefined): void {
  if (!token || typeof token !== 'string') return;
  const parts = token.split('.');
  if (parts.length !== 4) return;
  const nonce = parts[0];
  const expiresAtStr = parts[2];
  const expiresAt = parseInt(expiresAtStr || '0', 10);
  if (!nonce) return;

  const exp = isNaN(expiresAt) || expiresAt <= 0 ? Math.floor(Date.now() / 1000) + 1800 : expiresAt;
  consumedNonces.set(nonce, exp);

  try {
    const redis = getRedisCacheClient();
    if (redis && redis.status === 'ready') {
      const ttl = Math.max(1, exp - Math.floor(Date.now() / 1000));
      redis.set(`csrf:consumed:${nonce}`, '1', 'EX', ttl).catch(() => {});
    }
  } catch {}
}

/**
 * Validates Origin/Referer and CSRF token for a state-changing NextRequest.
 */
export function validateCsrf(
  request: NextRequest,
  options: {
    sessionId?: string;
    flow?: string;
    consume?: boolean;
  },
): CsrfValidationResult {
  const method = request.method.toUpperCase();
  // Safe methods do not require CSRF token
  if (['GET', 'HEAD', 'OPTIONS'].includes(method)) {
    return { valid: true };
  }

  // 1. Validate Sec-Fetch-Site (defense-in-depth against cross-site requests)
  const secFetchSite = request.headers.get('sec-fetch-site');
  if (secFetchSite && secFetchSite === 'cross-site') {
    return { valid: false, reason: 'Cross-site request blocked by Sec-Fetch-Site' };
  }

  // 2. Validate Origin / Referer against canonical APP_URL
  const origin = request.headers.get('origin');
  const referer = request.headers.get('referer');
  const originValid = validateOriginOrReferer(origin, referer, env.APP_URL);
  if (!originValid) {
    return { valid: false, reason: 'Invalid or missing Origin/Referer header' };
  }

  // 3. Validate Synchronizer Token from x-csrf-token header
  const token = request.headers.get('x-csrf-token');
  if (!token) {
    return { valid: false, reason: 'Missing x-csrf-token header' };
  }

  const keys = getServerKeys();

  // 4. Session-bound token validation
  if (options.sessionId) {
    const valid = verifySessionCsrfToken(token, options.sessionId, keys.csrfHmacKey);
    return valid ? { valid: true } : { valid: false, reason: 'Invalid session CSRF token' };
  }

  // 5. Flow-bound pre-auth token validation
  if (options.flow) {
    const valid = verifyFlowCsrfToken(token, options.flow, keys.csrfHmacKey);
    if (!valid) {
      return { valid: false, reason: 'Invalid pre-auth CSRF token' };
    }

    const parts = token.split('.');
    const nonce = parts[0];

    // Verify cookie binding if cookie is provided
    const primaryCookieName = getCsrfCookieName(options.flow);
    const fallbackCookieName = `javaverse_csrf_${options.flow}`;
    const cookieVal =
      request.cookies.get(primaryCookieName)?.value ||
      request.cookies.get(fallbackCookieName)?.value;

    if (cookieVal && cookieVal !== nonce) {
      return { valid: false, reason: 'CSRF cookie mismatch' };
    }

    // Check replay protection (consumed token)
    cleanExpiredNonces();
    if (nonce && consumedNonces.has(nonce)) {
      return { valid: false, reason: 'CSRF token already consumed' };
    }

    if (options.consume) {
      consumeCsrfToken(token);
    }

    return { valid: true };
  }

  return { valid: false, reason: 'No session or flow context provided for CSRF check' };
}

/**
 * Creates a CSRF token for the client.
 */
export function createCsrfToken(options: { sessionId?: string; flow?: string }): string {
  const keys = getServerKeys();
  if (options.sessionId) {
    return generateSessionCsrfToken(options.sessionId, keys.csrfHmacKey);
  }
  if (options.flow) {
    return generateFlowCsrfToken(options.flow, keys.csrfHmacKey);
  }
  return generateFlowCsrfToken('general', keys.csrfHmacKey);
}
