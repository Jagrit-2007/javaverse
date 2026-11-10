import { describe, it, expect, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { prisma, assertSafeTestDatabase } from '@javaverse/db';
import { createCsrfToken } from '@/lib/csrf';
import { resolveSession, SESSION_COOKIE_NAME, LOCAL_ACCOUNT_LIMIT } from '@/lib/auth';
import { POST as handleSignup } from '@/app/api/v1/auth/signup/route';
import { POST as handleLogin } from '@/app/api/v1/auth/login/route';
import { POST as handleLogout } from '@/app/api/v1/auth/logout/route';

import { getRedisCacheClient } from '@/lib/redis';

const VALID_PASSWORD = 'MemberP@ssw0rd!2026';

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

describe('Local-First 5-Account Model & Member Signup Invariants', () => {
  beforeEach(async () => {
    assertSafeTestDatabase(process.env.DATABASE_URL);
    // Flush redis rate limiters
    const redis = getRedisCacheClient();
    await redis.flushdb();

    // Clean all user tables
    await prisma.session.deleteMany();
    await prisma.recoveryCode.deleteMany();
    await prisma.mfaTotp.deleteMany();
    await prisma.emailToken.deleteMany();
    await prisma.user.deleteMany();
  });

  it('signs up when zero users exist, creates a learner account, and creates a valid session', async () => {
    const userCountBefore = await prisma.user.count();
    expect(userCountBefore).toBe(0);

    const req = createSignupRequest(
      {
        displayName: 'First Learner',
        email: 'learner1@example.local',
        password: VALID_PASSWORD,
        confirmPassword: VALID_PASSWORD,
      },
      '10.0.0.1',
    );

    const res = await handleSignup(req);
    expect(res.status).toBe(201);

    const data = await res.json();
    expect(data.data.user.displayName).toBe('First Learner');
    expect(data.data.user.email).toBe('learner1@example.local');

    // Verify raw session token in Set-Cookie header
    const rawToken = extractRawSessionToken(res);
    expect(rawToken).not.toBeNull();

    // Verify session resolves in DB
    const sessionCtx = await resolveSession(rawToken);
    expect(sessionCtx).not.toBeNull();
    expect(sessionCtx?.user.email).toBe('learner1@example.local');

    // Verify DB user record
    const dbUser = await prisma.user.findUnique({
      where: { email: 'learner1@example.local' },
    });
    expect(dbUser?.status).toBe('ACTIVE');
  });

  it('safely rejects duplicate normalized emails regardless of case or whitespace', async () => {
    // 1. Initial registration
    const req1 = createSignupRequest(
      {
        displayName: 'Original User',
        email: 'unique.user@example.local',
        password: VALID_PASSWORD,
        confirmPassword: VALID_PASSWORD,
      },
      '10.0.0.2',
    );
    const res1 = await handleSignup(req1);
    expect(res1.status).toBe(201);

    // 2. Case-variant attempt
    const req2 = createSignupRequest(
      {
        displayName: 'Impostor',
        email: '  UNIQUE.USER@example.local  ',
        password: VALID_PASSWORD,
        confirmPassword: VALID_PASSWORD,
      },
      '10.0.0.3',
    );
    const res2 = await handleSignup(req2);
    expect(res2.status).toBe(409);

    const data2 = await res2.json();
    expect(data2.error.code).toBe('USER_EXISTS');
    expect(data2.error.message).toBe('An account with this email address already exists.');

    const totalUsers = await prisma.user.count();
    expect(totalUsers).toBe(1);
  });

  it('rejects short passwords and mismatched confirmations', async () => {
    // Password too short (< 12)
    const reqShort = createSignupRequest(
      {
        email: 'short@example.local',
        password: 'short',
        confirmPassword: 'short',
      },
      '10.0.0.4',
    );
    const resShort = await handleSignup(reqShort);
    expect(resShort.status).toBe(400);

    // Password confirmation mismatch
    const reqMismatch = createSignupRequest(
      {
        email: 'mismatch@example.local',
        password: VALID_PASSWORD,
        confirmPassword: 'DifferentPassword123!',
      },
      '10.0.0.5',
    );
    const resMismatch = await handleSignup(reqMismatch);
    expect(resMismatch.status).toBe(400);
  });

  it('enforces the exact limit of 5 accounts: 5th succeeds and 6th is rejected', async () => {
    expect(LOCAL_ACCOUNT_LIMIT).toBe(5);

    // Create 4 users
    for (let i = 1; i <= 4; i++) {
      const req = createSignupRequest(
        {
          displayName: `User ${i}`,
          email: `account${i}@example.local`,
          password: VALID_PASSWORD,
          confirmPassword: VALID_PASSWORD,
        },
        `10.1.0.${i}`,
      );
      const res = await handleSignup(req);
      expect(res.status).toBe(201);
    }

    const countAfter4 = await prisma.user.count({ where: { status: { not: 'DELETED' } } });
    expect(countAfter4).toBe(4);

    // 5th signup: must succeed
    const req5 = createSignupRequest(
      {
        displayName: 'Fifth User',
        email: 'account5@example.local',
        password: VALID_PASSWORD,
        confirmPassword: VALID_PASSWORD,
      },
      '10.1.0.5',
    );
    const res5 = await handleSignup(req5);
    expect(res5.status).toBe(201);

    const countAfter5 = await prisma.user.count({ where: { status: { not: 'DELETED' } } });
    expect(countAfter5).toBe(5);

    // 6th signup: must be rejected with the exact required message
    const req6 = createSignupRequest(
      {
        displayName: 'Sixth User (Overflow)',
        email: 'account6@example.local',
        password: VALID_PASSWORD,
        confirmPassword: VALID_PASSWORD,
      },
      '10.1.0.6',
    );
    const res6 = await handleSignup(req6);
    expect(res6.status).toBe(409);

    const data6 = await res6.json();
    expect(data6.error.code).toBe('ACCOUNT_LIMIT_REACHED');
    expect(data6.error.message).toBe(
      'This local JavaVerse installation has reached its limit of 5 accounts. Existing users can still sign in.',
    );

    const finalCount = await prisma.user.count({ where: { status: { not: 'DELETED' } } });
    expect(finalCount).toBe(5);
  });

  it('strictly serializes concurrent signups under advisory lock so simultaneous attempts cannot exceed 5 users', async () => {
    // Pre-create 4 accounts
    for (let i = 1; i <= 4; i++) {
      await prisma.user.create({
        data: {
          email: `seed${i}@example.local`,
          status: 'ACTIVE',
        },
      });
    }

    const countBefore = await prisma.user.count({ where: { status: { not: 'DELETED' } } });
    expect(countBefore).toBe(4);

    // Concurrently trigger 5 distinct signup requests for the 1 remaining seat
    const requests = Array.from({ length: 5 }, (_, idx) =>
      createSignupRequest(
        {
          displayName: `Racer ${idx + 1}`,
          email: `race${idx + 1}@example.local`,
          password: VALID_PASSWORD,
          confirmPassword: VALID_PASSWORD,
        },
        `10.2.0.${idx + 1}`,
      ),
    );

    const responses = await Promise.all(requests.map((r) => handleSignup(r)));
    const statuses = await Promise.all(responses.map((r) => r.status));

    const successes = statuses.filter((s) => s === 201);
    const rejected = statuses.filter((s) => s === 409);

    // Exactly 1 must succeed and exactly 4 must be rejected
    expect(successes.length).toBe(1);
    expect(rejected.length).toBe(4);

    // Verify DB count is exactly 5
    const totalUsers = await prisma.user.count({ where: { status: { not: 'DELETED' } } });
    expect(totalUsers).toBe(5);
  });

  it('allows existing users to log in when 5 accounts exist, and invalid passwords are rejected', async () => {
    // Create user 1 with password
    const req1 = createSignupRequest(
      {
        displayName: 'Account 1',
        email: 'user1@example.local',
        password: VALID_PASSWORD,
        confirmPassword: VALID_PASSWORD,
      },
      '10.3.0.1',
    );
    await handleSignup(req1);

    // Create 4 more users to reach the limit
    for (let i = 2; i <= 5; i++) {
      const req = createSignupRequest(
        {
          displayName: `Account ${i}`,
          email: `user${i}@example.local`,
          password: VALID_PASSWORD,
          confirmPassword: VALID_PASSWORD,
        },
        `10.3.0.${i}`,
      );
      await handleSignup(req);
    }

    const totalCount = await prisma.user.count({ where: { status: { not: 'DELETED' } } });
    expect(totalCount).toBe(5);

    // Invalid password must be rejected
    const badLoginReq = createLoginRequest(
      { email: 'user1@example.local', password: 'WrongPassword999!' },
      '10.3.0.10',
    );
    const badLoginRes = await handleLogin(badLoginReq);
    expect(badLoginRes.status).toBe(401);

    // Existing user login must succeed despite account limit
    const validLoginReq = createLoginRequest(
      { email: 'user1@example.local', password: VALID_PASSWORD },
      '10.3.0.11',
    );
    const validLoginRes = await handleLogin(validLoginReq);
    expect(validLoginRes.status).toBe(200);

    const rawToken = extractRawSessionToken(validLoginRes);
    expect(rawToken).not.toBeNull();

    const sessionCtx = await resolveSession(rawToken);
    expect(sessionCtx).not.toBeNull();
    expect(sessionCtx?.user.email).toBe('user1@example.local');

    // Logout invalidates session
    const csrfToken = createCsrfToken({ sessionId: sessionCtx!.session.publicId });
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

    const resolvedAfterLogout = await resolveSession(rawToken);
    expect(resolvedAfterLogout).toBeNull();
  });

  it('guarantees Account 1 and Account 5 have identical learner permissions and properties', async () => {
    // Create Account 1
    const req1 = createSignupRequest(
      {
        displayName: 'Account 1',
        email: 'member1@example.local',
        password: VALID_PASSWORD,
        confirmPassword: VALID_PASSWORD,
      },
      '10.4.0.1',
    );
    const res1 = await handleSignup(req1);
    expect(res1.status).toBe(201);

    // Create 3 middle accounts
    for (let i = 2; i <= 4; i++) {
      const req = createSignupRequest(
        {
          displayName: `Account ${i}`,
          email: `member${i}@example.local`,
          password: VALID_PASSWORD,
          confirmPassword: VALID_PASSWORD,
        },
        `10.4.0.${i}`,
      );
      const res = await handleSignup(req);
      expect(res.status).toBe(201);
    }

    // Create Account 5
    const req5 = createSignupRequest(
      {
        displayName: 'Account 5',
        email: 'member5@example.local',
        password: VALID_PASSWORD,
        confirmPassword: VALID_PASSWORD,
      },
      '10.4.0.5',
    );
    const res5 = await handleSignup(req5);
    expect(res5.status).toBe(201);

    const user1 = await prisma.user.findUnique({ where: { email: 'member1@example.local' } });
    const user5 = await prisma.user.findUnique({ where: { email: 'member5@example.local' } });

    expect(user1).not.toBeNull();
    expect(user5).not.toBeNull();
    expect(user1?.status).toBe('ACTIVE');
    expect(user5?.status).toBe('ACTIVE');
  });
});
