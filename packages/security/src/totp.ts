import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';
import * as OTPAuth from 'otpauth';

export function generateTotpSecret(): string {
  const secret = new OTPAuth.Secret({ size: 20 });
  return secret.base32;
}

export function generateTotpUri(
  accountNameOrOptions: string | { secret: string; account?: string; issuer?: string },
  secretBase32?: string,
  issuer = 'JavaVerse',
): string {
  let account: string;
  let secretStr: string;
  let issuerStr: string;

  if (typeof accountNameOrOptions === 'object') {
    account = accountNameOrOptions.account || 'owner@javaverse.local';
    secretStr = accountNameOrOptions.secret;
    issuerStr = accountNameOrOptions.issuer || 'JavaVerse';
  } else {
    account = accountNameOrOptions;
    secretStr = secretBase32!;
    issuerStr = issuer;
  }

  const totp = new OTPAuth.TOTP({
    issuer: issuerStr,
    label: account,
    algorithm: 'SHA1',
    digits: 6,
    period: 30,
    secret: OTPAuth.Secret.fromBase32(secretStr),
  });
  return totp.toString();
}

export function encryptTotpSecret(secret: string, key: Buffer, aad: string): string {
  if (key.length !== 32) {
    throw new Error('MFA encryption key must be 32 bytes (256 bits)');
  }
  const nonce = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, nonce);
  cipher.setAAD(Buffer.from(aad, 'utf-8'));

  const ciphertext = Buffer.concat([cipher.update(secret, 'utf-8'), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return `v1:${nonce.toString('hex')}:${authTag.toString('hex')}:${ciphertext.toString('hex')}`;
}

export function decryptTotpSecret(encryptedStr: string, key: Buffer, aad: string): string {
  if (key.length !== 32) {
    throw new Error('MFA encryption key must be 32 bytes (256 bits)');
  }
  const parts = encryptedStr.split(':');
  if (parts.length !== 4 || parts[0] !== 'v1') {
    throw new Error('Invalid or unsupported encrypted TOTP secret format');
  }

  const [, nonceHex, tagHex, ciphertextHex] = parts;
  if (!nonceHex || !tagHex || !ciphertextHex) {
    throw new Error('Malformed encrypted TOTP payload');
  }

  const nonce = Buffer.from(nonceHex, 'hex');
  const authTag = Buffer.from(tagHex, 'hex');
  const ciphertext = Buffer.from(ciphertextHex, 'hex');

  const decipher = createDecipheriv('aes-256-gcm', key, nonce);
  decipher.setAAD(Buffer.from(aad, 'utf-8'));
  decipher.setAuthTag(authTag);

  const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  return decrypted.toString('utf-8');
}

export function verifyTotpCode(
  secretBase32: string,
  candidateCode: string,
  lastUsedTimestep?: bigint | null,
): { valid: boolean; timestep?: bigint; reason?: string } {
  if (!candidateCode || typeof candidateCode !== 'string') {
    return { valid: false, reason: 'Invalid code format' };
  }

  const cleanedCode = candidateCode.trim().replace(/\s+/g, '');
  if (!/^\d{6}$/.test(cleanedCode)) {
    return { valid: false, reason: 'Code must be 6 digits' };
  }

  let secret: OTPAuth.Secret;
  try {
    secret = OTPAuth.Secret.fromBase32(secretBase32);
  } catch {
    return { valid: false, reason: 'Invalid TOTP secret' };
  }

  const totp = new OTPAuth.TOTP({
    algorithm: 'SHA1',
    digits: 6,
    period: 30,
    secret,
  });

  const delta = totp.validate({ token: cleanedCode, window: 1 });
  if (delta === null) {
    return { valid: false, reason: 'Invalid or expired TOTP code' };
  }

  const currentStep = BigInt(Math.floor(Date.now() / 30000));
  const verifiedTimestep = currentStep + BigInt(delta);

  if (lastUsedTimestep !== undefined && lastUsedTimestep !== null) {
    if (verifiedTimestep <= lastUsedTimestep) {
      return { valid: false, reason: 'TOTP code has already been used' };
    }
  }

  return { valid: true, timestep: verifiedTimestep };
}

export function validateTotpCode(options: {
  secret: string;
  token: string;
  lastUsedTimestep?: bigint | null;
  window?: number;
}): { valid: boolean; timestep: bigint | null; reason?: string } {
  const res = verifyTotpCode(options.secret, options.token, options.lastUsedTimestep);
  return {
    valid: res.valid,
    timestep: res.timestep ?? null,
    ...(res.reason ? { reason: res.reason } : {}),
  };
}

export function generateTotpCode(secretBase32: string): string {
  const totp = new OTPAuth.TOTP({
    algorithm: 'SHA1',
    digits: 6,
    period: 30,
    secret: OTPAuth.Secret.fromBase32(secretBase32),
  });
  return totp.generate();
}
