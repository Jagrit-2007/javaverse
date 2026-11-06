import { NextRequest } from 'next/server';
import { Redis } from 'ioredis';
import { prisma } from '@javaverse/db';
import { env } from '../env';
import { getRedisCacheClient } from './redis';

const MAX_CONCURRENT_SSE_CONNECTIONS = 3;
const HEARTBEAT_INTERVAL_MS = 15000;

/**
 * Handles authenticated Server-Sent Events (SSE) streaming for a user, with optional chat filtering.
 */
export async function handleUserEventStream(
  request: NextRequest,
  userId: string,
  filterChatId?: string,
): Promise<Response> {
  const cacheRedis = getRedisCacheClient();
  const connKey = `sse:active_count:${userId}`;

  // 1. Enforce concurrent connection limit
  let activeConns = 1;
  try {
    activeConns = await cacheRedis.incr(connKey);
    await cacheRedis.expire(connKey, 3600); // safety TTL
  } catch {
    // If Redis fails, allow connection (fail-open for UX stream)
  }

  if (activeConns > MAX_CONCURRENT_SSE_CONNECTIONS) {
    try {
      await cacheRedis.decr(connKey);
    } catch {
      // Ignored
    }
    return new Response(
      JSON.stringify({
        error: {
          code: 'SSE_CONNECTION_LIMIT_REACHED',
          message: 'Maximum 3 concurrent event streams allowed per account.',
        },
      }),
      {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-store, no-cache, must-revalidate',
        },
      },
    );
  }

  // 2. Determine Last-Event-ID for cursor replay
  const lastEventIdHeader =
    request.headers.get('Last-Event-ID') || request.nextUrl.searchParams.get('lastEventId');
  let lastEventIdBigInt: bigint | null = null;
  if (lastEventIdHeader && /^\d+$/.test(lastEventIdHeader.trim())) {
    try {
      lastEventIdBigInt = BigInt(lastEventIdHeader.trim());
    } catch {
      lastEventIdBigInt = null;
    }
  }

  // 3. Create dedicated Redis subscriber connection
  const subRedis = new Redis(env.REDIS_CACHE_URL, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
    lazyConnect: true,
  });

  let isClosed = false;
  let heartbeatInterval: NodeJS.Timeout | null = null;

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();

      const send = (data: string) => {
        if (!isClosed) {
          try {
            controller.enqueue(encoder.encode(data));
          } catch {
            cleanup();
          }
        }
      };

      // A. Replay unread events from database if Last-Event-ID provided
      if (lastEventIdBigInt !== null) {
        try {
          const missedEvents = await prisma.userStreamEvent.findMany({
            where: {
              userId,
              ...(filterChatId ? { chatId: filterChatId } : {}),
              streamSeq: { gt: lastEventIdBigInt },
            },
            orderBy: { streamSeq: 'asc' },
            take: 200,
          });

          for (const ev of missedEvents) {
            const payload = {
              ...(typeof ev.payload === 'object' && ev.payload !== null ? ev.payload : {}),
              streamSeq: ev.streamSeq.toString(),
              jobEventSeq: ev.jobEventSeq,
            };
            send(
              `id: ${ev.streamSeq}\nevent: ${ev.eventType}\ndata: ${JSON.stringify(payload)}\n\n`,
            );
          }
        } catch {
          // Replay error: continue to live stream
        }
      }

      // B. Connect and subscribe to user channel
      try {
        await subRedis.connect();
        const channelName = `events:user:${userId}`;
        await subRedis.subscribe(channelName);

        subRedis.on('message', (_channel, messageStr) => {
          try {
            const data = JSON.parse(messageStr);
            // If filtering by chat, skip events belonging to other chats
            if (filterChatId && data.payload?.chatId && data.payload.chatId !== filterChatId) {
              return;
            }

            const streamSeq = data.streamSeq || '';
            const eventType = data.eventType || 'message';
            const payload = data.payload || {};

            send(`id: ${streamSeq}\nevent: ${eventType}\ndata: ${JSON.stringify(payload)}\n\n`);
          } catch {
            // Malformed message ignored
          }
        });
      } catch {
        // Fallback if pub/sub fails
      }

      // C. Periodic Heartbeat
      heartbeatInterval = setInterval(() => {
        send(': ping\n\n');
      }, HEARTBEAT_INTERVAL_MS);
    },

    cancel() {
      cleanup();
    },
  });

  function cleanup() {
    if (isClosed) return;
    isClosed = true;

    if (heartbeatInterval) {
      clearInterval(heartbeatInterval);
      heartbeatInterval = null;
    }

    try {
      subRedis.disconnect();
    } catch {
      // Ignored
    }

    // Decrement connection count
    cacheRedis.decr(connKey).catch(() => {});
  }

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
