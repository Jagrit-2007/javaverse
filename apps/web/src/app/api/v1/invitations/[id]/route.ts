import { NextRequest } from 'next/server';
import { prisma } from '@javaverse/db';
import { validateCsrf } from '@/lib/csrf';
import { getSessionFromRequest } from '@/lib/auth';
import { recordAuditEvent } from '@/lib/audit';
import { jsonOk, jsonError } from '@/lib/apiResponse';

export const dynamic = 'force-dynamic';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const sessionCtx = await getSessionFromRequest(request);
  if (!sessionCtx || sessionCtx.user.role !== 'OWNER') {
    return jsonError('FORBIDDEN', 'Only workspace owners can revoke invitations', 403);
  }

  const { id } = await params;
  if (!id) {
    return jsonError('INVALID_REQUEST', 'Invitation ID is required', 400);
  }

  const csrfResult = validateCsrf(request, { sessionId: sessionCtx.session.publicId });
  if (!csrfResult.valid) {
    return jsonError('CSRF_ERROR', csrfResult.reason || 'Invalid CSRF token', 403);
  }

  const invitation = await prisma.invitation.findUnique({
    where: { id },
  });

  if (!invitation) {
    return jsonError('NOT_FOUND', 'Invitation not found', 404);
  }

  if (invitation.status !== 'PENDING') {
    return jsonError(
      'INVALID_STATE',
      `Cannot revoke an invitation with status: ${invitation.status}`,
      400,
    );
  }

  await prisma.invitation.update({
    where: { id },
    data: { status: 'REVOKED' },
  });

  await recordAuditEvent({
    action: 'invitation.revoked',
    actorType: 'USER',
    actorUserId: sessionCtx.user.id,
    actorRoleAtTime: sessionCtx.user.role,
    metadata: {
      invitation_id: id,
      email: invitation.emailNormalized,
    },
  });

  return jsonOk({ success: true });
}
