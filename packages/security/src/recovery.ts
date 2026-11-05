import { randomBytes } from 'node:crypto';
import { hashToken } from './tokens';

// Crockford's Base32 alphabet (32 characters, excluding I, L, O, U to prevent visual confusion)
const CROCKFORD_CHARS = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';

export function generateSingleRecoveryCode(): string {
  // 16 chars from 32-char alphabet = 32^16 = 2^80 bits of entropy
  const bytes = randomBytes(16);
  let code = '';
  for (let i = 0; i < 16; i++) {
    const byte = bytes[i];
    const charIndex = (byte !== undefined ? byte : 0) % 32;
    code += CROCKFORD_CHARS[charIndex];
  }
  // Format into 4 groups of 4: XXXX-XXXX-XXXX-XXXX
  return `${code.slice(0, 4)}-${code.slice(4, 8)}-${code.slice(8, 12)}-${code.slice(12, 16)}`;
}

export function normalizeRecoveryCode(rawCode: string): string {
  if (!rawCode || typeof rawCode !== 'string') return '';
  return rawCode.toUpperCase().replace(/[^0-9A-Z]/g, '');
}

export function hashRecoveryCode(code: string, key: Buffer | string): string {
  const normalized = normalizeRecoveryCode(code);
  return hashToken(normalized, key, 'recovery_code');
}

export function generateRecoveryCodes(
  key: Buffer | string,
  count = 10,
): { rawCodes: string[]; hashedCodes: string[] } {
  const rawCodes: string[] = [];
  const hashedCodes: string[] = [];

  for (let i = 0; i < count; i++) {
    const raw = generateSingleRecoveryCode();
    rawCodes.push(raw);
    hashedCodes.push(hashRecoveryCode(raw, key));
  }

  return { rawCodes, hashedCodes };
}
