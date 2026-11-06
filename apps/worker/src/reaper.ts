import { prisma, type Prisma } from '@javaverse/db';
import { createLogger } from '@javaverse/observability';
import { analysisQueue } from './queues';

const logger = createLogger({ service: 'worker' });

/**
 * Sweeps for stalled jobs with expired leases and handles recovery or failure.
 */
export async function sweepStalledJobs(): Promise<number> {
  const now = new Date();

  const stalledJobs = await prisma.durableJob.findMany({
    where: {
      status: 'RUNNING',
      leaseExpiresAt: {
        lt: now,
      },
    },
    take: 20,
  });

  if (stalledJobs.length === 0) return 0;

  logger.info({ count: stalledJobs.length }, 'Found stalled jobs with expired leases');

  for (const job of stalledJobs) {
    if (job.attempts < job.maxAttempts) {
      logger.warn({ jobId: job.id, attempts: job.attempts }, 'Recovering stalled job for retry');
      await prisma.durableJob.update({
        where: { id: job.id },
        data: {
          status: 'PENDING',
          leaseOwner: null,
          leaseExpiresAt: null,
        },
      });

      // Re-enqueue in BullMQ if not already queued
      try {
        await analysisQueue.add(
          'analyze-question',
          {
            jobId: job.id,
            chatId: job.chatId,
            userId: job.userId,
            correlationId: job.correlationId,
          },
          { jobId: `${job.id}-retry-${job.attempts}` },
        );
      } catch (err) {
        logger.error({ err, jobId: job.id }, 'Failed to re-enqueue recovered job');
      }
    } else {
      logger.error({ jobId: job.id }, 'Stalled job exceeded maxAttempts; marking FAILED');
      await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
        await tx.durableJob.update({
          where: { id: job.id },
          data: {
            status: 'FAILED',
            finishedAt: now,
          },
        });

        if (job.chatId) {
          await tx.message.updateMany({
            where: {
              chatId: job.chatId,
              status: { in: ['STREAMING', 'PENDING'] },
            },
            data: {
              status: 'FAILED',
              content: 'Processing encountered an unexpected failure. Please try again.',
            },
          });
        }

        if (job.userId) {
          const lastEvent = await tx.userStreamEvent.findFirst({
            where: { jobId: job.id },
            orderBy: { jobEventSeq: 'desc' },
            select: { jobEventSeq: true },
          });
          const nextSeq = (lastEvent?.jobEventSeq ?? 0) + 1;

          await tx.userStreamEvent.create({
            data: {
              jobEventSeq: nextSeq,
              userId: job.userId,
              chatId: job.chatId,
              jobId: job.id,
              eventType: 'job_failed',
              payload: {
                jobId: job.id,
                error: 'Job lease expired and max retries exceeded.',
              },
            },
          });
        }
      });
    }
  }

  return stalledJobs.length;
}

let reaperTimer: NodeJS.Timeout | null = null;

export function startReaper(intervalMs = 30000): void {
  if (reaperTimer) return;
  logger.info({ intervalMs }, 'Starting background job reaper...');
  reaperTimer = setInterval(() => {
    sweepStalledJobs().catch((err) => {
      logger.error({ err }, 'Error during stalled job sweep');
    });
  }, intervalMs);
}

export function stopReaper(): void {
  if (reaperTimer) {
    clearInterval(reaperTimer);
    reaperTimer = null;
    logger.info('Background job reaper stopped.');
  }
}
