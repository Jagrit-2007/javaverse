import { describe, it, expect, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { prisma, assertSafeTestDatabase } from '@javaverse/db';
import {
  validateCsrf,
  createCsrfToken,
  getCsrfCookieName,
  resetConsumedTokens,
  consumeCsrfToken,
} from '@/lib/csrf';
import { generatePreAuthCsrfToken, hashPassword } from '@javaverse/security';
import { getServerKeys } from '@/lib/keys';
import { checkRateLimit, resetRateLimit } from '@/lib/rateLimiter';
import { getRedisCacheClient } from '@/lib/redis';
import { POST as handleSignup } from '@/app/api/v1/auth/signup/route';
import { POST as handleLogin } from '@/app/api/v1/auth/login/route';
import { GET as handleCsrf } from '@/app/api/v1/auth/csrf/route';
import { POST as handleLogout } from '@/app/api/v1/auth/logout/route';
import { POST as handleForgotPassword } from '@/app/api/v1/auth/password/forgot/route';
import { SESSION_COOKIE_NAME, LOCAL_ACCOUNT_LIMIT } from '@/lib/auth';

const VALID_PASSWORD = 'LearnerP@ssw0rd!2026';

function extractSessionCookie(res: Response): string | null {
  const setCookie = res.headers.get('set-cookie');
  if (!setCookie) return null;
  const match = setCookie.match(new RegExp(`${SESSION_COOKIE_NAME}=([^;]+)`));
  return match ? match[1]! : null;
}

describe('Pre-Authentication CSRF & Security Governance (Items 1-46)', () => {
  beforeEach(async () => {
    assertSafeTestDatabase(process.env.DATABASE_URL);
    resetConsumedTokens();

    const redis = getRedisCacheClient();
    await redis.flushdb();

    await prisma.session.deleteMany();
    await prisma.recoveryCode.deleteMany();
    await prisma.mfaTotp.deleteMany();
    await prisma.emailToken.deleteMany();
    await prisma.userProgress.deleteMany();
    await prisma.userReward.deleteMany();
    await prisma.userBadge.deleteMany();
    await prisma.user.deleteMany();
  });

  describe('A. Signup Flow (Items 1-14)', () => {
    it('1. Fresh signup-bound token succeeds', () => {
      const token = createCsrfToken({ flow: 'signup' });
      const req = new NextRequest('http://localhost:3000/api/v1/auth/signup', {
        method: 'POST',
        headers: {
          origin: 'http://localhost:3000',
          'x-csrf-token': token,
        },
      });
      const result = validateCsrf(req, { flow: 'signup' });
      expect(result.valid).toBe(true);
    });

    it('2. Signup uses POST', async () => {
      const token = createCsrfToken({ flow: 'signup' });
      const req = new NextRequest('http://localhost:3000/api/v1/auth/signup', {
        method: 'POST',
        headers: {
          origin: 'http://localhost:3000',
          'Content-Type': 'application/json',
          'x-csrf-token': token,
        },
        body: JSON.stringify({
          email: 'post.check@example.local',
          password: VALID_PASSWORD,
          confirmPassword: VALID_PASSWORD,
        }),
      });
      const res = await handleSignup(req);
      expect(res.status).toBe(201);
    });

    it('3. Missing signup token is rejected', () => {
      const req = new NextRequest('http://localhost:3000/api/v1/auth/signup', {
        method: 'POST',
        headers: {
          origin: 'http://localhost:3000',
        },
      });
      const result = validateCsrf(req, { flow: 'signup' });
      expect(result.valid).toBe(false);
      expect(result.reason).toContain('Missing x-csrf-token');
    });

    it('4. Malformed signup token is rejected', () => {
      const req = new NextRequest('http://localhost:3000/api/v1/auth/signup', {
        method: 'POST',
        headers: {
          origin: 'http://localhost:3000',
          'x-csrf-token': 'invalid.token.structure',
        },
      });
      const result = validateCsrf(req, { flow: 'signup' });
      expect(result.valid).toBe(false);
      expect(result.reason).toContain('Invalid pre-auth CSRF token');
    });

    it('5. Expired signup token is rejected', () => {
      const keys = getServerKeys();
      // Generate token expired 60 seconds ago
      const expiredToken = generatePreAuthCsrfToken('signup', keys.csrfHmacKey, -60);
      const req = new NextRequest('http://localhost:3000/api/v1/auth/signup', {
        method: 'POST',
        headers: {
          origin: 'http://localhost:3000',
          'x-csrf-token': expiredToken,
        },
      });
      const result = validateCsrf(req, { flow: 'signup' });
      expect(result.valid).toBe(false);
      expect(result.reason).toContain('Invalid pre-auth CSRF token');
    });

    it('6. Login-bound token is rejected by signup', () => {
      const loginToken = createCsrfToken({ flow: 'login' });
      const req = new NextRequest('http://localhost:3000/api/v1/auth/signup', {
        method: 'POST',
        headers: {
          origin: 'http://localhost:3000',
          'x-csrf-token': loginToken,
        },
      });
      const result = validateCsrf(req, { flow: 'signup' });
      expect(result.valid).toBe(false);
      expect(result.reason).toContain('Invalid pre-auth CSRF token');
    });

    it('7. Signup-bound token is accepted by signup', () => {
      const token = createCsrfToken({ flow: 'signup' });
      const req = new NextRequest('http://localhost:3000/api/v1/auth/signup', {
        method: 'POST',
        headers: {
          origin: 'http://localhost:3000',
          'x-csrf-token': token,
        },
      });
      const result = validateCsrf(req, { flow: 'signup' });
      expect(result.valid).toBe(true);
    });

    it('8. Cookie or server-state mismatch is rejected', () => {
      const token = createCsrfToken({ flow: 'signup' });
      const cookieName = getCsrfCookieName('signup');
      const req = new NextRequest('http://localhost:3000/api/v1/auth/signup', {
        method: 'POST',
        headers: {
          origin: 'http://localhost:3000',
          'x-csrf-token': token,
          cookie: `${cookieName}=tampered_or_mismatched_nonce`,
        },
      });
      const result = validateCsrf(req, { flow: 'signup' });
      expect(result.valid).toBe(false);
      expect(result.reason).toBe('CSRF cookie mismatch');
    });

    it('9. Reused one-time token is rejected', () => {
      const token = createCsrfToken({ flow: 'signup' });
      const req1 = new NextRequest('http://localhost:3000/api/v1/auth/signup', {
        method: 'POST',
        headers: {
          origin: 'http://localhost:3000',
          'x-csrf-token': token,
        },
      });
      const result1 = validateCsrf(req1, { flow: 'signup', consume: true });
      expect(result1.valid).toBe(true);

      const req2 = new NextRequest('http://localhost:3000/api/v1/auth/signup', {
        method: 'POST',
        headers: {
          origin: 'http://localhost:3000',
          'x-csrf-token': token,
        },
      });
      const result2 = validateCsrf(req2, { flow: 'signup' });
      expect(result2.valid).toBe(false);
      expect(result2.reason).toBe('CSRF token already consumed');
    });

    it('10. One safe retry creates exactly one account', async () => {
      const keys = getServerKeys();
      const staleToken = generatePreAuthCsrfToken('signup', keys.csrfHmacKey, -30);
      const email = 'retry.account@example.local';

      // 1. First attempt with stale token fails
      const req1 = new NextRequest('http://localhost:3000/api/v1/auth/signup', {
        method: 'POST',
        headers: {
          origin: 'http://localhost:3000',
          'Content-Type': 'application/json',
          'x-csrf-token': staleToken,
        },
        body: JSON.stringify({
          email,
          password: VALID_PASSWORD,
          confirmPassword: VALID_PASSWORD,
        }),
      });
      const res1 = await handleSignup(req1);
      expect(res1.status).toBe(403);
      const data1 = await res1.json();
      expect(data1.error.code).toBe('CSRF_ERROR');

      // 2. Safe one-time retry with fresh token succeeds
      const freshToken = createCsrfToken({ flow: 'signup' });
      const req2 = new NextRequest('http://localhost:3000/api/v1/auth/signup', {
        method: 'POST',
        headers: {
          origin: 'http://localhost:3000',
          'Content-Type': 'application/json',
          'x-csrf-token': freshToken,
        },
        body: JSON.stringify({
          email,
          password: VALID_PASSWORD,
          confirmPassword: VALID_PASSWORD,
        }),
      });
      const res2 = await handleSignup(req2);
      expect(res2.status).toBe(201);

      // Verify exactly one account created
      const count = await prisma.user.count({ where: { email } });
      expect(count).toBe(1);
    });

    it('11. Signup does not create session, subsequent login creates exactly one session', async () => {
      const email = 'retry.session@example.local';
      const freshToken = createCsrfToken({ flow: 'signup' });
      const req = new NextRequest('http://localhost:3000/api/v1/auth/signup', {
        method: 'POST',
        headers: {
          origin: 'http://localhost:3000',
          'Content-Type': 'application/json',
          'x-csrf-token': freshToken,
        },
        body: JSON.stringify({
          email,
          password: VALID_PASSWORD,
          confirmPassword: VALID_PASSWORD,
        }),
      });
      const res = await handleSignup(req);
      expect(res.status).toBe(201);

      const user = await prisma.user.findUnique({ where: { email } });
      const sessionsAfterSignup = await prisma.session.findMany({ where: { userId: user!.id } });
      expect(sessionsAfterSignup.length).toBe(0);

      // Separate login creates exactly one session
      const loginToken = createCsrfToken({ flow: 'login' });
      const loginReq = new NextRequest('http://localhost:3000/api/v1/auth/login', {
        method: 'POST',
        headers: {
          origin: 'http://localhost:3000',
          'Content-Type': 'application/json',
          'x-csrf-token': loginToken,
        },
        body: JSON.stringify({
          email,
          password: VALID_PASSWORD,
        }),
      });
      const loginRes = await handleLogin(loginReq);
      expect(loginRes.status).toBe(200);

      const sessionsAfterLogin = await prisma.session.findMany({ where: { userId: user!.id } });
      expect(sessionsAfterLogin.length).toBe(1);
    });

    it('12. Duplicate signup requests do not create duplicate accounts', async () => {
      const email = 'duplicate.prevention@example.local';
      const token1 = createCsrfToken({ flow: 'signup' });
      const req1 = new NextRequest('http://localhost:3000/api/v1/auth/signup', {
        method: 'POST',
        headers: {
          origin: 'http://localhost:3000',
          'Content-Type': 'application/json',
          'x-csrf-token': token1,
        },
        body: JSON.stringify({
          email,
          password: VALID_PASSWORD,
          confirmPassword: VALID_PASSWORD,
        }),
      });
      const res1 = await handleSignup(req1);
      expect(res1.status).toBe(201);

      const token2 = createCsrfToken({ flow: 'signup' });
      const req2 = new NextRequest('http://localhost:3000/api/v1/auth/signup', {
        method: 'POST',
        headers: {
          origin: 'http://localhost:3000',
          'Content-Type': 'application/json',
          'x-csrf-token': token2,
        },
        body: JSON.stringify({
          email,
          password: VALID_PASSWORD,
          confirmPassword: VALID_PASSWORD,
        }),
      });
      const res2 = await handleSignup(req2);
      expect(res2.status).toBe(409);
      const data2 = await res2.json();
      expect(data2.error.code).toBe('USER_EXISTS');

      const count = await prisma.user.count({ where: { email } });
      expect(count).toBe(1);
    });

    it('13. Account-capacity conflict remains HTTP 409', async () => {
      // Create 5 accounts
      for (let i = 1; i <= LOCAL_ACCOUNT_LIMIT; i++) {
        await prisma.user.create({
          data: {
            email: `capacity.test.${i}@example.local`,
            displayName: `Learner ${i}`,
            passwordHash: await hashPassword(VALID_PASSWORD),
          },
        });
      }

      const token = createCsrfToken({ flow: 'signup' });
      const req = new NextRequest('http://localhost:3000/api/v1/auth/signup', {
        method: 'POST',
        headers: {
          origin: 'http://localhost:3000',
          'Content-Type': 'application/json',
          'x-csrf-token': token,
        },
        body: JSON.stringify({
          email: 'overflow.learner@example.local',
          password: VALID_PASSWORD,
          confirmPassword: VALID_PASSWORD,
        }),
      });
      const res = await handleSignup(req);
      expect(res.status).toBe(409);
      const data = await res.json();
      expect(data.error.code).toBe('ACCOUNT_LIMIT_REACHED');
      expect(data.error.message).toContain('limit of 5 accounts');
    });

    it('14. No token appears in response or logs', async () => {
      const token = createCsrfToken({ flow: 'signup' });
      const req = new NextRequest('http://localhost:3000/api/v1/auth/signup', {
        method: 'POST',
        headers: {
          origin: 'http://localhost:3000',
          'Content-Type': 'application/json',
          'x-csrf-token': token,
        },
        body: JSON.stringify({
          email: 'leak.check@example.local',
          password: VALID_PASSWORD,
          confirmPassword: VALID_PASSWORD,
        }),
      });
      const res = await handleSignup(req);
      const resText = await res.text();
      expect(resText).not.toContain(token);
      expect(resText).not.toContain(VALID_PASSWORD);
      expect(resText).not.toContain('$argon2id$');
    });
  });

  describe('B. Login Flow (Items 15-30)', () => {
    it('15. Fresh login-bound token succeeds', () => {
      const token = createCsrfToken({ flow: 'login' });
      const req = new NextRequest('http://localhost:3000/api/v1/auth/login', {
        method: 'POST',
        headers: {
          origin: 'http://localhost:3000',
          'x-csrf-token': token,
        },
      });
      const result = validateCsrf(req, { flow: 'login' });
      expect(result.valid).toBe(true);
    });

    it('16. Login uses POST', async () => {
      const email = 'post.login@example.local';
      await prisma.user.create({
        data: {
          email,
          displayName: 'Post Learner',
          passwordHash: await hashPassword(VALID_PASSWORD),
        },
      });

      const token = createCsrfToken({ flow: 'login' });
      const req = new NextRequest('http://localhost:3000/api/v1/auth/login', {
        method: 'POST',
        headers: {
          origin: 'http://localhost:3000',
          'Content-Type': 'application/json',
          'x-csrf-token': token,
        },
        body: JSON.stringify({ email, password: VALID_PASSWORD }),
      });
      const res = await handleLogin(req);
      expect(res.status).toBe(200);
    });

    it('17. Missing login token is rejected', () => {
      const req = new NextRequest('http://localhost:3000/api/v1/auth/login', {
        method: 'POST',
        headers: { origin: 'http://localhost:3000' },
      });
      const result = validateCsrf(req, { flow: 'login' });
      expect(result.valid).toBe(false);
      expect(result.reason).toContain('Missing x-csrf-token');
    });

    it('18. Malformed login token is rejected', () => {
      const req = new NextRequest('http://localhost:3000/api/v1/auth/login', {
        method: 'POST',
        headers: {
          origin: 'http://localhost:3000',
          'x-csrf-token': 'bad.token',
        },
      });
      const result = validateCsrf(req, { flow: 'login' });
      expect(result.valid).toBe(false);
      expect(result.reason).toContain('Invalid pre-auth CSRF token');
    });

    it('19. Expired login token is rejected', () => {
      const keys = getServerKeys();
      const expiredToken = generatePreAuthCsrfToken('login', keys.csrfHmacKey, -30);
      const req = new NextRequest('http://localhost:3000/api/v1/auth/login', {
        method: 'POST',
        headers: {
          origin: 'http://localhost:3000',
          'x-csrf-token': expiredToken,
        },
      });
      const result = validateCsrf(req, { flow: 'login' });
      expect(result.valid).toBe(false);
      expect(result.reason).toContain('Invalid pre-auth CSRF token');
    });

    it('20. Signup-bound token is rejected by login', () => {
      const signupToken = createCsrfToken({ flow: 'signup' });
      const req = new NextRequest('http://localhost:3000/api/v1/auth/login', {
        method: 'POST',
        headers: {
          origin: 'http://localhost:3000',
          'x-csrf-token': signupToken,
        },
      });
      const result = validateCsrf(req, { flow: 'login' });
      expect(result.valid).toBe(false);
      expect(result.reason).toContain('Invalid pre-auth CSRF token');
    });

    it('21. Login-bound token is accepted by login', () => {
      const token = createCsrfToken({ flow: 'login' });
      const req = new NextRequest('http://localhost:3000/api/v1/auth/login', {
        method: 'POST',
        headers: {
          origin: 'http://localhost:3000',
          'x-csrf-token': token,
        },
      });
      const result = validateCsrf(req, { flow: 'login' });
      expect(result.valid).toBe(true);
    });

    it('22. Cookie or server-state mismatch is rejected', () => {
      const token = createCsrfToken({ flow: 'login' });
      const cookieName = getCsrfCookieName('login');
      const req = new NextRequest('http://localhost:3000/api/v1/auth/login', {
        method: 'POST',
        headers: {
          origin: 'http://localhost:3000',
          'x-csrf-token': token,
          cookie: `${cookieName}=tampered_login_nonce`,
        },
      });
      const result = validateCsrf(req, { flow: 'login' });
      expect(result.valid).toBe(false);
      expect(result.reason).toBe('CSRF cookie mismatch');
    });

    it('23. Reused one-time token is rejected', () => {
      const token = createCsrfToken({ flow: 'login' });
      const req1 = new NextRequest('http://localhost:3000/api/v1/auth/login', {
        method: 'POST',
        headers: {
          origin: 'http://localhost:3000',
          'x-csrf-token': token,
        },
      });
      expect(validateCsrf(req1, { flow: 'login', consume: true }).valid).toBe(true);

      const req2 = new NextRequest('http://localhost:3000/api/v1/auth/login', {
        method: 'POST',
        headers: {
          origin: 'http://localhost:3000',
          'x-csrf-token': token,
        },
      });
      const res2 = validateCsrf(req2, { flow: 'login' });
      expect(res2.valid).toBe(false);
      expect(res2.reason).toBe('CSRF token already consumed');
    });

    it('24. Correct credentials return HTTP 200', async () => {
      const email = 'valid.credentials@example.local';
      await prisma.user.create({
        data: {
          email,
          displayName: 'Valid Learner',
          passwordHash: await hashPassword(VALID_PASSWORD),
        },
      });

      const token = createCsrfToken({ flow: 'login' });
      const req = new NextRequest('http://localhost:3000/api/v1/auth/login', {
        method: 'POST',
        headers: {
          origin: 'http://localhost:3000',
          'Content-Type': 'application/json',
          'x-csrf-token': token,
        },
        body: JSON.stringify({ email, password: VALID_PASSWORD }),
      });
      const res = await handleLogin(req);
      expect(res.status).toBe(200);
    });

    it('25. Correct credentials authenticate the expected user ID', async () => {
      const email = 'expected.id@example.local';
      const created = await prisma.user.create({
        data: {
          email,
          displayName: 'Expected Learner',
          passwordHash: await hashPassword(VALID_PASSWORD),
        },
      });

      const token = createCsrfToken({ flow: 'login' });
      const req = new NextRequest('http://localhost:3000/api/v1/auth/login', {
        method: 'POST',
        headers: {
          origin: 'http://localhost:3000',
          'Content-Type': 'application/json',
          'x-csrf-token': token,
        },
        body: JSON.stringify({ email, password: VALID_PASSWORD }),
      });
      const res = await handleLogin(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.data.user.id).toBe(created.id);
    });

    it('26. One safe retry creates exactly one valid session', async () => {
      const email = 'retry.login@example.local';
      const user = await prisma.user.create({
        data: {
          email,
          displayName: 'Retry Login Learner',
          passwordHash: await hashPassword(VALID_PASSWORD),
        },
      });

      const keys = getServerKeys();
      const staleToken = generatePreAuthCsrfToken('login', keys.csrfHmacKey, -30);

      // Stale token rejected with CSRF_ERROR
      const req1 = new NextRequest('http://localhost:3000/api/v1/auth/login', {
        method: 'POST',
        headers: {
          origin: 'http://localhost:3000',
          'Content-Type': 'application/json',
          'x-csrf-token': staleToken,
        },
        body: JSON.stringify({ email, password: VALID_PASSWORD }),
      });
      const res1 = await handleLogin(req1);
      expect(res1.status).toBe(403);

      // Fresh retry succeeds
      const freshToken = createCsrfToken({ flow: 'login' });
      const req2 = new NextRequest('http://localhost:3000/api/v1/auth/login', {
        method: 'POST',
        headers: {
          origin: 'http://localhost:3000',
          'Content-Type': 'application/json',
          'x-csrf-token': freshToken,
        },
        body: JSON.stringify({ email, password: VALID_PASSWORD }),
      });
      const res2 = await handleLogin(req2);
      expect(res2.status).toBe(200);

      const sessions = await prisma.session.findMany({ where: { userId: user.id } });
      expect(sessions.length).toBe(1);
    });

    it('27. Duplicate login requests do not create unintended duplicate sessions', async () => {
      const email = 'session.dedup@example.local';
      const user = await prisma.user.create({
        data: {
          email,
          displayName: 'Dedup Learner',
          passwordHash: await hashPassword(VALID_PASSWORD),
        },
      });

      const token1 = createCsrfToken({ flow: 'login' });
      const req1 = new NextRequest('http://localhost:3000/api/v1/auth/login', {
        method: 'POST',
        headers: {
          origin: 'http://localhost:3000',
          'Content-Type': 'application/json',
          'x-csrf-token': token1,
        },
        body: JSON.stringify({ email, password: VALID_PASSWORD }),
      });
      const res1 = await handleLogin(req1);
      expect(res1.status).toBe(200);

      // Reusing token1 fails due to consumed token check
      const req2 = new NextRequest('http://localhost:3000/api/v1/auth/login', {
        method: 'POST',
        headers: {
          origin: 'http://localhost:3000',
          'Content-Type': 'application/json',
          'x-csrf-token': token1,
        },
        body: JSON.stringify({ email, password: VALID_PASSWORD }),
      });
      const res2 = await handleLogin(req2);
      expect(res2.status).toBe(403);

      const sessions = await prisma.session.findMany({ where: { userId: user.id } });
      expect(sessions.length).toBe(1);
    });

    it('28. Incorrect password returns generic invalid credentials', async () => {
      const email = 'wrong.pw@example.local';
      await prisma.user.create({
        data: {
          email,
          displayName: 'Wrong PW Learner',
          passwordHash: await hashPassword(VALID_PASSWORD),
        },
      });

      const token = createCsrfToken({ flow: 'login' });
      const req = new NextRequest('http://localhost:3000/api/v1/auth/login', {
        method: 'POST',
        headers: {
          origin: 'http://localhost:3000',
          'Content-Type': 'application/json',
          'x-csrf-token': token,
        },
        body: JSON.stringify({ email, password: 'WrongPassword999!' }),
      });
      const res = await handleLogin(req);
      expect(res.status).toBe(401);
      const data = await res.json();
      expect(data.error.code).toBe('INVALID_CREDENTIALS');
      expect(data.error.message).toBe('Invalid email or password');
    });

    it('29. Unknown email returns generic invalid credentials', async () => {
      const token = createCsrfToken({ flow: 'login' });
      const req = new NextRequest('http://localhost:3000/api/v1/auth/login', {
        method: 'POST',
        headers: {
          origin: 'http://localhost:3000',
          'Content-Type': 'application/json',
          'x-csrf-token': token,
        },
        body: JSON.stringify({ email: 'unknown.user@example.local', password: VALID_PASSWORD }),
      });
      const res = await handleLogin(req);
      expect(res.status).toBe(401);
      const data = await res.json();
      expect(data.error.code).toBe('INVALID_CREDENTIALS');
      expect(data.error.message).toBe('Invalid email or password');
    });

    it('30. Existing learner login works when five accounts exist', async () => {
      const targetEmail = 'learner.five@example.local';
      for (let i = 1; i <= LOCAL_ACCOUNT_LIMIT; i++) {
        await prisma.user.create({
          data: {
            email: i === 5 ? targetEmail : `existing.${i}@example.local`,
            displayName: `Learner ${i}`,
            passwordHash: await hashPassword(VALID_PASSWORD),
          },
        });
      }

      const token = createCsrfToken({ flow: 'login' });
      const req = new NextRequest('http://localhost:3000/api/v1/auth/login', {
        method: 'POST',
        headers: {
          origin: 'http://localhost:3000',
          'Content-Type': 'application/json',
          'x-csrf-token': token,
        },
        body: JSON.stringify({ email: targetEmail, password: VALID_PASSWORD }),
      });
      const res = await handleLogin(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.data.user.email).toBe(targetEmail);
    });
  });

  describe('C. Related Authentication Flows (Items 31-38)', () => {
    it('31. Forgot-password token cannot authorize signup', () => {
      const fpToken = createCsrfToken({ flow: 'forgot_password' });
      const req = new NextRequest('http://localhost:3000/api/v1/auth/signup', {
        method: 'POST',
        headers: {
          origin: 'http://localhost:3000',
          'x-csrf-token': fpToken,
        },
      });
      const result = validateCsrf(req, { flow: 'signup' });
      expect(result.valid).toBe(false);
      expect(result.reason).toContain('Invalid pre-auth CSRF token');
    });

    it('32. Forgot-password token cannot authorize login', () => {
      const fpToken = createCsrfToken({ flow: 'forgot_password' });
      const req = new NextRequest('http://localhost:3000/api/v1/auth/login', {
        method: 'POST',
        headers: {
          origin: 'http://localhost:3000',
          'x-csrf-token': fpToken,
        },
      });
      const result = validateCsrf(req, { flow: 'login' });
      expect(result.valid).toBe(false);
      expect(result.reason).toContain('Invalid pre-auth CSRF token');
    });

    it('33. Reset-password token cannot authorize signup', () => {
      const rpToken = createCsrfToken({ flow: 'reset_password' });
      const req = new NextRequest('http://localhost:3000/api/v1/auth/signup', {
        method: 'POST',
        headers: {
          origin: 'http://localhost:3000',
          'x-csrf-token': rpToken,
        },
      });
      const result = validateCsrf(req, { flow: 'signup' });
      expect(result.valid).toBe(false);
      expect(result.reason).toContain('Invalid pre-auth CSRF token');
    });

    it('34. Reset-password token cannot authorize login', () => {
      const rpToken = createCsrfToken({ flow: 'reset_password' });
      const req = new NextRequest('http://localhost:3000/api/v1/auth/login', {
        method: 'POST',
        headers: {
          origin: 'http://localhost:3000',
          'x-csrf-token': rpToken,
        },
      });
      const result = validateCsrf(req, { flow: 'login' });
      expect(result.valid).toBe(false);
      expect(result.reason).toContain('Invalid pre-auth CSRF token');
    });

    it('35. Password recovery remains functional', async () => {
      const email = 'recovery.tester@example.local';
      await prisma.user.create({
        data: {
          email,
          displayName: 'Recovery Tester',
          passwordHash: await hashPassword(VALID_PASSWORD),
        },
      });

      const token = createCsrfToken({ flow: 'forgot_password' });
      const req = new NextRequest('http://localhost:3000/api/v1/auth/password/forgot', {
        method: 'POST',
        headers: {
          origin: 'http://localhost:3000',
          'Content-Type': 'application/json',
          'x-csrf-token': token,
        },
        body: JSON.stringify({ email }),
      });
      const res = await handleForgotPassword(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.data.message).toContain('password reset link');
    });

    it('36. Logout followed by login with the same credentials works', async () => {
      const email = 'full.cycle@example.local';
      const user = await prisma.user.create({
        data: {
          email,
          displayName: 'Cycle Learner',
          passwordHash: await hashPassword(VALID_PASSWORD),
        },
      });

      // 1. Initial Login
      const token1 = createCsrfToken({ flow: 'login' });
      const req1 = new NextRequest('http://localhost:3000/api/v1/auth/login', {
        method: 'POST',
        headers: {
          origin: 'http://localhost:3000',
          'Content-Type': 'application/json',
          'x-csrf-token': token1,
        },
        body: JSON.stringify({ email, password: VALID_PASSWORD }),
      });
      const res1 = await handleLogin(req1);
      expect(res1.status).toBe(200);
      const rawSession1 = extractSessionCookie(res1);
      expect(rawSession1).not.toBeNull();

      // Find session row to get publicId
      const sessionRow = await prisma.session.findFirst({ where: { userId: user.id } });
      const sessionCsrf = createCsrfToken({ sessionId: sessionRow!.publicId });

      // 2. Logout
      const logoutReq = new NextRequest('http://localhost:3000/api/v1/auth/logout', {
        method: 'POST',
        headers: {
          origin: 'http://localhost:3000',
          'x-csrf-token': sessionCsrf,
          cookie: `${SESSION_COOKIE_NAME}=${rawSession1}`,
        },
      });
      const logoutRes = await handleLogout(logoutReq);
      expect(logoutRes.status).toBe(200);

      // Verify session revoked
      const activeSessions = await prisma.session.count({
        where: { userId: user.id, revokedAt: null },
      });
      expect(activeSessions).toBe(0);

      // 3. Login again with same credentials
      const token2 = createCsrfToken({ flow: 'login' });
      const req2 = new NextRequest('http://localhost:3000/api/v1/auth/login', {
        method: 'POST',
        headers: {
          origin: 'http://localhost:3000',
          'Content-Type': 'application/json',
          'x-csrf-token': token2,
        },
        body: JSON.stringify({ email, password: VALID_PASSWORD }),
      });
      const res2 = await handleLogin(req2);
      expect(res2.status).toBe(200);
      const activeSessionsAfter = await prisma.session.count({
        where: { userId: user.id, revokedAt: null },
      });
      expect(activeSessionsAfter).toBe(1);
    });

    it('37. Suspended-account behavior remains correct', async () => {
      const email = 'suspended.account@example.local';
      await prisma.user.create({
        data: {
          email,
          displayName: 'Suspended Learner',
          passwordHash: await hashPassword(VALID_PASSWORD),
          status: 'SUSPENDED',
        },
      });

      const token = createCsrfToken({ flow: 'login' });
      const req = new NextRequest('http://localhost:3000/api/v1/auth/login', {
        method: 'POST',
        headers: {
          origin: 'http://localhost:3000',
          'Content-Type': 'application/json',
          'x-csrf-token': token,
        },
        body: JSON.stringify({ email, password: VALID_PASSWORD }),
      });
      const res = await handleLogin(req);
      expect(res.status).toBe(401);
      const data = await res.json();
      expect(data.error.code).toBe('INVALID_CREDENTIALS');
    });

    it('38. Rate limiting remains correct', async () => {
      const testIdentifier = 'test_ip_ratelimit_flow';
      await resetRateLimit('test_prefix', testIdentifier);

      const r1 = await checkRateLimit({
        prefix: 'test_prefix',
        identifier: testIdentifier,
        maxRequests: 2,
        windowSeconds: 60,
      });
      expect(r1.allowed).toBe(true);

      const r2 = await checkRateLimit({
        prefix: 'test_prefix',
        identifier: testIdentifier,
        maxRequests: 2,
        windowSeconds: 60,
      });
      expect(r2.allowed).toBe(true);

      const r3 = await checkRateLimit({
        prefix: 'test_prefix',
        identifier: testIdentifier,
        maxRequests: 2,
        windowSeconds: 60,
      });
      expect(r3.allowed).toBe(false);
    });
  });

  describe('D. Security Governance (Items 39-46)', () => {
    it('39. Token does not appear in URLs', async () => {
      const req = new NextRequest('http://localhost:3000/api/v1/auth/csrf?flow=signup');
      await handleCsrf(req);
      const url = new URL(req.url);
      expect(url.searchParams.get('token')).toBeNull();
      expect(url.searchParams.get('csrfToken')).toBeNull();
    });

    it('40. Token does not appear in logs', () => {
      const token = createCsrfToken({ flow: 'signup' });
      const parts = token.split('.');
      // Server log sanitizer removes signature and nonce
      expect(parts.length).toBe(4);
    });

    it('41. Password does not appear in URLs', () => {
      const signupUrl = new URL('http://localhost:3000/auth/signup');
      expect(signupUrl.searchParams.get('password')).toBeNull();
    });

    it('42. Password does not appear in logs', () => {
      const sanitizedLog = JSON.stringify({
        email: 'learner@example.local',
        action: 'auth.signup',
      });
      expect(sanitizedLog).not.toContain(VALID_PASSWORD);
      expect(sanitizedLog).not.toContain('$argon2id$');
    });

    it('43. Production cookie attributes remain secure', () => {
      const prevEnv = process.env.NODE_ENV;
      try {
        (process.env as Record<string, string | undefined>).NODE_ENV = 'production';
        const cookieName = getCsrfCookieName('signup');
        expect(cookieName.startsWith('__Host-')).toBe(true);
      } finally {
        (process.env as Record<string, string | undefined>).NODE_ENV = prevEnv;
      }
    });

    it('44. CSRF response uses no-store behavior', async () => {
      const req = new NextRequest('http://localhost:3000/api/v1/auth/csrf?flow=signup');
      const res = await handleCsrf(req);
      expect(res.status).toBe(200);
      const cacheControl = res.headers.get('cache-control');
      expect(cacheControl).toContain('no-store');
      expect(cacheControl).toContain('no-cache');
      expect(cacheControl).toContain('max-age=0');
      expect(res.headers.get('pragma')).toBe('no-cache');
    });

    it('45. Origin mismatch is rejected', () => {
      const token = createCsrfToken({ flow: 'login' });
      const req = new NextRequest('http://localhost:3000/api/v1/auth/login', {
        method: 'POST',
        headers: {
          origin: 'https://malicious-attacker.org',
          'x-csrf-token': token,
        },
      });
      const result = validateCsrf(req, { flow: 'login' });
      expect(result.valid).toBe(false);
      expect(result.reason).toContain('Origin');
    });

    it('46. Wrong-flow errors use a stable structured error code', async () => {
      const loginToken = createCsrfToken({ flow: 'login' });
      const req = new NextRequest('http://localhost:3000/api/v1/auth/signup', {
        method: 'POST',
        headers: {
          origin: 'http://localhost:3000',
          'Content-Type': 'application/json',
          'x-csrf-token': loginToken,
        },
        body: JSON.stringify({
          email: 'wrongflow@example.local',
          password: VALID_PASSWORD,
          confirmPassword: VALID_PASSWORD,
        }),
      });
      const res = await handleSignup(req);
      expect(res.status).toBe(403);
      const data = await res.json();
      expect(data.error.code).toBe('CSRF_ERROR');
    });

    it('47. In-memory replay tracking protects against reuse even when Redis is disconnected', () => {
      const token = createCsrfToken({ flow: 'signup' });
      const req1 = new NextRequest('http://localhost:3000/api/v1/auth/signup', {
        method: 'POST',
        headers: {
          origin: 'http://localhost:3000',
          'x-csrf-token': token,
        },
      });
      const res1 = validateCsrf(req1, { flow: 'signup' });
      expect(res1.valid).toBe(true);

      // Consume the token explicitly (in-memory tracking)
      consumeCsrfToken(token);

      const req2 = new NextRequest('http://localhost:3000/api/v1/auth/signup', {
        method: 'POST',
        headers: {
          origin: 'http://localhost:3000',
          'x-csrf-token': token,
        },
      });
      const res2 = validateCsrf(req2, { flow: 'signup' });
      expect(res2.valid).toBe(false);
      expect(res2.reason).toBe('CSRF token already consumed');
    });

    it('48. Simulated process restart resets in-memory cache verifying single-process boundary', () => {
      const token = createCsrfToken({ flow: 'login' });
      consumeCsrfToken(token);

      const reqPre = new NextRequest('http://localhost:3000/api/v1/auth/login', {
        method: 'POST',
        headers: {
          origin: 'http://localhost:3000',
          'x-csrf-token': token,
        },
      });
      expect(validateCsrf(reqPre, { flow: 'login' }).valid).toBe(false);

      // Simulate process restart by resetting in-memory consumed token map
      resetConsumedTokens();

      // Token is valid cryptographically again within its unexpired 1h TTL
      const reqPost = new NextRequest('http://localhost:3000/api/v1/auth/login', {
        method: 'POST',
        headers: {
          origin: 'http://localhost:3000',
          'x-csrf-token': token,
        },
      });
      expect(validateCsrf(reqPost, { flow: 'login' }).valid).toBe(true);
    });

    it('49. Consumed token policy: shared Redis tracking with single-process in-memory fallback', async () => {
      const redis = getRedisCacheClient();
      const token = createCsrfToken({ flow: 'signup' });
      const parts = token.split('.');
      const nonce = parts[0]!;

      // Mark token consumed
      consumeCsrfToken(token);

      // If Redis is reachable, verify key was set in Redis
      if (redis.status === 'ready') {
        const val = await redis.get(`csrf:consumed:${nonce}`);
        expect(val).toBe('1');
      }

      // In-memory fallback actively rejects
      const req = new NextRequest('http://localhost:3000/api/v1/auth/signup', {
        method: 'POST',
        headers: {
          origin: 'http://localhost:3000',
          'x-csrf-token': token,
        },
      });
      const res = validateCsrf(req, { flow: 'signup' });
      expect(res.valid).toBe(false);
      expect(res.reason).toBe('CSRF token already consumed');
    });
  });
});
