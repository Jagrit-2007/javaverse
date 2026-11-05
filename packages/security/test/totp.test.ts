import { describe, it, expect } from 'vitest';
import * as OTPAuth from 'otpauth';
import {
  generateTotpSecret,
  generateTotpUri,
  encryptTotpSecret,
  decryptTotpSecret,
  verifyTotpCode,
} from '../src/totp';

describe('TOTP Primitives & Encryption', () => {
  const mfaKey = Buffer.alloc(32, 0x5a); // 32-byte key
  const aad = 'javaverse:mfa_totp:test-user-uuid:v1';

  it('generates valid 20-byte base32 TOTP secrets', () => {
    const secret = generateTotpSecret();
    expect(secret).toHaveLength(32); // 20 bytes in base32 = 32 chars
  });

  it('generates valid otpauth URIs', () => {
    const secret = generateTotpSecret();
    const uri = generateTotpUri('learner@javaverse.local', secret);
    expect(uri).toContain('otpauth://totp/JavaVerse:learner%40javaverse.local');
    expect(uri).toContain(`secret=${secret}`);
  });

  it('encrypts and decrypts secrets with AES-256-GCM and bound AAD', () => {
    const secret = generateTotpSecret();
    const encrypted = encryptTotpSecret(secret, mfaKey, aad);

    expect(encrypted.startsWith('v1:')).toBe(true);

    const decrypted = decryptTotpSecret(encrypted, mfaKey, aad);
    expect(decrypted).toBe(secret);
  });

  it('fails decryption if AAD is tampered with', () => {
    const secret = generateTotpSecret();
    const encrypted = encryptTotpSecret(secret, mfaKey, aad);

    expect(() => decryptTotpSecret(encrypted, mfaKey, 'wrong-aad')).toThrow();
  });

  it('verifies valid TOTP codes and rejects replayed timesteps', () => {
    const secret = generateTotpSecret();
    const totp = new OTPAuth.TOTP({
      secret: OTPAuth.Secret.fromBase32(secret),
      digits: 6,
      period: 30,
    });

    const code = totp.generate();
    const verification = verifyTotpCode(secret, code);
    expect(verification.valid).toBe(true);
    expect(verification.timestep).toBeDefined();

    const usedTimestep = verification.timestep!;
    // Replay attempt with same timestep
    const replayCheck = verifyTotpCode(secret, code, usedTimestep);
    expect(replayCheck.valid).toBe(false);
    expect(replayCheck.reason).toContain('already been used');

    // Invalid code check
    const invalidCheck = verifyTotpCode(secret, '000000');
    expect(invalidCheck.valid).toBe(false);
  });
});
