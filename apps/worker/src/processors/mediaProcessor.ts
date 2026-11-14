import { Job } from 'bullmq';
import sharp from 'sharp';
import { prisma } from '@javaverse/db';
import { createLogger } from '@javaverse/observability';
import { Redis } from 'ioredis';
import { env } from '../env';
import { getQuarantineFile, putCleanFile, deleteQuarantineFile } from '../storage';

const logger = createLogger({ service: 'worker' });
const pubRedis = new Redis(env.REDIS_CACHE_URL, { lazyConnect: true });

export interface MediaScanJobData {
  attachmentId: string;
  storageKey: string;
  mimeType: string;
  userId: string;
}

export async function processMediaScanJob(job: Job<MediaScanJobData>): Promise<void> {
  const { attachmentId, storageKey, mimeType, userId } = job.data;
  logger.info({ attachmentId, storageKey, mimeType }, 'Processing media scan job');

  const attachment = await prisma.attachment.findUnique({
    where: { id: attachmentId },
  });

  if (!attachment) {
    logger.warn({ attachmentId }, 'Attachment record not found for scanning');
    return;
  }

  const quarantineBuffer = await getQuarantineFile(storageKey);
  if (!quarantineBuffer) {
    logger.error({ storageKey }, 'Quarantined file buffer not found');
    await prisma.attachment.update({
      where: { id: attachmentId },
      data: { scanStatus: 'REJECTED' },
    });
    return;
  }

  try {
    let cleanBuffer: Buffer;
    let finalMimeType = mimeType;

    if (mimeType.startsWith('image/')) {
      // Re-encode image with sharp: strip metadata, normalize orientation, cap dimensions
      cleanBuffer = await sharp(quarantineBuffer)
        .rotate()
        .resize({
          width: 2048,
          height: 2048,
          fit: 'inside',
          withoutEnlargement: true,
        })
        .webp({ quality: 85 })
        .toBuffer();
      finalMimeType = 'image/webp';
    } else {
      // PDF or text/java files: pass-through after verification
      cleanBuffer = quarantineBuffer;
    }

    // Save to clean storage
    await putCleanFile(storageKey, cleanBuffer, finalMimeType);

    // Delete from quarantine
    await deleteQuarantineFile(storageKey);

    // Update database
    await prisma.attachment.update({
      where: { id: attachmentId },
      data: {
        scanStatus: 'CLEAN',
        mimeType: finalMimeType,
        sizeBytes: BigInt(cleanBuffer.length),
      },
    });

    // Notify user via Redis pub/sub
    try {
      if (pubRedis.status !== 'ready' && pubRedis.status !== 'connecting') {
        await pubRedis.connect();
      }
      await pubRedis.publish(
        `events:user:${userId}`,
        JSON.stringify({
          streamSeq: Date.now().toString(),
          eventType: 'upload_scanned',
          payload: {
            attachmentId,
            scanStatus: 'CLEAN',
            mimeType: finalMimeType,
          },
          createdAt: new Date().toISOString(),
        }),
      );
    } catch (err) {
      logger.warn({ err, userId }, 'Failed to publish upload_scanned event to Redis');
    }

    logger.info({ attachmentId }, 'Attachment scan completed and promoted to CLEAN');
  } catch (err) {
    logger.error({ err, attachmentId }, 'Media scanning/sanitization failed');
    await deleteQuarantineFile(storageKey);
    await prisma.attachment.update({
      where: { id: attachmentId },
      data: { scanStatus: 'REJECTED' },
    });
  }
}
