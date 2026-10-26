import { sanitizeErrorMessage } from '@javaverse/security';

export const serializers = {
  err: (err: unknown) => {
    if (!(err instanceof Error)) {
      return err;
    }
    return {
      type: err.name,
      message: sanitizeErrorMessage(err.message),
      stack:
        process.env.NODE_ENV === 'production' ? undefined : sanitizeErrorMessage(err.stack || ''),
    };
  },
  req: (
    req:
      | {
          method?: string;
          url?: string;
          headers?: Record<string, string | undefined>;
        }
      | null
      | undefined,
  ) => {
    if (!req) return req;
    return {
      method: req.method,
      url: req.url,
      headers: {
        host: req.headers?.host,
        'user-agent': req.headers?.['user-agent'],
        'x-correlation-id': req.headers?.['x-correlation-id'],
      },
    };
  },
  res: (res: { statusCode?: number } | null | undefined) => {
    if (!res) return res;
    return {
      statusCode: res.statusCode,
    };
  },
};
