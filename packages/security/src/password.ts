import { hash, verify } from '@node-rs/argon2';
import { createHash } from 'node:crypto';
import { isCommonPassword } from './data/common-passwords';

export const DUMMY_ARGON2_HASH =
  '$argon2id$v=19$m=65536,t=3,p=4$exCKJmSfSQoJLDu7xMuuRQ$RA8khchIS+Puxsz7sKo4b+gx32OGm1tIkWjdmjb4PXQ';

export const ARGON2_CONFIG = {
  memoryCost: 65536,
  timeCost: 3,
  parallelism: 4,
  algorithm: 2 as const, // Argon2id
};

export async function hashPassword(password: string): Promise<string> {
  const policy = validatePasswordPolicy(password);
  if (!policy.valid) {
    throw new Error(policy.reason || 'Password policy violation');
  }
  return hash(password, ARGON2_CONFIG);
}

export async function verifyPassword(password: string, hashStr: string): Promise<boolean> {
  if (!password || !hashStr) return false;
  try {
    return await verify(hashStr, password);
  } catch {
    return false;
  }
}

export async function verifyDummyPassword(password: string): Promise<boolean> {
  try {
    return await verify(DUMMY_ARGON2_HASH, password);
  } catch {
    return false;
  }
}

export function validatePasswordPolicy(password: string): { valid: boolean; reason?: string } {
  if (typeof password !== 'string') {
    return { valid: false, reason: 'Password must be a string' };
  }
  if (/^\s|\s$/.test(password)) {
    return { valid: false, reason: 'Password cannot begin or end with whitespace.' };
  }
  if (password.length < 12) {
    return { valid: false, reason: 'Password must be at least 12 characters long' };
  }
  if (password.length > 128) {
    return { valid: false, reason: 'Password must not exceed 128 characters' };
  }
  if (isCommonPassword(password)) {
    return {
      valid: false,
      reason:
        'This password is too common and easily guessed. Please choose a more secure password.',
    };
  }
  return { valid: true };
}

export async function checkPasswordBreach(
  password: string,
  mode: 'degraded' | 'strict' = 'degraded',
): Promise<{ breached: boolean; count: number; degraded: boolean }> {
  // 1. Mandatory local blocklist check
  if (isCommonPassword(password)) {
    return { breached: true, count: 10000, degraded: false };
  }

  // 2. Privacy-preserving HIBP k-Anonymity range check
  try {
    const sha1Hex = createHash('sha1').update(password).digest('hex').toUpperCase();
    const prefix = sha1Hex.slice(0, 5);
    const suffix = sha1Hex.slice(5);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 1500);

    const response = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'JavaVerse-Password-Validator/1.0',
      },
    }).finally(() => clearTimeout(timeoutId));

    if (!response.ok) {
      if (mode === 'strict') {
        throw new Error(`HIBP responded with status ${response.status}`);
      }
      return { breached: false, count: 0, degraded: true };
    }

    const text = await response.text();
    const lines = text.split('\r\n');
    for (const line of lines) {
      const [hashSuffix, countStr] = line.split(':');
      if (hashSuffix && hashSuffix.trim() === suffix) {
        const count = parseInt(countStr || '1', 10);
        return { breached: true, count, degraded: false };
      }
    }

    return { breached: false, count: 0, degraded: false };
  } catch (err) {
    if (mode === 'strict') {
      throw new Error(`Breach check service unavailable in strict mode: ${(err as Error).message}`);
    }
    return { breached: false, count: 0, degraded: true };
  }
}
