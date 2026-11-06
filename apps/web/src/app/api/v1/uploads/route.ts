import { NextRequest } from 'next/server';
import { extractSessionCookie, resolveSession } from '@/lib/auth';
import { validateCsrf } from '@/lib/csrf';
import { jsonOk, jsonError } from '@/lib/apiResponse';
import { processUpload, UploadRateLimitError } from '@/lib/uploads';
import { SecurityValidationError } from '@javaverse/security';

function parseMultipartFallback(
  buffer: Buffer,
  contentType: string,
): { fileName: string; buffer: Buffer } | null {
  const boundaryMatch = contentType.match(/boundary=(?:"([^"]+)"|([^;]+))/i);
  if (!boundaryMatch) return null;
  const boundary = boundaryMatch[1] || boundaryMatch[2];
  if (!boundary) return null;

  const boundaryBuffer = Buffer.from(`--${boundary.trim()}`);
  const startIndex = buffer.indexOf(boundaryBuffer);
  if (startIndex === -1) return null;

  const headerStart = startIndex + boundaryBuffer.length;
  let headerEnd = buffer.indexOf('\r\n\r\n', headerStart);
  let delimiterLength = 4;
  if (headerEnd === -1) {
    headerEnd = buffer.indexOf('\n\n', headerStart);
    delimiterLength = 2;
  }
  if (headerEnd === -1) return null;

  const headerText = buffer.subarray(headerStart, headerEnd).toString('utf-8');
  const filenameMatch = headerText.match(/filename="?([^"\r\n;]+)"?/i);
  const fileName = filenameMatch ? filenameMatch[1]!.trim() : 'upload.bin';

  const bodyStart = headerEnd + delimiterLength;
  const nextBoundary = buffer.indexOf(boundaryBuffer, bodyStart);
  if (nextBoundary === -1) return null;

  let bodyEnd = nextBoundary;
  if (bodyEnd >= bodyStart + 2 && buffer[bodyEnd - 2] === 0x0d && buffer[bodyEnd - 1] === 0x0a) {
    bodyEnd -= 2;
  } else if (bodyEnd >= bodyStart + 1 && buffer[bodyEnd - 1] === 0x0a) {
    bodyEnd -= 1;
  }

  const contentBuffer = buffer.subarray(bodyStart, bodyEnd);
  return { fileName, buffer: contentBuffer };
}

export async function POST(request: NextRequest) {
  const sessionToken = extractSessionCookie(request);
  const auth = await resolveSession(sessionToken);

  if (!auth) {
    return jsonError('UNAUTHORIZED', 'Authentication required', 401);
  }

  const csrf = validateCsrf(request, { sessionId: auth.session.publicId });
  if (!csrf.valid) {
    return jsonError('CSRF_ERROR', csrf.reason || 'Invalid CSRF token', 403);
  }

  try {
    let fileName = 'upload.bin';
    let fileBuffer: Buffer | null = null;

    const contentType = request.headers.get('content-type') || '';
    const rawArrayBuffer = await request.arrayBuffer();
    const rawBuffer = Buffer.from(rawArrayBuffer);

    if (contentType.includes('multipart/form-data')) {
      const parsed = parseMultipartFallback(rawBuffer, contentType);
      if (parsed) {
        fileName = parsed.fileName;
        fileBuffer = parsed.buffer;
      }
    } else if (rawBuffer.length > 0) {
      fileName = request.headers.get('x-filename') || 'upload.bin';
      fileBuffer = rawBuffer;
    }

    if (!fileBuffer) {
      return jsonError('BAD_REQUEST', 'A valid file must be uploaded under the "file" field.', 400);
    }

    const attachment = await processUpload({
      userId: auth.user.id,
      buffer: fileBuffer,
      originalFileName: fileName,
    });

    return jsonOk(
      {
        attachment: {
          id: attachment.id,
          originalFileName: attachment.originalFileName,
          safeDisplayName: attachment.safeDisplayName,
          mimeType: attachment.mimeType,
          sizeBytes: Number(attachment.sizeBytes),
          scanStatus: attachment.scanStatus,
          createdAt: attachment.createdAt.toISOString(),
        },
      },
      { status: 201 },
    );
  } catch (err) {
    if (
      err instanceof UploadRateLimitError ||
      (err instanceof Error && err.name === 'UploadRateLimitError')
    ) {
      return jsonError('RATE_LIMITED', (err as Error).message, 429);
    }
    if (
      err instanceof SecurityValidationError ||
      (err instanceof Error && err.name === 'SecurityValidationError')
    ) {
      return jsonError('INVALID_FILE', (err as Error).message, 400);
    }
    const message = err instanceof Error ? err.message : 'Upload processing failed';
    return jsonError('INTERNAL_ERROR', message, 500);
  }
}
