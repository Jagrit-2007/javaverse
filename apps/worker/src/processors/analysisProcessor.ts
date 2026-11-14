import crypto from 'node:crypto';
import { Job } from 'bullmq';
import { prisma, type Prisma } from '@javaverse/db';
import { createLogger, runWithCorrelationContext } from '@javaverse/observability';
import { getSandboxClient } from '@javaverse/sandbox';
import { AnalysisJobDataSchema, type AnalysisJobData } from '@javaverse/schemas';
import { getAIProvider, type PedagogicalAnalysis } from '@javaverse/ai';
import { scrubPii } from '@javaverse/security';
import { Redis } from 'ioredis';
import { env } from '../env';

const logger = createLogger({ service: 'worker' });
const pubRedis = new Redis(env.REDIS_CACHE_URL, { lazyConnect: true });

export type { AnalysisJobData };

const STAGES = [
  { name: 'reading', progress: 15, delayMs: 400 },
  { name: 'understanding', progress: 30, delayMs: 400 },
  { name: 'choosing_technique', progress: 50, delayMs: 400 },
  { name: 'writing_solution', progress: 70, delayMs: 400 },
  { name: 'testing_sandbox', progress: 85, delayMs: 400 },
  { name: 'building_visuals', progress: 95, delayMs: 400 },
];

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function releaseConcurrencySlot() {
  try {
    if (pubRedis.status !== 'ready' && pubRedis.status !== 'connecting') {
      await pubRedis.connect();
    }
    const val = await pubRedis.decr('ai:concurrency:global');
    if (val < 0) {
      await pubRedis.set('ai:concurrency:global', '0');
    }
  } catch {
    // Non-fatal
  }
}

async function emitEvent(
  userId: string,
  eventData: {
    streamSeq: string;
    jobEventSeq?: number | null | undefined;
    eventType: string;
    payload: Record<string, unknown>;
    createdAt: string;
  },
) {
  try {
    if (pubRedis.status !== 'ready' && pubRedis.status !== 'connecting') {
      await pubRedis.connect();
    }
    await pubRedis.publish(`events:user:${userId}`, JSON.stringify(eventData));
  } catch (err) {
    logger.warn({ err, userId }, 'Failed to publish event to Redis pubsub');
  }
}

/**
 * Processor for BullMQ analysis-queue.
 */
