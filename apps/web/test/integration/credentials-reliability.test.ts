import { createHash } from 'node:crypto';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NextRequest } from 'next/server';
import {
  prisma,
  PrismaClient,
  assertSafeTestDatabase,
  getSafeDatabaseDiagnostics,
  verifyDatabaseStartupGuard,
} from '@javaverse/db';
import { createCsrfToken } from '@/lib/csrf';
import { resolveSession, SESSION_COOKIE_NAME } from '@/lib/auth';
import { verifyPassword, generateRandomToken, deriveTokenDigest } from '@javaverse/security';
import { POST as handleSignup } from '@/app/api/v1/auth/signup/route';
import { POST as handleLogin } from '@/app/api/v1/auth/login/route';
import { POST as handleLogout } from '@/app/api/v1/auth/logout/route';
import { GET as handleSession } from '@/app/api/v1/auth/session/route';
import { GET as handleGetSessions } from '@/app/api/v1/auth/sessions/route';
import { POST as handlePasswordChange } from '@/app/api/v1/auth/password/change/route';
import { POST as handlePasswordReset } from '@/app/api/v1/auth/password/reset/route';
import { getServerKeys } from '@/lib/keys';
import { getRedisCacheClient } from '@/lib/redis';

const BASE_TEST_PASSWORD = 'SecureLearnerPass!2026';

function createSignupRequest(body: Record<string, unknown>, ip = '127.0.0.1') {
  const csrfToken = createCsrfToken({ flow: 'signup' });
  return new NextRequest('http://localhost:3000/api/v1/auth/signup', {
    method: 'POST',
    headers: {
      origin: 'http://localhost:3000',
      'Content-Type': 'application/json',
      'x-csrf-token': csrfToken,
      'x-forwarded-for': ip,
    },
    body: JSON.stringify(body),
  });
}

function createLoginRequest(body: Record<string, unknown>, ip = '127.0.0.1') {
  const csrfToken = createCsrfToken({ flow: 'login' });
  return new NextRequest('http://localhost:3000/api/v1/auth/login', {
    method: 'POST',
    headers: {
      origin: 'http://localhost:3000',
      'Content-Type': 'application/json',
      'x-csrf-token': csrfToken,
      'x-forwarded-for': ip,
    },
    body: JSON.stringify(body),
  });
}

function extractRawSessionToken(response: Response): string | null {
  const setCookie = response.headers.get('set-cookie');
  if (!setCookie) return null;
  const match = setCookie.match(new RegExp(`${SESSION_COOKIE_NAME}=([^;]+)`));
  return match ? match[1]! : null;
}

function createChangePasswordRequest(
  body: Record<string, unknown>,
  rawToken: string,
  publicId: string,
  ip = '127.0.0.1',
) {
  const csrfToken = createCsrfToken({ sessionId: publicId });
  return new NextRequest('http://localhost:3000/api/v1/auth/password/change', {
    method: 'POST',
    headers: {
      origin: 'http://localhost:3000',
      'Content-Type': 'application/json',
      'x-csrf-token': csrfToken,
      'x-forwarded-for': ip,
      cookie: `${SESSION_COOKIE_NAME}=${rawToken}`,
    },
    body: JSON.stringify(body),
  });
}

function createResetPasswordRequest(body: Record<string, unknown>, ip = '127.0.0.1') {
  const csrfToken = createCsrfToken({ flow: 'reset_password' });
  return new NextRequest('http://localhost:3000/api/v1/auth/password/reset', {
    method: 'POST',
    headers: {
      origin: 'http://localhost:3000',
      'Content-Type': 'application/json',
      'x-csrf-token': csrfToken,
      'x-forwarded-for': ip,
    },
    body: JSON.stringify(body),
  });
}

