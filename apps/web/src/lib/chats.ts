import {
  prisma,
  type Chat,
  type ChatState,
  type Message,
  type DurableJob,
  type Prisma,
} from '@javaverse/db';
import { getRedisCacheClient } from './redis';
import { enqueueAnalysisJob, getAnalysisQueue } from './queue';

export class ChatLimitReachedError extends Error {
  code = 'CHAT_LIMIT_REACHED';
  constructor(message = 'Maximum of 3 active chats allowed. Delete a chat to open a new one.') {
    super(message);
    this.name = 'ChatLimitReachedError';
  }
}

export class ChatNotFoundError extends Error {
  code = 'CHAT_NOT_FOUND';
  constructor(message = 'Chat not found or access denied.') {
    super(message);
    this.name = 'ChatNotFoundError';
  }
}

export class ActiveJobInProgressError extends Error {
  code = 'ACTIVE_JOB_IN_PROGRESS';
  constructor(message = 'A question analysis is already in progress for this slot.') {
    super(message);
    this.name = 'ActiveJobInProgressError';
  }
}

export interface ChatWithBadge extends Chat {
  badgeStatus: 'idle' | 'working' | 'ready';
  latestMessage?: Message | null;
  state?: ChatState | null;
}

/**
 * Computes deterministic 32-bit positive integer for PostgreSQL advisory xact locks.
 */
function hashToLockId(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash % 2147483647);
}

/**
 * Lists all active chats for a user, sorted by slot ascending.
 */
export async function listUserChats(userId: string): Promise<ChatWithBadge[]> {
  const chats = await prisma.chat.findMany({
    where: { userId },
    orderBy: { slot: 'asc' },
    include: {
      state: true,
      messages: {
        orderBy: { createdAt: 'desc' },
        take: 1,
      },
      durableJobs: {
        orderBy: { createdAt: 'desc' },
        take: 1,
      },
    },
  });

  return chats.map((chat) => {
    let badgeStatus: 'idle' | 'working' | 'ready' = 'idle';
    const latestJob = chat.durableJobs[0];
    if (latestJob) {
      if (latestJob.status === 'RUNNING' || latestJob.status === 'PENDING') {
        badgeStatus = 'working';
      } else if (latestJob.status === 'COMPLETED') {
        badgeStatus = 'ready';
      }
    }

    return {
      id: chat.id,
      userId: chat.userId,
      slot: chat.slot,
      title: chat.title,
      createdAt: chat.createdAt,
      updatedAt: chat.updatedAt,
      badgeStatus,
      latestMessage: chat.messages[0] || null,
      state: chat.state,
    };
  });
}

/**
 * Creates a new chat in the first available slot (1..3).
 * Enforces transactional concurrency control via pg_advisory_xact_lock.
 */
