import { test, expect } from '@playwright/test';
import { prisma } from '@javaverse/db';
import {
  generateRandomToken,
  deriveTokenDigest,
  deriveKeyHierarchy,
  hashPassword,
  generateTotpSecret,
  encryptTotpSecret,
  generateTotpCode,
} from '@javaverse/security';

test.describe('Authentication & Security E2E Flows', () => {
  const MASTER_KEY =
    process.env.APP_MASTER_KEY ||
    process.env.SESSION_SECRET ||
    '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
  const keys = deriveKeyHierarchy(MASTER_KEY);

  test.beforeEach(async () => {
    // Reset test database auth state
    await prisma.session.deleteMany();
    await prisma.recoveryCode.deleteMany();
    await prisma.mfaTotp.deleteMany();
    await prisma.emailToken.deleteMany();
    await prisma.invitation.deleteMany();
    await prisma.user.deleteMany();
  });

  test('1. Owner Bootstrap Flow with TOTP and Recovery Codes', async ({ page }) => {
    // Generate valid bootstrap token in DB
    const rawToken = generateRandomToken(32);
    const tokenHash = deriveTokenDigest(rawToken, 'owner_bootstrap', keys.authTokenHmacKey);

    await prisma.emailToken.create({
      data: {
        tokenHash,
        purpose: 'OWNER_BOOTSTRAP',
        deliveryChannel: 'TERMINAL',
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      },
    });

    // 1. Visit bootstrap page & wait for CSRF
    const csrfPromise = page.waitForResponse((r) => r.url().includes('/api/v1/auth/csrf'));
    await page.goto('/auth/bootstrap');
    await csrfPromise;
    await expect(page.locator('h1')).toContainText('Workspace Owner Bootstrap');

    // 2. Submit token on Step 1
    await page.fill('#bootstrap-token', rawToken);
    const validatePromise = page.waitForResponse((r) =>
      r.url().includes('/api/v1/auth/bootstrap/validate'),
    );
    await page.click('button:has-text("Validate Token")');
    await validatePromise;

    // 3. Step 2: Credentials and TOTP
    await page.waitForSelector('#owner-email');
    await page.fill('#owner-email', 'owner.e2e@example.com');
    await page.fill('#owner-name', 'Primary Owner');
    await page.fill('#owner-password', 'StrongP@ssw0rd!2026');

    // Read TOTP Secret from Base32 display
    const secretElem = page.locator('[aria-label="Base32 TOTP Secret"]');
    await expect(secretElem).toBeVisible();
    const totpSecret = (await secretElem.textContent())?.trim() || '';
    expect(totpSecret.length).toBeGreaterThanOrEqual(16);

    // Generate valid TOTP code
    const code = generateTotpCode(totpSecret);
    await page.fill('#owner-totp', code);
    const finalizePromise = page.waitForResponse((r) =>
      r.url().includes('/api/v1/auth/bootstrap/finalize'),
    );
    await page.click('button:has-text("Complete Owner Setup")');
    await finalizePromise;

    // 4. Step 3: Recovery Codes
    await page.waitForSelector('#saved-recovery-codes');
    await page.check('#saved-recovery-codes');
    await page.click('button:has-text("Enter JavaVerse Dashboard")');

    // 5. Lands on Dashboard
    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page.locator('h1')).toBeVisible();

    // Verify DB user created as OWNER
    const user = await prisma.user.findUnique({
      where: { email: 'owner.e2e@example.com' },
    });
    expect(user).not.toBeNull();
    expect(user?.role).toBe('OWNER');
    expect(user?.displayName).toBe('Primary Owner');
  });

  test('2. Owner Login requiring MFA challenge', async ({ page }) => {
    // Seed an OWNER with MFA enabled
    const totpSecret = generateTotpSecret();
    const passwordHash = await hashPassword('OwnerP@ssw0rd!2026');
    const userId = crypto.randomUUID();
    const encryptedSecret = encryptTotpSecret(totpSecret, keys.mfaEncryptionKey, userId);

    const user = await prisma.user.create({
      data: {
        id: userId,
        email: 'owner.login@example.com',
        passwordHash,
        role: 'OWNER',
        status: 'ACTIVE',
        displayName: 'Login Owner',
        mfaTotp: {
          create: {
            secretCiphertext: encryptedSecret,
            lastUsedTimestep: BigInt(0),
          },
        },
      },
    });

    // 1. Visit Login & wait for CSRF
    const csrfPromise = page.waitForResponse((r) => r.url().includes('/api/v1/auth/csrf'));
    await page.goto('/auth/login');
    await csrfPromise;

    await page.fill('#login-email', user.email);
    await page.fill('#login-password', 'OwnerP@ssw0rd!2026');
    const loginPromise = page.waitForResponse((r) => r.url().includes('/api/v1/auth/login'));
    await page.click('button:has-text("Sign In")');
    await loginPromise;

    // 2. Redirected to /auth/mfa
    await expect(page).toHaveURL(/\/auth\/mfa/);
    await expect(page.locator('h1')).toContainText('Two-Factor Authentication');
    await expect(page.locator('#mfa-code')).toBeVisible();

    // Generate code
    const code = generateTotpCode(totpSecret);
    await page.fill('#mfa-code', code);
    await expect(page.locator('button:has-text("Verify Code")')).toBeEnabled();
    const challengePromise = page.waitForResponse((r) =>
      r.url().includes('/api/v1/auth/mfa/challenge'),
    );
    await page.click('button:has-text("Verify Code")');
    await challengePromise;

    // 3. Lands on Dashboard
    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page.locator('h1')).toBeVisible();
  });

  test('3. Member Invitation Acceptance Flow', async ({ page }) => {
    const rawInviteToken = generateRandomToken(32);
    const tokenHash = deriveTokenDigest(rawInviteToken, 'invitation', keys.authTokenHmacKey);

    await prisma.invitation.create({
      data: {
        emailNormalized: 'invitee.e2e@example.com',
        tokenHash,
        role: 'MEMBER',
        status: 'PENDING',
        expiresAt: new Date(Date.now() + 48 * 3600 * 1000),
      },
    });

    // Visit invite acceptance with hash fragment & wait for CSRF
    const csrfPromise = page.waitForResponse((r) => r.url().includes('/api/v1/auth/csrf'));
    await page.goto(`/auth/invite#token=${rawInviteToken}`);
    await csrfPromise;
    await expect(page.locator('h1')).toContainText('Accept Workspace Invitation');

    await page.fill('#member-name', 'New Member');
    await page.fill('#member-password', 'MemberP@ssw0rd!2026');
    const acceptPromise = page.waitForResponse((r) =>
      r.url().includes('/api/v1/invitations/accept'),
    );
    await page.click('button:has-text("Join Workspace")');
    await acceptPromise;

    // Lands on dashboard
    await expect(page).toHaveURL(/\/dashboard/);

    // Verify member created
    const member = await prisma.user.findUnique({
      where: { email: 'invitee.e2e@example.com' },
    });
    expect(member).not.toBeNull();
    expect(member?.role).toBe('MEMBER');
    expect(member?.displayName).toBe('New Member');
  });

  test('4. Security Settings Page & Session Management', async ({ page, context }) => {
    // Create authenticated member session
    const rawToken = generateRandomToken(32);
    const tokenDigest = deriveTokenDigest(rawToken, 'session', keys.authTokenHmacKey);
    const publicId = crypto.randomUUID();

    const user = await prisma.user.create({
      data: {
        email: 'member.settings@example.com',
        role: 'MEMBER',
        status: 'ACTIVE',
        displayName: 'Active Member',
      },
    });

    await prisma.session.create({
      data: {
        id: tokenDigest,
        userId: user.id,
        publicId,
        createdAt: new Date(),
        lastSeenAt: new Date(),
        expiresAt: new Date(Date.now() + 7 * 24 * 3600 * 1000),
        reauthAt: new Date(),
      },
    });

    // Set session cookie
    const isProd = process.env.NODE_ENV === 'production';
    const cookieName = isProd ? '__Host-javaverse_session' : 'javaverse_session';
    await context.addCookies([
      {
        name: cookieName,
        value: rawToken,
        domain: 'localhost',
        path: '/',
        httpOnly: true,
        secure: isProd,
        sameSite: 'Lax',
      },
    ]);

    await page.goto('/dashboard/settings/security');
    await expect(page.locator('h1')).toContainText('Account Security & Sessions');
    await expect(page.locator('text=Active Sessions')).toBeVisible();

    // Check sign out via TopBar icon button
    const signOutBtn = page.locator('button[aria-label="Sign out of JavaVerse"]');
    await expect(signOutBtn).toBeVisible();
    await signOutBtn.click();

    // Redirected to login
    await expect(page).toHaveURL(/\/auth\/login/);
  });
});
