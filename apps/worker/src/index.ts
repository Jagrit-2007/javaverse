import { Worker } from 'bullmq';
import { createLogger, runWithCorrelationContext } from '@javaverse/observability';
import { queueConnection } from './queues';

const logger = createLogger({ service: 'worker' });

logger.info('Initializing JavaVerse background worker...');

const worker = new Worker(
  'analysis-queue',
  async (job) => {
    const correlationId = (job.data as { correlationId?: string })?.correlationId;
    return runWithCorrelationContext({ correlationId }, async () => {
      logger.info({ jobId: job.id, queue: job.queueName }, 'Processing job');
      // Phase 1 foundation stub: no real AI or sandbox execution
      return { status: 'processed_in_phase_1_stub' };
    });
  },
  {
    connection: queueConnection,
    concurrency: 5,
  },
);

worker.on('completed', (job) => {
  logger.info({ jobId: job.id }, 'Job completed successfully');
});

worker.on('failed', (job, err) => {
  logger.error({ jobId: job?.id, err }, 'Job processing failed');
});

async function shutdown(signal: string) {
  logger.info({ signal }, 'Shutting down background worker gracefully...');
  try {
    await worker.close();
    await queueConnection.quit();
    logger.info('Background worker shutdown complete.');
    process.exit(0);
  } catch (err) {
    logger.error({ err }, 'Error during background worker shutdown');
    process.exit(1);
  }
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
