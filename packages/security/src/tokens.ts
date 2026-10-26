import { createHmac, timingSafeEqual } from 'node:crypto';

export type TokenDomain =
  'owner_bootstrap' | 'invitation' | 'email_verification' | 'password_reset' | 'session';

export function hashToken(token: string, secret: string, domain: TokenDomain): string {
  if (!token || !secret) {
    throw new Error('Token and secret are required for domain-separated token hashing');
  }
  return createHmac('sha256', secret).update(`javaverse:${domain}:${token}`).digest('hex');
}

export function timingSafeCompare(knownHexHash: string, candidateHexHash: string): boolean {
  if (typeof knownHexHash !== 'string' || typeof candidateHexHash !== 'string') {
    return false;
  }
  const knownBuffer = Buffer.from(knownHexHash, 'hex');
  const candidateBuffer = Buffer.from(candidateHexHash, 'hex');

  if (knownBuffer.length === 0 || knownBuffer.length !== candidateBuffer.length) {
    return false;
  }

  return timingSafeEqual(knownBuffer, candidateBuffer);
}
