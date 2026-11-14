import { NextRequest } from 'next/server';
import { extractSessionCookie, resolveSession } from '@/lib/auth';
import { validateCsrf } from '@/lib/csrf';
import { jsonOk, jsonError } from '@/lib/apiResponse';
import { getLessonBySlug, evaluateQuiz } from '@/lib/lessons';
import { awardLessonProgressRewards, recordMistakeFlashcard } from '@/lib/progress';
import { QuizSubmissionSchema } from '@javaverse/schemas';

/**
 * POST /api/v1/lessons/[slug]/quiz
 * Submits answers for a lesson's 5-question quiz and returns score & explanations.
 */
export async function POST(request: NextRequest, context: { params: Promise<{ slug: string }> }) {
  const sessionToken = extractSessionCookie(request);
  const auth = await resolveSession(sessionToken);

  if (!auth) {
    return jsonError('UNAUTHORIZED', 'Authentication required to submit quiz', 401);
  }

  const csrf = validateCsrf(request, { sessionId: auth.session.publicId });
  if (!csrf.valid) {
    return jsonError('CSRF_ERROR', csrf.reason || 'Invalid CSRF token', 403);
  }

  const { slug } = await context.params;
  const lesson = await getLessonBySlug(slug);

  if (!lesson) {
    return jsonError('NOT_FOUND', `Lesson '${slug}' not found`, 404);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError('BAD_REQUEST', 'Invalid JSON body', 400);
  }

  const parsed = QuizSubmissionSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError('VALIDATION_ERROR', 'Invalid quiz submission format', 400);
  }

  const quizResult = evaluateQuiz(lesson.quiz, parsed.data.answers);

  let rewards = { xpAwarded: 0, newlyAwardedBadges: [] as string[] };
  if (quizResult.passed) {
    rewards = await awardLessonProgressRewards(auth.user.id, slug, 'quiz');
  }

  // Auto-generate flashcards for missed questions to power spaced repetition
  for (const r of quizResult.results) {
    if (!r.correct) {
      const q = lesson.quiz.find((item) => item.id === r.id);
      if (q) {
        await recordMistakeFlashcard(
          auth.user.id,
          `Java Concept: ${q.question}`,
          `Explanation: ${q.explanation}`,
          'quiz_mistake',
          slug,
        );
      }
    }
  }

  return jsonOk({
    result: quizResult,
    xpAwarded: rewards.xpAwarded,
    newlyAwardedBadges: rewards.newlyAwardedBadges,
  });
}
