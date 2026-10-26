import { AsyncLocalStorage } from 'node:async_hooks';
import { randomUUID } from 'node:crypto';

export interface CorrelationContext {
  correlationId: string;
  traceId?: string | undefined;
  spanId?: string | undefined;
  userId?: string | undefined;
}

export interface CorrelationContextInput {
  correlationId?: string | undefined;
  traceId?: string | undefined;
  spanId?: string | undefined;
  userId?: string | undefined;
}

const storage = new AsyncLocalStorage<CorrelationContext>();

export function generateCorrelationId(): string {
  return randomUUID();
}

export function runWithCorrelationContext<T>(context: CorrelationContextInput, fn: () => T): T {
  const fullContext: CorrelationContext = {
    correlationId: context.correlationId || generateCorrelationId(),
    traceId: context.traceId,
    spanId: context.spanId,
    userId: context.userId,
  };
  return storage.run(fullContext, fn);
}

export function getCorrelationContext(): CorrelationContext | undefined {
  return storage.getStore();
}

export function getCorrelationId(): string {
  return storage.getStore()?.correlationId || generateCorrelationId();
}
