import { z } from 'zod';

export const CorrelationIdSchema = z.string().uuid();

export const SafeErrorEnvelopeSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    correlationId: z.string(),
    timestamp: z.string(),
  }),
});

export type SafeErrorEnvelope = z.infer<typeof SafeErrorEnvelopeSchema>;
