import { NextRequest } from 'next/server';
import { prisma } from '@javaverse/db';
import { requireOwnerAuth } from '@/lib/adminAuth';
import { validateCsrf } from '@/lib/csrf';
import { jsonOk, jsonError } from '@/lib/apiResponse';
import { recordAuditEvent } from '@/lib/audit';
import { runGoldenEvaluation, getAIProvider } from '@javaverse/ai';
import { getSandboxClient } from '@javaverse/sandbox';
import { env } from '@/env';

export async function GET(request: NextRequest) {
  const auth = await requireOwnerAuth(request);
  if (!auth.ok) {
    return jsonError(auth.status === 403 ? 'FORBIDDEN' : 'UNAUTHORIZED', auth.error, auth.status);
  }

  try {
    const runs = await prisma.evalRun.findMany({
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    return jsonOk({ runs });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to fetch eval runs';
    return jsonError('INTERNAL_ERROR', message, 500);
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireOwnerAuth(request);
  if (!auth.ok) {
    return jsonError(auth.status === 403 ? 'FORBIDDEN' : 'UNAUTHORIZED', auth.error, auth.status);
  }

  const csrf = validateCsrf(request, { sessionId: auth.sessionId });
  if (!csrf.valid) {
    return jsonError('CSRF_ERROR', csrf.reason || 'Invalid CSRF token', 403);
  }

  let body: Record<string, unknown> = {};
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {}

  const maxCases = typeof body?.maxCases === 'number' ? body.maxCases : 5;

  try {
    const provider = getAIProvider({
      primary: env.AI_PROVIDER_PRIMARY,
      fallback: 'mock',
      anthropicApiKey: env.ANTHROPIC_API_KEY,
      geminiApiKey: env.GEMINI_API_KEY,
    });
    const sandboxClient = getSandboxClient();

    const evalResult = await runGoldenEvaluation({
      suiteName: 'javaverse-golden-v1',
      provider,
      sandboxClient,
      maxCases,
      passThreshold: 90,
    });

    const runRecord = await prisma.evalRun.create({
      data: {
        suiteName: evalResult.suiteName,
        model: evalResult.model,
        promptVersion: evalResult.promptVersion,
        totalCases: evalResult.totalCases,
        passedCases: evalResult.passedCases,
        score: evalResult.score,
        metadata: {
          details: evalResult.details,
          regressionDetected: evalResult.regressionDetected,
        },
      },
    });

    await recordAuditEvent({
      actorType: 'USER',
      actorUserId: auth.user.id,
      action: 'EVAL_RUN_TRIGGERED',
      metadata: {
        runId: runRecord.id,
        score: runRecord.score,
        passedCases: runRecord.passedCases,
        totalCases: runRecord.totalCases,
      },
    });

    return jsonOk({ evalRun: runRecord }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Evaluation run failed';
    return jsonError('INTERNAL_ERROR', message, 500);
  }
}
