import { test, expect } from '@playwright/test';
import { prisma, assertSafeTestDatabase } from '@javaverse/db';
import { Redis } from 'ioredis';
import { hashPassword, verifyPassword } from '@javaverse/security';

test.describe('Learner Authentication & Local-First Security E2E Flows', () => {
  const VALID_PASSWORD = 'MemberP@ssw0rd!2026';

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

    // 3. Lands on Dashboard
    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page.locator('h1')).toBeVisible();

    // Verify fresh account progress starts at zero (Part 6)
    await expect(page.locator('text=Start Learning')).toBeVisible();
    await expect(
      page.locator(
        'text=No lessons completed yet. Start your Java learning journey to begin tracking progress.',
      ),
    ).toBeVisible();

    // 4. Query DB for created user
    const dbUser = await prisma.user.findUnique({
      where: { email: testEmail },
    });
    expect(dbUser).not.toBeNull();
    const userId = dbUser!.id;
    expect(dbUser?.displayName).toBe(testDisplayName);
    expect(dbUser?.passwordHash && dbUser.passwordHash.startsWith('$argon2id$')).toBe(true);

    const isPwValid = await verifyPassword(testPassword, dbUser!.passwordHash || '');
    expect(isPwValid).toBe(true);

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

    const loginPromise = page.waitForResponse((r) => r.url().includes('/api/v1/auth/login'));
    await page.click('button:has-text("Sign In")');
    const loginRes = await loginPromise;
    expect(loginRes.status()).toBe(200);

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
    await expect(page).toHaveURL(/\/dashboard/);

    // 2. Sign out
    const signOutBtn = page.locator('button[aria-label="Sign out of JavaVerse"]');
    await expect(signOutBtn).toBeVisible();
    const logoutPromise = page.waitForResponse((r) => r.url().includes('/api/v1/auth/logout'));
    await signOutBtn.click();
    await logoutPromise;
    await expect(page).toHaveURL(/\/auth\/login/);

    await page.goto('/auth/login');
    const csrfPromise = page.waitForResponse((r) => r.url().includes('/api/v1/auth/csrf'));
    await csrfPromise;

    // 3. Log in with lowercase email
    await page.fill('#login-email', lowerCaseEmail);
    await page.fill('#login-password', VALID_PASSWORD);
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
    // 1. Seed member
    const passwordHash = await hashPassword(VALID_PASSWORD);
    const user = await prisma.user.create({
      data: {
        email: 'member.settings@example.com',
        passwordHash,
        status: 'ACTIVE',
        displayName: 'Active Member',
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
    const member = await prisma.user.create({
      data: {
        email: 'member.login.e2e@example.com',
        passwordHash,
        status: 'ACTIVE',
        displayName: 'Browser Member',
      },
    });

    // Visit /auth/login with a safe returnUrl
    const csrfPromise = page.waitForResponse((r) => r.url().includes('/api/v1/auth/csrf'));
    await page.goto('/auth/login?returnUrl=/dashboard/practice');
    await csrfPromise;

    await page.fill('#login-email', member.email);
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
        email: 'member.authfail@example.com',
        passwordHash,
        status: 'ACTIVE',
        displayName: 'Fail Test Member',
      },
    });

    // 1. Invalid password
    await page.goto('/auth/login');
    await page.fill('#login-email', 'member.authfail@example.com');
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
    await page.fill('#login-email', 'member.authfail@example.com');
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
          email: `member${i}.capacity@example.com`,
          passwordHash,
          status: 'ACTIVE',
          displayName: `Member ${i}`,
        },
      });
    }

    // 2. 6th account attempt via /auth/signup
    await page.goto('/auth/signup');
    await page.fill('#signup-name', 'Sixth Member');
    await page.fill('#signup-email', 'member6.capacity@example.com');
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
      where: { email: 'member6.capacity@example.com' },
    });
    expect(user6).toBeNull();

    // 5. Existing user can still log in successfully
    const csrfPromise = page.waitForResponse((r) => r.url().includes('/api/v1/auth/csrf'));
    await page.goto('/auth/login');
    await csrfPromise;
    await page.fill('#login-email', 'member1.capacity@example.com');
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

    // 4. Verify HTTP 201, email normalized, Argon2id hash exists, plaintext absent, redirects to dashboard
    expect(signupRes.status()).toBe(201);
    await expect(page).toHaveURL(/\/dashboard/);

    const dbUser = await prisma.user.findUnique({
      where: { email: testEmail.toLowerCase() },
    });
    expect(dbUser).not.toBeNull();
    const signupUserId = dbUser!.id;
    expect(dbUser?.email).toBe(testEmail.toLowerCase());
    expect(dbUser?.passwordHash && dbUser.passwordHash.startsWith('$argon2id$')).toBe(true);

    const userCount = await prisma.user.count({ where: { email: testEmail.toLowerCase() } });
    expect(userCount).toBe(1);

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
});
