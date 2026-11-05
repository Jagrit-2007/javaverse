// Test environment variables
(process.env as Record<string, string | undefined>).NODE_ENV = 'test';
process.env.DATABASE_URL =
  process.env.DATABASE_URL ||
  'postgresql://javaverse:javaverse@127.0.0.1:5432/javaverse?schema=public';
process.env.REDIS_QUEUE_URL = process.env.REDIS_QUEUE_URL || 'redis://127.0.0.1:6379';
process.env.REDIS_CACHE_URL = process.env.REDIS_CACHE_URL || 'redis://127.0.0.1:6380';
process.env.SESSION_SECRET =
  process.env.SESSION_SECRET || '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
process.env.APP_MASTER_KEY =
  process.env.APP_MASTER_KEY || '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
process.env.CURSOR_SIGNING_SECRET =
  process.env.CURSOR_SIGNING_SECRET ||
  '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
process.env.SANDBOX_SHARED_SECRET =
  process.env.SANDBOX_SHARED_SECRET ||
  '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
process.env.APP_URL = process.env.APP_URL || 'http://localhost:3000';
process.env.SMTP_HOST = process.env.SMTP_HOST || '127.0.0.1';
process.env.SMTP_PORT = process.env.SMTP_PORT || '1025';
process.env.SMTP_FROM = process.env.SMTP_FROM || 'noreply@javaverse.local';
process.env.EMAIL_FROM = process.env.EMAIL_FROM || 'noreply@javaverse.local';

// Test setup for jsdom environment
if (typeof window !== 'undefined') {
  // Mock window.matchMedia
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }),
  });

  // Mock HTMLDialogElement methods if not implemented in jsdom
  if (!HTMLDialogElement.prototype.showModal) {
    HTMLDialogElement.prototype.showModal = function () {
      this.setAttribute('open', '');
    };
  }
  if (!HTMLDialogElement.prototype.close) {
    HTMLDialogElement.prototype.close = function () {
      this.removeAttribute('open');
    };
  }
}
