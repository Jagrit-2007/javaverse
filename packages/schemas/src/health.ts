import { z } from 'zod';

export const HealthResponseSchema = z.object({
  data: z.object({
    status: z.literal('ok'),
    timestamp: z.string(),
  }),
});

export type HealthResponse = z.infer<typeof HealthResponseSchema>;

export const ReadinessCheckStatusSchema = z.enum(['ok', 'degraded', 'failed', 'disabled']);

export const ReadinessResponseSchema = z.object({
  data: z.object({
    status: z.enum(['ready', 'degraded', 'unhealthy']),
    checks: z.object({
      database: ReadinessCheckStatusSchema,
      redisQueue: ReadinessCheckStatusSchema,
      redisCache: ReadinessCheckStatusSchema.optional(),
      storage: ReadinessCheckStatusSchema.optional(),
      clamav: ReadinessCheckStatusSchema.optional(),
    }),
    timestamp: z.string(),
  }),
});

export type ReadinessResponse = z.infer<typeof ReadinessResponseSchema>;