export async function createChatInFirstFreeSlot(
  userId: string,
  title = 'New Question',
): Promise<Chat> {
  const lockId = hashToLockId(`chat_allocation_${userId}`);

  return prisma.$transaction(async (tx) => {
    // 1. Acquire transaction-scoped advisory lock for this user
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(${lockId})`;

    // 2. Query currently occupied slots
    const existing = await tx.chat.findMany({
      where: { userId },
      select: { slot: true },
      orderBy: { slot: 'asc' },
    });

    const occupiedSlots = new Set(existing.map((c) => c.slot));
    const candidateSlots = [1, 2, 3];
    const freeSlot = candidateSlots.find((s) => !occupiedSlots.has(s));

    if (!freeSlot) {
      throw new ChatLimitReachedError();
    }

    // 3. Insert new chat
    const newChat = await tx.chat.create({
      data: {
        userId,
        slot: freeSlot,
        title: title.trim().slice(0, 100) || `Question in Slot ${freeSlot}`,
      },
    });

    // 4. Initialize empty chat state
    await tx.chatState.create({
      data: {
        chatId: newChat.id,
        uiState: {
          activeTab: 'workspace',
          scrollPosition: 0,
          vizStep: 0,
          editorCode: '',
          draftMessage: '',
        },
      },
    });

    return newChat;
  });
}

/**
 * Retrieves chat details and messages with user-scoped access validation.
 */
export async function getChatById(
  chatId: string,
  userId: string,
): Promise<{
  chat: Chat;
  state: ChatState | null;
  messages: Message[];
  activeJob: DurableJob | null;
}> {
  const chat = await prisma.chat.findFirst({
    where: { id: chatId, userId },
    include: {
      state: true,
      messages: {
        orderBy: { createdAt: 'asc' },
        take: 100,
        include: {
          analysis: true,
        },
      },
      durableJobs: {
        orderBy: { createdAt: 'desc' },
        take: 1,
      },
    },
  });

  if (!chat) {
    throw new ChatNotFoundError();
  }

  return {
    chat: {
      id: chat.id,
      userId: chat.userId,
      slot: chat.slot,
      title: chat.title,
      createdAt: chat.createdAt,
      updatedAt: chat.updatedAt,
    },
    state: chat.state,
    messages: chat.messages,
    activeJob: chat.durableJobs[0] || null,
  };
}

/**
 * Updates chat title or settings.
 */
export async function updateChat(
  chatId: string,
  userId: string,
  data: { title?: string },
): Promise<Chat> {
  const chat = await prisma.chat.findFirst({
    where: { id: chatId, userId },
  });

  if (!chat) {
    throw new ChatNotFoundError();
  }

  return prisma.chat.update({
    where: { id: chatId },
    data: {
      title: data.title ? data.title.trim().slice(0, 100) : chat.title,
    },
  });
}

/**
 * Permanently deletes chat, cascading to state, messages, and jobs. Frees the slot immediately.
 */
export async function deleteChatAndFreeSlot(chatId: string, userId: string): Promise<void> {
  const chat = await prisma.chat.findFirst({
    where: { id: chatId, userId },
  });

  if (!chat) {
    throw new ChatNotFoundError();
  }

  await prisma.chat.delete({
    where: { id: chatId },
  });
}

/**
 * Upserts chat UI state (active tab, scroll position, editor text, viz step, draft).
 */
export async function saveChatState(
  chatId: string,
  userId: string,
  uiState: Record<string, unknown>,
): Promise<ChatState> {
  const chat = await prisma.chat.findFirst({
    where: { id: chatId, userId },
  });

  if (!chat) {
    throw new ChatNotFoundError();
  }

  return prisma.chatState.upsert({
    where: { chatId },
    update: {
      uiState: uiState as Prisma.InputJsonValue,
    },
    create: {
      chatId,
      uiState: uiState as Prisma.InputJsonValue,
    },
  });
}

/**
 * Posts a user message, creates placeholder assistant message and durable job, and enqueues BullMQ task.
 */
export async function postUserMessage(params: {
  chatId: string;
  userId: string;
  content: string;
  correlationId: string;
  attachmentIds?: string[];
}): Promise<{
  userMessage: Message;
  assistantMessage: Message;
  job: DurableJob;
}> {
  const { chatId, userId, content, correlationId, attachmentIds } = params;

  if (!content || content.trim().length === 0) {
    throw new Error('Message content cannot be empty.');
  }

  if (content.length > 10000) {
    throw new Error('Message exceeds 10,000 character maximum limit.');
  }

  // 1. User-scoped resource access validation
  const chat = await prisma.chat.findFirst({
    where: { id: chatId, userId },
  });

  if (!chat) {
    throw new ChatNotFoundError();
  }

  const jobId = crypto.randomUUID();

  // 2. Transactionally create messages, job, and initial stream event
  const result = await prisma.$transaction(async (tx) => {
    // Acquire advisory lock on the chat to prevent concurrent duplicate submissions
    const lockId = hashToLockId(`chat_post_${chatId}`);
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(${lockId})`;

    // Check if there is an active job currently pending or running for this chat
    const activeJob = await tx.durableJob.findFirst({
      where: {
        chatId,
        status: { in: ['PENDING', 'RUNNING'] },
      },
    });

    if (activeJob) {
      throw new ActiveJobInProgressError();
    }

    // Auto-update chat title from first question if default
    if (chat.title.startsWith('New Question') || chat.title.startsWith('Question in Slot')) {
      const cleanSnippet = content.trim().slice(0, 40).replace(/\n/g, ' ');
      await tx.chat.update({
        where: { id: chatId },
        data: { title: cleanSnippet.length > 0 ? `${cleanSnippet}...` : chat.title },
      });
    }

    // Insert user message
    const userMsg = await tx.message.create({
      data: {
        chatId,
        role: 'USER',
        content: content.trim(),
        status: 'SENT',
      },
    });

    if (attachmentIds && attachmentIds.length > 0) {
      if (attachmentIds.length > 3) {
        throw new Error('Maximum 3 attachments per message allowed.');
      }
      await tx.attachment.updateMany({
        where: {
          id: { in: attachmentIds },
          userId,
        },
        data: {
          messageId: userMsg.id,
        },
      });
    }

    // Insert placeholder assistant message
    const assistantMsg = await tx.message.create({
      data: {
        chatId,
        parentId: userMsg.id,
        role: 'ASSISTANT',
        content: '',
        status: 'STREAMING',
      },
    });

    // Insert durable job
    const job = await tx.durableJob.create({
      data: {
        id: jobId,
        queue: 'analysis-queue',
        status: 'PENDING',
        stage: 'reading',
        userId,
        chatId,
        correlationId,
        maxAttempts: 3,
        attempts: 0,
        progress: 5,
        startedAt: new Date(),
      },
    });

    // Insert stream event
    const streamEvent = await tx.userStreamEvent.create({
      data: {
        jobEventSeq: 1,
        userId,
        chatId,
        jobId: job.id,
        eventType: 'stage_changed',
        payload: {
          jobId: job.id,
          stage: 'reading',
          progress: 5,
          messageId: assistantMsg.id,
        },
      },
    });

    return { userMsg, assistantMsg, job, streamEvent };
  });

  // 3. Publish initial event to Redis Pub/Sub for active SSE clients
  try {
    const redis = getRedisCacheClient();
    await redis.publish(
      `events:user:${userId}`,
      JSON.stringify({
        streamSeq: result.streamEvent.streamSeq.toString(),
        eventType: result.streamEvent.eventType,
        payload: result.streamEvent.payload,
        createdAt: result.streamEvent.createdAt.toISOString(),
      }),
    );
  } catch {
    // Non-fatal if pub/sub publish fails; client recovers via DB cursor replay
  }

  // 4. Enqueue to BullMQ
  await enqueueAnalysisJob({
    jobId: result.job.id,
    chatId,
    userId,
    messageId: result.assistantMsg.id,
    userPrompt: content.trim(),
    correlationId,
  });

  return {
    userMessage: result.userMsg,
    assistantMessage: result.assistantMsg,
    job: result.job,
  };
}

