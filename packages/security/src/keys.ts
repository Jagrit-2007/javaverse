import { hkdfSync } from 'node:crypto';

export interface KeyHierarchy {
  sessionTokenHmacKey: Buffer;
  authTokenHmacKey: Buffer;
  mfaEncryptionKey: Buffer;
  totpAesKey: Buffer;
  csrfSigningKey: Buffer;
  csrfHmacKey: Buffer;
  rateLimitKey: Buffer;
  rateLimitHmacKey: Buffer;
  auditPseudonymKey: Buffer;
  auditHmacKey: Buffer;
}

export function deriveKeyHierarchy(masterSecret: string): KeyHierarchy {
  if (!masterSecret || masterSecret.length < 32) {
    throw new Error('Master secret must be at least 32 characters for key derivation');
  }

  const ikm = Buffer.from(masterSecret, 'utf-8');
  const salt = Buffer.from('javaverse:key_hierarchy:salt:v1', 'utf-8');

  const sessionTokenHmacKey = Buffer.from(
    hkdfSync('sha256', ikm, salt, Buffer.from('javaverse:session_tokens:v1', 'utf-8'), 32),
  );
  const authTokenHmacKey = Buffer.from(
    hkdfSync('sha256', ikm, salt, Buffer.from('javaverse:auth_tokens:v1', 'utf-8'), 32),
  );
  const mfaEncryptionKey = Buffer.from(
    hkdfSync('sha256', ikm, salt, Buffer.from('javaverse:mfa_encryption:v1', 'utf-8'), 32),
  );
  const csrfSigningKey = Buffer.from(
    hkdfSync('sha256', ikm, salt, Buffer.from('javaverse:csrf_signing:v1', 'utf-8'), 32),
  );
  const rateLimitKey = Buffer.from(
    hkdfSync('sha256', ikm, salt, Buffer.from('javaverse:rate_limit:v1', 'utf-8'), 32),
  );
  const auditPseudonymKey = Buffer.from(
    hkdfSync('sha256', ikm, salt, Buffer.from('javaverse:audit_pseudonym:v1', 'utf-8'), 32),
  );

  return {
    sessionTokenHmacKey,
    authTokenHmacKey,
    mfaEncryptionKey,
    totpAesKey: mfaEncryptionKey,
    csrfSigningKey,
    csrfHmacKey: csrfSigningKey,
    rateLimitKey,
    rateLimitHmacKey: rateLimitKey,
    auditPseudonymKey,
    auditHmacKey: auditPseudonymKey,
  };
}

let cachedHierarchy: KeyHierarchy | null = null;
let cachedSecret: string | null = null;

export function getKeyHierarchy(masterSecret?: string): KeyHierarchy {
  const secret = masterSecret || process.env.APP_MASTER_KEY || process.env.SESSION_SECRET || '';

  if (!secret) {
    throw new Error('APP_MASTER_KEY or SESSION_SECRET must be configured');
  }

  if (cachedHierarchy && cachedSecret === secret) {
    return cachedHierarchy;
  }

  cachedHierarchy = deriveKeyHierarchy(secret);
  cachedSecret = secret;
  return cachedHierarchy;
}
