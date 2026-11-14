import { describe, it, expect } from 'vitest';
import { NextRequest } from 'next/server';
import { prisma } from '@javaverse/db';
import {
  getLessonsList,
  getLessonBySlug,
  evaluateQuiz,
  assembleJavaSource,
  runChallenge,
  runPlaygroundCode,
} from '@/lib/lessons';
import { MockSandboxClient } from '@javaverse/sandbox';
import { GET as handleGetLesson } from '@/app/api/v1/lessons/[slug]/route';
import { POST as handleQuizSubmit } from '@/app/api/v1/lessons/[slug]/quiz/route';
import { POST as handleChallengeSubmit } from '@/app/api/v1/lessons/[slug]/challenge/route';
import { generateSessionTokens, createSessionRow, SESSION_COOKIE_NAME } from '@/lib/auth';
import { generateSessionCsrfToken } from '@javaverse/security';
import { getServerKeys } from '@/lib/keys';

describe('Phase 8: Curriculum & Lessons Integration', () => {
  it('loads all 12 published lessons across 4 tracks', async () => {
    const lessons = await getLessonsList();
    expect(lessons.length).toBe(12);

    const tracks = new Set(lessons.map((l) => l.track));
    expect(tracks.has('foundations')).toBe(true);
    expect(tracks.has('oop')).toBe(true);
    expect(tracks.has('dsa')).toBe(true);
    expect(tracks.has('advanced_java')).toBe(true);

    // Each track has exactly 3 launch lessons
    expect(lessons.filter((l) => l.track === 'foundations').length).toBe(3);
    expect(lessons.filter((l) => l.track === 'oop').length).toBe(3);
    expect(lessons.filter((l) => l.track === 'dsa').length).toBe(3);
    expect(lessons.filter((l) => l.track === 'advanced_java').length).toBe(3);
  });

  it('filters lessons by track correctly', async () => {
    const foundations = await getLessonsList('foundations');
    expect(foundations.length).toBe(3);
    for (const l of foundations) {
      expect(l.track).toBe('foundations');
    }
  });

  it('retrieves complete lesson detail for primitive-types', async () => {
    const lesson = await getLessonBySlug('primitive-types');
    expect(lesson).not.toBeNull();
    if (!lesson) return;

    expect(lesson.slug).toBe('primitive-types');
    expect(lesson.title).toContain('Primitive');
    expect(lesson.contentSimple).toBeTruthy();
    expect(lesson.contentStandard).toBeTruthy();
    expect(lesson.contentDeep).toBeTruthy();
    expect(lesson.visualization.kind).toBe('array');
    expect(lesson.quiz.length).toBe(5);
    expect(lesson.commonMistakes.length).toBeGreaterThanOrEqual(1);
    expect(lesson.challenge.testCode).toContain('TestHarness');
    expect(lesson.metadata.reviewStatus).toBe('REVIEWED');
  });

  it('returns null for non-existent lesson slug', async () => {
    const lesson = await getLessonBySlug('non-existent-quantum-computing');
    expect(lesson).toBeNull();
  });

  it('evaluates quiz answers correctly and determines passing threshold', async () => {
    const lesson = await getLessonBySlug('primitive-types');
    expect(lesson).not.toBeNull();
    if (!lesson) return;

    // Perfect score: all 5 correct
    const perfectAnswers: Record<string, number> = {};
    for (const q of lesson.quiz) {
      perfectAnswers[q.id] = q.answerIndex;
    }

    const perfectResult = evaluateQuiz(lesson.quiz, perfectAnswers);
    expect(perfectResult.score).toBe(5);
    expect(perfectResult.total).toBe(5);
    expect(perfectResult.passed).toBe(true);
    expect(perfectResult.results.every((r) => r.correct)).toBe(true);

    // Failing score: 2 correct, 3 wrong
    const failingAnswers: Record<string, number> = {};
    lesson.quiz.forEach((q, idx) => {
      failingAnswers[q.id] = idx < 2 ? q.answerIndex : (q.answerIndex + 1) % 4;
    });

    const failingResult = evaluateQuiz(lesson.quiz, failingAnswers);
    expect(failingResult.score).toBe(2);
    expect(failingResult.passed).toBe(false);
  });

  it('assembles multi-part Java source by hoisting imports to top', () => {
    const part1 = `import java.util.List;\nclass A { List<String> list; }`;
    const part2 = `import java.util.Map;\nimport java.util.List;\nclass B { Map<String, String> map; }`;

    const assembled = assembleJavaSource([part1, part2]);
    const lines = assembled.split('\n');

    expect(lines[0]).toMatch(/^import java\.util\.(List|Map);$/);
    expect(lines[1]).toMatch(/^import java\.util\.(List|Map);$/);
    expect(assembled).toContain('class A');
    expect(assembled).toContain('class B');
  });

  it('executes challenge with mock sandbox client', async () => {
    const mock = new MockSandboxClient();

    const result = await runChallenge('primitive-types', 'class Solution {}', mock);
    expect(result.passed).toBe(true);
    expect(result.stdout).toContain('Mock Execution Output');
    expect(result.timeMs).toBe(42);
  });

  it('executes playground code with mock sandbox client', async () => {
    const mock = new MockSandboxClient();

    const result = await runPlaygroundCode('public class Main {}', '21', mock);
    expect(result.passed).toBe(true);
    expect(result.stdout).toContain('Mock Execution Output');
  });

  describe('Lesson Assessment Data Protection & Public DTO Allowlisting', () => {
    it('ensures GET /api/v1/lessons/[slug] strips private assessment data for unauthenticated requests', async () => {
      const req = new NextRequest('http://localhost:3000/api/v1/lessons/primitive-types');
      const res = await handleGetLesson(req, {
        params: Promise.resolve({ slug: 'primitive-types' }),
      });

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.data).toBeDefined();
      const lesson = json.data.lesson;

      expect(lesson.slug).toBe('primitive-types');
      expect(lesson.challenge.prompt).toBeTruthy();
      expect(lesson.challenge.starterCode).toBeTruthy();

      // Assert private assessment fields are not exposed
      expect(lesson.challenge).not.toHaveProperty('solutionCode');
      expect(lesson.challenge).not.toHaveProperty('testCode');
      expect(lesson).not.toHaveProperty('codeSolution');

      // Assert quiz questions do not leak answerIndex or explanation before submission
      expect(lesson.quiz.length).toBe(5);
      for (const q of lesson.quiz) {
        expect(q).toHaveProperty('id');
        expect(q).toHaveProperty('question');
        expect(q).toHaveProperty('options');
        expect(q).not.toHaveProperty('answerIndex');
        expect(q).not.toHaveProperty('explanation');
      }

      // Assert raw JSON payload contains zero references to private fields
      const rawText = JSON.stringify(json);
      expect(rawText).not.toContain('answerIndex');
      expect(rawText).not.toContain('solutionCode');
      expect(rawText).not.toContain('testCode');
    });

    it('ensures GET /api/v1/lessons/[slug] strips private assessment data for authenticated requests', async () => {
      const user = await prisma.user.create({
        data: {
          email: `lesson-tester-${Math.random().toString(36).substring(2)}@example.com`,
          status: 'ACTIVE',
        },
      });
      const tokens = generateSessionTokens();
      await createSessionRow({
        userId: user.id,
        tokenDigest: tokens.tokenDigest,
        publicId: tokens.publicId,
      });

      const req = new NextRequest('http://localhost:3000/api/v1/lessons/primitive-types', {
        headers: {
          cookie: `${SESSION_COOKIE_NAME}=${tokens.rawToken}`,
        },
      });
      const res = await handleGetLesson(req, {
        params: Promise.resolve({ slug: 'primitive-types' }),
      });

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.data).toBeDefined();
      const lesson = json.data.lesson;

      expect(lesson.challenge).not.toHaveProperty('solutionCode');
      expect(lesson.challenge).not.toHaveProperty('testCode');
      expect(lesson).not.toHaveProperty('codeSolution');

      for (const q of lesson.quiz) {
        expect(q).not.toHaveProperty('answerIndex');
        expect(q).not.toHaveProperty('explanation');
      }

      const rawText = JSON.stringify(json);
      expect(rawText).not.toContain('answerIndex');
      expect(rawText).not.toContain('solutionCode');
      expect(rawText).not.toContain('testCode');
    });

    it('ensures quiz submission evaluates against server-side answer keys and reveals explanations only post-submission', async () => {
      const user = await prisma.user.create({
        data: {
          email: `quiz-grader-${Math.random().toString(36).substring(2)}@example.com`,
          status: 'ACTIVE',
        },
      });
      const tokens = generateSessionTokens();
      await createSessionRow({
        userId: user.id,
        tokenDigest: tokens.tokenDigest,
        publicId: tokens.publicId,
      });

      const keys = await getServerKeys();
      const csrfToken = generateSessionCsrfToken(tokens.publicId, keys.csrfHmacKey);

      const lessonRecord = await getLessonBySlug('primitive-types');
      expect(lessonRecord).not.toBeNull();
      const answers: Record<string, number> = {};
      for (const q of lessonRecord!.quiz) {
        answers[q.id] = q.answerIndex;
      }

      // Submit answers using server-side grading
      const req = new NextRequest('http://localhost:3000/api/v1/lessons/primitive-types/quiz', {
        method: 'POST',
        headers: {
          cookie: `${SESSION_COOKIE_NAME}=${tokens.rawToken}`,
          'x-csrf-token': csrfToken,
          'content-type': 'application/json',
          origin: 'http://localhost:3000',
        },
        body: JSON.stringify({ answers }),
      });

      const res = await handleQuizSubmit(req, {
        params: Promise.resolve({ slug: 'primitive-types' }),
      });

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.data).toBeDefined();
      expect(json.data.result.passed).toBe(true);
      expect(json.data.result.score).toBe(5);
      expect(json.data.result.results.length).toBe(5);
      // Explanations are returned post-submission in the evaluation result
      expect(json.data.result.results[0].explanation).toBeTruthy();
    });

    it('ensures challenge grading executes against server-side test code harness', async () => {
      const user = await prisma.user.create({
        data: {
          email: `challenge-grader-${Math.random().toString(36).substring(2)}@example.com`,
          status: 'ACTIVE',
        },
      });
      const tokens = generateSessionTokens();
      await createSessionRow({
        userId: user.id,
        tokenDigest: tokens.tokenDigest,
        publicId: tokens.publicId,
      });

      const keys = await getServerKeys();
      const csrfToken = generateSessionCsrfToken(tokens.publicId, keys.csrfHmacKey);

      const req = new NextRequest(
        'http://localhost:3000/api/v1/lessons/primitive-types/challenge',
        {
          method: 'POST',
          headers: {
            cookie: `${SESSION_COOKIE_NAME}=${tokens.rawToken}`,
            'x-csrf-token': csrfToken,
            'content-type': 'application/json',
            origin: 'http://localhost:3000',
          },
          body: JSON.stringify({
            code: 'public class Solution { public static int add(int a, int b) { return a + b; } }',
          }),
        },
      );

      const res = await handleChallengeSubmit(req, {
        params: Promise.resolve({ slug: 'primitive-types' }),
      });

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.data).toBeDefined();
      expect(json.data.result.passed).toBe(true);
    });
  });
});
