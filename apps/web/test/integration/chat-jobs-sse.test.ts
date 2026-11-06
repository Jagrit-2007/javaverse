import { describe, it, expect, beforeEach } from 'vitest';
import { prisma } from '@javaverse/db';
import { createChatInFirstFreeSlot, postUserMessage, cancelChatJob } from '@/lib/chats';
import { handleUserEventStream } from '@/lib/events';
import { NextRequest } from 'next/server';
import { processAnalysisJob } from '../../../../apps/worker/src/processors/analysisProcessor';
import { sweepStalledJobs } from '../../../../apps/worker/src/reaper';

describe('Phase 4: Durable Jobs, Mock Worker & SSE Streaming', () => {
  let userId: string;
  let chatId: string;

  beforeEach(async () => {
    // Clean test state
    await prisma.userStreamEvent.deleteMany();
    await prisma.durableJob.deleteMany();
    await prisma.analysis.deleteMany();
    await prisma.message.deleteMany();
    await prisma.chatState.deleteMany();
    await prisma.chat.deleteMany();
    await prisma.user.deleteMany();

    const u = await prisma.user.create({
      data: {
        email: 'learner-jobs@example.com',
        role: 'MEMBER',
        status: 'ACTIVE',
      },
    });
    userId = u.id;

    const c = await createChatInFirstFreeSlot(userId, 'Binary Search Invariants');
    chatId = c.id;
  });

  describe('Message Submission & Job Creation', () => {
    it('creates message, placeholder assistant message, durable job, and initial stream event', async () => {
      const result = await postUserMessage({
        chatId,
        userId,
        content: 'How do I implement binary search without off-by-one errors?',
        correlationId: 'test-corr-1',
      });

      expect(result.userMessage.role).toBe('USER');
      expect(result.userMessage.status).toBe('SENT');
      expect(result.assistantMessage.role).toBe('ASSISTANT');
      expect(result.assistantMessage.status).toBe('STREAMING');
      expect(result.job.status).toBe('PENDING');
      expect(result.job.stage).toBe('reading');

      // Verify stream event in DB
      const events = await prisma.userStreamEvent.findMany({
        where: { jobId: result.job.id },
      });
      expect(events.length).toBe(1);
      expect(events[0]?.eventType).toBe('stage_changed');
    });

    it('rejects oversized messages exceeding 10,000 characters', async () => {
      const hugeContent = 'a'.repeat(10001);
      await expect(
        postUserMessage({
          chatId,
          userId,
          content: hugeContent,
          correlationId: 'test-corr-huge',
        }),
      ).rejects.toThrow('Message exceeds 10,000 character maximum limit.');
    });
  });

  describe('Worker Processing & Mock Pipeline', () => {
    it('executes staged pipeline, persists analysis record, and marks job COMPLETED', async () => {
      const submission = await postUserMessage({
        chatId,
        userId,
        content: 'Show me binary search with visual array pointers',
        correlationId: 'test-corr-exec',
      });

      // Simulate worker processing
      const workerResult = await processAnalysisJob({
        data: {
          jobId: submission.job.id,
          chatId,
          userId,
          messageId: submission.assistantMessage.id,
          userPrompt: 'Show me binary search with visual array pointers',
          correlationId: 'test-corr-exec',
        },
      } as any);

      expect(workerResult.status).toBe('completed');

      // Verify DB job state
      const completedJob = await prisma.durableJob.findUnique({
        where: { id: submission.job.id },
      });
      expect(completedJob?.status).toBe('COMPLETED');
      expect(completedJob?.progress).toBe(100);
      expect(completedJob?.finishedAt).toBeDefined();

      // Verify assistant message was updated
      const updatedMessage = await prisma.message.findUnique({
        where: { id: submission.assistantMessage.id },
      });
      expect(updatedMessage?.status).toBe('SENT');
      expect(updatedMessage?.content).toContain('Verified ✅');

      // Verify Analysis row was created with pedagogical solution & visualizations
      const analysis = await prisma.analysis.findUnique({
        where: { messageId: submission.assistantMessage.id },
      });
      expect(analysis).toBeDefined();
      expect(analysis?.verificationStatus).toBe('VERIFIED_CORRECT');
      const res = analysis?.result as any;
      expect(res.solution.code).toContain('public class Solution');
      expect(res.visualizations[0].kind).toBe('array');

      // Verify events stream records
      const allEvents = await prisma.userStreamEvent.findMany({
        where: { jobId: submission.job.id },
        orderBy: { streamSeq: 'asc' },
      });
      // 1 initial + 6 stages + 1 final = 8 events
      expect(allEvents.length).toBeGreaterThanOrEqual(7);
      expect(allEvents[allEvents.length - 1]?.eventType).toBe('job_completed');
    });
  });

  describe('Cancellation Semantics', () => {
    it('cancelling an active job marks it CANCELLED and halts further output', async () => {
      const submission = await postUserMessage({
        chatId,
        userId,
        content: 'Long running task that learner wants to stop',
        correlationId: 'test-corr-cancel',
      });

      // User calls cancel
      await cancelChatJob(chatId, userId);

      const jobAfterCancel = await prisma.durableJob.findUnique({
        where: { id: submission.job.id },
      });
      expect(jobAfterCancel?.status).toBe('CANCELLED');

      // When worker picks it up, it aborts immediately
      const workerResult = await processAnalysisJob({
        data: {
          jobId: submission.job.id,
          chatId,
          userId,
          messageId: submission.assistantMessage.id,
          userPrompt: 'Cancelled task',
          correlationId: 'test-corr-cancel',
        },
      } as any);

      expect(workerResult.status).toBe('cancelled');
    });
  });

  describe('SSE Connection Limiting & Cursor Replay', () => {
    it('enforces maximum 3 concurrent SSE connections per user and rejects 4th with 429', async () => {
      const req1 = new NextRequest('http://localhost:3000/api/v1/events');
      const req2 = new NextRequest('http://localhost:3000/api/v1/events');
      const req3 = new NextRequest('http://localhost:3000/api/v1/events');
      const req4 = new NextRequest('http://localhost:3000/api/v1/events');

      const res1 = await handleUserEventStream(req1, userId);
      const res2 = await handleUserEventStream(req2, userId);
      const res3 = await handleUserEventStream(req3, userId);
      const res4 = await handleUserEventStream(req4, userId);

      // First 3 connections succeed with 200 text/event-stream
      expect(res1.status).toBe(200);
      expect(res1.headers.get('Content-Type')).toContain('text/event-stream');
      expect(res2.status).toBe(200);
      expect(res3.status).toBe(200);

      // 4th connection is rejected with 429 SSE_CONNECTION_LIMIT_REACHED
      expect(res4.status).toBe(429);
      const errJson = await res4.json();
      expect(errJson.error.code).toBe('SSE_CONNECTION_LIMIT_REACHED');

      // Cleanup
      res1.body?.cancel();
      res2.body?.cancel();
      res3.body?.cancel();
    });
  });

  describe('Stalled Job Recovery & Reaper Resilience', () => {
    it('recovers stalled job with expired lease and re-enqueues valid shared payload', async () => {
      const submission = await postUserMessage({
        chatId,
        userId,
        content: 'Explain dynamic programming memoization in Java',
        correlationId: 'test-corr-reaper-1',
      });

      // Simulate worker crash: job left in RUNNING with expired lease
      await prisma.durableJob.update({
        where: { id: submission.job.id },
        data: {
          status: 'RUNNING',
          leaseOwner: 'worker-dead-node',
          leaseExpiresAt: new Date(Date.now() - 5000), // Expired 5 seconds ago
          attempts: 1,
        },
      });

      // Sweep for stalled jobs
      const recoveredCount = await sweepStalledJobs();
      expect(recoveredCount).toBe(1);

      // Verify DB job transitioned to PENDING with cleared lease
      const recoveredJob = await prisma.durableJob.findUnique({
        where: { id: submission.job.id },
      });
      expect(recoveredJob?.status).toBe('PENDING');
      expect(recoveredJob?.leaseOwner).toBeNull();
      expect(recoveredJob?.leaseExpiresAt).toBeNull();

      // Subsequent sweep should be idempotent and find 0 jobs
      const secondSweep = await sweepStalledJobs();
      expect(secondSweep).toBe(0);

      // Worker picks up recovered job (payload contains messageId, userPrompt resolved from PostgreSQL)
      const workerResult = await processAnalysisJob({
        data: {
          jobId: submission.job.id,
          chatId,
          userId,
          messageId: submission.assistantMessage.id,
          correlationId: 'test-corr-reaper-1',
        },
      } as any);

      expect(workerResult.status).toBe('completed');

      // Verify analysis completed and assistant message was updated
      const completedJob = await prisma.durableJob.findUnique({
        where: { id: submission.job.id },
      });
      expect(completedJob?.status).toBe('COMPLETED');

      const updatedMsg = await prisma.message.findUnique({
        where: { id: submission.assistantMessage.id },
      });
      expect(updatedMsg?.status).toBe('SENT');
      expect(updatedMsg?.content).toContain('Verified ✅');
    });

    it('gracefully handles missing message without crashing worker', async () => {
      const submission = await postUserMessage({
        chatId,
        userId,
        content: 'Task with message to delete',
        correlationId: 'test-corr-missing-msg',
      });

      // Delete the assistant message from DB
      await prisma.message.delete({
        where: { id: submission.assistantMessage.id },
      });

      // Worker attempts to process
      const workerResult = await processAnalysisJob({
        data: {
          jobId: submission.job.id,
          chatId,
          userId,
          messageId: submission.assistantMessage.id,
          correlationId: 'test-corr-missing-msg',
        },
      } as any);

      expect(workerResult.status).toBe('missing_message');

      const failedJob = await prisma.durableJob.findUnique({
        where: { id: submission.job.id },
      });
      expect(failedJob?.status).toBe('FAILED');
    });

    it('rejects malformed payloads predictably rather than crashing the worker', async () => {
      const invalidPayload = {
        jobId: 'not-a-valid-uuid',
        chatId,
        userId,
        messageId: 'invalid-id',
        correlationId: 'corr-malformed',
      };

      const workerResult = await processAnalysisJob({
        data: invalidPayload,
      } as any);

      expect(workerResult.status).toBe('malformed_payload');
    });

    it('transitions job to FAILED and creates stream event when maxAttempts is exceeded', async () => {
      const submission = await postUserMessage({
        chatId,
        userId,
        content: 'Task that repeatedly crashes',
        correlationId: 'test-corr-max-attempts',
      });

      // Simulate job exceeding maxAttempts (attempts = 3, maxAttempts = 3)
      await prisma.durableJob.update({
        where: { id: submission.job.id },
        data: {
          status: 'RUNNING',
          leaseOwner: 'worker-dead-node',
          leaseExpiresAt: new Date(Date.now() - 5000),
          attempts: 3,
          maxAttempts: 3,
        },
      });

      // Sweep should terminally fail the job
      const recoveredCount = await sweepStalledJobs();
      expect(recoveredCount).toBe(1);

      const failedJob = await prisma.durableJob.findUnique({
        where: { id: submission.job.id },
      });
      expect(failedJob?.status).toBe('FAILED');
      expect(failedJob?.finishedAt).toBeDefined();

      // Assistant message must be marked FAILED
      const failedMsg = await prisma.message.findUnique({
        where: { id: submission.assistantMessage.id },
      });
      expect(failedMsg?.status).toBe('FAILED');

      // Failure stream event must be recorded
      const failureEvent = await prisma.userStreamEvent.findFirst({
        where: { jobId: submission.job.id, eventType: 'job_failed' },
      });
      expect(failureEvent).toBeDefined();
    });
  });
});
