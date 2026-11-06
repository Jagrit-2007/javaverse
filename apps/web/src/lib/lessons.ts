import { prisma } from '@javaverse/db';
import { getSandboxClient, type SandboxClient } from '@javaverse/sandbox';
import type {
  CurriculumLessonSummary,
  CurriculumLessonDetail,
  PublicCurriculumLessonDetail,
  LessonQuizQuestion,
  QuizResult,
  ChallengeResult,
} from '@javaverse/schemas';

/**
 * List all published curriculum lessons with optional track filter
 */
export async function getLessonsList(track?: string): Promise<CurriculumLessonSummary[]> {
  const lessons = await prisma.curriculumLesson.findMany({
    where: {
      published: true,
      ...(track ? { track } : {}),
    },
    orderBy: [{ track: 'asc' }, { orderIndex: 'asc' }],
    select: {
      id: true,
      slug: true,
      title: true,
      track: true,
      module: true,
      orderIndex: true,
      published: true,
      difficulty: true,
      estimatedMinutes: true,
      hook: true,
    },
  });

  return lessons as CurriculumLessonSummary[];
}

/**
 * Fetch full curriculum lesson details by unique slug
 */
export async function getLessonBySlug(slug: string): Promise<CurriculumLessonDetail | null> {
  const lesson = await prisma.curriculumLesson.findUnique({
    where: { slug },
  });

  if (!lesson || !lesson.published) {
    return null;
  }

  return lesson as unknown as CurriculumLessonDetail;
}

/**
 * Transforms an internal lesson detail into a safe public DTO using an explicit allowlist.
 * Ensures answerIndex, quiz explanation, challenge solutionCode, challenge testCode,
 * and codeSolution never leak to the client.
 */
export function toPublicLessonDetail(lesson: CurriculumLessonDetail): PublicCurriculumLessonDetail {
  return {
    id: lesson.id,
    slug: lesson.slug,
    title: lesson.title,
    track: lesson.track,
    module: lesson.module,
    orderIndex: lesson.orderIndex,
    published: lesson.published,
    difficulty: lesson.difficulty,
    estimatedMinutes: lesson.estimatedMinutes,
    hook: lesson.hook,
    contentSimple: lesson.contentSimple,
    contentStandard: lesson.contentStandard,
    contentDeep: lesson.contentDeep,
    visualization: lesson.visualization,
    codeStarter: lesson.codeStarter,
    commonMistakes: lesson.commonMistakes,
    quiz: lesson.quiz.map((q) => ({
      id: q.id,
      question: q.question,
      options: q.options,
    })),
    challenge: {
      prompt: lesson.challenge.prompt,
      starterCode: lesson.challenge.starterCode,
      hints: lesson.challenge.hints ?? [],
    },
    javaVersion: lesson.javaVersion,
    metadata: lesson.metadata,
  };
}

/**
 * Evaluate submitted answers against a lesson's 5-question quiz
 */
export function evaluateQuiz(
  quizQuestions: LessonQuizQuestion[],
  answers: Record<string, number>,
): QuizResult {
  const results = quizQuestions.map((q) => {
    const selected = answers[q.id];
    const selectedIndex: number = typeof selected === 'number' ? selected : -1;
    const correct = selectedIndex === q.answerIndex;
    return {
      id: q.id,
      correct,
      selectedIndex,
      correctIndex: q.answerIndex,
      explanation: q.explanation,
    };
  });

  const score = results.filter((r) => r.correct).length;
  const total = quizQuestions.length;
  const passed = score >= Math.ceil(total * 0.8); // 80% passing threshold (e.g. 4/5)

  return {
    score,
    total,
    passed,
    results,
  };
}

export function normalizeJavaVersion(
  v?: string,
): 'JAVA_8' | 'JAVA_11' | 'JAVA_17' | 'JAVA_21' | 'JAVA_25' {
  if (v === '8' || v === 'JAVA_8') return 'JAVA_8';
  if (v === '11' || v === 'JAVA_11') return 'JAVA_11';
  if (v === '17' || v === 'JAVA_17') return 'JAVA_17';
  if (v === '25' || v === 'JAVA_25') return 'JAVA_25';
  return 'JAVA_21';
}

/**
 * Assembles multi-part Java source by hoisting import statements to the file header
 */
export function assembleJavaSource(parts: string[]): string {
  const imports = new Set<string>();
  const bodyLines: string[] = [];

  for (const part of parts) {
    for (const line of part.split('\n')) {
      const trimmed = line.trim();
      if (trimmed.startsWith('import ') && trimmed.endsWith(';')) {
        imports.add(trimmed);
      } else {
        bodyLines.push(line);
      }
    }
  }

  return `${Array.from(imports).join('\n')}\n\n${bodyLines.join('\n')}`;
}

/**
 * Execute learner code against a lesson challenge's test harness
 */
export async function runChallenge(
  slug: string,
  userCode: string,
  sandboxClient?: SandboxClient,
): Promise<ChallengeResult> {
  const lesson = await getLessonBySlug(slug);
  if (!lesson) {
    return {
      passed: false,
      stdout: '',
      stderr: 'Lesson not found',
      exitCode: 1,
      timeMs: 0,
      error: 'Lesson not found',
    };
  }

  const client = sandboxClient || getSandboxClient();
  const assembledCode = assembleJavaSource([lesson.challenge.testCode, userCode]);

  const result = await client.execute({
    code: assembledCode,
    javaVersion: normalizeJavaVersion(lesson.javaVersion),
    timeoutMs: 5000,
  });

  return {
    passed: result.status === 'SUCCESS',
    stdout: result.stdout,
    stderr: result.stderr,
    exitCode: result.exitCode,
    timeMs: result.timeMs,
    ...(result.status !== 'SUCCESS' ? { error: result.stderr || 'Execution failed' } : {}),
  };
}

/**
 * Execute arbitrary runnable Java code for in-lesson playground
 */
export async function runPlaygroundCode(
  code: string,
  javaVersion = 'JAVA_21',
  sandboxClient?: SandboxClient,
): Promise<ChallengeResult> {
  const client = sandboxClient || getSandboxClient();

  const result = await client.execute({
    code,
    javaVersion: normalizeJavaVersion(javaVersion),
    timeoutMs: 5000,
  });

  return {
    passed: result.status === 'SUCCESS',
    stdout: result.stdout,
    stderr: result.stderr,
    exitCode: result.exitCode,
    timeMs: result.timeMs,
    ...(result.status !== 'SUCCESS' ? { error: result.stderr || 'Execution failed' } : {}),
  };
}
