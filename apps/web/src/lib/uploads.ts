import crypto from 'node:crypto';
import { prisma, type Attachment } from '@javaverse/db';
import { inspectFileBuffer, sanitizeFileName } from '@javaverse/security';
import { putQuarantineFile } from './storage';
import { enqueueMediaScanJob } from './queue';
import { checkRateLimit } from '@/lib/rateLimiter';

export class UploadRateLimitError extends Error {
  code = 'UPLOAD_RATE_LIMITED';
  constructor(message = 'Upload rate limit exceeded. Please wait a moment.') {
    super(message);
    this.name = 'UploadRateLimitError';
  }
}

export interface UploadOptions {
  userId: string;
  buffer: Buffer;
  originalFileName: string;
}

export async function processUpload(options: UploadOptions): Promise<Attachment> {
  const { userId, buffer, originalFileName } = options;

  // Rate limit: 10 uploads per minute per user
  const rl = await checkRateLimit({
    prefix: 'upload',
    identifier: userId,
    maxRequests: 10,
    windowSeconds: 60,
  });

  if (!rl.allowed) {
    throw new UploadRateLimitError();
  }

  // Inspect file & reject SVG or dangerous files
  const inspected = inspectFileBuffer(buffer, originalFileName);
  const safeName = sanitizeFileName(originalFileName);
  const storageKey = crypto.randomUUID();

  // Store in quarantine
  await putQuarantineFile(storageKey, buffer, inspected.mimeType);

  // Create database record
  const attachment = await prisma.attachment.create({
    data: {
      userId,
      storageKey,
      originalFileName,
      safeDisplayName: safeName,
      mimeType: inspected.mimeType,
      sizeBytes: BigInt(inspected.byteSize),
      sha256: inspected.sha256,
      scanStatus: 'PENDING',
    },
  });

  // Enqueue media worker job
  await enqueueMediaScanJob({
    attachmentId: attachment.id,
    storageKey,
    mimeType: inspected.mimeType,
    userId,
  });

  return attachment;
}

export async function getAttachmentById(id: string, userId: string): Promise<Attachment | null> {
  return prisma.attachment.findFirst({
    where: {
      id,
      userId,
    },
  });
}

export async function deleteAttachment(id: string, userId: string): Promise<boolean> {
  const attachment = await prisma.attachment.findFirst({
    where: { id, userId },
  });

  if (!attachment) {
    return false;
  }

  await prisma.attachment.delete({
    where: { id: attachment.id },
  });

  return true;
}
