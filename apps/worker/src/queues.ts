import { Queue } from 'bullmq';
import { Redis } from 'ioredis';
import { env } from './env';

export const queueConnection = new Redis(env.REDIS_QUEUE_URL, {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
});

export const analysisQueue = new Queue('analysis-queue', {
  connection: queueConnection,
});

export const cleanupQueue = new Queue('cleanup-queue', {
  connection: queueConnection,
});
