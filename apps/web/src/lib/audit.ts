import { prisma, type Prisma } from '@javaverse/db';
import { deriveAuditPseudonym, sanitizeAuditMetadata, hashIpAddress } from '@javaverse/security';
import { getServerKeys } from './keys';

export interface AuditLogParams {
  actorType: 'USER' | 'SYSTEM' | 'ANONYMOUS';
  actorUserId?: string | null;
  targetUserId?: string | null;
  systemName?: string;
  anonymousId?: string;
  action: string;
  metadata?: Record<string, unknown> | null;
  clientIp?: string | null;
  correlationId?: string | null;
  tx?: Prisma.TransactionClient;
}

export async function recordAuditEvent(params: AuditLogParams): Promise<void> {
  const keys = getServerKeys();
  let actorPseudonym: string;

  if (params.actorType === 'USER' && params.actorUserId) {
    actorPseudonym = deriveAuditPseudonym(params.actorUserId, keys.auditHmacKey, 'usr');
  } else if (params.actorType === 'SYSTEM') {
    actorPseudonym = `sys:${params.systemName || 'auth'}`;
  } else {
    actorPseudonym = deriveAuditPseudonym(
      params.anonymousId || 'unknown',
      keys.auditHmacKey,
      'anon',
    );
  }

  const hashedIp = params.clientIp ? hashIpAddress(params.clientIp, keys.rateLimitHmacKey) : null;
  const sanitized = params.metadata ? sanitizeAuditMetadata(params.metadata) : {};
  if (params.correlationId) {
    sanitized.correlation_id = params.correlationId;
  }

  const client = params.tx || prisma;

  try {
    await client.auditLog.create({
      data: {
        actorType: params.actorType,
        actorUserId: params.actorUserId || null,
        targetUserId: params.targetUserId || null,
        actorPseudonym,
        action: params.action,
        targetMetadata: sanitized as Prisma.InputJsonValue,
        ipAddress: hashedIp,
      },
    });
  } catch (error) {
    // If inside transaction, rethrow to abort
    if (params.tx) {
      throw error;
    }

    console.error('Failed to record audit event:', error);
  }
}
