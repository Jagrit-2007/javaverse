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

export interface CsrfValidationResult {
  valid: boolean;
  reason?: string;
}

/**
 * Validates Origin/Referer and CSRF token for a state-changing NextRequest.
 */
export function validateCsrf(
  request: NextRequest,
  options: {
    sessionId?: string;
    flow?: string;
  },
): CsrfValidationResult {
  const method = request.method.toUpperCase();
  // Safe methods do not require CSRF token
  if (['GET', 'HEAD', 'OPTIONS'].includes(method)) {
    return { valid: true };
  }

  // 1. Validate Origin / Referer
  const origin = request.headers.get('origin');
  const referer = request.headers.get('referer');
  const originValid = validateOriginOrReferer(origin, referer, env.APP_URL);
  if (!originValid) {
    return { valid: false, reason: 'Invalid or missing Origin/Referer header' };
  }

  // 2. Validate Synchronizer Token from x-csrf-token header
  const token = request.headers.get('x-csrf-token');
  if (!token) {
    return { valid: false, reason: 'Missing x-csrf-token header' };
  }

  const keys = getServerKeys();

  if (options.sessionId) {
    const valid = verifySessionCsrfToken(token, options.sessionId, keys.csrfHmacKey);
    return valid ? { valid: true } : { valid: false, reason: 'Invalid session CSRF token' };
  }

  if (options.flow) {
    const valid = verifyFlowCsrfToken(token, options.flow, keys.csrfHmacKey);
    return valid ? { valid: true } : { valid: false, reason: 'Invalid pre-auth CSRF token' };
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
