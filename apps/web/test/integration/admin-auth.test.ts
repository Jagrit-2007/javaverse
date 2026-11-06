import { describe, it, expect, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { prisma } from '@javaverse/db';
import { generateSessionTokens, createSessionRow, SESSION_COOKIE_NAME } from '@/lib/auth';
import { generateSessionCsrfToken } from '@javaverse/security';
import { getServerKeys } from '@/lib/keys';
import {
  GET as handleAdminEvalsGet,
  POST as handleAdminEvalsPost,
} from '@/app/api/v1/admin/evals/route';
import { PATCH as handleAdminFeedbackPatch } from '@/app/api/v1/admin/feedback/[id]/route';
import { POST as handleAdminKbReviewPost } from '@/app/api/v1/admin/kb/candidates/[id]/review/route';
import { POST as handleFeedbackPost } from '@/app/api/v1/feedback/route';
import { POST as handleKbCandidatePost } from '@/app/api/v1/kb/candidates/route';

describe('Admin Authorization, Owner Gating, and CSRF Bypass Remediation', () => {
  let memberTokens: { rawToken: string; tokenDigest: string; publicId: string };
  let ownerTokens: { rawToken: string; tokenDigest: string; publicId: string };
  let memberUser: any;
  let ownerUser: any;
  let keys: any;
  let ownerCsrfToken: string;
  let memberCsrfToken: string;

  beforeEach(async () => {
    keys = await getServerKeys();

    await prisma.session.deleteMany();

    memberUser = await prisma.user.create({
      data: {
        email: `member-${Date.now()}-${Math.random().toString(36).substring(2)}@example.com`,
        displayName: 'Test Member',
        role: 'MEMBER',
        status: 'ACTIVE',
      },
    });
    memberTokens = generateSessionTokens();
    await createSessionRow({
      userId: memberUser.id,
      tokenDigest: memberTokens.tokenDigest,
      publicId: memberTokens.publicId,
    });
    memberCsrfToken = generateSessionCsrfToken(memberTokens.publicId, keys.csrfHmacKey);

    ownerUser = await prisma.user.findFirst({ where: { role: 'OWNER' } });
    if (!ownerUser) {
      ownerUser = await prisma.user.create({
        data: {
          email: `owner-${Date.now()}@test.local`,
          displayName: 'Test Owner',
          role: 'OWNER',
          status: 'ACTIVE',
        },
      });
    }
    ownerTokens = generateSessionTokens();
    await createSessionRow({
      userId: ownerUser.id,
      tokenDigest: ownerTokens.tokenDigest,
      publicId: ownerTokens.publicId,
    });
    ownerCsrfToken = generateSessionCsrfToken(ownerTokens.publicId, keys.csrfHmacKey);
  });

  describe('requireOwnerAuth enforcement on Admin APIs', () => {
    it('returns 401 UNAUTHORIZED for unauthenticated admin requests even if E2E_FIXTURES_ENABLED=true', async () => {
      const origFixture = process.env.E2E_FIXTURES_ENABLED;
      process.env.E2E_FIXTURES_ENABLED = 'true';

      try {
        const req = new NextRequest('http://localhost:3000/api/v1/admin/evals');
        const res = await handleAdminEvalsGet(req);
        expect(res.status).toBe(401);
        const json = await res.json();
        expect(json.error.code).toBe('UNAUTHORIZED');
      } finally {
        process.env.E2E_FIXTURES_ENABLED = origFixture;
      }
    });

    it('returns 403 FORBIDDEN for authenticated MEMBER requests to admin APIs', async () => {
      const req = new NextRequest('http://localhost:3000/api/v1/admin/evals', {
        headers: {
          cookie: `${SESSION_COOKIE_NAME}=${memberTokens.rawToken}`,
        },
      });
      const res = await handleAdminEvalsGet(req);
      expect(res.status).toBe(403);
      const json = await res.json();
      expect(json.error.code).toBe('FORBIDDEN');
    });

    it('returns 200 OK for authenticated OWNER requests to admin APIs', async () => {
      const req = new NextRequest('http://localhost:3000/api/v1/admin/evals', {
        headers: {
          cookie: `${SESSION_COOKIE_NAME}=${ownerTokens.rawToken}`,
        },
      });
      const res = await handleAdminEvalsGet(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.data).toBeDefined();
    });
  });

  describe('CSRF Enforcement across State-Changing Mutation Routes', () => {
    it('rejects POST /api/v1/admin/evals when CSRF token is missing, even if E2E_FIXTURES_ENABLED=true', async () => {
      const origFixture = process.env.E2E_FIXTURES_ENABLED;
      process.env.E2E_FIXTURES_ENABLED = 'true';

      try {
        const req = new NextRequest('http://localhost:3000/api/v1/admin/evals', {
          method: 'POST',
          headers: {
            cookie: `${SESSION_COOKIE_NAME}=${ownerTokens.rawToken}`,
            'content-type': 'application/json',
            origin: 'http://localhost:3000',
          },
          body: JSON.stringify({ maxCases: 1 }),
        });
        const res = await handleAdminEvalsPost(req);
        expect(res.status).toBe(403);
        const json = await res.json();
        expect(json.error.code).toBe('CSRF_ERROR');
      } finally {
        process.env.E2E_FIXTURES_ENABLED = origFixture;
      }
    });

    it('rejects PATCH /api/v1/admin/feedback/[id] when CSRF token is invalid, even if E2E_FIXTURES_ENABLED=true', async () => {
      const origFixture = process.env.E2E_FIXTURES_ENABLED;
      process.env.E2E_FIXTURES_ENABLED = 'true';

      try {
        const req = new NextRequest('http://localhost:3000/api/v1/admin/feedback/fb-123', {
          method: 'PATCH',
          headers: {
            cookie: `${SESSION_COOKIE_NAME}=${ownerTokens.rawToken}`,
            'x-csrf-token': 'invalid-forged-token',
            'content-type': 'application/json',
            origin: 'http://localhost:3000',
          },
          body: JSON.stringify({ resolution: 'RESOLVED' }),
        });
        const res = await handleAdminFeedbackPatch(req, {
          params: Promise.resolve({ id: 'fb-123' }),
        });
        expect(res.status).toBe(403);
        const json = await res.json();
        expect(json.error.code).toBe('CSRF_ERROR');
      } finally {
        process.env.E2E_FIXTURES_ENABLED = origFixture;
      }
    });

    it('rejects POST /api/v1/admin/kb/candidates/[id]/review when CSRF token is missing', async () => {
      const req = new NextRequest(
        'http://localhost:3000/api/v1/admin/kb/candidates/cand-123/review',
        {
          method: 'POST',
          headers: {
            cookie: `${SESSION_COOKIE_NAME}=${ownerTokens.rawToken}`,
            'content-type': 'application/json',
            origin: 'http://localhost:3000',
          },
          body: JSON.stringify({ action: 'APPROVE' }),
        },
      );
      const res = await handleAdminKbReviewPost(req, {
        params: Promise.resolve({ id: 'cand-123' }),
      });
      expect(res.status).toBe(403);
      const json = await res.json();
      expect(json.error.code).toBe('CSRF_ERROR');
    });

    it('rejects POST /api/v1/feedback when CSRF token is missing, even if E2E_FIXTURES_ENABLED=true', async () => {
      const origFixture = process.env.E2E_FIXTURES_ENABLED;
      process.env.E2E_FIXTURES_ENABLED = 'true';

      try {
        const req = new NextRequest('http://localhost:3000/api/v1/feedback', {
          method: 'POST',
          headers: {
            cookie: `${SESSION_COOKIE_NAME}=${memberTokens.rawToken}`,
            'content-type': 'application/json',
            origin: 'http://localhost:3000',
          },
          body: JSON.stringify({
            messageId: '00000000-0000-0000-0000-000000000000',
            feedbackType: 'INACCURATE',
            comment: 'Testing CSRF rejection',
          }),
        });
        const res = await handleFeedbackPost(req);
        expect(res.status).toBe(403);
        const json = await res.json();
        expect(json.error.code).toBe('CSRF_ERROR');
      } finally {
        process.env.E2E_FIXTURES_ENABLED = origFixture;
      }
    });

    it('rejects POST /api/v1/kb/candidates when CSRF token is invalid, even if E2E_FIXTURES_ENABLED=true', async () => {
      const origFixture = process.env.E2E_FIXTURES_ENABLED;
      process.env.E2E_FIXTURES_ENABLED = 'true';

      try {
        const req = new NextRequest('http://localhost:3000/api/v1/kb/candidates', {
          method: 'POST',
          headers: {
            cookie: `${SESSION_COOKIE_NAME}=${memberTokens.rawToken}`,
            'x-csrf-token': 'forged-token',
            'content-type': 'application/json',
            origin: 'http://localhost:3000',
          },
          body: JSON.stringify({
            analysisId: '00000000-0000-0000-0000-000000000000',
            topic: 'Java Collections',
          }),
        });
        const res = await handleKbCandidatePost(req);
        expect(res.status).toBe(403);
        const json = await res.json();
        expect(json.error.code).toBe('CSRF_ERROR');
      } finally {
        process.env.E2E_FIXTURES_ENABLED = origFixture;
      }
    });

    it('accepts POST requests when valid CSRF token is provided', async () => {
      const req = new NextRequest('http://localhost:3000/api/v1/feedback', {
        method: 'POST',
        headers: {
          cookie: `${SESSION_COOKIE_NAME}=${memberTokens.rawToken}`,
          'x-csrf-token': memberCsrfToken,
          'content-type': 'application/json',
          origin: 'http://localhost:3000',
        },
        body: JSON.stringify({
          messageId: '00000000-0000-0000-0000-000000000000',
          feedbackType: 'INACCURATE',
          comment: 'Valid CSRF submission',
        }),
      });
      const res = await handleFeedbackPost(req);
      // Valid CSRF means it passes the CSRF check! (It may return 404 or 400 because messageId doesn't exist, but not 403 CSRF_ERROR)
      expect(res.status).not.toBe(403);
      const json = await res.json();
      expect(json.error?.code).not.toBe('CSRF_ERROR');

      // Also verify owner with valid CSRF passes CSRF check on admin eval run
      const ownerReq = new NextRequest('http://localhost:3000/api/v1/admin/evals', {
        method: 'POST',
        headers: {
          cookie: `${SESSION_COOKIE_NAME}=${ownerTokens.rawToken}`,
          'x-csrf-token': ownerCsrfToken,
          'content-type': 'application/json',
          origin: 'http://localhost:3000',
        },
        body: JSON.stringify({ maxCases: 1 }),
      });
      const ownerRes = await handleAdminEvalsPost(ownerReq);
      expect(ownerRes.status).toBe(201);
      const ownerJson = await ownerRes.json();
      expect(ownerJson.data).toBeDefined();
    });

    it('MEDIUM 5: enforces OWNER authorization and resolves provider safely without leaking credentials', async () => {
      // Non-owner (MEMBER) rejection
      const memberReq = new NextRequest('http://localhost:3000/api/v1/admin/evals', {
        method: 'POST',
        headers: {
          cookie: `${SESSION_COOKIE_NAME}=${memberTokens.rawToken}`,
          'x-csrf-token': memberCsrfToken,
          'content-type': 'application/json',
          origin: 'http://localhost:3000',
        },
        body: JSON.stringify({ maxCases: 1 }),
      });
      const memberRes = await handleAdminEvalsPost(memberReq);
      expect(memberRes.status).toBe(403);
      const memberJson = await memberRes.json();
      expect(memberJson.error.code).toBe('FORBIDDEN');

      // Valid OWNER execution: does not accept arbitrary client provider and never leaks internal credentials
      const ownerReq = new NextRequest('http://localhost:3000/api/v1/admin/evals', {
        method: 'POST',
        headers: {
          cookie: `${SESSION_COOKIE_NAME}=${ownerTokens.rawToken}`,
          'x-csrf-token': ownerCsrfToken,
          'content-type': 'application/json',
          origin: 'http://localhost:3000',
        },
        body: JSON.stringify({
          maxCases: 1,
          provider: 'arbitrary-client-provider-attempt',
          apiKey: 'client-key-attempt',
        }),
      });
      const ownerRes = await handleAdminEvalsPost(ownerReq);
      expect(ownerRes.status).toBe(201);
      const ownerJson = await ownerRes.json();
      const evalRun = ownerJson.data.evalRun;

      expect(evalRun).toBeDefined();
      expect(evalRun.model).toBe('mock'); // Uses validated mock provider by default
      expect(evalRun.suiteName).toBe('javaverse-golden-v1');
      // Verify no credential fields or arbitrary client provider are leaked
      expect(JSON.stringify(ownerJson)).not.toContain('arbitrary-client-provider-attempt');
      expect(JSON.stringify(ownerJson)).not.toContain('client-key-attempt');
      expect(ownerJson.data.evalRun.apiKey).toBeUndefined();
      expect(ownerJson.data.evalRun.anthropicApiKey).toBeUndefined();
      expect(ownerJson.data.evalRun.geminiApiKey).toBeUndefined();
    });
  });
});
