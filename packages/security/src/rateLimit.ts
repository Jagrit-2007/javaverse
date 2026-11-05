import { createHmac } from 'node:crypto';

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetSeconds: number;
  limit: number;
}

export function deriveRateLimitKey(
  actionOrPrefix: string,
  dimensionOrIdentifier: string,
  identifierOrKey?: string | Buffer,
  optionalKey?: Buffer | string,
): string {
  let action: string;
  let dimension: string;
  let identifier: string;
  let key: Buffer | string;

  if (optionalKey !== undefined) {
    action = actionOrPrefix;
    dimension = dimensionOrIdentifier;
    identifier = identifierOrKey as string;
    key = optionalKey;
  } else {
    action = actionOrPrefix;
    dimension = 'direct';
    identifier = dimensionOrIdentifier;
    key = identifierOrKey as Buffer | string;
  }

  const keyBuffer = Buffer.isBuffer(key) ? key : Buffer.from(key, 'utf-8');
  const digest = createHmac('sha256', keyBuffer)
    .update(`${action}:${dimension}:${identifier}`)
    .digest('hex')
    .slice(0, 32);
  return `ratelimit:${action}:${dimension}:${digest}`;
}

export function normalizeIp(rawIp: string): string {
  if (!rawIp || typeof rawIp !== 'string') return '127.0.0.1';
  let ip = rawIp.trim();

  // Strip IPv4-mapped IPv6 (e.g. ::ffff:192.0.2.1 -> 192.0.2.1)
  if (ip.startsWith('::ffff:')) {
    ip = ip.slice(7);
  }

  // IPv6 subnet masking (/64)
  if (ip.includes(':')) {
    const segments = ip.split(':');
    return `${segments.slice(0, 4).join(':')}::/64`;
  }

  return ip;
}

export const normalizeIpAddress = normalizeIp;

export function extractClientIp(
  headers: Headers | Record<string, string | undefined> | string,
  directPeerIpOrXff?: string,
  trustedProxiesOrList?: string | string[],
): string {
  const directPeerIp = typeof headers === 'string' ? headers : undefined;
  const headersObj: Headers | Record<string, string | undefined> | undefined =
    typeof headers === 'string' ? undefined : headers;
  let trustedProxies: string[] = [];

  if (Array.isArray(trustedProxiesOrList)) {
    trustedProxies = trustedProxiesOrList;
  } else if (typeof trustedProxiesOrList === 'string') {
    trustedProxies = trustedProxiesOrList
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
  }

  if (directPeerIp) {
    // Called with (directIp, xForwardedFor, trustedProxies)
    const xff = directPeerIpOrXff;
    if (trustedProxies.length === 0 || !trustedProxies.includes(directPeerIp)) {
      return normalizeIp(directPeerIp || '127.0.0.1');
    }
    if (!xff) {
      return normalizeIp(directPeerIp);
    }
    const parts = xff
      .split(',')
      .map((p) => p.trim())
      .filter(Boolean);
    for (let i = parts.length - 1; i >= 0; i--) {
      const hop = parts[i];
      if (hop && !trustedProxies.includes(hop)) {
        return normalizeIp(hop);
      }
    }
    return normalizeIp(directPeerIp);
  }

  // Called with (headers, directPeerIp, trustedProxies)
  const peerIp = directPeerIpOrXff;
  if (!headersObj) return normalizeIp(peerIp || '127.0.0.1');

  if (trustedProxies.length === 0 || !peerIp || !trustedProxies.includes(peerIp)) {
    return normalizeIp(peerIp || '127.0.0.1');
  }

  const xff =
    typeof (headersObj as Headers).get === 'function'
      ? (headersObj as Headers).get('x-forwarded-for')
      : (headersObj as Record<string, string | undefined>)['x-forwarded-for'];

  if (!xff) {
    return normalizeIp(peerIp);
  }

  const parts = xff
    .split(',')
    .map((p) => p.trim())
    .filter(Boolean);
  for (let i = parts.length - 1; i >= 0; i--) {
    const hop = parts[i];
    if (hop && !trustedProxies.includes(hop)) {
      return normalizeIp(hop);
    }
  }

  return normalizeIp(peerIp);
}
