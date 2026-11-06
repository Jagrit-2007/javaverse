import { describe, it, expect } from 'vitest';
import {
  getLessonsList,
  getLessonBySlug,
  evaluateQuiz,
  assembleJavaSource,
  runChallenge,
  runPlaygroundCode,
} from '@/lib/lessons';
import { MockSandboxClient } from '@javaverse/sandbox';

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
});
