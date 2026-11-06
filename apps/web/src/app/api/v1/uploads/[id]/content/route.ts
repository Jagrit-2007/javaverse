import { NextRequest, NextResponse } from 'next/server';
import { extractSessionCookie, resolveSession } from '@/lib/auth';
import { jsonError } from '@/lib/apiResponse';
import { getAttachmentById } from '@/lib/uploads';
import { getCleanFile } from '@/lib/storage';

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

  // Quarantine check
  if (attachment.scanStatus === 'PENDING') {
    return jsonError(
      'FILE_QUARANTINED',
      'This file is currently in quarantine undergoing antivirus and security scanning.',
      423,
    );
  }

  if (attachment.scanStatus === 'INFECTED' || attachment.scanStatus === 'REJECTED') {
    return jsonError(
      'FILE_INFECTED',
      'This file failed security inspection and cannot be accessed.',
      410,
    );
  }

  const fileData = await getCleanFile(attachment.storageKey);
  if (!fileData) {
    return jsonError('NOT_FOUND', 'File content unavailable', 404);
  }

  const responseHeaders = new Headers();
  responseHeaders.set('Content-Type', attachment.mimeType);
  responseHeaders.set(
    'Content-Disposition',
    `attachment; filename="${encodeURIComponent(attachment.safeDisplayName)}"`,
  );
  responseHeaders.set('X-Content-Type-Options', 'nosniff');
  responseHeaders.set('Cache-Control', 'private, max-age=3600');

  return new NextResponse(new Uint8Array(fileData.buffer), {
    status: 200,
    headers: responseHeaders,
  });
}
