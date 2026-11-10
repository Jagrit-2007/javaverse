import { describe, it, expect, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET as handleProvidersGet } from '@/app/api/v1/ai/providers/route';
import { prisma, assertSafeTestDatabase } from '@javaverse/db';
import { generateSessionTokens, createSessionRow, SESSION_COOKIE_NAME } from '@/lib/auth';

describe('AI Providers Endpoint Safety & Compliance (Part 6)', () => {
  let learnerTokens: { rawToken: string; tokenDigest: string; publicId: string };
  let learnerUser: any;

  beforeEach(async () => {
    assertSafeTestDatabase(process.env.DATABASE_URL);
    await prisma.session.deleteMany();

    learnerUser = await prisma.user.create({
      data: {
        email: `learner-providers-${Date.now()}@test.local`,
        displayName: 'Test Learner',
        status: 'ACTIVE',
      },
    });

    learnerTokens = generateSessionTokens();
    await createSessionRow({
      userId: learnerUser.id,
      tokenDigest: learnerTokens.tokenDigest,
      publicId: learnerTokens.publicId,
    });
  });

  it('1. Authentication requirement: rejects unauthenticated requests with 401', async () => {
    const req = new NextRequest('http://localhost:3000/api/v1/ai/providers');
    const res = await handleProvidersGet(req);

    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.error.code).toBe('UNAUTHORIZED');
  });

  it('2. Returns 200 OK for authenticated learner with strictly allowlisted providers', async () => {
    const req = new NextRequest('http://localhost:3000/api/v1/ai/providers', {
      headers: {
        cookie: `${SESSION_COOKIE_NAME}=${learnerTokens.rawToken}`,
      },
    });

    const res = await handleProvidersGet(req);
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.data).toBeDefined();
    expect(json.data.activeProvider).toBeDefined();
    expect(json.data.activeModel).toBeDefined();
    expect(typeof json.data.externalAiEnabled).toBe('boolean');

    const allowedProviderIds = ['mock', 'gemini', 'anthropic'];
    const providers = json.data.providers;
    expect(Array.isArray(providers)).toBe(true);

    for (const prov of providers) {
      expect(allowedProviderIds).toContain(prov.id);
      expect(typeof prov.label).toBe('string');
      expect(typeof prov.configured).toBe('boolean');
      expect(typeof prov.external).toBe('boolean');
      expect(typeof prov.mayConsumePaidUsage).toBe('boolean');
    }
  });

  it('3. Never exposes API keys, key fragments, environment values, or internal URLs', async () => {
    const req = new NextRequest('http://localhost:3000/api/v1/ai/providers', {
      headers: {
        cookie: `${SESSION_COOKIE_NAME}=${learnerTokens.rawToken}`,
      },
    });

    const res = await handleProvidersGet(req);
    const text = await res.text();

    // Verify no secret patterns exist anywhere in raw response
    expect(text).not.toMatch(/AIza[0-9A-Za-z-_]{35}/); // Gemini API key format
    expect(text).not.toMatch(/sk-ant-[0-9A-Za-z-_]+/); // Anthropic API key format
    expect(text).not.toContain('API_KEY');
    expect(text).not.toContain('DATABASE_URL');
    expect(text).not.toContain('REDIS_');
    expect(text).not.toContain('SESSION_SECRET');
    expect(text).not.toContain('localhost:5432');
    expect(text).not.toContain('127.0.0.1:5432');
    expect(text).not.toContain('postgresql://');
  });

  it('4. Zero stack trace leakage', async () => {
    const req = new NextRequest('http://localhost:3000/api/v1/ai/providers', {
      headers: {
        cookie: `${SESSION_COOKIE_NAME}=${learnerTokens.rawToken}`,
      },
    });

    const res = await handleProvidersGet(req);
    const json = await res.json();

    expect(json.stack).toBeUndefined();
    expect(json.error?.stack).toBeUndefined();
  });
});
