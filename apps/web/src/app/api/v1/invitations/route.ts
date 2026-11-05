import { NextRequest } from 'next/server';
import { prisma } from '@javaverse/db';
import { createInvitationSchema } from '@javaverse/schemas';
import { validateCsrf } from '@/lib/csrf';
import { getSessionFromRequest, getSafeDisplayName } from '@/lib/auth';
import { sendMemberInvitationEmail } from '@/lib/email';
import { recordAuditEvent } from '@/lib/audit';
import { createMemberInvitation, InvitationError } from '@/lib/invitations';
import { jsonOk, jsonError } from '@/lib/apiResponse';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const sessionCtx = await getSessionFromRequest(request);
  if (!sessionCtx || sessionCtx.user.role !== 'OWNER') {
    return jsonError('FORBIDDEN', 'Only workspace owners can view invitations', 403);
  }

  const now = new Date();
  const invitations = await prisma.invitation.findMany({
    where: {
      status: 'PENDING',
      expiresAt: { gt: now },
    },
    orderBy: { createdAt: 'desc' },
  });

  return jsonOk({
    invitations: invitations.map((inv) => ({
      id: inv.id,
      email: inv.emailNormalized,
      role: inv.role,
      status: inv.status,
      expiresAt: inv.expiresAt.toISOString(),
      createdAt: inv.createdAt.toISOString(),
    })),
  });
}

export async function POST(request: NextRequest) {
  const sessionCtx = await getSessionFromRequest(request);
  if (!sessionCtx || sessionCtx.user.role !== 'OWNER') {
    return jsonError('FORBIDDEN', 'Only workspace owners can send invitations', 403);
  }

  const csrfResult = validateCsrf(request, { sessionId: sessionCtx.session.publicId });
  if (!csrfResult.valid) {
    return jsonError('CSRF_ERROR', csrfResult.reason || 'Invalid CSRF token', 403);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError('INVALID_REQUEST', 'Invalid JSON payload', 400);
  }

  const parsed = createInvitationSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(
      'VALIDATION_ERROR',
      'Valid email address is required',
      400,
      parsed.error.issues,
    );
  }

  // Execute invitation creation under transaction-scoped PostgreSQL advisory lock
  let invitationResult;
  try {
    invitationResult = await createMemberInvitation({
      email: parsed.data.email,
      invitedByUserId: sessionCtx.user.id,
    });
  } catch (err) {
    if (err instanceof InvitationError) {
      return jsonError(err.code, err.message, err.statusCode);
    }
    console.error('Failed to create invitation:', err);
    return jsonError('INTERNAL_ERROR', 'Failed to process invitation', 500);
  }

  const { invitation, rawToken } = invitationResult;

  // Send email asynchronously after transaction has committed
  sendMemberInvitationEmail({
    email: invitation.emailNormalized,
    token: rawToken,
    invitedByName: getSafeDisplayName(sessionCtx.user),
  }).catch((err) => {
    console.error('Failed to send invitation email:', err);
  });

  await recordAuditEvent({
    action: 'invitation.created',
    actorType: 'USER',
    actorUserId: sessionCtx.user.id,
    actorRoleAtTime: sessionCtx.user.role,
    metadata: {
      new_invitation_id: invitation.id,
    },
  });

  return jsonOk({
    invitation: {
      id: invitation.id,
      email: invitation.emailNormalized,
      expiresAt: invitation.expiresAt.toISOString(),
    },
  });
}
