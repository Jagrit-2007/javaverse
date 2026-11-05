import { prisma, type Invitation } from '@javaverse/db';
import { canonicalizeEmail, generateRandomToken, deriveTokenDigest } from '@javaverse/security';
import { getServerKeys } from '@/lib/keys';
import { env } from '@/env';

export const INVITATION_ADVISORY_LOCK_ID = 74619283;

export class InvitationError extends Error {
  constructor(
    public readonly code:
      'USER_EXISTS' | 'PENDING_EXISTS' | 'SEAT_CAPACITY_EXCEEDED' | 'NOT_FOUND' | 'INVALID_EMAIL',
    message: string,
    public readonly statusCode: number = 400,
  ) {
    super(message);
    this.name = 'InvitationError';
  }
}

export interface CreateInvitationResult {
  invitation: Invitation;
  rawToken: string;
}

export interface ResendInvitationResult {
  newInvitation: Invitation;
  previousInvitationId: string;
  email: string;
  rawToken: string;
}

/**
 * Executes invitation creation under a PostgreSQL transaction-scoped advisory lock.
 * Serializes seat reservation and prevents concurrent seat cap overflows.
 */
export async function createMemberInvitation(params: {
  email: string;
  invitedByUserId?: string | null | undefined;
  prismaClient?: typeof prisma | undefined;
}): Promise<CreateInvitationResult> {
  const client = params.prismaClient || prisma;
  const canonicalEmail = canonicalizeEmail(params.email);

  return client.$transaction(async (tx) => {
    // 1. Acquire transaction-scoped advisory lock
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(${INVITATION_ADVISORY_LOCK_ID})`;

    const now = new Date();

    // 2. Mark stale pending invitations as EXPIRED under lock
    await tx.$executeRaw`
      UPDATE "invitations"
      SET "status" = 'EXPIRED', "updated_at" = ${now}
      WHERE "status" = 'PENDING'
        AND "expires_at" <= ${now}
    `;

    // 3. Verify user does not already exist with active/pending status
    const existingUser = await tx.user.findUnique({
      where: { email: canonicalEmail },
    });
    if (existingUser && existingUser.status !== 'DELETED') {
      throw new InvitationError(
        'USER_EXISTS',
        'A user with this email address already exists',
        409,
      );
    }

    // 4. Check whether a live PENDING invitation exists for this target email
    const existingPending = await tx.invitation.findFirst({
      where: {
        emailNormalized: canonicalEmail,
        status: 'PENDING',
        expiresAt: { gt: now },
      },
    });
    if (existingPending) {
      throw new InvitationError(
        'PENDING_EXISTS',
        'A live invitation already exists for this email. Use resend to issue a new token.',
        409,
      );
    }

    // 5. Count active/reserved users across ACTIVE, SUSPENDED, DELETION_PENDING
    const reservedUsers = await tx.user.count({
      where: {
        status: { in: ['ACTIVE', 'SUSPENDED', 'DELETION_PENDING'] },
      },
    });

    // 6. Count unexpired PENDING invitations
    const pendingInvitations = await tx.invitation.count({
      where: {
        status: 'PENDING',
        expiresAt: { gt: now },
      },
    });

    // 7. Read deployment limits max_users singleton (id = 1)
    const limits = await tx.deploymentLimits.findUnique({
      where: { id: 1 },
    });
    const maxUsers = limits?.maxUsers ?? env.MAX_USERS;

    // 8. Reject when reserved seats reach or exceed capacity
    if (reservedUsers + pendingInvitations >= maxUsers) {
      throw new InvitationError(
        'SEAT_CAPACITY_EXCEEDED',
        `Workspace seat cap of ${maxUsers} has been reached. Revoke an invitation or upgrade your plan.`,
        409,
      );
    }

    // 9. Generate random bearer token and derive HMAC digest
    const keys = getServerKeys();
    const rawToken = generateRandomToken(32);
    const tokenHash = deriveTokenDigest(rawToken, 'invitation', keys.authTokenHmacKey);
    const expiresAt = new Date(now.getTime() + 48 * 60 * 60 * 1000); // 48 hours

    // 10. Create new PENDING MEMBER invitation
    const invitation = await tx.invitation.create({
      data: {
        emailNormalized: canonicalEmail,
        tokenHash,
        role: 'MEMBER',
        status: 'PENDING',
        invitedByUserId: params.invitedByUserId || null,
        expiresAt,
      },
    });

    return { invitation, rawToken };
  });
}

/**
 * Resends an invitation under the advisory lock. Revokes the prior invitation
 * and issues a fresh replacement, preserving the reserved seat.
 */
export async function resendMemberInvitation(params: {
  invitationId?: string | undefined;
  email?: string | undefined;
  invitedByUserId?: string | null | undefined;
  prismaClient?: typeof prisma | undefined;
}): Promise<ResendInvitationResult> {
  const client = params.prismaClient || prisma;
  const canonicalEmail = params.email ? canonicalizeEmail(params.email) : undefined;

  return client.$transaction(async (tx) => {
    // 1. Acquire transaction-scoped advisory lock
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(${INVITATION_ADVISORY_LOCK_ID})`;

    const now = new Date();

    // 2. Mark stale pending invitations as EXPIRED
    await tx.$executeRaw`
      UPDATE "invitations"
      SET "status" = 'EXPIRED', "updated_at" = ${now}
      WHERE "status" = 'PENDING'
        AND "expires_at" <= ${now}
    `;

    // 3. Find existing pending invitation
    const existingInvitation = await tx.invitation.findFirst({
      where: params.invitationId
        ? { id: params.invitationId, status: 'PENDING', expiresAt: { gt: now } }
        : { emailNormalized: canonicalEmail!, status: 'PENDING', expiresAt: { gt: now } },
    });

    if (!existingInvitation) {
      throw new InvitationError(
        'NOT_FOUND',
        'Pending invitation not found or already expired',
        404,
      );
    }

    // 4. Atomically revoke prior invitation
    await tx.invitation.update({
      where: { id: existingInvitation.id },
      data: { status: 'REVOKED' },
    });

    // 5. Generate fresh replacement token and digest
    const keys = getServerKeys();
    const rawToken = generateRandomToken(32);
    const tokenHash = deriveTokenDigest(rawToken, 'invitation', keys.authTokenHmacKey);
    const expiresAt = new Date(now.getTime() + 48 * 60 * 60 * 1000); // 48 hours

    // 6. Create replacement invitation (preserves the single reserved seat)
    const newInvitation = await tx.invitation.create({
      data: {
        emailNormalized: existingInvitation.emailNormalized,
        tokenHash,
        role: 'MEMBER',
        status: 'PENDING',
        invitedByUserId: params.invitedByUserId || existingInvitation.invitedByUserId,
        expiresAt,
      },
    });

    return {
      newInvitation,
      previousInvitationId: existingInvitation.id,
      email: existingInvitation.emailNormalized,
      rawToken,
    };
  });
}
