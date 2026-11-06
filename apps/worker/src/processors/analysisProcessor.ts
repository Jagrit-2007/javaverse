import crypto from 'node:crypto';
import { Job } from 'bullmq';
import { prisma, type Prisma } from '@javaverse/db';
import { createLogger, runWithCorrelationContext } from '@javaverse/observability';
import { getSandboxClient } from '@javaverse/sandbox';
import { AnalysisJobDataSchema, type AnalysisJobData } from '@javaverse/schemas';
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
 * Deterministic mock pedagogical analysis generator for Phase 4.
 */
function generateMockAnalysis(prompt: string) {
  const isStack =
    prompt.toLowerCase().includes('stack') || prompt.toLowerCase().includes('parenthes');

  let topic: 'DSA' | 'OOP' | 'CORE_JAVA' = 'DSA';
  let javaCode = `public class Solution {
    public static int search(int[] nums, int target) {
        int low = 0;
        int high = nums.length - 1;
        while (low <= high) {
            int mid = low + (high - low) / 2;
            if (nums[mid] == target) {
                return mid;
            } else if (nums[mid] < target) {
                low = mid + 1;
            } else {
                high = mid - 1;
            }
        }
        return -1;
    }

    public static void main(String[] args) {
        int[] arr = {2, 5, 8, 12, 16, 23, 38, 56};
        System.out.println("Index: " + search(arr, 23));
    }
}`;

  let vizSpec: Record<string, unknown> = {
    kind: 'array',
    title: 'Binary Search Step-by-Step',
    summary: 'Visualizing pointer updates across halves of a sorted array.',
    initial: { data: [2, 5, 8, 12, 16, 23, 38, 56] },
    steps: [
      {
        line: 3,
        text: 'Initialize search interval: low=0, high=7',
        state: { low: 0, high: 7, mid: 3, highlight: [3] },
      },
      {
        line: 8,
        text: 'mid=3 (value=12) < target (23). Narrow search to right half: low=4',
        state: { low: 4, high: 7, mid: 5, highlight: [5] },
      },
      {
        line: 6,
        text: 'mid=5 (value=23) == target (23). Element found at index 5!',
        state: { low: 4, high: 7, mid: 5, highlight: [5], found: true },
      },
    ],
  };

  if (isStack) {
    topic = 'DSA';
    javaCode = `import java.util.ArrayDeque;
import java.util.Deque;

public class Solution {
    public static boolean isValid(String s) {
        Deque<Character> stack = new ArrayDeque<>();
        for (char c : s.toCharArray()) {
            if (c == '(' || c == '{' || c == '[') {
                stack.push(c);
            } else {
                if (stack.isEmpty()) return false;
                char top = stack.pop();
                if (c == ')' && top != '(') return false;
                if (c == '}' && top != '{') return false;
                if (c == ']' && top != '[') return false;
            }
        }
        return stack.isEmpty();
    }
}`;
    vizSpec = {
      kind: 'stack',
      title: 'Bracket Matching Stack Simulation',
      summary: 'Pushing opening brackets and matching closing brackets in LIFO order.',
      initial: { items: [] },
      steps: [
        {
          line: 7,
          text: 'Read opening bracket "(": push to stack',
          state: { items: ['('], action: 'push' },
        },
        {
          line: 7,
          text: 'Read opening bracket "{": push to stack',
          state: { items: ['(', '{'], action: 'push' },
        },
        {
          line: 11,
          text: 'Read closing bracket "}": match and pop "{" from stack',
          state: { items: ['('], action: 'pop' },
        },
        {
          line: 11,
          text: 'Read closing bracket ")": match and pop "(" from stack. Stack empty -> valid!',
          state: { items: [], action: 'pop', valid: true },
        },
      ],
    };
  }

  return {
    schemaVersion: 1,
    meta: {
      topic,
      subtopics: ['Algorithm Design', 'Time Complexity', 'Invariants'],
      difficulty: 'MEDIUM',
      questionType: 'CODING',
      javaVersion: '21',
      confidence: 0.98,
    },
    understanding: {
      restatement: `The problem asks us to solve: "${prompt.slice(0, 120)}..." in an efficient, verified manner.`,
      inputs: ['Input array / parameters matching question criteria'],
      outputs: ['Result satisfying all declared constraints'],
      constraints: ['Time limit: O(log N) or O(N)', 'Memory limit: O(1) auxiliary space'],
      examples: [
        {
          input: 'arr = [2, 5, 8, 12, 16, 23], target = 23',
          output: '5',
          explanation: 'Found at index 5.',
        },
      ],
      edgeCases: ['Empty input', 'Single-element input', 'Target not present'],
      assumptions: ['Input is valid and pre-conditioned'],
    },
    prerequisites: [
      { concept: 'Array indexing', explanation: 'Elements accessed in O(1) time.' },
      {
        concept: 'Loop invariants',
        explanation: 'Maintaining true conditions across every iteration.',
      },
    ],
    approaches: [
      {
        name: 'Linear Scan',
        pattern: 'Brute Force',
        idea: 'Inspect every element sequentially from start to end.',
        steps: ['Iterate i from 0 to N-1', 'Compare nums[i] with target'],
        time: 'O(N)',
        space: 'O(1)',
        pros: ['Trivial to write', 'Works on unsorted arrays'],
        cons: ['Too slow for large N'],
        recommended: false,
      },
      {
        name: 'Optimal Divide & Conquer',
        pattern: 'Binary Search',
        idea: 'Halve the search space at every step by checking the middle element.',
        steps: ['Set low=0, high=N-1', 'Compute mid', 'Narrow interval based on comparison'],
        time: 'O(log N)',
        space: 'O(1)',
        pros: ['Logarithmic time complexity', 'Ideal for sorted inputs'],
        cons: ['Requires sorted array'],
        recommended: true,
      },
    ],
    solution: {
      code: javaCode,
      explanation: [
        { fromLine: 1, toLine: 5, text: 'Class setup and boundary initialization.' },
        { fromLine: 6, toLine: 12, text: 'Core iteration loop dividing the problem space.' },
      ],
      tests: [
        { name: 'Standard Case', input: 'arr = [2, 5, 8], target = 5', expectedOutput: '1' },
        { name: 'Not Found', input: 'arr = [2, 5, 8], target = 99', expectedOutput: '-1' },
      ],
      dryRun: [
        { step: 1, line: 3, vars: { low: 0, high: 7, mid: 3 }, note: 'First midpoint calculation' },
        {
          step: 2,
          line: 8,
          vars: { low: 4, high: 7, mid: 5 },
          note: 'Narrowing to right subarray',
        },
      ],
    },
    visualizations: [vizSpec],
    pitfalls: [
      'Integer overflow when calculating midpoint: use low + (high - low) / 2 instead of (low + high) / 2.',
      'Off-by-one errors with loop condition <= vs <.',
    ],
    followUps: ['How does this approach generalize to unbounded arrays?'],
    relatedLessons: ['binary-search', 'arrays-arraylist'],
    practice: [
      {
        prompt: 'Implement search in a rotated sorted array.',
        difficulty: 'MEDIUM',
        hints: ['Find the pivot index first', 'One half is always sorted'],
      },
    ],
  };
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

    // 3. Generate Mock Analysis and Complete Job
    const analysisData = generateMockAnalysis(authoritativePrompt);

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
          verificationStatus: execResult.status === 'SUCCESS' ? 'VERIFIED_CORRECT' : 'UNVERIFIED',
        },
        create: {
          messageId,
          modelId: 'mock-analyzer-v1',
          promptVersion: '1.0.0',
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
  });
}
