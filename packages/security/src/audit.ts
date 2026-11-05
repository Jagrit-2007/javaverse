import { createHmac } from 'node:crypto';

export const ALLOWED_AUDIT_METADATA_KEYS = new Set([
  'route',
  'method',
  'status_code',
  'reason',
  'key_version',
  'target_role',
  'breach_check',
  'delivery_channel',
  'count',
  'revoked_session_public_id',
  'previous_invitation_id',
  'new_invitation_id',
]);

const UUID_METADATA_KEYS = new Set([
  'revoked_session_public_id',
  'previous_invitation_id',
  'new_invitation_id',
]);

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function deriveAuditPseudonym(
  typeOrId: 'user' | 'ip' | 'system' | string,
  idOrKey: string | Buffer,
  keyOrType?: Buffer | string,
): string {
  let type: 'user' | 'ip' | 'system';
  let identifier: string;
  let key: Buffer | string;

  if (
    keyOrType !== undefined &&
    typeof idOrKey === 'string' &&
    (typeOrId === 'user' || typeOrId === 'ip' || typeOrId === 'system')
  ) {
    type = typeOrId;
    identifier = idOrKey;
    key = keyOrType;
  } else {
    // Signature: (identifier: string, key: Buffer | string, type?: 'usr' | 'anon')
    identifier = typeOrId;
    key = idOrKey;
    const prefixType = typeof keyOrType === 'string' ? keyOrType : 'usr';
    type = prefixType === 'anon' ? 'ip' : 'user';
  }

  if (type === 'system') {
    return `sys:${identifier.replace(/[^a-zA-Z0-9_-]/g, '_')}`;
  }

  const keyBuffer = Buffer.isBuffer(key) ? key : Buffer.from(key, 'utf-8');
  const digest = createHmac('sha256', keyBuffer)
    .update(`audit:${type}:${identifier}`)
    .digest('hex')
    .slice(0, 16);

  return type === 'user' ? `usr_${digest}` : `anon_${digest}`;
}

export function hashIpAddress(ip: string, key: Buffer | string): string {
  const keyBuffer = Buffer.isBuffer(key) ? key : Buffer.from(key, 'utf-8');
  return createHmac('sha256', keyBuffer).update(`ip:${ip}`).digest('hex').slice(0, 32);
}

export function sanitizeAuditMetadata(
  metadata: Record<string, unknown> = {},
): Record<string, unknown> {
  const sanitized: Record<string, unknown> = {};

  for (const [k, v] of Object.entries(metadata)) {
    if (ALLOWED_AUDIT_METADATA_KEYS.has(k)) {
      if (UUID_METADATA_KEYS.has(k)) {
        // Enforce validated UUID format for identifier references
        if (typeof v === 'string' && UUID_REGEX.test(v)) {
          sanitized[k] = v;
        }
      } else if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') {
        sanitized[k] = v;
      }
    }
  }

  return sanitized;
}
