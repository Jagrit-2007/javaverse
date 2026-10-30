/**
 * Content Security Policy utilities for JavaVerse (Part S10)
 *
 * Implements route-segregated CSP:
 * 1. Static public marketing routes: strict hash-based CSP compatible with SSG.
 * 2. Dynamic dashboard routes: fresh per-request cryptographic nonce.
 *
 * Note on style-src:
 * 'unsafe-inline' is permitted solely for dynamic CSS custom property theming
 * and framework hydration styles. Inline style attributes are minimized.
 */

export interface CspOptions {
  themeScriptHash?: string;
  nonce?: string;
  isDev?: boolean;
}

export { STATIC_THEME_SCRIPT_HASH, STATIC_ROUTE_SCRIPT_HASHES } from './static-hashes';
import { STATIC_THEME_SCRIPT_HASH, STATIC_ROUTE_SCRIPT_HASHES } from './static-hashes';

export function buildStaticCsp(hashes: string[] = STATIC_ROUTE_SCRIPT_HASHES): string {
  const scriptHashes = hashes.join(' ');
  return [
    "default-src 'self'",
    `script-src 'self' ${scriptHashes}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data:",
    "font-src 'self'",
    "connect-src 'self'",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join('; ');
}

export function buildDynamicNonceCsp(nonce: string, isDev = false): string {
  const evalDirective = isDev ? " 'unsafe-eval'" : '';

  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' ${STATIC_THEME_SCRIPT_HASH}${evalDirective}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data:",
    "font-src 'self'",
    "connect-src 'self'",
    "worker-src 'self' blob:",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join('; ');
}
