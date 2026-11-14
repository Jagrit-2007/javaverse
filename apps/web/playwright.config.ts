import { defineConfig, devices } from '@playwright/test';
import { assertSafeTestDatabase, getDatabaseNameFromUrl } from '@javaverse/db';

const TEST_DATABASE_URL =
  process.env.TEST_DATABASE_URL ||
  'postgresql://javaverse:javaverse@127.0.0.1:5432/javaverse_test?schema=public';

const TEST_MASTER_KEY =
  process.env.APP_MASTER_KEY || '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';

// Ensure the Playwright test runner process targets javaverse_test and test environment
(process.env as Record<string, string | undefined>).NODE_ENV = 'test';
process.env.DATABASE_URL = TEST_DATABASE_URL;
process.env.APP_MASTER_KEY = TEST_MASTER_KEY;

// Strict safety guard: Assert safe test database before initializing test runner
assertSafeTestDatabase(TEST_DATABASE_URL);
const targetTestDb = getDatabaseNameFromUrl(TEST_DATABASE_URL);
if (targetTestDb === 'javaverse') {
  throw new Error(
    'CRITICAL DATA-SAFETY VIOLATION: Playwright cannot target development database "javaverse"',
  );
}

export default defineConfig({
  testDir: './test/e2e',
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: 0,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'off',
    video: 'off',
    screenshot: 'off',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
  ],
  webServer: {
    command: `sh -c "node -e 'const u = new URL(process.env.DATABASE_URL || \\\"\\\"); const db = u.pathname.replace(/^\\/+/, \\\"\\\").split(\\\"?\\\")[0]; if (db === \\\"javaverse\\\") { console.error(\\\"Playwright webServer refusing to run on javaverse\\\"); process.exit(1); }' && DATABASE_URL='${TEST_DATABASE_URL}' APP_MASTER_KEY='${TEST_MASTER_KEY}' pnpm --filter @javaverse/worker run dev & DATABASE_URL='${TEST_DATABASE_URL}' APP_MASTER_KEY='${TEST_MASTER_KEY}' ALLOW_LOCAL_SERVICES_IN_PRODUCTION=true pnpm run start"`,
    url: 'http://localhost:3000',
    reuseExistingServer: false,
    timeout: 60 * 1000,
    env: {
      DATABASE_URL: TEST_DATABASE_URL,
      APP_MASTER_KEY: TEST_MASTER_KEY,
      ALLOW_LOCAL_SERVICES_IN_PRODUCTION: 'true',
    },
  },
});
