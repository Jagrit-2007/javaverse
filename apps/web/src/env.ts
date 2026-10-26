import { validateEnv, ConfigValidationError, type Env } from '@javaverse/schemas';
import { createLogger } from '@javaverse/observability';

const logger = createLogger({ service: 'web' });

let env: Env;

try {
  env = validateEnv(process.env);
} catch (error) {
  if (error instanceof ConfigValidationError) {
    logger.fatal(
      { issues: error.issues },
      'Failed to bootstrap web application due to invalid environment',
    );
  } else {
    logger.fatal({ err: error }, 'Unexpected error during environment validation');
  }
  process.exit(1);
}

export { env };
