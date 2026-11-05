import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

export type TokenPurpose =
  | 'owner_bootstrap'
  | 'invitation'
  | 'email_verification'
  | 'password_reset'
  | 'recovery_code'
  | 'session'
  | 'mfa_ticket';

export function generateRandomToken(bytes = 32): string {
  return randomBytes(bytes).toString('hex');
}

export function hashToken(
  token: string,
  key: Buffer | string,
  purpose: TokenPurpose | string,
): string {
  if (!token || !key) {
    throw new Error('Token and key are required for purpose-bound token hashing');
  }
  const keyBuffer = Buffer.isBuffer(key) ? key : Buffer.from(key, 'utf-8');
  return createHmac('sha256', keyBuffer).update(`${purpose}:${token}`).digest('hex');
}

export function deriveTokenDigest(
  token: string,
  purpose: TokenPurpose | string,
  key: Buffer | string,
): string {
  return hashToken(token, key, purpose.toLowerCase());
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

export function verifyTokenDigest(
  rawToken: string,
  storedHash: string,
  primaryKey: Buffer | string,
  purpose: TokenPurpose | string,
  fallbackKey?: Buffer | string,
): { valid: boolean; requiresRehash: boolean } {
  const primaryHash = hashToken(rawToken, primaryKey, purpose);
  if (timingSafeCompare(storedHash, primaryHash)) {
    return { valid: true, requiresRehash: false };
  }

  if (fallbackKey) {
    const fallbackHash = hashToken(rawToken, fallbackKey, purpose);
    if (timingSafeCompare(storedHash, fallbackHash)) {
      return { valid: true, requiresRehash: true };
    }
  }

  return { valid: false, requiresRehash: false };
}