/**
 * Cancels an active job for a chat.
 */
export async function cancelChatJob(chatId: string, userId: string): Promise<void> {
  const activeJob = await prisma.durableJob.findFirst({
    where: {
      chatId,
      userId,
      status: { in: ['PENDING', 'RUNNING'] },
    },
    orderBy: { createdAt: 'desc' },
  });

  if (!activeJob) return;

  await prisma.$transaction(async (tx) => {
    await tx.durableJob.update({
      where: { id: activeJob.id },
      data: {
        status: 'CANCELLED',
        finishedAt: new Date(),
      },
    });

    // Mark pending assistant message as FAILED (cancelled)
    await tx.message.updateMany({
      where: {
        chatId,
        status: { in: ['STREAMING', 'PENDING'] },
      },
      data: {
        status: 'FAILED',
        content: 'Analysis cancelled by learner.',
      },
    });

    const lastEvent = await tx.userStreamEvent.findFirst({
      where: { jobId: activeJob.id },
      orderBy: { jobEventSeq: 'desc' },
      select: { jobEventSeq: true },
    });
    const nextSeq = (lastEvent?.jobEventSeq ?? 0) + 1;

    const streamEvent = await tx.userStreamEvent.create({
      data: {
        jobEventSeq: nextSeq,
        userId,
        chatId,
        jobId: activeJob.id,
        eventType: 'job_cancelled',
        payload: {
          jobId: activeJob.id,
          chatId,
          reason: 'Cancelled by user',
        },
      },
    });

    try {
      const redis = getRedisCacheClient();
      await redis.publish(
        `events:user:${userId}`,
        JSON.stringify({
          streamSeq: streamEvent.streamSeq.toString(),
          eventType: streamEvent.eventType,
          payload: streamEvent.payload,
          createdAt: streamEvent.createdAt.toISOString(),
        }),
      );
    } catch {
      // Ignored
    }
  });
}

/**
 * Retries a failed or stalled assistant job for a chat without duplicating the user message.
 */
