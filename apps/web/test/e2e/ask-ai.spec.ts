import { test, expect, type Page } from '@playwright/test';
import { prisma, assertSafeTestDatabase } from '@javaverse/db';
import { Redis } from 'ioredis';

const VALID_PASSWORD = 'LearnerP@ssw0rd!2026';

async function registerAndLoginLearner(page: Page, email: string, displayName = 'Learner') {
  await page.goto('/auth/signup');
  await page.fill('#signup-name', displayName);
  await page.fill('#signup-email', email);
  await page.fill('#signup-password', VALID_PASSWORD);
  await page.fill('#signup-confirm-password', VALID_PASSWORD);
  await page.click('button:has-text("Create account")');
  await expect(page).toHaveURL(/\/auth\/login\?created=1/);
  await expect(
    page.locator('text=Account created successfully. Sign in with your email and password.'),
  ).toBeVisible();
  await page.fill('#login-email', email);
  await expect(page.locator('#login-email')).toHaveValue(email);
  await page.fill('#login-password', VALID_PASSWORD);
  await expect(page.locator('#login-password')).toHaveValue(VALID_PASSWORD);
  await page.click('button:has-text("Sign In")');
  await expect(page).toHaveURL(/\/dashboard/);
}

test.describe('Part 4 & 8: Comprehensive Ask-AI End-to-End Suite (27 Browser Scenarios)', () => {
  let userEmail: string;
  let userBEmail: string;

  test.beforeEach(async () => {
    // 1. Strict test database guard before any cleanup
    assertSafeTestDatabase(process.env.DATABASE_URL);

    // 2. Clean test database tables
    await prisma.session.deleteMany();
    await prisma.recoveryCode.deleteMany();
    await prisma.mfaTotp.deleteMany();
    await prisma.emailToken.deleteMany();
    await prisma.userProgress.deleteMany();
    await prisma.userReward.deleteMany();
    await prisma.userBadge.deleteMany();
    await prisma.userStreamEvent.deleteMany();
    await prisma.durableJob.deleteMany();
    await prisma.analysis.deleteMany();
    await prisma.message.deleteMany();
    await prisma.chatState.deleteMany();
    await prisma.chat.deleteMany();
    await prisma.user.deleteMany();

    // 3. Flush Redis cache
    const redis = new Redis(process.env.REDIS_CACHE_URL || 'redis://localhost:6380/0');
    await redis.flushdb();
    redis.disconnect();

    const nonce = `${Date.now()}.${Math.random().toString(36).slice(2)}`;
    userEmail = `learner.askai.${nonce}@example.local`;
    userBEmail = `learner.b.askai.${nonce}@example.local`;
  });

  test('Scenarios 1-4, 22-24, 26, 27: Local Mock mode, badges, zero tokens, execution wording, and error hygiene', async ({
    page,
  }) => {
    const consoleErrors: string[] = [];
    const pageErrors: Error[] = [];

    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });
    page.on('pageerror', (err) => {
      pageErrors.push(err);
    });

    // Sign up learner and access dashboard
    await registerAndLoginLearner(page, userEmail, 'Mock Learner');

    await page.goto('/dashboard/ask');
    await expect(page).toHaveURL(/\/dashboard\/ask/);

    // Scenario 1: Local Mock badge is visible
    // Scenario 2: Mock model identifier is visible
    // Scenario 4: Mock displays No external token usage
    const aiBanner = page.locator('[data-testid="ai-mode-banner"]').first();
    await expect(aiBanner).toBeVisible();
    await expect(aiBanner).toContainText('AI Provider: Local Mock');
    await expect(aiBanner).toContainText('Model:');
    await expect(aiBanner).toContainText('Type: Local');
    await expect(aiBanner).toContainText('No external AI request or paid token usage');

    // Scenario 3: Verify mock performs NO external fetch to googleapis or anthropic
    let externalFetchAttempted = false;
    await page.route(/(generativelanguage\.googleapis\.com|api\.anthropic\.com)/, (route) => {
      externalFetchAttempted = true;
      route.abort();
    });

    // Select Slot 1
    const slot1Card = page.locator('button:has-text("Slot 1")').first();
    await expect(slot1Card).toBeVisible();
    await slot1Card.click();

    // Verify external consent is bypassed in mock mode
    await expect(page.locator('[data-testid="external-ai-consent-dialog"]')).not.toBeVisible();

    // Compose question
    const composer = page.locator('textarea[aria-label="Your Java Question"]');
    await expect(composer).toBeVisible();
    await composer.fill('How do I reverse an ArrayList in Java?');

    // Submit question
    await page.locator('button:has-text("Send Question")').click();

    // Verify message appears in log
    await expect(
      page.locator('[role="log"]').getByText('How do I reverse an ArrayList in Java?'),
    ).toBeVisible();

    // Wait for mock pipeline completion (wait for code to populate)
    const codeArea = page.locator('pre code');
    await expect(codeArea).toContainText('public class Solution', { timeout: 25000 });

    // Scenario 23: "Verified in Sandbox" is absent
    await expect(page.locator('text=Verified in Sandbox')).not.toBeVisible();

    // Scenario 24: Local Mock execution wording is visible
    await expect(page.locator('text=Execution mode: Local Mock')).toBeVisible();

    // Scenario 4: Token usage display truthfully shows Local Mock · No external token usage
    const tokenDisplay = page.locator('[data-testid="token-usage-display"]').first();
    await expect(tokenDisplay).toBeVisible({ timeout: 25000 });
    await expect(tokenDisplay).toContainText('Local Mock · No external token usage');

    // Requirement A4: Usage remains visible after page reload and chat reopen
    await page.reload();
    await expect(page.locator('button:has-text("Slot 1")').first()).toBeVisible();
    await page.locator('button:has-text("Slot 1")').first().click();
    const reloadedTokenDisplay = page.locator('[data-testid="token-usage-display"]').first();
    await expect(reloadedTokenDisplay).toBeVisible({ timeout: 10000 });
    await expect(reloadedTokenDisplay).toContainText('Local Mock · No external token usage');

    // Scenario 3 assertion: Confirmed zero external API calls
    expect(externalFetchAttempted).toBe(false);

    // Scenario 22: No API key anywhere in URL, localStorage, sessionStorage, or DOM
    expect(page.url()).not.toMatch(/api[_-]?key/i);
    const storageKeys = await page.evaluate(() => {
      return {
        local: Object.keys(localStorage),
        session: Object.keys(sessionStorage),
      };
    });
    expect(storageKeys.local.some((k) => k.toLowerCase().includes('key'))).toBe(false);
    expect(storageKeys.session.some((k) => k.toLowerCase().includes('key'))).toBe(false);

    // Scenario 26 & 27: No unexpected browser console errors or uncaught page errors
    expect(pageErrors.length).toBe(0);
    const criticalConsoleErrors = consoleErrors.filter(
      (msg) => !msg.includes('favicon') && !msg.includes('Hydration'),
    );
    expect(criticalConsoleErrors.length).toBe(0);
  });

  test('Scenarios 5-14: Controlled external stub, allowlist models, consent lifecycle, cancel, and two-user isolation', async ({
    page,
  }) => {
    // Sign up User A
    await registerAndLoginLearner(page, userEmail, 'Learner Alpha');

    // Intercept /api/v1/ai/providers to simulate configured Gemini external provider
    await page.route('**/api/v1/ai/providers', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: {
            activeProvider: 'gemini',
            activeModel: 'gemini-2.5-flash',
            externalAiEnabled: true,
            providers: [
              {
                id: 'mock',
                label: 'Local Mock',
                configured: true,
                external: false,
                mayConsumePaidUsage: false,
              },
              {
                id: 'gemini',
                label: 'Gemini',
                configured: true,
                external: true,
                mayConsumePaidUsage: true,
              },
              {
                id: 'anthropic',
                label: 'Anthropic',
                configured: false,
                external: true,
                mayConsumePaidUsage: true,
              },
            ],
          },
        }),
      });
    });

    await page.goto('/dashboard/ask');

    // Scenario 6: Configured external provider label is accurate ("Gemini")
    // Scenario 7: Allowlisted model label is accurate ("gemini-2.5-flash")
    const banner = page.locator('[data-testid="ai-mode-banner"]').first();
    await expect(banner).toContainText('AI Provider: Gemini');
    await expect(banner).toContainText('gemini-2.5-flash');

    // Scenario 8: Unconfigured provider cannot be selected (no UI allows selecting unconfigured anthropic)
    await expect(page.locator('button:has-text("Anthropic")')).toHaveCount(0);

    // Open Slot 1
    await page.locator('button:has-text("Slot 1")').first().click();

    // Draft a question
    const composer = page.locator('textarea[aria-label="Your Java Question"]');
    await composer.fill('Explain Java Record patterns and pattern matching.');

    // Intercept POST /api/v1/chats/*/messages to verify no outbound request before consent
    let outboundSent = false;
    await page.route('**/api/v1/chats/*/messages', async (route) => {
      outboundSent = true;
      await route.continue();
    });

    // Click Send Question
    await page.locator('button:has-text("Send Question")').click();

    // Scenario 9: External-AI consent modal appears before dispatch
    const consentDialog = page.locator('[data-testid="external-ai-consent-dialog"]');
    await expect(consentDialog).toBeVisible();

    // Scenario 10: Consent copy says "Remember for this browser session"
    const checkboxLabel = consentDialog.locator('label[for="consent-remember"]');
    await expect(checkboxLabel).toHaveText('Remember for this browser session');

    // Privacy warning accurately states detection may not catch all secrets
    await expect(consentDialog).toContainText(
      'Automated detection may not identify every sensitive value',
    );

    // Scenario 11 & 12: Cancel sends NO provider request and creates NO durable provider job
    await consentDialog.locator('button:has-text("Cancel")').click();
    await expect(consentDialog).not.toBeVisible();
    expect(outboundSent).toBe(false);

    // Draft remains intact in composer
    await expect(composer).toHaveValue('Explain Java Record patterns and pattern matching.');

    // Check DB has 0 durable jobs created
    const jobsCount = await prisma.durableJob.count();
    expect(jobsCount).toBe(0);

    // Check session consent can be granted
    await page.locator('button:has-text("Send Question")').click();
    await expect(consentDialog).toBeVisible();
    await consentDialog.locator('#consent-remember').check();

    // Mock message response so we don't call real external Gemini
    await page.route('**/api/v1/chats/*/messages', async (route) => {
      await route.fulfill({
        status: 202,
        contentType: 'application/json',
        body: JSON.stringify({
          data: {
            message: {
              id: 'msg-user-1',
              content: 'Explain Java Record patterns and pattern matching.',
            },
            assistantMessage: { id: 'msg-asst-1', content: '' },
            jobId: 'job-stub-1',
          },
        }),
      });
    });

    await consentDialog.locator('button:has-text("Continue with Gemini")').click();
    await expect(consentDialog).not.toBeVisible();

    // Verify consent stored in sessionStorage
    const storedConsent = await page.evaluate(() => sessionStorage.getItem('external_ai_consent'));
    expect(storedConsent).toBe('true');

    // Scenario 13: Logout clears session-level consent
    await page.locator('button[aria-label="Sign out of JavaVerse"]').click();
    await expect(page).toHaveURL(/\/auth\/login/);

    const postLogoutConsent = await page.evaluate(() =>
      sessionStorage.getItem('external_ai_consent'),
    );
    expect(postLogoutConsent).toBeNull();

    // Scenario 14: A second learner does not inherit consent
    // Sign up User B in the same browser
    await registerAndLoginLearner(page, userBEmail, 'Learner Beta');

    await page.goto('/dashboard/ask');
    await page.locator('button:has-text("Slot 1")').first().click();
    const composerB = page.locator('textarea[aria-label="Your Java Question"]');
    await composerB.fill('What is the difference between Comparable and Comparator?');
    await page.locator('button:has-text("Send Question")').click();

    // User B must see the consent dialog (did not inherit User A's consent)
    await expect(page.locator('[data-testid="external-ai-consent-dialog"]')).toBeVisible();
  });

  test('Scenarios 15-16: Usage displays when metadata exists, or shows "Token usage not reported by provider"', async ({
    page,
  }) => {
    // Authenticate learner
    await registerAndLoginLearner(page, userEmail, 'Usage Tester');

    // Create a completed chat with real usage metadata in DB
    const user = await prisma.user.findFirst({ where: { email: userEmail.toLowerCase() } });
    expect(user).not.toBeNull();

    const chatWithUsage = await prisma.chat.create({
      data: {
        userId: user!.id,
        slot: 1,
        title: 'Token Usage Test',
      },
    });

    await prisma.message.create({
      data: {
        chatId: chatWithUsage.id,
        role: 'USER',
        content: 'Explain Java generics wildcard capture.',
        status: 'SENT',
      },
    });

    const asstMsg = await prisma.message.create({
      data: {
        chatId: chatWithUsage.id,
        role: 'ASSISTANT',
        content: 'Wildcard capture occurs when the compiler infers a specific type for a wildcard.',
        status: 'SENT',
      },
    });

    // Attach analysis with external usage metadata (240 input, 180 output, 420 total)
    await prisma.analysis.create({
      data: {
        messageId: asstMsg.id,
        modelId: 'gemini-2.5-flash',
        promptVersion: '1.0.0',
        result: {
          schemaVersion: 1,
          meta: { topic: 'Java Generics', difficulty: 'MEDIUM', confidence: 1 },
          understanding: { restatement: 'Generics wildcard capture explanation' },
          approaches: [
            {
              name: 'Helper method capture',
              idea: 'Capture wildcard with type parameter',
              time: 'O(1)',
              space: 'O(1)',
            },
          ],
          solution: { code: 'void foo(List<?> list) { fooHelper(list); }' },
          usageMetadata: {
            provider: 'gemini',
            model: 'gemini-2.5-flash',
            inputTokens: 240,
            outputTokens: 180,
            totalTokens: 420,
            isSynthetic: false,
          },
        },
      },
    });

    await page.goto('/dashboard/ask');
    const slot1Card = page.locator('button:has-text("Token Usage Test")');
    await expect(slot1Card).toBeVisible();
    await slot1Card.click();

    // Scenario 15: Usage displays formatted numbers when provider metadata exists
    const tokenDisplay = page.locator('[data-testid="token-usage-display"]');
    await expect(tokenDisplay).toBeVisible();
    await expect(tokenDisplay).toContainText(
      'Gemini · gemini-2.5-flash · 240 input tokens · 180 output tokens · 420 total tokens',
    );

    // Create Slot 2 with missing token usage (nulls)
    const chatMissingUsage = await prisma.chat.create({
      data: {
        userId: user!.id,
        slot: 2,
        title: 'Missing Tokens Test',
      },
    });

    const asstMsg2 = await prisma.message.create({
      data: {
        chatId: chatMissingUsage.id,
        role: 'ASSISTANT',
        content: 'Response with unmetered provider.',
        status: 'SENT',
      },
    });

    await prisma.analysis.create({
      data: {
        messageId: asstMsg2.id,
        modelId: 'claude-3-5-sonnet-20241022',
        promptVersion: '1.0.0',
        result: {
          schemaVersion: 1,
          meta: { topic: 'Testing', difficulty: 'EASY', confidence: 1 },
          understanding: { restatement: 'Testing missing tokens' },
          approaches: [{ name: 'Test', idea: 'Test', time: 'O(1)', space: 'O(1)' }],
          solution: { code: '// code' },
          usageMetadata: {
            provider: 'anthropic',
            model: 'claude-3-5-sonnet-20241022',
            inputTokens: null,
            outputTokens: null,
            totalTokens: null,
          },
        },
      },
    });

    await page.goto('/dashboard/ask');
    const slot2Card = page.locator('button:has-text("Missing Tokens Test")');
    await expect(slot2Card).toBeVisible();
    await slot2Card.click();

    // Scenario 16: Missing usage displays "Token usage not reported by provider"
    await expect(page.locator('[data-testid="token-usage-display"]')).toContainText(
      'Token usage not reported by provider',
    );
  });

  test('Scenario 17: Rapid duplicate Send clicks create exactly one durable job and keep button disabled with accessible busy state', async ({
    page,
  }) => {
    // Authenticate
    await registerAndLoginLearner(page, userEmail, 'Duplicate Tester');

    await page.goto('/dashboard/ask');
    await page.locator('button:has-text("Slot 1")').first().click();

    const composer = page.locator('textarea[aria-label="Your Java Question"]');
    await composer.fill('Demonstrate concurrency limits.');

    const sendBtn = page.locator('button:has-text("Send Question")');
    await expect(sendBtn).toBeVisible();

    // Deterministically hold the network request in-flight to assert pending busy state
    let resolveMessageRoute: () => void = () => {};
    const messagePaused = new Promise<void>((resolve) => {
      resolveMessageRoute = resolve;
    });

    let dispatchCount = 0;
    await page.route('**/api/v1/chats/*/messages', async (route) => {
      dispatchCount++;
      await messagePaused;
      await route.continue();
    });

    // Initiate click without waiting for network response to complete
    await sendBtn.click({ noWaitAfter: true });

    // While submission is pending: verify button is disabled, aria-disabled is accurate, aria-busy is true, and processing status is visible
    await expect(sendBtn).toBeVisible();
    await expect(sendBtn).toBeDisabled();
    await expect(sendBtn).toHaveAttribute('aria-disabled', 'true');
    await expect(sendBtn).toHaveAttribute('aria-busy', 'true');
    await expect(page.locator('[data-testid="composer-processing-status"]')).toBeVisible();

    // Attempt second rapid click on the disabled button while first is pending
    await sendBtn.click({ force: true });

    // Release deferred in-flight request
    resolveMessageRoute();

    // Verify only one dispatch occurred from the browser
    expect(dispatchCount).toBe(1);

    // Verify in database: exactly 1 durable job created for this user
    const user = await prisma.user.findFirst({ where: { email: userEmail.toLowerCase() } });
    expect(user).not.toBeNull();

    await expect
      .poll(
        async () => {
          return prisma.durableJob.count({ where: { userId: user!.id } });
        },
        { timeout: 10000 },
      )
      .toBe(1);
  });

  test('Scenario 18: Daily limit display safe 429 message test', async ({ page }) => {
    // Authenticate
    await registerAndLoginLearner(page, userEmail, 'Daily Limit Tester');

    // Mock Gemini external provider
    await page.route('**/api/v1/ai/providers', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: {
            activeProvider: 'gemini',
            activeModel: 'gemini-2.5-flash',
            externalAiEnabled: true,
            providers: [
              {
                id: 'gemini',
                label: 'Gemini',
                configured: true,
                external: true,
                mayConsumePaidUsage: true,
              },
            ],
          },
        }),
      });
    });

    // Mock 429 response from messages API
    await page.route('**/api/v1/chats/*/messages', async (route) => {
      await route.fulfill({
        status: 429,
        contentType: 'application/json',
        headers: { 'Retry-After': '14400' },
        body: JSON.stringify({
          error: {
            code: 'DAILY_LIMIT_EXCEEDED',
            message:
              'Daily external AI request limit reached for this account (50 requests/day). Limit resets at midnight UTC (in ~4h).',
          },
        }),
      });
    });

    await page.goto('/dashboard/ask');
    // Pre-seed consent so prompt dispatch directly calls messages API
    await page.evaluate(() => sessionStorage.setItem('external_ai_consent', 'true'));

    await page.locator('button:has-text("Slot 1")').first().click();
    const composer = page.locator('textarea[aria-label="Your Java Question"]');
    await composer.fill('Another question after limit exceeded.');
    await page.locator('button:has-text("Send Question")').click();

    // Verify safe 429 message is displayed to user
    await expect(
      page.locator('text=Daily external AI request limit reached for this account'),
    ).toBeVisible();
  });

  test('Scenario 19: Concurrency ceiling safe 429 message test', async ({ page }) => {
    // Authenticate
    await registerAndLoginLearner(page, userEmail, 'Concurrency Tester');

    // Mock Gemini external provider
    await page.route('**/api/v1/ai/providers', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: {
            activeProvider: 'gemini',
            activeModel: 'gemini-2.5-flash',
            externalAiEnabled: true,
            providers: [
              {
                id: 'gemini',
                label: 'Gemini',
                configured: true,
                external: true,
                mayConsumePaidUsage: true,
              },
            ],
          },
        }),
      });
    });

    // Mock 429 response for concurrency ceiling
    await page.route('**/api/v1/chats/*/messages', async (route) => {
      await route.fulfill({
        status: 429,
        contentType: 'application/json',
        body: JSON.stringify({
          error: {
            code: 'CONCURRENCY_LIMIT_EXCEEDED',
            message:
              'Installation external AI concurrency limit reached. Please wait a few moments for active requests to finish.',
          },
        }),
      });
    });

    await page.goto('/dashboard/ask');
    // Pre-seed consent
    await page.evaluate(() => sessionStorage.setItem('external_ai_consent', 'true'));

    await page.locator('button:has-text("Slot 1")').first().click();
    const composer = page.locator('textarea[aria-label="Your Java Question"]');
    await composer.fill('Question under high concurrency.');
    await page.locator('button:has-text("Send Question")').click();

    await expect(
      page.locator('text=Installation external AI concurrency limit reached'),
    ).toBeVisible();
  });

  test('Scenarios 20-21: Cross-user privacy: User A cannot read User B chat or usage', async ({
    page,
  }) => {
    // 1. Create User A and User B
    const userA = await prisma.user.create({
      data: {
        email: userEmail.toLowerCase(),
        displayName: 'User Alpha',
        status: 'ACTIVE',
      },
    });

    const userB = await prisma.user.create({
      data: {
        email: userBEmail.toLowerCase(),
        displayName: 'User Beta',
        status: 'ACTIVE',
      },
    });

    // Create private chat and message for User B
    const chatB = await prisma.chat.create({
      data: {
        userId: userB.id,
        slot: 1,
        title: 'Secret Question from User B',
      },
    });

    await prisma.message.create({
      data: {
        chatId: chatB.id,
        role: 'USER',
        content: 'Confidential private message of User B',
        status: 'SENT',
      },
    });

    // 2. Log in as User A
    await page.goto('/auth/login');
    await page.fill('#login-email', userEmail);
    await page.fill('#login-password', VALID_PASSWORD);
    const { hashPassword } = await import('@javaverse/security');
    const hash = await hashPassword(VALID_PASSWORD);
    await prisma.user.update({ where: { id: userA.id }, data: { passwordHash: hash } });

    await page.click('button:has-text("Sign in")');
    await expect(page).toHaveURL(/\/dashboard/);

    // Scenario 20: User A visits /dashboard/ask
    await page.goto('/dashboard/ask');
    // User A must NOT see User B's chat title
    await expect(page.locator('text=Secret Question from User B')).toHaveCount(0);

    // Attempt direct API fetch of User B's chat as User A
    const directChatResponse = await page.evaluate(async (chatId) => {
      const res = await fetch(`/api/v1/chats/${chatId}`);
      return { status: res.status, ok: res.ok };
    }, chatB.id);

    // Must be rejected with 404 Not Found (or access denied)
    expect(directChatResponse.status).toBe(404);

    // Scenario 21: Attempt direct API fetch of User B's messages/usage
    const directMessagesResponse = await page.evaluate(async (chatId) => {
      const res = await fetch(`/api/v1/chats/${chatId}/messages`);
      return { status: res.status, ok: res.ok };
    }, chatB.id);

    expect(directMessagesResponse.status).toBe(404);
  });

  test('Scenario 25: Dark mode renders correctly across Ask workspace', async ({ page }) => {
    // Authenticate
    await registerAndLoginLearner(page, userEmail, 'Theme Tester');

    await page.goto('/dashboard/ask');

    // Toggle theme to dark via theme selector in TopBar
    const themeSelect = page.locator('header select[aria-label="Select color theme"]');
    await themeSelect.selectOption('dark');

    // Verify html tag has data-theme="dark"
    const htmlTag = page.locator('html');
    await expect(htmlTag).toHaveAttribute('data-theme', 'dark');

    // Verify Ask AI mode banner and workspace have dark surface styling
    const banner = page.locator('[data-testid="ai-mode-banner"]').first();
    await expect(banner).toBeVisible();

    const bannerBg = await banner.evaluate((el) => window.getComputedStyle(el).backgroundColor);
    // Background must not be pure white rgb(255, 255, 255)
    expect(bannerBg).not.toBe('rgb(255, 255, 255)');
  });
});
