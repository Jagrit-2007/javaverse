import { NextRequest } from 'next/server';
import { extractSessionCookie, resolveSession } from '@/lib/auth';
import { validateCsrf } from '@/lib/csrf';
import { jsonOk, jsonError } from '@/lib/apiResponse';
import { getAttachmentById, deleteAttachment } from '@/lib/uploads';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  const sessionToken = extractSessionCookie(request);
  const auth = await resolveSession(sessionToken);

  if (!auth) {
    return jsonError('UNAUTHORIZED', 'Authentication required', 401);
  }

  const attachment = await getAttachmentById(id, auth.user.id);
  if (!attachment) {
    return jsonError('NOT_FOUND', 'Upload not found or access denied', 404);
  }

  return jsonOk({
    attachment: {
      id: attachment.id,
      originalFileName: attachment.originalFileName,
      safeDisplayName: attachment.safeDisplayName,
      mimeType: attachment.mimeType,
      sizeBytes: Number(attachment.sizeBytes),
      scanStatus: attachment.scanStatus,
      createdAt: attachment.createdAt.toISOString(),
    },
  });
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  const sessionToken = extractSessionCookie(request);
  const auth = await resolveSession(sessionToken);

  if (!auth) {
    return jsonError('UNAUTHORIZED', 'Authentication required', 401);
  }

  const csrf = validateCsrf(request, { sessionId: auth.session.publicId });
  if (!csrf.valid) {
    return jsonError('CSRF_ERROR', csrf.reason || 'Invalid CSRF token', 403);
  }

  const deleted = await deleteAttachment(id, auth.user.id);
  if (!deleted) {
    return jsonError('NOT_FOUND', 'Upload not found or access denied', 404);
  }

  return jsonOk({ success: true, message: 'Upload deleted.' });
}