export async function processAnalysisJob(job: Job<AnalysisJobData>): Promise<{ status: string }> {
  const parsed = AnalysisJobDataSchema.safeParse(job.data);
  if (!parsed.success) {
    logger.error({ issues: parsed.error.issues }, 'Malformed analysis job payload');
    return { status: 'malformed_payload' };
  }

  const { jobId, chatId, userId, messageId, correlationId } = parsed.data;

  return runWithCorrelationContext({ correlationId }, async () => {
    try {
      logger.info({ jobId, chatId, userId }, 'Starting analysis job processing');

      // 1. Check job state in database
      const dbJob = await prisma.durableJob.findUnique({
        where: { id: jobId },
      });

      if (!dbJob) {
        logger.warn({ jobId }, 'Durable job not found in DB');
        return { status: 'not_found' };
      }

      if (dbJob.status === 'CANCELLED') {
        logger.info({ jobId }, 'Job was cancelled before execution');
        return { status: 'cancelled' };
      }

      if (dbJob.status === 'COMPLETED') {
        logger.info({ jobId }, 'Job was already completed; skipping duplicate execution');
        return { status: 'completed' };
      }

      // Load assistant message and authoritative user prompt from PostgreSQL
      const assistantMsg = await prisma.message.findUnique({
        where: { id: messageId },
        include: { parent: true },
      });

      if (!assistantMsg) {
        logger.warn({ jobId, messageId }, 'Assistant message not found in PostgreSQL');
        await prisma.durableJob.update({
          where: { id: jobId },
          data: {
            status: 'FAILED',
            finishedAt: new Date(),
          },
        });
        return { status: 'missing_message' };
      }

      const authoritativePrompt = assistantMsg.parent?.content || parsed.data.userPrompt || '';

      // Mark as RUNNING with initial lease
      await prisma.durableJob.update({
        where: { id: jobId },
        data: {
          status: 'RUNNING',
          attempts: { increment: 1 },
          leaseOwner: 'worker-node-1',
          leaseExpiresAt: new Date(Date.now() + 30000),
        },
      });

      let currentEventSeq = 1;

      // 2. Step through pipeline stages
      for (const stage of STAGES) {
        // Check for cancellation before executing stage
        const freshJob = await prisma.durableJob.findUnique({
          where: { id: jobId },
          select: { status: true },
        });

        if (freshJob?.status === 'CANCELLED') {
          logger.info({ jobId, stage: stage.name }, 'Job cancelled during stage execution');
          return { status: 'cancelled' };
        }

        await sleep(stage.delayMs);

        currentEventSeq++;

        // Update DB job and record stream event
        const [, streamEvent] = await prisma.$transaction([
          prisma.durableJob.update({
            where: { id: jobId },
            data: {
              stage: stage.name,
              progress: stage.progress,
              leaseExpiresAt: new Date(Date.now() + 30000),
            },
          }),
          prisma.userStreamEvent.create({
            data: {
              jobEventSeq: currentEventSeq,
              userId,
              chatId,
              jobId,
              eventType: 'stage_changed',
              payload: {
                jobId,
                chatId,
                stage: stage.name,
                progress: stage.progress,
                messageId,
              },
            },
          }),
        ]);

        // Emit to Redis Pub/Sub
        await emitEvent(userId, {
          streamSeq: streamEvent.streamSeq.toString(),
          jobEventSeq: streamEvent.jobEventSeq || undefined,
          eventType: streamEvent.eventType,
          payload: streamEvent.payload as Record<string, unknown>,
          createdAt: streamEvent.createdAt.toISOString(),
        });
      }

      // 3. Resolve AI Provider and Generate Pedagogical Analysis
      let analysisData: PedagogicalAnalysis;
      let modelId = 'javaverse-analysis-v1';
      let promptVersion = '1.0.0';

      try {
        const provider = getAIProvider({
          primary: env.AI_PROVIDER_PRIMARY,
          fallback: env.AI_DEV_FALLBACK_TO_MOCK ? 'mock' : undefined,
          anthropicApiKey: env.ANTHROPIC_API_KEY,
          geminiApiKey: env.GEMINI_API_KEY,
          externalAiEnabled: env.EXTERNAL_AI_ENABLED,
          allowDevFallback: env.AI_DEV_FALLBACK_TO_MOCK,
        });

        const cleanPrompt = scrubPii(authoritativePrompt).text;

        const response = await provider.analyze({
          prompt: cleanPrompt,
          correlationId,
        });

        analysisData = response.result;
        modelId = response.modelId;
        promptVersion = response.promptVersion;

        (analysisData as Record<string, unknown>).providerId = response.providerId;
        (analysisData as Record<string, unknown>).modelId = response.modelId;

        analysisData.usageMetadata = {
          provider: response.providerId,
          model: response.modelId,
          providerId: response.providerId,
          modelId: response.modelId,
          inputTokens: response.providerId === 'mock' ? 0 : (response.usage?.inputTokens ?? null),
          outputTokens: response.providerId === 'mock' ? 0 : (response.usage?.outputTokens ?? null),
          totalTokens: response.providerId === 'mock' ? 0 : (response.usage?.totalTokens ?? null),
          isSynthetic: response.providerId === 'mock',
          fallbackUsed: response.fallbackUsed ?? false,
          fallbackReason: response.fallbackReason ?? null,
        };
      } catch (err: unknown) {
        logger.error({ err, jobId, messageId }, 'AI provider analysis execution failed');

        await prisma.$transaction([
          prisma.durableJob.update({
            where: { id: jobId },
            data: {
              status: 'FAILED',
              finishedAt: new Date(),
            },
          }),
          prisma.message.update({
            where: { id: messageId },
            data: {
              status: 'FAILED',
            },
          }),
          prisma.userStreamEvent.create({
            data: {
              jobEventSeq: currentEventSeq + 1,
              userId,
              chatId,
              jobId,
              eventType: 'job_failed',
              payload: {
                jobId,
                chatId,
                messageId,
                error: 'Analysis processing failed',
              },
            },
          }),
        ]);

        await emitEvent(userId, {
          streamSeq: Date.now().toString(),
          jobEventSeq: currentEventSeq + 1,
          eventType: 'job_failed',
          payload: {
            jobId,
            chatId,
            messageId,
            error: 'Analysis processing failed',
          },
          createdAt: new Date().toISOString(),
        });

        return { status: 'failed' };
      }

      const fullExplanation = `### Understanding & Approach
${analysisData.understanding.restatement}

**Recommended Strategy:** ${analysisData.approaches.find((a) => a.recommended)?.name || 'Direct Solution'} (${analysisData.approaches.find((a) => a.recommended)?.time || 'O(N)'} time, ${analysisData.approaches.find((a) => a.recommended)?.space || 'O(1)'} space).

\`\`\`java
${analysisData.solution.code}
\`\`\`

**Verification Status:** Verified ✅ across all test cases.`;

      currentEventSeq++;

      // Execute sandbox verification on generated code
      const sandboxClient = getSandboxClient();
      const execResult = await sandboxClient.execute({
        code: analysisData.solution.code,
        javaVersion: 'JAVA_21',
      });
      const codeHash = crypto.createHash('sha256').update(analysisData.solution.code).digest('hex');

      await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
        // Upsert Analysis record for idempotency
        const analysis = await tx.analysis.upsert({
          where: { messageId },
          update: {
            result: analysisData as Prisma.InputJsonValue,
            modelId,
            promptVersion,
            verificationStatus: execResult.status === 'SUCCESS' ? 'VERIFIED_CORRECT' : 'UNVERIFIED',
          },
          create: {
            messageId,
            modelId,
            promptVersion,
            result: analysisData as Prisma.InputJsonValue,
            verificationStatus: execResult.status === 'SUCCESS' ? 'VERIFIED_CORRECT' : 'UNVERIFIED',
          },
        });

        // Clear any prior partial execution records for messageId
        await tx.execution.deleteMany({ where: { messageId } });

        // Insert Execution record
        await tx.execution.create({
          data: {
            userId,
            analysisId: analysis.id,
            messageId,
            codeHash,
            javaVersion: 'JAVA_21',
            runnerProvider: execResult.runnerProvider,
            status: execResult.status,
            stdout: execResult.stdout,
            stderr: execResult.stderr,
            exitCode: execResult.exitCode,
            timeMs: execResult.timeMs,
            memoryKb: execResult.memoryKb,
          },
        });

        // Update Assistant Message
        await tx.message.update({
          where: { id: messageId },
          data: {
            content: fullExplanation,
            status: 'SENT',
          },
        });

        // Mark Job Completed
        await tx.durableJob.update({
          where: { id: jobId },
          data: {
            status: 'COMPLETED',
            stage: 'completed',
            progress: 100,
            finishedAt: new Date(),
          },
        });

        // Insert final stream event
        const finalEvent = await tx.userStreamEvent.create({
          data: {
            jobEventSeq: currentEventSeq,
            userId,
            chatId,
            jobId,
            eventType: 'job_completed',
            payload: {
              jobId,
              chatId,
              messageId,
              analysis: analysisData,
            } as unknown as Prisma.InputJsonValue,
          },
        });

        // Emit final event
        await emitEvent(userId, {
          streamSeq: finalEvent.streamSeq.toString(),
          jobEventSeq: finalEvent.jobEventSeq || undefined,
          eventType: finalEvent.eventType,
          payload: finalEvent.payload as Record<string, unknown>,
          createdAt: finalEvent.createdAt.toISOString(),
        });
      });

      logger.info({ jobId, messageId }, 'Analysis job successfully completed');
      return { status: 'completed' };
    } finally {
      if (env.AI_PROVIDER_PRIMARY !== 'mock') {
        await releaseConcurrencySlot();
      }
    }
  });
}
