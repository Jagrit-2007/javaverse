import { sanitizeErrorMessage } from './redaction';

export interface SafeError {
  error: {
    code: string;
    message: string;
    correlationId: string;
    timestamp: string;
  };
}

export function createSafeErrorEnvelope(
  code: string,
  userMessage: string,
  correlationId: string,
): SafeError {
  return {
    error: {
      code,
      message: sanitizeErrorMessage(userMessage),
      correlationId,
      timestamp: new Date().toISOString(),
    },
  };
}
