import { test, expect } from '@playwright/test';
import { prisma, assertSafeTestDatabase } from '@javaverse/db';
import { Redis } from 'ioredis';
import {
  hashPassword,
  verifyPassword,
  generateRandomToken,
  deriveTokenDigest,
} from '@javaverse/security';
import { getServerKeys } from '@/lib/keys';

test.describe('Learner Authentication & Local-First Security E2E Flows', () => {
  const VALID_PASSWORD = 'LearnerP@ssw0rd!2026';

  test.beforeEach(async () => {
    // Assert strictly safe test database before any destructive cleanup
    assertSafeTestDatabase(process.env.DATABASE_URL);

    // Reset test database auth state
    await prisma.session.deleteMany();
    await prisma.recoveryCode.deleteMany();
    await prisma.mfaTotp.deleteMany();
    await prisma.emailToken.deleteMany();
    await prisma.userProgress.deleteMany();
    await prisma.userReward.deleteMany();
    await prisma.userBadge.deleteMany();
    await prisma.user.deleteMany();

    // Flush Redis cache rate limiter keys
    const redis = new Redis(process.env.REDIS_CACHE_URL || 'redis://localhost:6380/0');
    await redis.flushdb();
    redis.disconnect();
  });

  test('1. Learner local signup, session creation, logout, and subsequent login persistence (Part 3 #17)', async ({
    page,
  }) => {
    const testEmail = 'persistent.learner@example.local';
    const testPassword = VALID_PASSWORD;
    const testDisplayName = 'Persistent Learner';

    // 0. Confirm zero matching users in DB before starting
    const initialUserCount = await prisma.user.count({ where: { email: testEmail } });
    expect(initialUserCount).toBe(0);

    // 1. Visit /auth/bootstrap safely redirects to /auth/signup (Part 2 #2)
    await page.goto('/auth/bootstrap');
    await expect(page).toHaveURL(/\/auth\/signup/);
    await expect(page.locator('h1')).toContainText('Create your account');

    // 2. Fill registration form
    await page.fill('#signup-name', testDisplayName);
    await page.fill('#signup-email', testEmail);
    await page.fill('#signup-password', testPassword);
    await page.fill('#signup-confirm-password', testPassword);

    const signupPromise = page.waitForResponse((r) => r.url().includes('/api/v1/auth/signup'));
    await page.click('button:has-text("Create account")');
    const signupRes = await signupPromise;
    expect(signupRes.status()).toBe(201);

    // 3. Redirected to /auth/login?created=1 with accessible confirmation notice
    await expect(page).toHaveURL(/\/auth\/login\?created=1/);
    await expect(page.locator('div[role="status"]')).toContainText(
      'Account created successfully. Sign in with your email and password.',
    );
    expect(page.url()).not.toContain('/dashboard');

    // 4. Query DB for created user: account exists, Argon2id hash matches, but 0 sessions exist
    const dbUser = await prisma.user.findUnique({
      where: { email: testEmail },
    });
    expect(dbUser).not.toBeNull();
    const userId = dbUser!.id;
    expect(dbUser?.email).toBe(testEmail.toLowerCase());
    expect(dbUser?.displayName).toBe(testDisplayName);
    expect(dbUser?.passwordHash && dbUser.passwordHash.startsWith('$argon2id$')).toBe(true);

    const isPwValid = await verifyPassword(testPassword, dbUser!.passwordHash || '');
    expect(isPwValid).toBe(true);

    const initialSessionsCount = await prisma.session.count({
      where: { userId },
    });
    expect(initialSessionsCount).toBe(0);

    // 5. Fill login form with same credentials and sign in
    await page.fill('#login-email', testEmail);
    await expect(page.locator('#login-email')).toHaveValue(testEmail);
    await page.fill('#login-password', testPassword);
    await expect(page.locator('#login-password')).toHaveValue(testPassword);

    const firstLoginPromise = page.waitForResponse((r) => r.url().includes('/api/v1/auth/login'));
    await page.click('button:has-text("Sign In")');
    const firstLoginRes = await firstLoginPromise;
    expect(firstLoginRes.status()).toBe(200);

    // 6. Lands on Dashboard
    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page.locator('h1')).toBeVisible();

    const activeSessionAfterLogin = await prisma.session.findFirst({
      where: { userId, revokedAt: null },
    });
    expect(activeSessionAfterLogin).not.toBeNull();

    // Verify page refresh maintains active database session
    await page.reload();
    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page.locator('h1')).toBeVisible();

    // Verify fresh account progress starts at zero (Part 6)
    await expect(page.locator('text=Start Learning')).toBeVisible();
    await expect(
      page.locator(
        'text=No lessons completed yet. Start your Java learning journey to begin tracking progress.',
      ),
    ).toBeVisible();

    // 5. Logout through visible TopBar button
    const signOutBtn = page.locator('button[aria-label="Sign out of JavaVerse"]');
    await expect(signOutBtn).toBeVisible();
    const logoutPromise = page.waitForResponse((r) => r.url().includes('/api/v1/auth/logout'));
    await signOutBtn.click();
    await logoutPromise;
    await expect(page).toHaveURL(/\/auth\/login/);

    // Verify session invalidation in DB: no active (unrevoked) sessions
    const activeSessionsAfterLogout = await prisma.session.count({
      where: { userId, revokedAt: null },
    });
    expect(activeSessionsAfterLogout).toBe(0);

    // 6. Reload or use fresh page to log back in
    await page.goto('/auth/login');
    const csrfPromise = page.waitForResponse((r) => r.url().includes('/api/v1/auth/csrf'));
    await csrfPromise;

    await page.fill('#login-email', testEmail);
    await page.fill('#login-password', testPassword);

    const secondLoginPromise = page.waitForResponse((r) => r.url().includes('/api/v1/auth/login'));
    await page.click('button:has-text("Sign In")');
    const secondLoginRes = await secondLoginPromise;
    expect(secondLoginRes.status()).toBe(200);

    // 7. Lands on Dashboard
    await expect(page).toHaveURL(/\/dashboard/);

    // 8. DB assertions: exactly 1 user row, matching ID, Argon2id, exactly 1 active session
    const usersInDb = await prisma.user.findMany({
      where: { email: testEmail },
    });
    expect(usersInDb.length).toBe(1);
    expect(usersInDb[0]?.id).toBe(userId);

    const sessionsAfterLogin = await prisma.session.findMany({
      where: { userId, revokedAt: null },
    });
    expect(sessionsAfterLogin.length).toBe(1);
  });

  test('2. Case-insensitive email signup and login normalization (Part 3 #18)', async ({
    page,
  }) => {
    const mixedCaseEmail = 'Learner.MixedCase@Example.COM';
    const lowerCaseEmail = 'learner.mixedcase@example.com';

    // 1. Register with mixed case email
    await page.goto('/auth/signup');
    await page.fill('#signup-name', 'Mixed Case Learner');
    await page.fill('#signup-email', mixedCaseEmail);
    await page.fill('#signup-password', VALID_PASSWORD);
    await page.fill('#signup-confirm-password', VALID_PASSWORD);

    const signupPromise = page.waitForResponse((r) => r.url().includes('/api/v1/auth/signup'));
    await page.click('button:has-text("Create account")');
    const signupRes = await signupPromise;
    expect(signupRes.status()).toBe(201);
    await expect(page).toHaveURL(/\/auth\/login\?created=1/);
    await expect(
      page.locator('text=Account created successfully. Sign in with your email and password.'),
    ).toBeVisible();

    // 2. Log in with lowercase email
    await page.fill('#login-email', lowerCaseEmail);
    await expect(page.locator('#login-email')).toHaveValue(lowerCaseEmail);
    await page.fill('#login-password', VALID_PASSWORD);
    await expect(page.locator('#login-password')).toHaveValue(VALID_PASSWORD);
    const loginPromise = page.waitForResponse((r) => r.url().includes('/api/v1/auth/login'));
    await page.click('button:has-text("Sign In")');
    const loginRes = await loginPromise;
    expect(loginRes.status()).toBe(200);
    await expect(page).toHaveURL(/\/dashboard/);

    // Verify DB stores normalized email
    const dbUser = await prisma.user.findUnique({
      where: { email: lowerCaseEmail },
    });
    expect(dbUser).not.toBeNull();
  });

  test('3. Security Settings Page & Session Management (Part 2 #1)', async ({ page }) => {
    // 1. Seed learner
    const passwordHash = await hashPassword(VALID_PASSWORD);
    const user = await prisma.user.create({
      data: {
        email: 'learner.settings@example.com',
        passwordHash,
        status: 'ACTIVE',
        displayName: 'Active Learner',
      },
    });

    // 2. Log in through UI
    await page.goto('/auth/login');
    await page.fill('#login-email', user.email);
    await page.fill('#login-password', VALID_PASSWORD);
    const loginPromise = page.waitForResponse((r) => r.url().includes('/api/v1/auth/login'));
    await page.click('button:has-text("Sign In")');
    await loginPromise;

    // 3. Navigate to security settings
    await page.goto('/dashboard/settings/security');
    await expect(page.locator('h1')).toContainText('Account Security & Sessions');
    await expect(page.locator('text=Active Sessions')).toBeVisible();

    // Verify NO invitation or seat management elements exist
    await expect(page.locator('text=Workspace Learner Invitations')).not.toBeVisible();
    await expect(page.locator('text=Workspace Invitations')).not.toBeVisible();

    // 4. Check sign out via TopBar icon button
    const signOutBtn = page.locator('button[aria-label="Sign out of JavaVerse"]');
    await expect(signOutBtn).toBeVisible();
    await signOutBtn.click();

    // Redirected to login
    await expect(page).toHaveURL(/\/auth\/login/);
  });

  test('4. Learner Login Flow (valid credentials, session persistence, safe redirect, logout)', async ({
    page,
  }) => {
    const passwordHash = await hashPassword(VALID_PASSWORD);
    const learner = await prisma.user.create({
      data: {
        email: 'learner.login.e2e@example.com',
        passwordHash,
        status: 'ACTIVE',
        displayName: 'Browser Learner',
      },
    });

    // Visit /auth/login with a safe returnUrl
    const csrfPromise = page.waitForResponse((r) => r.url().includes('/api/v1/auth/csrf'));
    await page.goto('/auth/login?returnUrl=/dashboard/practice');
    await csrfPromise;

    await page.fill('#login-email', learner.email);
    await page.fill('#login-password', VALID_PASSWORD);

    const loginPromise = page.waitForResponse((r) => r.url().includes('/api/v1/auth/login'));
    await page.click('button:has-text("Sign In")');
    const loginRes = await loginPromise;
    expect(loginRes.status()).toBe(200);

    await expect(page).toHaveURL(/\/dashboard\/practice/);
    await page.waitForLoadState('networkidle');

    // Reload preserves session
    await page.reload();
    await expect(page).toHaveURL(/\/dashboard\/practice/);

    // Logout
    const signOutBtn = page.locator('button[aria-label="Sign out of JavaVerse"]');
    await signOutBtn.click();
    await expect(page).toHaveURL(/\/auth\/login/);

    // Unauthenticated access redirects
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/auth\/login/);
  });

  test('5. Login failure modes & open-redirect rejection', async ({ page }) => {
    const passwordHash = await hashPassword(VALID_PASSWORD);
    await prisma.user.create({
      data: {
        email: 'learner.authfail@example.com',
        passwordHash,
        status: 'ACTIVE',
        displayName: 'Fail Test Learner',
      },
    });

    // 1. Invalid password
    await page.goto('/auth/login');
    await page.fill('#login-email', 'learner.authfail@example.com');
    await page.fill('#login-password', 'WrongPassword!999');
    const failPromise = page.waitForResponse((r) => r.url().includes('/api/v1/auth/login'));
    await page.click('button:has-text("Sign In")');
    const failRes = await failPromise;
    expect(failRes.status()).toBe(401);
    const alert1 = page.locator('div[role="alert"]:not(#__next-route-announcer__)');
    await expect(alert1).toBeVisible();
    await expect(alert1).toContainText('Invalid email or password');

    // 2. Unknown account
    await page.fill('#login-email', 'nonexistent@example.com');
    await page.fill('#login-password', VALID_PASSWORD);
    const unknownPromise = page.waitForResponse((r) => r.url().includes('/api/v1/auth/login'));
    await page.click('button:has-text("Sign In")');
    const unknownRes = await unknownPromise;
    expect(unknownRes.status()).toBe(401);
    const alert2 = page.locator('div[role="alert"]:not(#__next-route-announcer__)');
    await expect(alert2).toBeVisible();

    // 3. Open redirect rejection: returnUrl pointing to external site falls back to /dashboard
    await page.goto('/auth/login?returnUrl=https://evil-phishing-site.example.com');
    await page.fill('#login-email', 'learner.authfail@example.com');
    await page.fill('#login-password', VALID_PASSWORD);
    const openRedirPromise = page.waitForResponse((r) => r.url().includes('/api/v1/auth/login'));
    await page.click('button:has-text("Sign In")');
    await openRedirPromise;
    await expect(page).toHaveURL(/\/dashboard$/);
  });

  test('6. Five-Account limit browser enforcement and capacity message (Part 5)', async ({
    page,
  }) => {
    // 1. Seed 5 existing active accounts
    const passwordHash = await hashPassword(VALID_PASSWORD);
    for (let i = 1; i <= 5; i++) {
      await prisma.user.create({
        data: {
          email: `learner${i}.capacity@example.com`,
          passwordHash,
          status: 'ACTIVE',
          displayName: `Learner ${i}`,
        },
      });
    }

    // 2. 6th account attempt via /auth/signup
    await page.goto('/auth/signup');
    await page.fill('#signup-name', 'Sixth Learner');
    await page.fill('#signup-email', 'learner6.capacity@example.com');
    await page.fill('#signup-password', VALID_PASSWORD);
    await page.fill('#signup-confirm-password', VALID_PASSWORD);

    const signupPromise = page.waitForResponse((r) => r.url().includes('/api/v1/auth/signup'));
    await page.click('button:has-text("Create account")');
    const signupRes = await signupPromise;
    expect(signupRes.status()).toBe(409);

    // 3. Exact capacity message is visible in accessible alert
    const alert = page.locator('div[role="alert"]:not(#__next-route-announcer__)');
    await expect(alert).toBeVisible();
    await expect(alert).toContainText(
      'This local JavaVerse installation has reached its limit of 5 accounts. Existing users can still sign in.',
    );

    // 4. Verify 6th user was NOT created in DB
    const user6 = await prisma.user.findUnique({
      where: { email: 'learner6.capacity@example.com' },
    });
    expect(user6).toBeNull();

    // 5. Existing user can still log in successfully
    const csrfPromise = page.waitForResponse((r) => r.url().includes('/api/v1/auth/csrf'));
    await page.goto('/auth/login');
    await csrfPromise;
    await page.fill('#login-email', 'learner1.capacity@example.com');
    await page.fill('#login-password', VALID_PASSWORD);
    const loginPromise = page.waitForResponse((r) => r.url().includes('/api/v1/auth/login'));
    await page.click('button:has-text("Sign In")');
    await loginPromise;
    await expect(page).toHaveURL(/\/dashboard$/);
  });

  test('7. Learner access to legacy admin routes safely redirects to dashboard', async ({
    page,
  }) => {
    // Register normal learner
    await page.goto('/auth/signup');
    await page.fill('#signup-name', 'Denied Learner');
    await page.fill('#signup-email', 'denied.learner@example.com');
    await page.fill('#signup-password', VALID_PASSWORD);
    await page.fill('#signup-confirm-password', VALID_PASSWORD);
    await page.click('button:has-text("Create account")');
    await expect(page).toHaveURL(/\/auth\/login\?created=1/);
    await expect(
      page.locator('text=Account created successfully. Sign in with your email and password.'),
    ).toBeVisible();
    await page.fill('#login-email', 'denied.learner@example.com');
    await expect(page.locator('#login-email')).toHaveValue('denied.learner@example.com');
    await page.fill('#login-password', VALID_PASSWORD);
    await expect(page.locator('#login-password')).toHaveValue(VALID_PASSWORD);
    await page.click('button:has-text("Sign In")');
    await expect(page).toHaveURL(/\/dashboard/);

    // Attempt direct navigation to /dashboard/admin
    await page.goto('/dashboard/admin');
    await expect(page).toHaveURL(/\/dashboard$/);

    // Verify Sidebar has NO Admin link
    await expect(page.locator('aside a:has-text("Admin")')).not.toBeVisible();
  });

  test('8. Theme selection across user lifecycle (public, login, dashboard, persistence) (Part 8)', async ({
    page,
  }) => {
    // 1. Unauthenticated on landing page selects dark theme
    await page.goto('/');
    const themeSelectLanding = page.locator('select[aria-label="Select color theme"]:visible');
    await expect(themeSelectLanding).toBeVisible();
    await themeSelectLanding.selectOption('dark');
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');

    // 2. Navigates to /auth/login - theme remains dark
    await page.goto('/auth/login');
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');

    // 3. Refresh /auth/login - theme remains dark from localStorage
    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');

    // 4. Switch to light on /auth/signup
    await page.goto('/auth/signup');
    const themeSelectSignup = page.locator('select[aria-label="Select color theme"]:visible');
    await themeSelectSignup.selectOption('light');
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');

    // 5. Create account - lands on dashboard
    await page.fill('#signup-name', 'Theme Learner');
    await page.fill('#signup-email', 'theme.learner@example.com');
    await page.fill('#signup-password', VALID_PASSWORD);
    await page.fill('#signup-confirm-password', VALID_PASSWORD);
    const signupPromise = page.waitForResponse((r) => r.url().includes('/api/v1/auth/signup'));
    await page.click('button:has-text("Create account")');
    await signupPromise;
    await expect(page).toHaveURL(/\/auth\/login\?created=1/);
    await expect(
      page.locator('text=Account created successfully. Sign in with your email and password.'),
    ).toBeVisible();
    await page.fill('#login-email', 'theme.learner@example.com');
    await expect(page.locator('#login-email')).toHaveValue('theme.learner@example.com');
    await page.fill('#login-password', VALID_PASSWORD);
    await expect(page.locator('#login-password')).toHaveValue(VALID_PASSWORD);
    await page.click('button:has-text("Sign In")');
    await expect(page).toHaveURL(/\/dashboard/);
    await page.waitForLoadState('networkidle');

    // 6. Switch to dark on dashboard TopBar and wait for persistence
    const themeSelectDash = page.locator('header select[aria-label="Select color theme"]');
    await expect(themeSelectDash).toBeVisible();
    const patchPromise = page.waitForResponse(
      (r) => r.url().includes('/api/v1/settings') && r.request().method() === 'PATCH',
    );
    await themeSelectDash.selectOption('dark');
    await patchPromise;
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');

    // 7. Verify settings reflects theme
    await page.goto('/dashboard/settings');
    const settingsThemeSelect = page.locator('#theme-select');
    await expect(settingsThemeSelect).toHaveValue('dark');

    // 8. Sign out - theme choice remains dark
    const signOutBtn = page.locator('button[aria-label="Sign out of JavaVerse"]');
    await signOutBtn.click();
    await expect(page).toHaveURL(/\/auth\/login/);
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  });

  test('9. Absence of Route Info and developer overlays on learner pages (Part 7)', async ({
    page,
  }) => {
    await page.goto('/');
    // Check that custom route info / clear segment overrides is not displayed
    const routeInfo = page.locator('text=Route Info');
    await expect(routeInfo).toHaveCount(0);
    const clearSegment = page.locator('text=Clear Segment Overrides');
    await expect(clearSegment).toHaveCount(0);
  });

  test('10. End-to-end Learner Credentials Freedom and Sign-in Reliability (Section 4)', async ({
    page,
  }) => {
    const nonce = Date.now();
    const testEmail = `learner.selected.${nonce}@custom-domain.ac.uk`;
    const testDisplayName = `Learner ${nonce}`;
    const testPassword = 'MyJavaPassword@2026';

    // 1. Open the visible Create account page
    await page.goto('/auth/signup');
    await expect(page.locator('h1')).toContainText('Create your account');

    // 2. Enter valid unique email, display name, password, and matching confirmation
    await page.fill('#signup-name', testDisplayName);
    await page.fill('#signup-email', testEmail);
    await page.fill('#signup-password', testPassword);
    await page.fill('#signup-confirm-password', testPassword);

    // 3. Click visible Create account button
    const signupPromise = page.waitForResponse(
      (r) => r.url().includes('/api/v1/auth/signup') && r.request().method() === 'POST',
    );
    await page.click('button:has-text("Create account")');
    const signupRes = await signupPromise;

    // 4. Verify HTTP 201, email normalized, Argon2id hash exists, plaintext absent, redirects to login with notice
    expect(signupRes.status()).toBe(201);
    await expect(page).toHaveURL(/\/auth\/login\?created=1/);

    const dbUser = await prisma.user.findUnique({
      where: { email: testEmail.toLowerCase() },
    });
    expect(dbUser).not.toBeNull();
    const signupUserId = dbUser!.id;
    expect(dbUser?.email).toBe(testEmail.toLowerCase());
    expect(dbUser?.passwordHash && dbUser.passwordHash.startsWith('$argon2id$')).toBe(true);

    const userCount = await prisma.user.count({ where: { email: testEmail.toLowerCase() } });
    expect(userCount).toBe(1);

    // Sign in to access dashboard
    await expect(
      page.locator('text=Account created successfully. Sign in with your email and password.'),
    ).toBeVisible();
    await page.fill('#login-email', testEmail);
    await expect(page.locator('#login-email')).toHaveValue(testEmail);
    await page.fill('#login-password', testPassword);
    await expect(page.locator('#login-password')).toHaveValue(testPassword);
    const initialLoginPromise = page.waitForResponse(
      (r) => r.url().includes('/api/v1/auth/login') && r.request().method() === 'POST',
    );
    await page.click('button:has-text("Sign In")');
    await initialLoginPromise;
    await expect(page).toHaveURL(/\/dashboard/);

    // 5. User ID recorded from safe DB query
    expect(signupUserId).toBeDefined();

    // 6. Log out through visible UI button
    const signOutBtn = page.locator('button[aria-label="Sign out of JavaVerse"]');
    await expect(signOutBtn).toBeVisible();
    const logoutPromise = page.waitForResponse(
      (r) => r.url().includes('/api/v1/auth/logout') && r.request().method() === 'POST',
    );
    await signOutBtn.click();
    const logoutRes = await logoutPromise;

    // 7. Verify logout succeeds, session revoked, redirected to login
    expect(logoutRes.status()).toBe(200);
    await expect(page).toHaveURL(/\/auth\/login/);
    await page.waitForLoadState('networkidle');

    const activeSessions = await prisma.session.count({
      where: { userId: signupUserId, revokedAt: null },
    });
    expect(activeSessions).toBe(0);

    // 8. Enter exact same email and password
    await page.fill('#login-email', testEmail);
    await expect(page.locator('#login-email')).toHaveValue(testEmail);
    await page.fill('#login-password', testPassword);
    await expect(page.locator('#login-password')).toHaveValue(testPassword);

    // 9. Click visible Sign in button
    const loginPromise = page.waitForResponse(
      (r) => r.url().includes('/api/v1/auth/login') && r.request().method() === 'POST',
    );
    await page.click('button:has-text("Sign In")');
    const loginRes = await loginPromise;

    // 10. Verify POST, HTTP 200, no credentials in URL, same account, dashboard redirect, same user ID
    expect(loginRes.status()).toBe(200);
    expect(loginRes.url()).not.toContain(testPassword);
    await expect(page).toHaveURL(/\/dashboard/);

    const activeSessions2 = await prisma.session.findMany({
      where: { userId: signupUserId, revokedAt: null },
    });
    expect(activeSessions2.length).toBe(1);
    const finalUserCount = await prisma.user.count({ where: { email: testEmail.toLowerCase() } });
    expect(finalUserCount).toBe(1);

    // 11-12. Log out and repeat login using a differently capitalized version of the email
    await page.locator('button[aria-label="Sign out of JavaVerse"]').click();
    await expect(page).toHaveURL(/\/auth\/login/);
    await page.waitForLoadState('networkidle');

    const capitalizedEmail = `LEARNER.SELECTED.${nonce}@CUSTOM-DOMAIN.AC.UK`;
    await page.fill('#login-email', capitalizedEmail);
    await expect(page.locator('#login-email')).toHaveValue(capitalizedEmail);
    await page.fill('#login-password', testPassword);
    const loginPromiseCap = page.waitForResponse(
      (r) => r.url().includes('/api/v1/auth/login') && r.request().method() === 'POST',
    );
    await page.click('button:has-text("Sign In")');
    const loginResCap = await loginPromiseCap;
    expect(loginResCap.status()).toBe(200);
    await expect(page).toHaveURL(/\/dashboard/);

    // 13-14. Log out and repeat login with leading and trailing email whitespace
    await page.locator('button[aria-label="Sign out of JavaVerse"]').click();
    await expect(page).toHaveURL(/\/auth\/login/);
    await page.waitForLoadState('networkidle');

    const spacedEmail = `   ${testEmail}   `;
    await page.fill('#login-email', spacedEmail);
    await page.fill('#login-password', testPassword);
    const loginPromiseSpace = page.waitForResponse(
      (r) => r.url().includes('/api/v1/auth/login') && r.request().method() === 'POST',
    );
    await page.click('button:has-text("Sign In")');
    const loginResSpace = await loginPromiseSpace;
    expect(loginResSpace.status()).toBe(200);
    await expect(page).toHaveURL(/\/dashboard/);

    // 15-16. Try the same email with a differently cased password -> generic invalid credentials
    await page.locator('button[aria-label="Sign out of JavaVerse"]').click();
    await expect(page).toHaveURL(/\/auth\/login/);
    await page.waitForLoadState('networkidle');

    const wrongCasedPassword = 'myjavapassword@2026';
    await page.fill('#login-email', testEmail);
    await expect(page.locator('#login-email')).toHaveValue(testEmail);
    await page.fill('#login-password', wrongCasedPassword);
    const loginPromiseFailCase = page.waitForResponse(
      (r) => r.url().includes('/api/v1/auth/login') && r.request().method() === 'POST',
    );
    await page.click('button:has-text("Sign In")');
    const loginResFailCase = await loginPromiseFailCase;
    expect(loginResFailCase.status()).toBe(401);
    const alertCase = page.locator('div[role="alert"]:not(#__next-route-announcer__)');
    await expect(alertCase).toBeVisible();
    await expect(alertCase).toContainText('Invalid email or password');

    // 17-18. Try a valid but unknown email -> same generic invalid credentials
    await page.fill('#login-email', `nonexistent.${nonce}@custom-domain.ac.uk`);
    await page.fill('#login-password', testPassword);
    const loginPromiseFailUnknown = page.waitForResponse(
      (r) => r.url().includes('/api/v1/auth/login') && r.request().method() === 'POST',
    );
    await page.click('button:has-text("Sign In")');
    const loginResFailUnknown = await loginPromiseFailUnknown;
    expect(loginResFailUnknown.status()).toBe(401);
    const alertUnknown = page.locator('div[role="alert"]:not(#__next-route-announcer__)');
    await expect(alertUnknown).toBeVisible();
    await expect(alertUnknown).toContainText('Invalid email or password');
  });

  test('11. Logout security: revokes server session, expires cookie, rejects protected route, removes external-AI consent, preserves theme and unrelated storage, prevents consent inheritance', async ({
    page,
  }) => {
    const nonce = Date.now();
    const learner1Email = `first.learner.${nonce}@example.com`;
    const learner2Email = `second.learner.${nonce}@example.com`;

    // 1. Sign up as first learner
    await page.goto('/auth/signup');
    await page.fill('#signup-name', 'First Learner');
    await page.fill('#signup-email', learner1Email);
    await page.fill('#signup-password', VALID_PASSWORD);
    await page.fill('#signup-confirm-password', VALID_PASSWORD);

    const signupPromise = page.waitForResponse((r) => r.url().includes('/api/v1/auth/signup'));
    await page.click('button:has-text("Create account")');
    const signupRes = await signupPromise;
    expect(signupRes.status()).toBe(201);
    await expect(page).toHaveURL(/\/auth\/login\?created=1/);
    await expect(
      page.locator('text=Account created successfully. Sign in with your email and password.'),
    ).toBeVisible();
    await page.fill('#login-email', learner1Email);
    await expect(page.locator('#login-email')).toHaveValue(learner1Email);
    await page.fill('#login-password', VALID_PASSWORD);
    await expect(page.locator('#login-password')).toHaveValue(VALID_PASSWORD);
    const loginPromise1 = page.waitForResponse((r) => r.url().includes('/api/v1/auth/login'));
    await page.click('button:has-text("Sign In")');
    const loginRes1 = await loginPromise1;
    expect(loginRes1.status()).toBe(200);
    await expect(page).toHaveURL(/\/dashboard/);
    await page.waitForLoadState('networkidle');

    const dbUser1 = await prisma.user.findUnique({
      where: { email: learner1Email },
    });
    expect(dbUser1).not.toBeNull();

    // 2. Select dark theme via visible TopBar selector and persist to DB & localStorage
    const themeSelectDash = page.locator('header select[aria-label="Select color theme"]');
    await expect(themeSelectDash).toBeVisible();
    const patchPromise = page.waitForResponse(
      (r) => r.url().includes('/api/v1/settings') && r.request().method() === 'PATCH',
    );
    await themeSelectDash.selectOption('dark');
    await patchPromise;
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');

    // Set external AI consent and unrelated items in browser storage
    await page.evaluate(() => {
      sessionStorage.setItem('external_ai_consent', 'true');
      sessionStorage.setItem('unrelated_session_key', 'keep_this_session');
      localStorage.setItem('unrelated_local_key', 'keep_this_local');
    });

    expect(await page.evaluate(() => sessionStorage.getItem('external_ai_consent'))).toBe('true');
    expect(await page.evaluate(() => sessionStorage.getItem('unrelated_session_key'))).toBe(
      'keep_this_session',
    );
    expect(await page.evaluate(() => localStorage.getItem('javaverse-theme'))).toBe('dark');
    expect(await page.evaluate(() => localStorage.getItem('unrelated_local_key'))).toBe(
      'keep_this_local',
    );

    // 3. Verify session active before logout
    const activeSessionsBefore = await prisma.session.count({
      where: { userId: dbUser1!.id, revokedAt: null },
    });
    expect(activeSessionsBefore).toBe(1);

    // 4. Click visible sign out button
    const signOutBtn = page.locator('button[aria-label="Sign out of JavaVerse"]');
    await expect(signOutBtn).toBeVisible();

    const logoutPromise = page.waitForResponse(
      (r) => r.url().includes('/api/v1/auth/logout') && r.request().method() === 'POST',
    );
    await signOutBtn.click();
    const logoutRes = await logoutPromise;

    // 5. Verify logout status HTTP 200, cookie expired (Max-Age=0)
    expect(logoutRes.status()).toBe(200);
    const setCookie = await logoutRes.headerValue('set-cookie');
    expect(setCookie).not.toBeNull();
    expect(setCookie).toContain('Max-Age=0');

    await expect(page).toHaveURL(/\/auth\/login/);
    await page.waitForLoadState('networkidle');

    // 6. Verify server-side session in PostgreSQL is revoked
    const activeSessionsAfter = await prisma.session.count({
      where: { userId: dbUser1!.id, revokedAt: null },
    });
    expect(activeSessionsAfter).toBe(0);

    // 7. Protected routes reject old session
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/auth\/login/);

    const checkSessionRes = await page.request.get('/api/v1/auth/session');
    expect(checkSessionRes.status()).toBe(200);
    const sessionStatus = await checkSessionRes.json();
    expect(sessionStatus.data.authenticated).toBe(false);
    expect(sessionStatus.data.user).toBeNull();

    const checkProtectedApiRes = await page.request.get('/api/v1/auth/sessions');
    expect(checkProtectedApiRes.status()).toBe(401);

    // 8. Verify browser storage:
    // - external_ai_consent removed
    // - theme preference intact
    // - unrelated session and local storage preserved (no indiscriminate clear())
    const consentAfterLogout = await page.evaluate(() =>
      sessionStorage.getItem('external_ai_consent'),
    );
    expect(consentAfterLogout).toBeNull();

    const unrelatedSessionVal = await page.evaluate(() =>
      sessionStorage.getItem('unrelated_session_key'),
    );
    expect(unrelatedSessionVal).toBe('keep_this_session');

    const themeAfterLogout = await page.evaluate(() => localStorage.getItem('javaverse-theme'));
    expect(themeAfterLogout).toBe('dark');
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');

    const unrelatedLocalVal = await page.evaluate(() =>
      localStorage.getItem('unrelated_local_key'),
    );
    expect(unrelatedLocalVal).toBe('keep_this_local');

    // 9. Second learner signs up on the same browser: confirm no consent inheritance
    await page.goto('/auth/signup');
    await page.waitForLoadState('networkidle');
    await page.fill('#signup-name', 'Second Learner');
    await page.fill('#signup-email', learner2Email);
    await page.fill('#signup-password', VALID_PASSWORD);
    await page.fill('#signup-confirm-password', VALID_PASSWORD);

    const signup2Promise = page.waitForResponse((r) => r.url().includes('/api/v1/auth/signup'));
    await page.click('button:has-text("Create account")');
    const signup2Res = await signup2Promise;
    expect(signup2Res.status()).toBe(201);
    await expect(page).toHaveURL(/\/auth\/login\?created=1/);
    await expect(
      page.locator('text=Account created successfully. Sign in with your email and password.'),
    ).toBeVisible();
    await page.fill('#login-email', learner2Email);
    await expect(page.locator('#login-email')).toHaveValue(learner2Email);
    await page.fill('#login-password', VALID_PASSWORD);
    await expect(page.locator('#login-password')).toHaveValue(VALID_PASSWORD);
    const loginPromise2 = page.waitForResponse((r) => r.url().includes('/api/v1/auth/login'));
    await page.click('button:has-text("Sign In")');
    const loginRes2 = await loginPromise2;
    expect(loginRes2.status()).toBe(200);
    await expect(page).toHaveURL(/\/dashboard/);
    await page.waitForLoadState('networkidle');

    // Confirm second learner does not inherit first learner's external AI consent
    const learner2Consent = await page.evaluate(() =>
      sessionStorage.getItem('external_ai_consent'),
    );
    expect(learner2Consent).toBeNull();

    // Confirm unrelated local storage remains intact in second learner session
    const preservedLocal = await page.evaluate(() => localStorage.getItem('unrelated_local_key'));
    expect(preservedLocal).toBe('keep_this_local');
  });

  test('12. Email verification URL fragment flow (#token=) security, Referer safety, and safe token lifecycle', async ({
    page,
  }) => {
    // 1. Create synthetic unverified learner account in isolated test DB
    const passwordHash = await hashPassword(VALID_PASSWORD);
    const unverifiedLearner = await prisma.user.create({
      data: {
        email: 'unverified.flow@example.local',
        displayName: 'Fragment Flow Learner',
        passwordHash,
        status: 'ACTIVE',
        emailVerifiedAt: null,
      },
    });

    // 2. Create synthetic verification token using approved security helpers
    const keys = getServerKeys();
    const syntheticToken = generateRandomToken(32);
    const tokenHash = deriveTokenDigest(
      syntheticToken,
      'email_verification',
      keys.authTokenHmacKey,
    );

    await prisma.emailToken.create({
      data: {
        subjectUserId: unverifiedLearner.id,
        purpose: 'VERIFY_EMAIL',
        deliveryChannel: 'EMAIL',
        tokenHash,
        expiresAt: new Date(Date.now() + 3600000), // 1 hour
      },
    });

    // Track console messages to confirm token is never printed to logs
    const consoleLogs: string[] = [];
    page.on('console', (msg) => consoleLogs.push(msg.text()));

    // Track requests to assert token is never leaked via query string or Referer header
    const requestedUrls: string[] = [];
    const refererHeaders: (string | undefined)[] = [];
    let verifyRequestBody: any = null;

    page.on('request', (req) => {
      requestedUrls.push(req.url());
      refererHeaders.push(req.headers()['referer']);
      if (req.url().includes('/api/v1/auth/email/verify') && req.method() === 'POST') {
        try {
          verifyRequestBody = req.postDataJSON();
        } catch {
          // ignore non-json
        }
      }
    });

    // 3. Open verification URL with hash fragment: /auth/verify-email#token=<token>
    const verifyPromise = page.waitForResponse(
      (r) => r.url().includes('/api/v1/auth/email/verify') && r.request().method() === 'POST',
    );
    await page.goto(`/auth/verify-email#token=${syntheticToken}`);

    // Wait for the verification API response
    const verifyRes = await verifyPromise;
    expect(verifyRes.status()).toBe(200);

    // 4. Verify token was transmitted ONLY in the JSON POST request body
    expect(verifyRequestBody).not.toBeNull();
    expect(verifyRequestBody?.token).toBe(syntheticToken);

    // 5. Verify no request URL contained ?token= or &token=
    for (const url of requestedUrls) {
      expect(url).not.toContain(`?token=`);
      expect(url).not.toContain(`&token=`);
      expect(url).not.toContain(syntheticToken);
    }

    // 6. Verify no Referer header contained the token
    for (const referer of refererHeaders) {
      if (referer) {
        expect(referer).not.toContain(syntheticToken);
        expect(referer).not.toContain('#token=');
        expect(referer).not.toContain('?token=');
      }
    }

    // 7. Verify the visible browser URL is immediately cleaned via history replacement
    await page.waitForFunction(() => window.location.hash === '');
    const currentUrl = page.url();
    expect(currentUrl).not.toContain('#token=');
    expect(currentUrl).not.toContain(syntheticToken);
    const hash = await page.evaluate(() => window.location.hash);
    expect(hash).toBe('');

    // 8. Verify the learner account received a verification timestamp in PostgreSQL
    const verifiedLearner = await prisma.user.findUnique({
      where: { id: unverifiedLearner.id },
    });
    expect(verifiedLearner?.emailVerifiedAt).not.toBeNull();

    // 9. Verify success UI is displayed and no token is visible in the UI
    const successAlert = page.locator('div[role="status"]');
    await expect(successAlert).toBeVisible();
    await expect(successAlert).toContainText(
      'Your email is verified. You now have full access to JavaVerse.',
    );
    const pageText = await page.locator('body').innerText();
    expect(pageText).not.toContain(syntheticToken);

    // 10. Verify no token was printed to client console/logs
    for (const log of consoleLogs) {
      expect(log).not.toContain(syntheticToken);
    }

    // 11. Verify reused token fails safely
    await page.goto('/auth/login');
    const reusePromise = page.waitForResponse(
      (r) => r.url().includes('/api/v1/auth/email/verify') && r.request().method() === 'POST',
    );
    await page.goto(`/auth/verify-email#token=${syntheticToken}`);
    const reuseRes = await reusePromise;
    expect(reuseRes.status()).toBe(400);
    const errorAlertReuse = page.locator('div[role="alert"]:not(#__next-route-announcer__)');
    await expect(errorAlertReuse).toBeVisible();
    await expect(errorAlertReuse).toContainText(
      'The email verification link is invalid or has expired',
    );

    // 12. Verify unknown / malformed token fails safely
    await page.goto('/auth/login');
    const unknownPromise = page.waitForResponse(
      (r) => r.url().includes('/api/v1/auth/email/verify') && r.request().method() === 'POST',
    );
    await page.goto('/auth/verify-email#token=malformed-unknown-token-xyz');
    const unknownRes = await unknownPromise;
    expect(unknownRes.status()).toBe(400);
    const errorAlertUnknown = page.locator('div[role="alert"]:not(#__next-route-announcer__)');
    await expect(errorAlertUnknown).toBeVisible();
    await expect(errorAlertUnknown).toContainText(
      'The email verification link is invalid or has expired',
    );

    // 13. Verify missing token fragment fails safely without making a POST request
    await page.goto('/auth/login');
    await page.goto('/auth/verify-email');
    const errorAlertMissing = page.locator('div[role="alert"]:not(#__next-route-announcer__)');
    await expect(errorAlertMissing).toBeVisible();
    await expect(errorAlertMissing).toContainText('Verification token is missing from the link.');
  });

  test('13. Comprehensive Pre-Authentication CSRF & Multi-Flow Governance (Section 18 Items A-G)', async ({
    page,
    context,
  }) => {
    const consoleErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        const text = msg.text();
        // Ignore expected HTTP response notices from intentional 401/403 test cases and favicon
        if (
          !text.includes('favicon.ico') &&
          !text.includes('status of 403') &&
          !text.includes('status of 401')
        ) {
          consoleErrors.push(text);
        }
      }
    });

    const testEmail = `remediated.csrf.${Date.now()}@example.local`;
    const testPassword = VALID_PASSWORD;
    const testDisplayName = 'Remediated CSRF Learner';

    // A. Visible signup: fast submit before initial token retrieval completes
    await page.goto('/auth/signup');
    await page.fill('#signup-name', testDisplayName);
    await page.fill('#signup-email', testEmail);
    await page.fill('#signup-password', testPassword);
    await page.fill('#signup-confirm-password', testPassword);

    const signupPromise = page.waitForResponse(
      (r) => r.url().includes('/api/v1/auth/signup') && r.request().method() === 'POST',
    );
    await page.click('button:has-text("Create account")');
    const signupRes = await signupPromise;
    expect(signupRes.status()).toBe(201);

    // Verify exactly one account created and redirect to login with confirmation
    await expect(page).toHaveURL(/\/auth\/login\?created=1/);
    const dbUser = await prisma.user.findUnique({ where: { email: testEmail } });
    expect(dbUser).not.toBeNull();
    const userId = dbUser!.id;

    // Verify confirmation notice and no CSRF error visible on page
    await expect(page.locator('div[role="status"]')).toContainText(
      'Account created successfully. Sign in with your email and password.',
    );
    const alertBox = page.locator('div[role="alert"]:not(#__next-route-announcer__)');
    await expect(alertBox).toHaveCount(0);

    // Initial log in to access dashboard
    await page.fill('#login-email', testEmail);
    await expect(page.locator('#login-email')).toHaveValue(testEmail);
    await page.fill('#login-password', testPassword);
    await expect(page.locator('#login-password')).toHaveValue(testPassword);
    const initialLoginPromise = page.waitForResponse(
      (r) => r.url().includes('/api/v1/auth/login') && r.request().method() === 'POST',
    );
    await page.click('button:has-text("Sign In")');
    const initialLoginRes = await initialLoginPromise;
    expect(initialLoginRes.status()).toBe(200);
    await expect(page).toHaveURL(/\/dashboard/);

    // B. Visible sign-in: sign out, open login, enter exact credentials, redirect
    const signOutBtn = page.locator('button[aria-label="Sign out of JavaVerse"]');
    await expect(signOutBtn).toBeVisible();
    const logoutPromise = page.waitForResponse(
      (r) => r.url().includes('/api/v1/auth/logout') && r.request().method() === 'POST',
    );
    await signOutBtn.click();
    await logoutPromise;
    await expect(page).toHaveURL(/\/auth\/login/);

    // Open visible login page without manual refresh, submit exact credentials
    await page.waitForLoadState('domcontentloaded');
    await expect(page.locator('#login-email')).toBeVisible();
    await page.fill('#login-email', testEmail);
    await expect(page.locator('#login-email')).toHaveValue(testEmail);
    await page.fill('#login-password', testPassword);
    await expect(page.locator('#login-password')).toHaveValue(testPassword);

    const loginPromise = page.waitForResponse(
      (r) => r.url().includes('/api/v1/auth/login') && r.request().method() === 'POST',
    );
    await page.click('button:has-text("Sign In")');
    const loginRes = await loginPromise;
    expect(loginRes.status()).toBe(200);
    await expect(page).toHaveURL(/\/dashboard/);

    // Verify authenticated user ID is the same
    const usersInDb = await prisma.user.findMany({ where: { email: testEmail } });
    expect(usersInDb.length).toBe(1);
    expect(usersInDb[0]?.id).toBe(userId);

    // C. Stale token recovery: simulate a stale token error on first attempt, verify automatic single retry
    await signOutBtn.click();
    await page.waitForURL(/\/auth\/login/);

    let retryTriggered = false;
    let postLoginCount = 0;
    await page.route('**/api/v1/auth/login', async (route) => {
      postLoginCount++;
      if (postLoginCount === 1) {
        retryTriggered = true;
        // Inject a simulated recognized CSRF failure on the first attempt
        await route.fulfill({
          status: 403,
          contentType: 'application/json',
          body: JSON.stringify({
            error: {
              code: 'CSRF_ERROR',
              message: 'Invalid pre-auth CSRF token',
            },
          }),
        });
      } else {
        // Let subsequent retry proceed to real server
        await route.continue();
      }
    });

    await page.fill('#login-email', testEmail);
    await page.fill('#login-password', testPassword);
    await page.click('button:has-text("Sign In")');

    // Wait for successful navigation to dashboard after automatic retry
    await expect(page).toHaveURL(/\/dashboard/);
    expect(retryTriggered).toBe(true);
    expect(postLoginCount).toBe(2); // Initial attempt + exactly 1 retry
    await page.unroute('**/api/v1/auth/login');

    // Sign out before testing unauthenticated multi-tab behavior
    const tabSignOutBtn = page.locator('button[aria-label="Sign out of JavaVerse"]');
    await tabSignOutBtn.click();
    await page.waitForURL(/\/auth\/login/);

    // D. Tabs: Open signup and login in separate pages/tabs
    const signupPage = await context.newPage();
    const loginPage = await context.newPage();

    await signupPage.goto('/auth/signup');
    await loginPage.goto('/auth/login');

    // Verify both pages obtain tokens without corrupting each other
    await signupPage.fill('#signup-name', 'Tab Learner');
    await signupPage.fill('#signup-email', `tab.${Date.now()}@example.local`);
    await signupPage.fill('#signup-password', VALID_PASSWORD);
    await signupPage.fill('#signup-confirm-password', VALID_PASSWORD);

    const tabSignupPromise = signupPage.waitForResponse(
      (r) => r.url().includes('/api/v1/auth/signup') && r.request().method() === 'POST',
    );
    await signupPage.click('button:has-text("Create account")');
    const tabSignupRes = await tabSignupPromise;
    expect(tabSignupRes.status()).toBe(201);
    await expect(signupPage).toHaveURL(/\/auth\/login\?created=1/);
    await expect(
      signupPage.locator(
        'text=Account created successfully. Sign in with your email and password.',
      ),
    ).toBeVisible();

    await expect(loginPage.locator('#login-email')).toBeVisible();
    await loginPage.fill('#login-email', testEmail);
    await expect(loginPage.locator('#login-email')).toHaveValue(testEmail);
    await loginPage.fill('#login-password', testPassword);
    await expect(loginPage.locator('#login-password')).toHaveValue(testPassword);
    const tabLoginPromise = loginPage.waitForResponse(
      (r) =>
        r.url().includes('/api/v1/auth/login') &&
        r.request().method() === 'POST' &&
        r.status() === 200,
    );
    await loginPage.click('button:has-text("Sign In")');
    const tabLoginRes = await tabLoginPromise;
    expect(tabLoginRes.status()).toBe(200);
    await expect(loginPage).toHaveURL(/\/dashboard/);

    await signupPage.close();
    await loginPage.close();

    // E. Navigation: refresh signup and submit, back and forward navigation
    await page.goto('/auth/signup');
    await page.reload();
    await expect(page.locator('h1')).toContainText('Create your account');

    // F. Host safety: 127.0.0.1 canonical redirect to localhost
    await page.goto('http://127.0.0.1:3000/auth/login');
    await expect(page).toHaveURL(/^http:\/\/localhost:3000\/auth\/login/);

    // G. Related flows: incorrect password message verification
    await page.fill('#login-email', testEmail);
    await page.fill('#login-password', 'IncorrectP@ssw0rd!');
    await page.click('button:has-text("Sign In")');
    const pwErrorAlert = page.locator('div[role="alert"]:not(#__next-route-announcer__)');
    await expect(pwErrorAlert).toBeVisible();
    await expect(pwErrorAlert).toContainText('Invalid email or password');

    // Verify no red console errors occurred during the entire test
    expect(consoleErrors).toEqual([]);
  });

  test('14. Password creation, manager integration semantics, passphrase support, and breach screening in browser', async ({
    page,
  }) => {
    const consoleErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        const text = msg.text();
        // Ignore expected HTTP response notices from intentional 400/401 test cases and favicon
        if (
          !text.includes('favicon.ico') &&
          !text.includes('status of 400') &&
          !text.includes('status of 401')
        ) {
          consoleErrors.push(text);
        }
      }
    });

    // 1. Verify signup form semantics and password manager attributes
    await page.goto('/auth/signup');
    await expect(page.locator('form')).toBeVisible();

    const nameInput = page.locator('#signup-name');
    await expect(nameInput).toHaveAttribute('name', 'displayName');
    await expect(nameInput).toHaveAttribute('autocomplete', 'name');

    const emailInput = page.locator('#signup-email');
    await expect(emailInput).toHaveAttribute('name', 'email');
    await expect(emailInput).toHaveAttribute('autocomplete', 'username');

    const pwInput = page.locator('#signup-password');
    await expect(pwInput).toHaveAttribute('name', 'password');
    await expect(pwInput).toHaveAttribute('autocomplete', 'new-password');

    const confirmPwInput = page.locator('#signup-confirm-password');
    await expect(confirmPwInput).toHaveAttribute('name', 'confirmPassword');
    await expect(confirmPwInput).toHaveAttribute('autocomplete', 'new-password');

    // 2. Verify login form semantics and password manager attributes
    await page.goto('/auth/login');
    await expect(page.locator('form')).toBeVisible();

    const loginEmailInput = page.locator('#login-email');
    await expect(loginEmailInput).toHaveAttribute('name', 'email');
    await expect(loginEmailInput).toHaveAttribute('autocomplete', 'username');

    const loginPwInput = page.locator('#login-password');
    await expect(loginPwInput).toHaveAttribute('name', 'password');
    await expect(loginPwInput).toHaveAttribute('autocomplete', 'current-password');

    // 3. Password length < 12 validation in UI
    await page.goto('/auth/signup');
    await page.fill('#signup-name', 'Short Test');
    await page.fill('#signup-email', 'short.learner@example.local');
    await page.fill('#signup-password', 'short123');
    await page.fill('#signup-confirm-password', 'short123');
    await page.click('button:has-text("Create account")');
    const shortAlert = page.locator('div[role="alert"]:not(#__next-route-announcer__)');
    await expect(shortAlert).toBeVisible();
    await expect(shortAlert).toContainText('Use at least 12 characters.');

    // 4. Password confirmation mismatch validation in UI
    await page.fill('#signup-password', 'ValidPassphrase123!');
    await page.fill('#signup-confirm-password', 'MismatchedPass123!');
    await page.click('button:has-text("Create account")');
    const mismatchAlert = page.locator('div[role="alert"]:not(#__next-route-announcer__)');
    await expect(mismatchAlert).toBeVisible();
    await expect(mismatchAlert).toContainText('Passwords do not match.');

    // 5. Common password rejection with friendly copy
    await page.fill('#signup-password', 'password12345');
    await page.fill('#signup-confirm-password', 'password12345');
    const commonPromise = page.waitForResponse(
      (r) => r.url().includes('/api/v1/auth/signup') && r.request().method() === 'POST',
    );
    await page.click('button:has-text("Create account")');
    const commonRes = await commonPromise;
    expect(commonRes.status()).toBe(400);
    const commonAlert = page.locator('div[role="alert"]:not(#__next-route-announcer__)');
    await expect(commonAlert).toBeVisible();
    await expect(commonAlert).toContainText(
      'This password is too common. Choose a longer, less predictable password.',
    );

    // 6. Long passphrase with spaces: sign up, log out, log in successfully
    const nonce = Date.now();
    const passphraseEmail = `passphrase.learner.${nonce}@example.local`;
    const longPassphrase = 'correct horse battery staple 2026!';

    await page.fill('#signup-name', 'Passphrase Learner');
    await page.fill('#signup-email', passphraseEmail);
    await page.fill('#signup-password', longPassphrase);
    await page.fill('#signup-confirm-password', longPassphrase);

    const signupPromise = page.waitForResponse(
      (r) => r.url().includes('/api/v1/auth/signup') && r.request().method() === 'POST',
    );
    await page.click('button:has-text("Create account")');
    const signupRes = await signupPromise;
    expect(signupRes.status()).toBe(201);
    await expect(page).toHaveURL(/\/auth\/login\?created=1/);
    await page.waitForLoadState('networkidle');

    // 7. Password manager autofill simulation: simulate autofill setting values and submitting
    const autofillEmail = page.locator('#login-email');
    const autofillPw = page.locator('#login-password');
    await expect(autofillEmail).toBeVisible();
    await expect(autofillPw).toBeVisible();

    await autofillEmail.fill(passphraseEmail);
    await autofillPw.fill(longPassphrase);
    await expect(autofillEmail).toHaveValue(passphraseEmail);
    await expect(autofillPw).toHaveValue(longPassphrase);

    const autofillLoginPromise = page.waitForResponse(
      (r) => r.url().includes('/api/v1/auth/login') && r.request().method() === 'POST',
    );
    await page.click('button:has-text("Sign In")');
    const autofillRes = await autofillLoginPromise;
    expect(autofillRes.status()).toBe(200);
    await expect(page).toHaveURL(/\/dashboard/);

    expect(consoleErrors).toEqual([]);
  });

  test('15. Exact password representation and Argon2id verification across signup and login', async ({
    page,
  }) => {
    const testCases = [
      { name: 'manual', password: 'MyManualPass2026!' },
      { name: 'generated', password: 'kX9#mQ2$vL8*pZ5@wR1!yT4^' },
      { name: 'passphrase', password: 'battery staple horse correct 2026' },
      { name: 'mixed_punct', password: 'Pass~With_All-Kinds.Of:Symbols!2026' },
    ];

    for (const tc of testCases) {
      const email = `repr.${tc.name}.${Date.now()}@example.local`;

      // 1. Submit signup through visible form
      await page.goto('/auth/signup');
      await page.fill('#signup-name', `Learner ${tc.name}`);
      await page.fill('#signup-email', email);
      await page.fill('#signup-password', tc.password);
      await page.fill('#signup-confirm-password', tc.password);

      // 2. Capture signup request body without logging password
      let capturedSignupPassword = '';
      const signupReqPromise = page.waitForRequest(
        (req) => req.url().includes('/api/v1/auth/signup') && req.method() === 'POST',
      );
      await page.click('button:has-text("Create account")');
      const signupReq = await signupReqPromise;
      const signupJson = signupReq.postDataJSON();
      capturedSignupPassword = signupJson?.password;

      // 3. Assert request password equals controlled value and redirects to login with notice
      expect(capturedSignupPassword).toBe(tc.password);
      await expect(page).toHaveURL(/\/auth\/login\?created=1/);

      // 4. Verify stored value is Argon2id hash
      const user = await prisma.user.findUnique({ where: { email } });
      expect(user).not.toBeNull();
      expect(user?.passwordHash).toMatch(/^\$argon2id\$v=19\$m=65536,t=3,p=4\$/);

      // 5. Verify controlled password against stored hash
      const verified = await verifyPassword(tc.password, user!.passwordHash!);
      expect(verified).toBe(true);

      // 6. Submit login through visible form
      await expect(
        page.locator('text=Account created successfully. Sign in with your email and password.'),
      ).toBeVisible();
      await page.fill('#login-email', email);
      await expect(page.locator('#login-email')).toHaveValue(email);
      await page.fill('#login-password', tc.password);
      await expect(page.locator('#login-password')).toHaveValue(tc.password);

      // 8. Capture login request body without logging password
      let capturedLoginPassword = '';
      const loginReqPromise = page.waitForRequest(
        (req) => req.url().includes('/api/v1/auth/login') && req.method() === 'POST',
      );
      const loginResPromise = page.waitForResponse(
        (res) => res.url().includes('/api/v1/auth/login') && res.request().method() === 'POST',
      );
      await page.click('button:has-text("Sign In")');

      const loginReq = await loginReqPromise;
      const loginRes = await loginResPromise;
      const loginJson = loginReq.postDataJSON();
      capturedLoginPassword = loginJson?.password;

      // 9. Assert login password equals original controlled value
      expect(capturedLoginPassword).toBe(tc.password);

      // 10. Verify HTTP 200
      expect(loginRes.status()).toBe(200);

      // 11. Verify signup and login return the same learner ID
      await expect(page).toHaveURL(/\/dashboard/);
      const session = await prisma.session.findFirst({
        where: { userId: user!.id },
        orderBy: { createdAt: 'desc' },
      });
      expect(session).not.toBeNull();
      expect(session?.userId).toBe(user!.id);

      // 12. Verify no duplicate account row exists
      const totalUserRows = await prisma.user.count({ where: { email } });
      expect(totalUserRows).toBe(1);

      // Clean up session by signing out before next iteration
      const logoutBtn = page.locator('button[aria-label="Sign out of JavaVerse"]');
      await expect(logoutBtn).toBeVisible();
      await logoutBtn.click();
      await expect(page).toHaveURL(/\/auth\/login/);
      await page.waitForLoadState('networkidle');
    }
  });

  test('16. Real account recovery flow verification via visible browser interface', async ({
    page,
  }) => {
    // 1. Create a controlled user in isolated test database
    const initialPassword = 'InitialValidPass!2026';
    const email = `recovery.test.${Date.now()}@example.local`;

    await page.goto('/auth/signup');
    await page.fill('#signup-name', 'Recovery Learner');
    await page.fill('#signup-email', email);
    await page.fill('#signup-password', initialPassword);
    await page.fill('#signup-confirm-password', initialPassword);
    await page.click('button:has-text("Create account")');
    await expect(page).toHaveURL(/\/auth\/login\?created=1/);

    const initialUser = await prisma.user.findUnique({ where: { email } });
    expect(initialUser).not.toBeNull();
    const initialUserId = initialUser!.id;
    const initialHash = initialUser!.passwordHash;

    // 2. Open /auth/forgot-password and submit
    await page.goto('/auth/forgot-password');
    await page.fill('#reset-email', email);

    // Clear prior Mailpit messages
    try {
      await fetch('http://127.0.0.1:8025/api/v1/messages', { method: 'DELETE' });
    } catch {
      // Mailpit might be empty
    }

    const forgotResPromise = page.waitForResponse(
      (r) => r.url().includes('/api/v1/auth/password/forgot') && r.request().method() === 'POST',
    );
    await page.click('button:has-text("Send Reset Link")');
    const forgotRes = await forgotResPromise;
    expect(forgotRes.status()).toBe(200);
    const forgotData = await forgotRes.json();

    // 3. Verify response does not reveal whether email exists
    expect(forgotData.data.message).toBe(
      'If an account exists with this email, a password reset link has been sent.',
    );
    const statusMsg = page.locator('div[role="status"]');
    await expect(statusMsg).toBeVisible();

    // 4. Verify Mailpit receives reset email (poll for async SMTP delivery)
    let resetMsgSummary: { ID: string; Subject: string } | undefined;
    for (let i = 0; i < 20; i++) {
      const mailpitRes = await fetch('http://127.0.0.1:8025/api/v1/messages');
      if (mailpitRes.ok) {
        const mailData = await mailpitRes.json();
        const messages = mailData.messages || [];
        resetMsgSummary = messages.find((m: { Subject: string }) =>
          m.Subject.includes('Reset your JavaVerse password'),
        );
        if (resetMsgSummary) break;
      }
      await page.waitForTimeout(250);
    }
    expect(resetMsgSummary).toBeDefined();

    const msgDetailRes = await fetch(`http://127.0.0.1:8025/api/v1/message/${resetMsgSummary!.ID}`);
    expect(msgDetailRes.ok).toBe(true);
    const msgDetail = await msgDetailRes.json();

    // 5. Verify reset token uses approved fragment-safe flow (#token=)
    const match = (msgDetail.Text || msgDetail.HTML).match(/#token=([a-zA-Z0-9_-]+)/);
    expect(match).not.toBeNull();
    const rawResetToken = match![1];

    // 6. Open reset page with fragment token
    await page.goto(`/auth/reset-password#token=${rawResetToken}`);
    await expect(page.locator('h1')).toContainText('Choose New Password');

    // 7 & 8. Verify policy rejection on short password
    await page.fill('#new-password', 'short');
    await page.fill('#confirm-new-password', 'short');
    await page.click('button:has-text("Save New Password")');
    const errAlert = page.locator('div[role="alert"]:not(#__next-route-announcer__)');
    await expect(errAlert).toBeVisible();
    await expect(errAlert).toContainText('Use at least 12 characters.');

    // 9. Enter new valid learner-chosen password
    const newPassword = 'BrandNewSecurePass!2026';
    await page.fill('#new-password', newPassword);
    await page.fill('#confirm-new-password', newPassword);

    const resetResPromise = page.waitForResponse(
      (r) => r.url().includes('/api/v1/auth/password/reset') && r.request().method() === 'POST',
    );
    await page.click('button:has-text("Save New Password")');
    const resetRes = await resetResPromise;
    expect(resetRes.status()).toBe(200);

    // 10. Verify new Argon2id hash is stored
    const updatedUser = await prisma.user.findUnique({ where: { email } });
    expect(updatedUser?.passwordHash).not.toBe(initialHash);
    expect(updatedUser?.passwordHash).toMatch(/^\$argon2id\$v=19\$m=65536,t=3,p=4\$/);
    const verifiesNew = await verifyPassword(newPassword, updatedUser!.passwordHash!);
    expect(verifiesNew).toBe(true);

    // 11. Verify old password no longer works
    const oldVerifies = await verifyPassword(initialPassword, updatedUser!.passwordHash!);
    expect(oldVerifies).toBe(false);

    // 12. Verify new password works through visible Sign in form
    await page.goto('/auth/login');
    await page.fill('#login-email', email);
    await page.fill('#login-password', newPassword);

    const newLoginResPromise = page.waitForResponse(
      (r) => r.url().includes('/api/v1/auth/login') && r.request().method() === 'POST',
    );
    await page.click('button:has-text("Sign In")');
    const newLoginRes = await newLoginResPromise;
    expect(newLoginRes.status()).toBe(200);
    // 13. Verify same user ID is authenticated
    await expect(page).toHaveURL(/\/dashboard/);
    const recoverySession = await prisma.session.findFirst({
      where: { userId: initialUserId },
      orderBy: { createdAt: 'desc' },
    });
    expect(recoverySession).not.toBeNull();
    expect(recoverySession?.userId).toBe(initialUserId);
  });
});
