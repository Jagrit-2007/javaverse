import { describe, it, expect, beforeEach } from 'vitest';
import { prisma } from '@javaverse/db';
import { deriveTokenDigest } from '@javaverse/security';
import { getServerKeys } from '@/lib/keys';
import { createMemberInvitation, resendMemberInvitation, InvitationError } from '@/lib/invitations';

describe('Database Invariants & Concurrency', () => {
  beforeEach(async () => {
    // Clean test state
    await prisma.session.deleteMany();
    await prisma.recoveryCode.deleteMany();
    await prisma.mfaTotp.deleteMany();
    await prisma.emailToken.deleteMany();
    await prisma.invitation.deleteMany();
    await prisma.user.deleteMany();

    // Ensure deployment_limits has maxUsers = 5
    await prisma.deploymentLimits.upsert({
      where: { id: 1 },
      create: { id: 1, maxUsers: 5, registrationMode: 'invite_only' },
      update: { maxUsers: 5 },
    });
  });

  describe('OWNER Uniqueness Concurrency', () => {
    it('strictly enforces single active OWNER constraint under concurrent insertion', async () => {
      // Create first OWNER
      const owner1 = await prisma.user.create({
        data: {
          email: 'owner1@example.com',
          role: 'OWNER',
          status: 'ACTIVE',
        },
      });
      expect(owner1.id).toBeDefined();

      // Attempt to concurrently create 3 more OWNERs
      const attempts = await Promise.allSettled([
        prisma.user.create({
          data: { email: 'owner2@example.com', role: 'OWNER', status: 'ACTIVE' },
        }),
        prisma.user.create({
          data: { email: 'owner3@example.com', role: 'OWNER', status: 'ACTIVE' },
        }),
        prisma.user.create({
          data: { email: 'owner4@example.com', role: 'OWNER', status: 'ACTIVE' },
        }),
      ]);

      // All 3 concurrent attempts must be rejected by PostgreSQL partial index
      const rejected = attempts.filter((a) => a.status === 'rejected');
      expect(rejected.length).toBe(3);

      // Verify that exactly 1 active OWNER exists
      const totalOwners = await prisma.user.count({
        where: { role: 'OWNER', status: { not: 'DELETED' } },
      });
      expect(totalOwners).toBe(1);
    });
  });

  describe('Production Seat-Cap Advisory Lock Concurrency', () => {
    it('A. Invitation creation race: strictly allows exactly 1 invitation for 1 remaining seat under 10 concurrent requests', async () => {
      const MAX_USERS = 5;

      // Seed 1 OWNER (seat 1) and 3 MEMBERs (seats 2, 3, 4) -> 4 seats allocated, exactly 1 seat left
      const owner = await prisma.user.create({
        data: { email: 'owner@example.com', role: 'OWNER', status: 'ACTIVE' },
      });
      for (let i = 1; i <= 3; i++) {
        await prisma.user.create({
          data: { email: `member${i}@example.com`, role: 'MEMBER', status: 'ACTIVE' },
        });
      }

      const activeUsers = await prisma.user.count({
        where: { status: { in: ['ACTIVE', 'SUSPENDED', 'DELETION_PENDING'] } },
      });
      expect(activeUsers).toBe(4);

      // Launch 10 concurrent creation attempts for 10 distinct emails using the actual production service
      const candidateEmails = Array.from({ length: 10 }, (_, i) => `candidate${i + 1}@example.com`);

      const results = await Promise.allSettled(
        candidateEmails.map((email) =>
          createMemberInvitation({
            email,
            invitedByUserId: owner.id,
          }),
        ),
      );

      // Filter successes and failures
      const fulfilled = results.filter((r) => r.status === 'fulfilled');
      const rejected = results.filter((r) => r.status === 'rejected');

      // Exactly 1 must succeed
      expect(fulfilled.length).toBe(1);
      // Exactly 9 must be rejected with SEAT_CAPACITY_EXCEEDED
      expect(rejected.length).toBe(9);

      for (const rej of rejected) {
        if (rej.status === 'rejected') {
          expect(rej.reason).toBeInstanceOf(InvitationError);
          expect((rej.reason as InvitationError).code).toBe('SEAT_CAPACITY_EXCEEDED');
        }
      }

      // Verify final database state: exactly 4 active users + 1 pending invitation = 5
      const finalUsers = await prisma.user.count({
        where: { status: { in: ['ACTIVE', 'SUSPENDED', 'DELETION_PENDING'] } },
      });
      const finalPendingInvites = await prisma.invitation.count({
        where: { status: 'PENDING', expiresAt: { gt: new Date() } },
      });

      expect(finalUsers + finalPendingInvites).toBe(MAX_USERS);
      expect(finalPendingInvites).toBe(1);
    });

    it('B. Same-email race: allows only 1 pending invitation and rejects concurrent duplicates with PENDING_EXISTS', async () => {
      const owner = await prisma.user.create({
        data: { email: 'owner-same-email@example.com', role: 'OWNER', status: 'ACTIVE' },
      });

      // 5 concurrent creation attempts for the same normalized email
      const targetVariants = [
        'learner.same@example.com',
        'LEARNER.SAME@example.com',
        ' learner.same@example.com ',
        'Learner.Same@Example.COM',
        'learner.same@example.com',
      ];

      const results = await Promise.allSettled(
        targetVariants.map((email) =>
          createMemberInvitation({
            email,
            invitedByUserId: owner.id,
          }),
        ),
      );

      const fulfilled = results.filter((r) => r.status === 'fulfilled');
      const rejected = results.filter((r) => r.status === 'rejected');

      expect(fulfilled.length).toBe(1);
      expect(rejected.length).toBe(4);

      for (const rej of rejected) {
        if (rej.status === 'rejected') {
          expect(rej.reason).toBeInstanceOf(InvitationError);
          expect((rej.reason as InvitationError).code).toBe('PENDING_EXISTS');
        }
      }

      // Exactly 1 pending invitation exists in DB
      const pendingCount = await prisma.invitation.count({
        where: { emailNormalized: 'learner.same@example.com', status: 'PENDING' },
      });
      expect(pendingCount).toBe(1);
    });

    it('C. Resend: revokes prior invitation, creates fresh replacement, preserves seat count, and rejects old token', async () => {
      const owner = await prisma.user.create({
        data: { email: 'owner-resend@example.com', role: 'OWNER', status: 'ACTIVE' },
      });

      // 1. Create initial invitation
      const initial = await createMemberInvitation({
        email: 'resend.test@example.com',
        invitedByUserId: owner.id,
      });

      const initialInvite = await prisma.invitation.findUnique({
        where: { id: initial.invitation.id },
      });
      expect(initialInvite?.status).toBe('PENDING');

      // Verify 2 reserved seats (1 owner + 1 invite)
      const seatCountBefore =
        (await prisma.user.count({ where: { status: { not: 'DELETED' } } })) +
        (await prisma.invitation.count({
          where: { status: 'PENDING', expiresAt: { gt: new Date() } },
        }));
      expect(seatCountBefore).toBe(2);

      // 2. Resend invitation
      const resent = await resendMemberInvitation({
        invitationId: initial.invitation.id,
        invitedByUserId: owner.id,
      });

      // 3. Verify prior invitation was revoked
      const oldInvite = await prisma.invitation.findUnique({
        where: { id: initial.invitation.id },
      });
      expect(oldInvite?.status).toBe('REVOKED');

      // 4. Verify new invitation is pending
      const newInvite = await prisma.invitation.findUnique({
        where: { id: resent.newInvitation.id },
      });
      expect(newInvite?.status).toBe('PENDING');

      // 5. Verify reserved seat count remains unchanged (2 seats)
      const seatCountAfter =
        (await prisma.user.count({ where: { status: { not: 'DELETED' } } })) +
        (await prisma.invitation.count({
          where: { status: 'PENDING', expiresAt: { gt: new Date() } },
        }));
      expect(seatCountAfter).toBe(2);

      // 6. Verify old token cannot be used to find pending invitation
      const keys = getServerKeys();
      const oldDigest = deriveTokenDigest(initial.rawToken, 'invitation', keys.authTokenHmacKey);
      const oldAttempt = await prisma.invitation.findFirst({
        where: { tokenHash: oldDigest, status: 'PENDING', expiresAt: { gt: new Date() } },
      });
      expect(oldAttempt).toBeNull();

      // 7. Verify new token can be used to accept the invitation
      const newDigest = deriveTokenDigest(resent.rawToken, 'invitation', keys.authTokenHmacKey);
      const newAttempt = await prisma.invitation.findFirst({
        where: { tokenHash: newDigest, status: 'PENDING', expiresAt: { gt: new Date() } },
      });
      expect(newAttempt).not.toBeNull();
      expect(newAttempt?.id).toBe(resent.newInvitation.id);
    });
  });
});
