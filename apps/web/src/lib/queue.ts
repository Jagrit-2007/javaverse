import { Queue } from 'bullmq';
import { getRedisQueueClient } from './redis';

let analysisQueueInstance: Queue | null = null;
let mediaQueueInstance: Queue | null = null;

export function getAnalysisQueue(): Queue {
  if (!analysisQueueInstance) {
    analysisQueueInstance = new Queue('analysis-queue', {
      connection: getRedisQueueClient(),
    });
  }
  return analysisQueueInstance;
}

export function getMediaQueue(): Queue {
  if (!mediaQueueInstance) {
    mediaQueueInstance = new Queue('media-queue', {
      connection: getRedisQueueClient(),
    });
  }
  return mediaQueueInstance;
}

export interface AnalysisJobPayload {
  jobId: string;
  chatId: string;
  userId: string;
  messageId: string;
  userPrompt: string;
  correlationId: string;
}

export interface MediaScanJobPayload {
  attachmentId: string;
  storageKey: string;
  mimeType: string;
  userId: string;
}

/**
 * Enqueues a media scan/processing job into BullMQ.
 */
export async function enqueueMediaScanJob(payload: MediaScanJobPayload): Promise<void> {
  const queue = getMediaQueue();
  await queue.add('scan-media', payload, {
    jobId: `media-${payload.attachmentId}`,
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
    removeOnComplete: { count: 100 },
    removeOnFail: { count: 200 },
  });
}

/**
 * Enqueues an analysis job into BullMQ with deterministic job ID.
 */
export async function enqueueAnalysisJob(payload: AnalysisJobPayload): Promise<void> {
  const queue = getAnalysisQueue();
  await queue.add('analyze-question', payload, {
    jobId: payload.jobId,
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
    removeOnComplete: {
      count: 100,
    },
    removeOnFail: {
      count: 200,
    },
  });
}
