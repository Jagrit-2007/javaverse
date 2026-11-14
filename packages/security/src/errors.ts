import { sanitizeErrorMessage } from './redaction';

export interface SafeError {
  error: {
    code: string;
    message: string;
    correlationId: string;
    timestamp: string;
  };
}

export class SecurityValidationError extends Error {
  code: string;
  constructor(message: string, code = 'SECURITY_VALIDATION_ERROR') {
    super(message);
    this.name = 'SecurityValidationError';
    this.code = code;
  }
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
