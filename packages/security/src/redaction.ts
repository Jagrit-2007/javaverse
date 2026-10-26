export const PINO_REDACT_PATHS = [
  '*.password',
  '*.*password',
  '*.passwordHash',
  '*.*passwordHash',
  '*.token',
  '*.*token',
  '*.tokenHash',
  '*.otpHash',
  '*.secret',
  '*.*secret',
  '*.cookie',
  '*.*cookie',
  '*.headers.authorization',
  '*.headers.cookie',
  '*.headers["x-api-key"]',
  '*.credential*',
  '*.apiKey',
  '*.sessionSecret',
  '*.connectionString',
  '*.databaseUrl',
  'req.headers.authorization',
  'req.headers.cookie',
];

export const PINO_REDACT_CENSOR = '[REDACTED]';

export function sanitizeErrorMessage(message: string): string {
  // Strip password credentials embedded in URLs e.g. postgresql://user:pass@host
  return message.replace(/:(\/\/[^:]+:)[^@]+@/g, ':$1[REDACTED]@');
}
