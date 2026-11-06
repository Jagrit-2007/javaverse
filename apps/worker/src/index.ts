import { Job, Worker } from 'bullmq';
import { createLogger } from '@javaverse/observability';
import { queueConnection } from './queues';
import { processAnalysisJob, type AnalysisJobData } from './processors/analysisProcessor';
import { processMediaScanJob, type MediaScanJobData } from './processors/mediaProcessor';
import { startReaper, stopReaper } from './reaper';

const logger = createLogger({ service: 'worker' });

logger.info('Initializing JavaVerse background worker...');

startReaper(30000);

const analysisWorker = new Worker(
  'analysis-queue',
  async (job: Job<AnalysisJobData>) => {
    return processAnalysisJob(job);
  },
  {
    connection: queueConnection,
    concurrency: 5,
  },
);

const mediaWorker = new Worker(
  'media-queue',
  async (job: Job<MediaScanJobData>) => {
    return processMediaScanJob(job);
  },
  {
    connection: queueConnection,
    concurrency: 5,
  },
);

analysisWorker.on('completed', (job) => {
  logger.info({ jobId: job.id }, 'Analysis job completed successfully');
});

analysisWorker.on('failed', (job, err) => {
  logger.error({ jobId: job?.id, err }, 'Analysis job processing failed');
});

mediaWorker.on('completed', (job) => {
  logger.info({ jobId: job.id }, 'Media scan job completed successfully');
});

mediaWorker.on('failed', (job, err) => {
  logger.error({ jobId: job?.id, err }, 'Media scan job processing failed');
});

async function shutdown(signal: string) {
  logger.info({ signal }, 'Shutting down background worker gracefully...');
  try {
    stopReaper();
    await analysisWorker.close();
    await mediaWorker.close();
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
