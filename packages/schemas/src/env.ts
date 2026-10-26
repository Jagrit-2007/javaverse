import { z } from 'zod';

export class ConfigValidationError extends Error {
  public readonly issues: Array<{ key: string; message: string }>;

  constructor(issues: Array<{ key: string; message: string }>) {
    const summary = issues.map((i) => `  - ${i.key}: ${i.message}`).join('\n');
    super(`Environment validation failed:\n${summary}`);
    this.name = 'ConfigValidationError';
    this.issues = issues;
  }
}

const PLACEHOLDER_REGEX = /replace_with|changeme|default_secret|secret_here/i;
const LOCALHOST_REGEX = /localhost|127\.0\.0\.1|0\.0\.0\.0/i;

export const EnvSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PORT: z.coerce.number().default(3000),

    DATABASE_URL: z.string().url().min(1),
    REDIS_QUEUE_URL: z.string().url().min(1),
    REDIS_CACHE_URL: z.string().url().min(1),

    SESSION_SECRET: z.string().min(32),
    CURSOR_SIGNING_SECRET: z.string().min(32),
    SANDBOX_SHARED_SECRET: z.string().min(32),

    MAX_USERS: z.coerce.number().int().positive().default(5),
    REGISTRATION_MODE: z.enum(['invite_only', 'open', 'closed']).default('invite_only'),

    // Future-compatible provider values
    AI_PROVIDER_PRIMARY: z.enum(['mock', 'anthropic', 'gemini']).default('mock'),
    AI_PROVIDER_EMBED: z.enum(['disabled', 'gemini', 'local']).default('disabled'),
    ANTHROPIC_API_KEY: z.string().optional(),
    GEMINI_API_KEY: z.string().optional(),

    SANDBOX_PROVIDER: z.enum(['mock', 'container_runner', 'judge0']).default('mock'),
    SANDBOX_CONTAINER_RUNNER_URL: z.string().optional(),

    S3_ENDPOINT: z.string().url().optional().default('http://127.0.0.1:9000'),
    S3_REGION: z.string().default('us-east-1'),
    S3_BUCKET: z.string().default('javaverse-uploads'),
    S3_ACCESS_KEY: z.string().default('minioadmin'),
    S3_SECRET_KEY: z.string().default('minioadmin'),

    SMTP_HOST: z.string().default('127.0.0.1'),
    SMTP_PORT: z.coerce.number().default(1025),
    SMTP_FROM: z.string().default('noreply@javaverse.local'),

    CLAMAV_HOST: z.string().default('127.0.0.1'),
    CLAMAV_PORT: z.coerce.number().default(3310),
    CLAMAV_ENABLED: z
      .string()
      .default('false')
      .transform((val) => val === 'true'),

    ALLOW_LOCAL_SERVICES_IN_PRODUCTION: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    // Phase 1 execution policy strictly requires mock providers
    if (data.AI_PROVIDER_PRIMARY !== 'mock') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['AI_PROVIDER_PRIMARY'],
        message: 'Phase 1 runtime policy strictly requires AI_PROVIDER_PRIMARY=mock',
      });
    }

    if (data.SANDBOX_PROVIDER !== 'mock') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['SANDBOX_PROVIDER'],
        message: 'Phase 1 runtime policy strictly requires SANDBOX_PROVIDER=mock',
      });
    }

    // Production guardrails
    if (data.NODE_ENV === 'production') {
      const secrets = [
        { key: 'SESSION_SECRET', val: data.SESSION_SECRET },
        { key: 'CURSOR_SIGNING_SECRET', val: data.CURSOR_SIGNING_SECRET },
        { key: 'SANDBOX_SHARED_SECRET', val: data.SANDBOX_SHARED_SECRET },
      ];

      for (const secret of secrets) {
        if (PLACEHOLDER_REGEX.test(secret.val) || secret.val.length < 32) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: [secret.key],
            message: `${secret.key} must be at least 32 characters and cannot be a placeholder in production`,
          });
        }
      }

      if (data.ALLOW_LOCAL_SERVICES_IN_PRODUCTION !== 'true') {
        const networkServices = [
          { key: 'DATABASE_URL', val: data.DATABASE_URL },
          { key: 'REDIS_QUEUE_URL', val: data.REDIS_QUEUE_URL },
          { key: 'REDIS_CACHE_URL', val: data.REDIS_CACHE_URL },
        ];

        for (const service of networkServices) {
          if (LOCALHOST_REGEX.test(service.val)) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              path: [service.key],
              message: `${service.key} cannot point to localhost/loopback in production without explicit ALLOW_LOCAL_SERVICES_IN_PRODUCTION=true`,
            });
          }
        }
      }
    }
  });

export type Env = z.infer<typeof EnvSchema>;

export function validateEnv(rawEnv: Record<string, string | undefined>): Env {
  const parsed = EnvSchema.safeParse(rawEnv);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => ({
      key: i.path.join('.'),
      message: i.message,
    }));
    throw new ConfigValidationError(issues);
  }
  return parsed.data;
}
