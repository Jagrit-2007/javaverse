import { NextRequest } from 'next/server';
import { validateCsrf } from '@/lib/csrf';
import { getSessionFromRequest, getSafeDisplayName } from '@/lib/auth';
import { sendMemberInvitationEmail } from '@/lib/email';
import { recordAuditEvent } from '@/lib/audit';
import { resendMemberInvitation, InvitationError } from '@/lib/invitations';
import { jsonOk, jsonError } from '@/lib/apiResponse';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const sessionCtx = await getSessionFromRequest(request);
  if (!sessionCtx || sessionCtx.user.role !== 'OWNER') {
    return jsonError('FORBIDDEN', 'Only workspace owners can resend invitations', 403);
  }

  const csrfResult = validateCsrf(request, { sessionId: sessionCtx.session.publicId });
  if (!csrfResult.valid) {
    return jsonError('CSRF_ERROR', csrfResult.reason || 'Invalid CSRF token', 403);
  }

  let body: { invitationId?: string; email?: string } = {};
  try {
    body = await request.json();
  } catch {
    return jsonError('INVALID_REQUEST', 'Invalid JSON payload', 400);
  }

  if (!body.invitationId && !body.email) {
    return jsonError('VALIDATION_ERROR', 'invitationId or email is required', 400);
  }

  let resendResult;
  try {
    resendResult = await resendMemberInvitation({
      invitationId: body.invitationId,
      email: body.email,
      invitedByUserId: sessionCtx.user.id,
    });
  } catch (err) {
    if (err instanceof InvitationError) {
      return jsonError(err.code, err.message, err.statusCode);
    }
    console.error('Failed to resend invitation:', err);
    return jsonError('INTERNAL_ERROR', 'Failed to process invitation resend', 500);
  }

  const { newInvitation, rawToken, previousInvitationId, email } = resendResult;

  // Send email asynchronously after transaction commits
  sendMemberInvitationEmail({
    email,
    token: rawToken,
    invitedByName: getSafeDisplayName(sessionCtx.user),
  }).catch((err) => {
    console.error('Failed to resend invitation email:', err);
  });

  await recordAuditEvent({
    action: 'invitation.resent',
    actorType: 'USER',
    actorUserId: sessionCtx.user.id,
    actorRoleAtTime: sessionCtx.user.role,
    metadata: {
      previous_invitation_id: previousInvitationId,
      new_invitation_id: newInvitation.id,
    },
  });

  return jsonOk({
    invitation: {
      id: newInvitation.id,
      email: newInvitation.emailNormalized,
      expiresAt: newInvitation.expiresAt.toISOString(),
    },
  });
}