describe('Credentials Freedom & Sign-in Reliability Integration Tests (Phase S)', () => {
  beforeEach(async () => {
    // Strictly verify test database safety before any destructive teardown
    assertSafeTestDatabase(process.env.DATABASE_URL);

    const redis = getRedisCacheClient();
    await redis.flushdb();

    await prisma.session.deleteMany();
    await prisma.recoveryCode.deleteMany();
    await prisma.mfaTotp.deleteMany();
    await prisma.emailToken.deleteMany();
    await prisma.user.deleteMany();
  });

  it('1. accepts a valid Gmail-format address for signup and login', async () => {
    const email = `learner.gmail.${Date.now()}@gmail.com`;
    const sReq = createSignupRequest({
      displayName: 'Gmail Learner',
      email,
      password: BASE_TEST_PASSWORD,
      confirmPassword: BASE_TEST_PASSWORD,
    });
    const sRes = await handleSignup(sReq);
    expect(sRes.status).toBe(201);

    const lReq = createLoginRequest({ email, password: BASE_TEST_PASSWORD });
    const lRes = await handleLogin(lReq);
    expect(lRes.status).toBe(200);
  });

  it('2. accepts a valid Outlook-format address for signup and login', async () => {
    const email = `learner.outlook.${Date.now()}@outlook.com`;
    const sReq = createSignupRequest({
      displayName: 'Outlook Learner',
      email,
      password: BASE_TEST_PASSWORD,
      confirmPassword: BASE_TEST_PASSWORD,
    });
    const sRes = await handleSignup(sReq);
    expect(sRes.status).toBe(201);

    const lReq = createLoginRequest({ email, password: BASE_TEST_PASSWORD });
    const lRes = await handleLogin(lReq);
    expect(lRes.status).toBe(200);
  });

  it('3. accepts another standards-compliant domain without predefined allowlists', async () => {
    const email = `researcher.${Date.now()}@subdomain.polytechnic.edu.au`;
    const sReq = createSignupRequest({
      displayName: 'Custom Domain Learner',
      email,
      password: BASE_TEST_PASSWORD,
      confirmPassword: BASE_TEST_PASSWORD,
    });
    const sRes = await handleSignup(sReq);
    expect(sRes.status).toBe(201);

    const lReq = createLoginRequest({ email, password: BASE_TEST_PASSWORD });
    const lRes = await handleLogin(lReq);
    expect(lRes.status).toBe(200);
  });

  it('4. does not require a real inbox or email verification check to access dashboard', async () => {
    const email = `synthetic.local.user.${Date.now()}@synthetic-offline-domain.test`;
    const sReq = createSignupRequest({
      displayName: 'Offline Learner',
      email,
      password: BASE_TEST_PASSWORD,
      confirmPassword: BASE_TEST_PASSWORD,
    });
    const sRes = await handleSignup(sReq);
    expect(sRes.status).toBe(201);

    const sToken = extractRawSessionToken(sRes);
    expect(sToken).toBeNull();

    const lReq = createLoginRequest({ email, password: BASE_TEST_PASSWORD });
    const lRes = await handleLogin(lReq);
    expect(lRes.status).toBe(200);

    const token = extractRawSessionToken(lRes);
    expect(token).not.toBeNull();

    const sessionCtx = await resolveSession(token);
    expect(sessionCtx).not.toBeNull();
    expect(sessionCtx?.user.email).toBe(email.toLowerCase());
  });

  it('5. rejects case-variant duplicate emails as existing accounts', async () => {
    const emailLower = `case.tester.${Date.now()}@example.org`;
    const emailVariant = `CASE.TESTER.${Date.now()}@EXAMPLE.ORG`;

    const sReq1 = createSignupRequest({
      displayName: 'Original',
      email: emailLower,
      password: BASE_TEST_PASSWORD,
      confirmPassword: BASE_TEST_PASSWORD,
    });
    const sRes1 = await handleSignup(sReq1);
    expect(sRes1.status).toBe(201);

    const sReq2 = createSignupRequest({
      displayName: 'Duplicate',
      email: emailVariant,
      password: BASE_TEST_PASSWORD,
      confirmPassword: BASE_TEST_PASSWORD,
    });
    const sRes2 = await handleSignup(sReq2);
    expect(sRes2.status).toBe(409);
    const data2 = await sRes2.json();
    expect(data2.error.code).toBe('USER_EXISTS');
  });

  it('6. safely normalizes email whitespace on signup and login', async () => {
    const rawEmail = `  whitespace.learner.${Date.now()}@example.com  `;
    const expectedCanonical = rawEmail.trim().toLowerCase();

    const sReq = createSignupRequest({
      displayName: 'Spaced Email',
      email: rawEmail,
      password: BASE_TEST_PASSWORD,
      confirmPassword: BASE_TEST_PASSWORD,
    });
    const sRes = await handleSignup(sReq);
    expect(sRes.status).toBe(201);

    const dbUser = await prisma.user.findUnique({ where: { email: expectedCanonical } });
    expect(dbUser).not.toBeNull();
    expect(dbUser?.email).toBe(expectedCanonical);

    // Login with differently spaced email variant resolves to the same account
    const lReq = createLoginRequest({
      email: `   ${expectedCanonical}   `,
      password: BASE_TEST_PASSWORD,
    });
    const lRes = await handleLogin(lReq);
    expect(lRes.status).toBe(200);
    const lData = await lRes.json();
    expect(lData.data.user.id).toBe(dbUser?.id);
  });

  it('7. succeeds with exact password matching stored Argon2id hash', async () => {
    const email = `exact.match.${Date.now()}@example.com`;
    await handleSignup(
      createSignupRequest({
        email,
        password: BASE_TEST_PASSWORD,
        confirmPassword: BASE_TEST_PASSWORD,
      }),
    );

    const lRes = await handleLogin(createLoginRequest({ email, password: BASE_TEST_PASSWORD }));
    expect(lRes.status).toBe(200);
  });

  it('8. fails when password has different casing (case sensitivity)', async () => {
    const email = `case.sensitive.${Date.now()}@example.com`;
    const password = 'MyJavaPassword@2026';
    await handleSignup(
      createSignupRequest({
        email,
        password,
        confirmPassword: password,
      }),
    );

    const lowerPassword = 'myjavapassword@2026';
    const lRes = await handleLogin(createLoginRequest({ email, password: lowerPassword }));
    expect(lRes.status).toBe(401);
    const data = await lRes.json();
    expect(data.error.code).toBe('INVALID_CREDENTIALS');
    expect(data.error.message).toBe('Invalid email or password');
  });

  it('9. permits internal password spaces when policy length is satisfied', async () => {
    const email = `spaced.pw.${Date.now()}@example.com`;
    const spacedPw = 'Correct Horse Battery Staple 2026!';
    const sRes = await handleSignup(
      createSignupRequest({
        email,
        password: spacedPw,
        confirmPassword: spacedPw,
      }),
    );
    expect(sRes.status).toBe(201);

    const lRes = await handleLogin(createLoginRequest({ email, password: spacedPw }));
    expect(lRes.status).toBe(200);
  });

  it('10. rejects leading password whitespace during signup with explicit message', async () => {
    const email = `leading.space.${Date.now()}@example.com`;
    const leadingPw = ` ${BASE_TEST_PASSWORD}`;
    const sRes = await handleSignup(
      createSignupRequest({
        email,
        password: leadingPw,
        confirmPassword: leadingPw,
      }),
    );
    expect(sRes.status).toBe(400);
    const data = await sRes.json();
    expect(data.error.message).toBe('Password cannot begin or end with whitespace.');
  });

  it('11. rejects trailing password whitespace during signup with explicit message', async () => {
    const email = `trailing.space.${Date.now()}@example.com`;
    const trailingPw = `${BASE_TEST_PASSWORD} `;
    const sRes = await handleSignup(
      createSignupRequest({
        email,
        password: trailingPw,
        confirmPassword: trailingPw,
      }),
    );
    expect(sRes.status).toBe(400);
    const data = await sRes.json();
    expect(data.error.message).toBe('Password cannot begin or end with whitespace.');
  });

  it('12. never silently trims password during login', async () => {
    const email = `no.silent.trim.${Date.now()}@example.com`;
    await handleSignup(
      createSignupRequest({
        email,
        password: BASE_TEST_PASSWORD,
        confirmPassword: BASE_TEST_PASSWORD,
      }),
    );

    // If login trimmed the password, passing leading space would mistakenly match
    const lRes = await handleLogin(
      createLoginRequest({
        email,
        password: ` ${BASE_TEST_PASSWORD}`,
      }),
    );
    expect(lRes.status).toBe(401);
  });

  it('13. returns generic invalid credentials for unknown valid email without user enumeration', async () => {
    const unknownEmail = `unknown.nonexistent.${Date.now()}@example.com`;
    const lRes = await handleLogin(
      createLoginRequest({ email: unknownEmail, password: BASE_TEST_PASSWORD }),
    );
    expect(lRes.status).toBe(401);
    const data = await lRes.json();
    expect(data.error.code).toBe('INVALID_CREDENTIALS');
    expect(data.error.message).toBe('Invalid email or password');
  });

  it('14. verifies no fixed test credential authenticates without an actual database row', async () => {
    const fixedEmails = [
      'demo@javaverse.local',
      'owner@javaverse.local',
      'learner@example.local',
      'test@example.com',
    ];

    for (const testEmail of fixedEmails) {
      const res = await handleLogin(
        createLoginRequest({ email: testEmail, password: 'AnyPassword123!' }),
      );
      expect(res.status).toBe(401);
    }
  });

  it('15. verifies complete signup -> sign in -> logout -> re-login sequence preserves exact user ID', async () => {
    const email = `lifecycle.learner.${Date.now()}@example.com`;
    const sRes = await handleSignup(
      createSignupRequest({
        displayName: 'Lifecycle Learner',
        email,
        password: BASE_TEST_PASSWORD,
        confirmPassword: BASE_TEST_PASSWORD,
      }),
    );
    expect(sRes.status).toBe(201);
    const sData = await sRes.json();
    const signupUserId = sData.data.user.id;
    expect(sData.data.requiresSignIn).toBe(true);

    // Assert NO session cookie is set during signup
    const signupRawToken = extractRawSessionToken(sRes);
    expect(signupRawToken).toBeNull();

    // Assert 0 sessions in DB after signup
    const sessionsAfterSignup = await prisma.session.count({ where: { userId: signupUserId } });
    expect(sessionsAfterSignup).toBe(0);

    // Initial sign-in with same credentials creates session
    const firstLoginRes = await handleLogin(
      createLoginRequest({ email, password: BASE_TEST_PASSWORD }),
    );
    expect(firstLoginRes.status).toBe(200);
    const initialRawToken = extractRawSessionToken(firstLoginRes);
    expect(initialRawToken).not.toBeNull();

    // Verify session in DB
    const initialCtx = await resolveSession(initialRawToken);
    expect(initialCtx?.user.id).toBe(signupUserId);

    // Logout
    const csrfToken = createCsrfToken({ sessionId: initialCtx!.session.publicId });
    const logoutReq = new NextRequest('http://localhost:3000/api/v1/auth/logout', {
      method: 'POST',
      headers: {
        origin: 'http://localhost:3000',
        'x-csrf-token': csrfToken,
        cookie: `${SESSION_COOKIE_NAME}=${initialRawToken}`,
      },
    });
    const logoutRes = await handleLogout(logoutReq);
    expect(logoutRes.status).toBe(200);

    // Verify session revoked
    const revokedCtx = await resolveSession(initialRawToken);
    expect(revokedCtx).toBeNull();

    // Re-login with same credentials
    const lRes = await handleLogin(createLoginRequest({ email, password: BASE_TEST_PASSWORD }));
    expect(lRes.status).toBe(200);
    const lData = await lRes.json();
    const loginUserId = lData.data.user.id;
    expect(loginUserId).toBe(signupUserId);

    // Verify exactly one user row exists
    const totalCount = await prisma.user.count({ where: { email: email.toLowerCase() } });
    expect(totalCount).toBe(1);
  });

  it('18. verifies development database accounts survive test database wipe', async () => {
    const devDbUrl = 'postgresql://javaverse:javaverse@127.0.0.1:5432/javaverse?schema=public';
    const markerEmail = `persistent.marker.${Date.now()}@example.local`;
    const devPrisma = new PrismaClient({ datasources: { db: { url: devDbUrl } } });

    try {
      await devPrisma.user.create({
        data: {
          email: markerEmail,
          displayName: 'Protected Marker User',
          status: 'ACTIVE',
        },
      });

      // Destructive cleanup against test database
      assertSafeTestDatabase(process.env.DATABASE_URL);
      await prisma.user.deleteMany();

      // Confirm marker survives in dev DB
      const marker = await devPrisma.user.findUnique({ where: { email: markerEmail } });
      expect(marker).not.toBeNull();
      expect(marker?.email).toBe(markerEmail);
    } finally {
      await devPrisma.user.deleteMany({ where: { email: markerEmail } });
      await devPrisma.$disconnect();
    }
  });

  it('19. verifies disposable clone database remains isolated from development database', async () => {
    const devDbUrl = 'postgresql://javaverse:javaverse@127.0.0.1:5432/javaverse?schema=public';
    const disposableDbUrl =
      'postgresql://javaverse:javaverse@127.0.0.1:5432/javaverse_test?schema=public';

    const devPrisma = new PrismaClient({ datasources: { db: { url: devDbUrl } } });
    const disposablePrisma = new PrismaClient({ datasources: { db: { url: disposableDbUrl } } });

    const cloneEmail = `clone.learner.${Date.now()}@example.local`;

    try {
      // Create user in disposable database
      await disposablePrisma.user.create({
        data: {
          email: cloneEmail,
          displayName: 'Disposable Clone User',
          status: 'ACTIVE',
        },
      });

      // Assert user exists in disposable DB
      const disposableUser = await disposablePrisma.user.findUnique({
        where: { email: cloneEmail },
      });
      expect(disposableUser).not.toBeNull();

      // Assert user DOES NOT exist in development DB
      const devUser = await devPrisma.user.findUnique({ where: { email: cloneEmail } });
      expect(devUser).toBeNull();
    } finally {
      await disposablePrisma.user.deleteMany({ where: { email: cloneEmail } });
      await devPrisma.$disconnect();
      await disposablePrisma.$disconnect();
    }
  });

  it('20. verifies no password or password hash is returned in API responses or user sessions, and verifies one-way Argon2id hash', async () => {
    const email = `redaction.learner.${Date.now()}@example.com`;
    const sRes = await handleSignup(
      createSignupRequest({
        displayName: 'Redaction Learner',
        email,
        password: BASE_TEST_PASSWORD,
        confirmPassword: BASE_TEST_PASSWORD,
      }),
    );
    const sText = await sRes.text();
    expect(sText).not.toContain(BASE_TEST_PASSWORD);
    expect(sText).not.toContain('$argon2id$');
    expect(sText).not.toContain('passwordHash');

    // 1. Verify stored database hash format and one-way non-reversibility
    const dbUser = await prisma.user.findUnique({ where: { email } });
    expect(dbUser).not.toBeNull();
    expect(dbUser?.passwordHash?.startsWith('$argon2id$')).toBe(true);
    expect(dbUser?.passwordHash).not.toBe(BASE_TEST_PASSWORD);
    expect(dbUser?.passwordHash).not.toContain(BASE_TEST_PASSWORD);

    // 2. Exact password verifies successfully; incorrect password fails
    const exactValid = await verifyPassword(BASE_TEST_PASSWORD, dbUser!.passwordHash!);
    expect(exactValid).toBe(true);
    const wrongValid = await verifyPassword('IncorrectPassword123!', dbUser!.passwordHash!);
    expect(wrongValid).toBe(false);

    // 3. Verify audit logs never log plaintext password or Argon2id hash
    const auditLogs = await prisma.auditLog.findMany({ where: { targetUserId: dbUser!.id } });
    for (const log of auditLogs) {
      const logStr = JSON.stringify(log);
      expect(logStr).not.toContain(BASE_TEST_PASSWORD);
      expect(logStr).not.toContain('$argon2id$');
    }

    const lRes = await handleLogin(createLoginRequest({ email, password: BASE_TEST_PASSWORD }));
    const lText = await lRes.text();
    expect(lText).not.toContain(BASE_TEST_PASSWORD);
    expect(lText).not.toContain('$argon2id$');
    expect(lText).not.toContain('passwordHash');

    const rawToken = extractRawSessionToken(lRes);
    expect(rawToken).not.toBeNull();

    const sessReq = new NextRequest('http://localhost:3000/api/v1/auth/session', {
      headers: { cookie: `${SESSION_COOKIE_NAME}=${rawToken}` },
    });
    const sessRes = await handleSession(sessReq);
    const sessText = await sessRes.text();
    expect(sessText).not.toContain(BASE_TEST_PASSWORD);
    expect(sessText).not.toContain('$argon2id$');
    expect(sessText).not.toContain('passwordHash');
  });

  it('21. verifies logout revokes server session, expires session cookie, does not expose token, and rejects old session', async () => {
    const email = `logout.contract.${Date.now()}@example.com`;
    await handleSignup(
      createSignupRequest({
        displayName: 'Logout Contract Learner',
        email,
        password: BASE_TEST_PASSWORD,
        confirmPassword: BASE_TEST_PASSWORD,
      }),
    );

    const lRes = await handleLogin(createLoginRequest({ email, password: BASE_TEST_PASSWORD }));
    expect(lRes.status).toBe(200);
    const rawToken = extractRawSessionToken(lRes);
    expect(rawToken).not.toBeNull();

    const sessionCtx = await resolveSession(rawToken);
    expect(sessionCtx).not.toBeNull();
    const sessionId = sessionCtx!.session.id;
    const publicId = sessionCtx!.session.publicId;

    // Verify session active before logout
    const preLogoutSession = await prisma.session.findUnique({ where: { id: sessionId } });
    expect(preLogoutSession?.revokedAt).toBeNull();

    // Perform logout
    const csrfToken = createCsrfToken({ sessionId: publicId });
    const logoutReq = new NextRequest('http://localhost:3000/api/v1/auth/logout', {
      method: 'POST',
      headers: {
        origin: 'http://localhost:3000',
        'x-csrf-token': csrfToken,
        cookie: `${SESSION_COOKIE_NAME}=${rawToken}`,
      },
    });
    const logoutRes = await handleLogout(logoutReq);
    expect(logoutRes.status).toBe(200);

    // Logout does not expose session token or password hash in response body
    const logoutText = await logoutRes.text();
    expect(logoutText).not.toContain(rawToken!);
    expect(logoutText).not.toContain(BASE_TEST_PASSWORD);
    expect(logoutText).not.toContain('$argon2id$');

    // Cookie expiration header has Max-Age=0
    const setCookie = logoutRes.headers.get('set-cookie');
    expect(setCookie).not.toBeNull();
    expect(setCookie).toContain(`${SESSION_COOKIE_NAME}=;`);
    expect(setCookie).toContain('Max-Age=0');

    // Server-side PostgreSQL session is revoked
    const postLogoutSession = await prisma.session.findUnique({ where: { id: sessionId } });
    expect(postLogoutSession?.revokedAt).not.toBeNull();

    // Session endpoint reports unauthenticated
    const afterSessReq = new NextRequest('http://localhost:3000/api/v1/auth/session', {
      headers: { cookie: `${SESSION_COOKIE_NAME}=${rawToken}` },
    });
    const afterSessRes = await handleSession(afterSessReq);
    expect(afterSessRes.status).toBe(200);
    const afterSessData = await afterSessRes.json();
    expect(afterSessData.data.authenticated).toBe(false);
    expect(afterSessData.data.user).toBeNull();

    // Protected route strictly rejects revoked session token with 401 Unauthorized
    const protectedReq = new NextRequest('http://localhost:3000/api/v1/auth/sessions', {
      headers: { cookie: `${SESSION_COOKIE_NAME}=${rawToken}` },
    });
    const protectedRes = await handleGetSessions(protectedReq);
    expect(protectedRes.status).toBe(401);
  });

  it('22. rejects signup with common password and returns friendly common-password copy', async () => {
    const email = `common.pw.${Date.now()}@example.com`;
    const res = await handleSignup(
      createSignupRequest({
        email,
        password: 'password12345',
        confirmPassword: 'password12345',
      }),
    );
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error.code).toBe('PASSWORD_COMMON');
    expect(data.error.message).toBe(
      'This password is too common. Choose a longer, less predictable password.',
    );
  });

  it('23. rejects signup with known breached password and returns friendly breach copy', async () => {
    const originalFetch = globalThis.fetch;
    const testPw = 'BreachedPassword123!';
    try {
      globalThis.fetch = async () => {
        const sha1 = createHash('sha1').update(testPw).digest('hex').toUpperCase();
        const suffix = sha1.slice(5);
        return new Response(`${suffix}:42\r\n`, { status: 200 });
      };

      const email = `breached.pw.${Date.now()}@example.com`;
      const res = await handleSignup(
        createSignupRequest({
          email,
          password: testPw,
          confirmPassword: testPw,
        }),
      );
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error.code).toBe('PASSWORD_BREACHED');
      expect(data.error.message).toBe(
        'This password appears in a known breach list. Choose a different password or use a password manager to generate one.',
      );
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it('24. degraded breach check allows signup to succeed and records audit log', async () => {
    const originalFetch = globalThis.fetch;
    try {
      globalThis.fetch = async () => {
        throw new Error('HIBP connection timeout');
      };

      const email = `degraded.learner.${Date.now()}@example.com`;
      const res = await handleSignup(
        createSignupRequest({
          email,
          password: 'MySafePassphrase2026!',
          confirmPassword: 'MySafePassphrase2026!',
        }),
      );
      expect(res.status).toBe(201);

      const auditEvent = await prisma.auditLog.findFirst({
        where: { action: 'auth.breach_check_degraded' },
      });
      expect(auditEvent).not.toBeNull();
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it('25. rejects signup with password < 12 characters with exact required message', async () => {
    const email = `short.pw.${Date.now()}@example.com`;
    const res = await handleSignup(
      createSignupRequest({
        email,
        password: 'short',
        confirmPassword: 'short',
      }),
    );
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error.message).toBe('Use at least 12 characters.');
  });

  it('26. rejects signup with mismatched confirmation with exact required message', async () => {
    const email = `mismatch.pw.${Date.now()}@example.com`;
    const res = await handleSignup(
      createSignupRequest({
        email,
        password: BASE_TEST_PASSWORD,
        confirmPassword: 'DifferentPassword123!',
      }),
    );
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error.message).toBe('Passwords do not match.');
  });

  it('27. password change flow requires correct current password and validates new password policy', async () => {
    const email = `change.pw.${Date.now()}@example.com`;
    const sRes = await handleSignup(
      createSignupRequest({
        email,
        password: BASE_TEST_PASSWORD,
        confirmPassword: BASE_TEST_PASSWORD,
      }),
    );
    expect(sRes.status).toBe(201);

    const lRes = await handleLogin(createLoginRequest({ email, password: BASE_TEST_PASSWORD }));
    expect(lRes.status).toBe(200);
    const rawToken = extractRawSessionToken(lRes)!;
    const sessionCtx = await resolveSession(rawToken);
    expect(sessionCtx).not.toBeNull();

    // 1. Wrong current password -> 400
    const badChangeRes = await handlePasswordChange(
      createChangePasswordRequest(
        {
          currentPassword: 'WrongPassword999!',
          newPassword: 'BrandNewSecurePass2026!',
        },
        rawToken,
        sessionCtx!.session.publicId,
      ),
    );
    expect(badChangeRes.status).toBe(400);
    const badChangeData = await badChangeRes.json();
    expect(badChangeData.error.message).toBe('Incorrect current password');

    // 2. Common new password -> 400 PASSWORD_COMMON
    const commonChangeRes = await handlePasswordChange(
      createChangePasswordRequest(
        {
          currentPassword: BASE_TEST_PASSWORD,
          newPassword: 'password12345',
        },
        rawToken,
        sessionCtx!.session.publicId,
      ),
    );
    expect(commonChangeRes.status).toBe(400);
    const commonChangeData = await commonChangeRes.json();
    expect(commonChangeData.error.code).toBe('PASSWORD_COMMON');

    // 3. Valid new password -> 200
    const newPassword = 'BrandNewSecurePass2026!';
    const okChangeRes = await handlePasswordChange(
      createChangePasswordRequest(
        {
          currentPassword: BASE_TEST_PASSWORD,
          newPassword,
        },
        rawToken,
        sessionCtx!.session.publicId,
      ),
    );
    expect(okChangeRes.status).toBe(200);

    // Old password no longer works
    const oldLoginRes = await handleLogin(
      createLoginRequest({ email, password: BASE_TEST_PASSWORD }),
    );
    expect(oldLoginRes.status).toBe(401);

    // New password works
    const newLoginRes = await handleLogin(createLoginRequest({ email, password: newPassword }));
    expect(newLoginRes.status).toBe(200);
  });

  it('28. password reset flow validates token and validates new password policy', async () => {
    const email = `reset.pw.${Date.now()}@example.com`;
    const sRes = await handleSignup(
      createSignupRequest({
        email,
        password: BASE_TEST_PASSWORD,
        confirmPassword: BASE_TEST_PASSWORD,
      }),
    );
    expect(sRes.status).toBe(201);
    const dbUser = await prisma.user.findUnique({ where: { email } });
    expect(dbUser).not.toBeNull();

    // 1. Invalid reset token -> 400
    const badTokenRes = await handlePasswordReset(
      createResetPasswordRequest({
        token: 'invalid-nonexistent-token',
        password: 'BrandNewResetPass2026!',
      }),
    );
    expect(badTokenRes.status).toBe(400);
    const badTokenData = await badTokenRes.json();
    expect(badTokenData.error.message).toBe('The password reset link is invalid or has expired');

    // 2. Generate valid emailToken in DB
    const keys = getServerKeys();
    const rawResetToken = generateRandomToken(32);
    const tokenHash = deriveTokenDigest(rawResetToken, 'password_reset', keys.authTokenHmacKey);
    await prisma.emailToken.create({
      data: {
        tokenHash,
        deliveryChannel: 'EMAIL',
        purpose: 'RESET_PASSWORD',
        subjectUserId: dbUser!.id,
        subjectEmail: dbUser!.email,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      },
    });

    // 3. Reset with common password -> 400 PASSWORD_COMMON
    const commonResetRes = await handlePasswordReset(
      createResetPasswordRequest({
        token: rawResetToken,
        password: 'password12345',
      }),
    );
    expect(commonResetRes.status).toBe(400);
    const commonResetData = await commonResetRes.json();
    expect(commonResetData.error.code).toBe('PASSWORD_COMMON');

    // 4. Reset with valid password -> 200
    const newPassword = 'ResetSecurePass2026!';
    const okResetRes = await handlePasswordReset(
      createResetPasswordRequest({
        token: rawResetToken,
        password: newPassword,
      }),
    );
    expect(okResetRes.status).toBe(200);

    // Login with reset password succeeds
    const lRes = await handleLogin(createLoginRequest({ email, password: newPassword }));
    expect(lRes.status).toBe(200);
  });

  it('29. signup transaction atomicity: rolls back completely on user creation failure', async () => {
    const email = `fail.user.${Date.now()}@example.com`;
    const orig$transaction = prisma.$transaction.bind(prisma);
    vi.spyOn(prisma, '$transaction').mockImplementationOnce(async (fn: any, ...args: any[]) => {
      return orig$transaction(
        async (tx: any) => {
          tx.user.create = vi.fn().mockRejectedValue(new Error('Simulated disk/DB write failure'));
          return fn(tx);
        },
        ...args,
      );
    });

    const sReq = createSignupRequest({
      email,
      password: BASE_TEST_PASSWORD,
      confirmPassword: BASE_TEST_PASSWORD,
    });
    const sRes = await handleSignup(sReq);
    expect(sRes.status).toBe(500);
    expect(sRes.headers.get('set-cookie')).toBeNull();

    // Verify 0 user rows and 0 session rows
    const userCount = await prisma.user.count({ where: { email } });
    expect(userCount).toBe(0);
    const sessionCount = await prisma.session.count();
    expect(sessionCount).toBe(0);
  });

  it('30. signup transaction atomicity: rolls back completely on audit log insert failure', async () => {
    const email = `fail.audit.${Date.now()}@example.com`;
    const orig$transaction = prisma.$transaction.bind(prisma);
    vi.spyOn(prisma, '$transaction').mockImplementationOnce(async (fn: any, ...args: any[]) => {
      return orig$transaction(
        async (tx: any) => {
          tx.auditLog.create = vi
            .fn()
            .mockRejectedValue(new Error('Simulated audit log insert constraint failure'));
          return fn(tx);
        },
        ...args,
      );
    });

    const sReq = createSignupRequest({
      email,
      password: BASE_TEST_PASSWORD,
      confirmPassword: BASE_TEST_PASSWORD,
    });
    const sRes = await handleSignup(sReq);
    expect(sRes.status).toBe(500);
    expect(sRes.headers.get('set-cookie')).toBeNull();

    // Verify atomic rollback: user was NOT committed, 0 users, 0 sessions
    const userCount = await prisma.user.count({ where: { email } });
    expect(userCount).toBe(0);
    const sessionCount = await prisma.session.count();
    expect(sessionCount).toBe(0);
  });

  it('31. signup transaction atomicity: rolls back completely on transaction commit failure', async () => {
    const email = `fail.commit.${Date.now()}@example.com`;
    vi.spyOn(prisma, '$transaction').mockRejectedValueOnce(
      new Error('Simulated PostgreSQL commit deadlock/timeout'),
    );

    const sReq = createSignupRequest({
      email,
      password: BASE_TEST_PASSWORD,
      confirmPassword: BASE_TEST_PASSWORD,
    });
    const sRes = await handleSignup(sReq);
    expect(sRes.status).toBe(500);
    expect(sRes.headers.get('set-cookie')).toBeNull();

    const userCount = await prisma.user.count({ where: { email } });
    expect(userCount).toBe(0);
  });

  it('32. database startup guards: test mode strictly rejects protected and non-allowlisted databases', () => {
    expect(() => {
      verifyDatabaseStartupGuard('web', 'postgresql://user:secret123@127.0.0.1:5432/javaverse', {
        nodeEnv: 'test',
      });
    }).toThrow(/CRITICAL STARTUP GUARD: Database "javaverse" is not an allowlisted test database/);

    expect(() => {
      verifyDatabaseStartupGuard(
        'worker',
        'postgresql://user:secret123@127.0.0.1:5432/production',
        {
          nodeEnv: 'test',
        },
      );
    }).toThrow(/CRITICAL STARTUP GUARD: Database "production" is not an allowlisted test database/);
  });

  it('33. database startup guards: allows test databases and warns when dev mode connects to test database', () => {
    // Test mode on test database succeeds
    const result = verifyDatabaseStartupGuard(
      'web',
      'postgresql://user:secret123@127.0.0.1:5432/javaverse_test',
      { nodeEnv: 'test' },
    );
    expect(result.dbName).toBe('javaverse_test');
    expect(result.mode).toBe('test');
    expect(result.component).toBe('web');

    // Dev mode with _test database logs a warning
    const warnFn = vi.fn();
    const infoFn = vi.fn();
    verifyDatabaseStartupGuard('web', 'postgresql://user:secret123@127.0.0.1:5432/javaverse_test', {
      nodeEnv: 'development',
      logger: { info: infoFn, warn: warnFn },
    });
    expect(warnFn).toHaveBeenCalledTimes(1);
    const firstCall = warnFn.mock.calls[0];
    expect(firstCall?.[1]).toContain(
      'WARNING: Development mode is connected to test database "javaverse_test"',
    );
  });

  it('34. database diagnostics extraction never exposes credentials, passwords, or query tokens', () => {
    const sensitiveUrl =
      'postgresql://admin_user:super_secret_pw!@db.internal.host:5433/javaverse_test?sslmode=require&application_name=test';
    const diag = getSafeDatabaseDiagnostics(sensitiveUrl);

    expect(diag.dbHost).toBe('db.internal.host');
    expect(diag.dbPort).toBe('5433');
    expect(diag.dbName).toBe('javaverse_test');

    // Strict guarantee: no credentials in string representation
    const serialized = JSON.stringify(diag);
    expect(serialized).not.toContain('admin_user');
    expect(serialized).not.toContain('super_secret_pw');
    expect(serialized).not.toContain('sslmode');
  });

  it('35. complete database-backed acceptance journey: signup, immediate DB check, session resolve, logout, login with same credentials', async () => {
    const email = `acceptance.learner.${Date.now()}@example.local`;
    const password = BASE_TEST_PASSWORD;

    // 1. Confirm zero matching users in DB
    const initialCount = await prisma.user.count({ where: { email } });
    expect(initialCount).toBe(0);

    // 2. Submit signup
    const sReq = createSignupRequest({
      displayName: 'Acceptance Learner',
      email,
      password,
      confirmPassword: password,
    });
    const sRes = await handleSignup(sReq);
    expect(sRes.status).toBe(201);
    const sData = await sRes.json();
    expect(sData.data.requiresSignIn).toBe(true);

    // 3. Confirm NO session token in Set-Cookie header
    const rawSessionToken = extractRawSessionToken(sRes);
    expect(rawSessionToken).toBeNull();

    // 4. Immediately query DB: assert exactly 1 user row exists and 0 sessions exist
    const dbUsers = await prisma.user.findMany({ where: { email } });
    expect(dbUsers.length).toBe(1);
    const dbUser = dbUsers[0]!;
    expect(dbUser.email).toBe(email.toLowerCase());
    expect(dbUser.passwordHash).not.toBeNull();
    expect(dbUser.passwordHash!.startsWith('$argon2id$')).toBe(true);

    const initialSessions = await prisma.session.count({ where: { userId: dbUser.id } });
    expect(initialSessions).toBe(0);

    // 5. Verify the controlled password matches the stored Argon2id hash
    const isPwValid = await verifyPassword(password, dbUser.passwordHash!);
    expect(isPwValid).toBe(true);

    // 6. Sign in with the exact same credentials: creates exactly 1 session
    const lReq1 = createLoginRequest({ email, password });
    const lRes1 = await handleLogin(lReq1);
    expect(lRes1.status).toBe(200);
    const loginRawToken = extractRawSessionToken(lRes1);
    expect(loginRawToken).not.toBeNull();

    // 7. Assert one valid session row references that user
    const dbSessions = await prisma.session.findMany({
      where: { userId: dbUser.id, revokedAt: null },
    });
    expect(dbSessions.length).toBe(1);

    // 8. Refresh/resolve dashboard session using raw session token
    const resolvedAuth = await resolveSession(loginRawToken);
    expect(resolvedAuth).not.toBeNull();
    expect(resolvedAuth!.user.id).toBe(dbUser.id);
    expect(resolvedAuth!.user.email).toBe(dbUser.email);

    // 9. Sign out: assert session is revoked in DB
    const logoutReq = new NextRequest('http://localhost:3000/api/v1/auth/logout', {
      method: 'POST',
      headers: {
        origin: 'http://localhost:3000',
        'Content-Type': 'application/json',
        'x-csrf-token': createCsrfToken({ sessionId: dbSessions[0]!.publicId }),
        cookie: `${SESSION_COOKIE_NAME}=${loginRawToken}`,
      },
    });
    const logoutRes = await handleLogout(logoutReq);
    expect(logoutRes.status).toBe(200);

    const activeSessionsAfterLogout = await prisma.session.count({
      where: { userId: dbUser.id, revokedAt: null },
    });
    expect(activeSessionsAfterLogout).toBe(0);

    // 10. Login again with exact same credentials
    const lReq2 = createLoginRequest({ email, password });
    const lRes2 = await handleLogin(lReq2);
    expect(lRes2.status).toBe(200);
    const loginData = await lRes2.json();
    expect(loginData.data.user.id).toBe(dbUser.id);

    // 11. Confirm no duplicate user row was created
    const finalUsers = await prisma.user.findMany({ where: { email } });
    expect(finalUsers.length).toBe(1);
    expect(finalUsers[0]!.id).toBe(dbUser.id);
  });

  it('36. dashboard fixture helper fails closed when pointing to development database "javaverse"', async () => {
    const { getDashboardFixtureState } = await import('@/components/fixtures/dashboardData');
    const origEnv = process.env.E2E_FIXTURES_ENABLED;
    const origDb = process.env.DATABASE_URL;
    try {
      process.env.E2E_FIXTURES_ENABLED = 'true';
      // Case 1: Pointing to development database
      process.env.DATABASE_URL =
        'postgresql://javaverse:javaverse@127.0.0.1:5432/javaverse?schema=public';
      expect(getDashboardFixtureState({ _fixture: 'standard' })).toBeNull();

      // Case 2: Pointing to test database
      process.env.DATABASE_URL =
        'postgresql://javaverse:javaverse@127.0.0.1:5432/javaverse_test?schema=public';
      expect(getDashboardFixtureState({ _fixture: 'standard' })).toBe('standard');

      // Case 3: E2E_FIXTURES_ENABLED is false/unset
      process.env.E2E_FIXTURES_ENABLED = 'false';
      expect(getDashboardFixtureState({ _fixture: 'standard' })).toBeNull();
    } finally {
      process.env.E2E_FIXTURES_ENABLED = origEnv;
      process.env.DATABASE_URL = origDb;
    }
  });
});
