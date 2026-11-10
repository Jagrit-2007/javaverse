import { describe, it, expect, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { prisma, PrismaClient, assertSafeTestDatabase } from '@javaverse/db';
import { createCsrfToken } from '@/lib/csrf';
import { resolveSession, SESSION_COOKIE_NAME } from '@/lib/auth';
import { verifyPassword } from '@javaverse/security';
import { POST as handleSignup } from '@/app/api/v1/auth/signup/route';
import { POST as handleLogin } from '@/app/api/v1/auth/login/route';
import { POST as handleLogout } from '@/app/api/v1/auth/logout/route';
import { GET as handleSession } from '@/app/api/v1/auth/session/route';
import { GET as handleGetSessions } from '@/app/api/v1/auth/sessions/route';
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

    const token = extractRawSessionToken(sRes);
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

  it('15. verifies complete signup -> logout -> login sequence preserves exact user ID', async () => {
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
    const initialRawToken = extractRawSessionToken(sRes);
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
});
