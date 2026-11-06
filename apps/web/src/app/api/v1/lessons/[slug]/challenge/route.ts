import { NextRequest } from 'next/server';
import { extractSessionCookie, resolveSession } from '@/lib/auth';
import { validateCsrf } from '@/lib/csrf';
import { jsonOk, jsonError } from '@/lib/apiResponse';
import { runChallenge } from '@/lib/lessons';
import { awardLessonProgressRewards } from '@/lib/progress';
import { ChallengeSubmissionSchema } from '@javaverse/schemas';

/**
 * POST /api/v1/lessons/[slug]/challenge
 * Executes learner challenge code against the lesson's automated test harness in the sandbox.
 */
export async function POST(request: NextRequest, context: { params: Promise<{ slug: string }> }) {
  const sessionToken = extractSessionCookie(request);
  const auth = await resolveSession(sessionToken);

  if (!auth) {
    return jsonError('UNAUTHORIZED', 'Authentication required to run challenge', 401);
  }

  const csrf = validateCsrf(request, { sessionId: auth.session.publicId });
  if (!csrf.valid) {
    return jsonError('CSRF_ERROR', csrf.reason || 'Invalid CSRF token', 403);
  }

  const { slug } = await context.params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError('BAD_REQUEST', 'Invalid JSON body', 400);
  }

  const parsed = ChallengeSubmissionSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError('VALIDATION_ERROR', 'Invalid challenge submission: missing code', 400);
  }

  try {
    const result = await runChallenge(slug, parsed.data.code);
    let rewards = { xpAwarded: 0, newlyAwardedBadges: [] as string[] };
    if (result.passed) {
      rewards = await awardLessonProgressRewards(auth.user.id, slug, 'challenge');
    }

    return jsonOk({
      result,
      xpAwarded: rewards.xpAwarded,
      newlyAwardedBadges: rewards.newlyAwardedBadges,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Challenge execution failed';
    return jsonError('INTERNAL_ERROR', message, 500);
  }
}
