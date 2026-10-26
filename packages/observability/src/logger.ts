import pino, { type Logger, type LoggerOptions } from 'pino';
import { PINO_REDACT_PATHS, PINO_REDACT_CENSOR } from '@javaverse/security';
import { getCorrelationContext } from './context';
import { serializers } from './serializers';

export interface CreateLoggerOptions {
  service: 'web' | 'worker' | 'script';
  level?: string;
}

export function createLogger(options: CreateLoggerOptions): Logger {
  const isProduction = process.env.NODE_ENV === 'production';
  const level = options.level || (isProduction ? 'info' : 'debug');

  const pinoOptions: LoggerOptions = {
    level,
    base: {
      service: options.service,
      env: process.env.NODE_ENV || 'development',
    },
    redact: {
      paths: PINO_REDACT_PATHS,
      censor: PINO_REDACT_CENSOR,
    },
    serializers,
    mixin() {
      const context = getCorrelationContext();
      if (!context) return {};
      return {
        correlationId: context.correlationId,
        ...(context.traceId && { traceId: context.traceId }),
        ...(context.spanId && { spanId: context.spanId }),
        ...(context.userId && { userId: context.userId }),
      };
    },
  };

  return pino(pinoOptions);
}