export async function retryChatJob(
  chatId: string,
  userId: string,
  correlationId: string,
): Promise<DurableJob> {
  const chat = await prisma.chat.findFirst({
    where: { id: chatId, userId },
  });

  if (!chat) {
    throw new ChatNotFoundError();
  }

  // Transactionally lock and retry the existing failed assistant job
  const retryResult = await prisma.$transaction(async (tx) => {
    // Find the latest assistant message and its parent user message
    const latestAssistantMsg = await tx.message.findFirst({
      where: { chatId, role: 'ASSISTANT' },
      orderBy: { createdAt: 'desc' },
      include: { parent: true },
    });

    if (!latestAssistantMsg || !latestAssistantMsg.parent) {
      throw new Error('No assistant message available to retry.');
    }

    // Row-lock the latest durable job for this chat to serialize concurrent retries
    const lockedJobs = await tx.$queryRaw<
      Array<{
        id: string;
        status: string;
        stage: string | null;
        user_id: string | null;
        chat_id: string | null;
        correlation_id: string;
      }>
    >`
      SELECT id, status, stage, user_id, chat_id, correlation_id
      FROM durable_jobs
      WHERE chat_id = ${chatId}::uuid AND user_id = ${userId}::uuid
      ORDER BY started_at DESC
      LIMIT 1
      FOR UPDATE
    `;

    const latestJob = lockedJobs[0];
    if (!latestJob) {
      throw new Error('No durable job found for this chat.');
    }

    // Prevent retrying completed jobs
    if (latestJob.status === 'COMPLETED') {
      throw new Error('Cannot retry a completed job.');
    }

    // Prevent retrying actively running jobs
    if (latestJob.status === 'RUNNING') {
      throw new Error('Cannot retry an actively running job.');
    }

    // If job is PENDING and never failed (initial post still pending), reject
    if (latestJob.status === 'PENDING' && latestAssistantMsg.status !== 'FAILED') {
      // If already pending retry from a concurrent request, return existing job (idempotent)
      const existingDbJob = await tx.durableJob.findUnique({
        where: { id: latestJob.id },
      });
      if (existingDbJob) {
        return { job: existingDbJob, shouldEnqueue: false, assistantMsg: latestAssistantMsg };
      }
    }

    // Ensure the job or assistant message is in a failed state
    if (latestJob.status !== 'FAILED' && latestAssistantMsg.status !== 'FAILED') {
      throw new Error('Cannot retry a job that has not failed.');
    }

    // Reset the failed assistant message to STREAMING
    await tx.message.update({
      where: { id: latestAssistantMsg.id },
      data: {
        status: 'STREAMING',
        content: '',
      },
    });

    // Reset the durable job to PENDING
    const updatedJob = await tx.durableJob.update({
      where: { id: latestJob.id },
      data: {
        status: 'PENDING',
        stage: 'reading',
        progress: 5,
        attempts: 0,
        leaseOwner: null,
        leaseExpiresAt: null,
        finishedAt: null,
        correlationId,
        startedAt: new Date(),
      },
    });

    // Delete any prior analysis record associated with this message
    await tx.analysis.deleteMany({
      where: { messageId: latestAssistantMsg.id },
    });

    // Find latest event sequence for this job to preserve unique constraint
    const maxSeq = await tx.userStreamEvent.aggregate({
      where: { jobId: updatedJob.id },
      _max: { jobEventSeq: true },
    });
    const nextSeq = (maxSeq._max.jobEventSeq || 0) + 1;

    // Create fresh stream event for the retry
    const streamEvent = await tx.userStreamEvent.create({
      data: {
        jobEventSeq: nextSeq,
        userId,
        chatId,
        jobId: updatedJob.id,
        eventType: 'stage_changed',
        payload: {
          jobId: updatedJob.id,
          stage: 'reading',
          progress: 5,
          messageId: latestAssistantMsg.id,
        },
      },
    });

    return {
      job: updatedJob,
      shouldEnqueue: true,
      assistantMsg: latestAssistantMsg,
      streamEvent,
    };
  });

  if (!retryResult.shouldEnqueue) {
    return retryResult.job;
  }

  // Publish event to Redis Pub/Sub for active SSE clients
  try {
    const redis = getRedisCacheClient();
    if (retryResult.streamEvent) {
      await redis.publish(
        `events:user:${userId}`,
        JSON.stringify({
          streamSeq: retryResult.streamEvent.streamSeq.toString(),
          eventType: retryResult.streamEvent.eventType,
          payload: retryResult.streamEvent.payload,
          createdAt: retryResult.streamEvent.createdAt.toISOString(),
        }),
      );
    }
  } catch {}

  // Remove previous BullMQ job instance if present, then re-enqueue
  const queue = getAnalysisQueue();
  try {
    const existingBullJob = await queue.getJob(retryResult.job.id);
    if (existingBullJob) {
      await existingBullJob.remove();
    }
  } catch {}

  await enqueueAnalysisJob({
    jobId: retryResult.job.id,
    chatId,
    userId,
    messageId: retryResult.assistantMsg.id,
    userPrompt: retryResult.assistantMsg.parent!.content,
    correlationId,
  });

  return retryResult.job;
}
