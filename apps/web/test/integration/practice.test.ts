import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import { prisma } from '@javaverse/db';
import {
  getPracticeProblemsList,
  getPracticeProblemBySlug,
  runPracticeCode,
  submitPracticeCode,
} from '@/lib/practice';
import {
  calculateStreak,
  reviewFlashcard,
  recordMistakeFlashcard,
  getDueFlashcards,
  getUserProgressOverview,
} from '@/lib/progress';
import { saveLibraryItem, getLibraryItems } from '@/lib/library';
import { getUserSettings, updateUserSettings, generateUserDataExport } from '@/lib/settings';
import { MockSandboxClient } from '@javaverse/sandbox';

describe('Phase 9: Practice, Progress, Mastery and Rewards Integration', () => {
  let testUserId: string;

  beforeAll(async () => {
    // Seed or get test user
    const user = await prisma.user.upsert({
      where: { email: 'phase9_learner@javaverse.local' },
      update: {},
      create: {
        email: 'phase9_learner@javaverse.local',
        displayName: 'Phase 9 Learner',
        role: 'MEMBER',
      },
    });
    testUserId = user.id;
  });

  it('retrieves all 12 practice problems across 4 topics', async () => {
    const list = await getPracticeProblemsList(testUserId);
    expect(list.length).toBe(12);

    const topics = new Set(list.map((p) => p.topic));
    expect(topics.has('CORE_JAVA')).toBe(true);
    expect(topics.has('OOP')).toBe(true);
    expect(topics.has('DSA')).toBe(true);
    expect(topics.has('ADVANCED_JAVA')).toBe(true);

    // Each topic has 3 problems
    expect(list.filter((p) => p.topic === 'CORE_JAVA').length).toBe(3);
    expect(list.filter((p) => p.topic === 'OOP').length).toBe(3);
    expect(list.filter((p) => p.topic === 'DSA').length).toBe(3);
    expect(list.filter((p) => p.topic === 'ADVANCED_JAVA').length).toBe(3);
  });

  it('filters problems by topic and difficulty', async () => {
    const coreEasy = await getPracticeProblemsList(testUserId, 'CORE_JAVA', 'EASY');
    expect(coreEasy.length).toBeGreaterThan(0);
    for (const p of coreEasy) {
      expect(p.topic).toBe('CORE_JAVA');
      expect(p.difficulty).toBe('EASY');
    }
  });

  it('strictly prevents hidden test leakage on detail fetch', async () => {
    const problem = await getPracticeProblemBySlug('two-sum-array', testUserId);
    expect(problem).not.toBeNull();
    expect(problem?.slug).toBe('two-sum-array');
    expect(problem?.sampleTests.length).toBe(2);

    // CRITICAL: Ensure hiddenTests, solutionCode, and testHarness are NOT present in the returned object
    const untyped = problem as Record<string, unknown>;
    expect(untyped['hiddenTests']).toBeUndefined();
    expect(untyped['solutionCode']).toBeUndefined();
    expect(untyped['testHarness']).toBeUndefined();
  });

  it('runs sample tests via sandbox client', async () => {
    const mock = new MockSandboxClient({
      customHandler: (req) => {
        if (req.code.includes('class Solution')) {
          return {
            stdout: 'TEST_PASSED: sample-1\nTEST_PASSED: sample-2',
            stderr: '',
            exitCode: 0,
            timeMs: 12,
            memoryKb: 1024,
            status: 'SUCCESS',
          };
        }
        return {
          stdout: '',
          stderr: 'Compilation failed',
          exitCode: 1,
          timeMs: 5,
          memoryKb: 0,
          status: 'RUNTIME_ERROR',
        };
      },
    });

    const res = await runPracticeCode('two-sum-array', 'class Solution {}', mock);
    expect(res.passed).toBe(true);
    expect(res.testsPassed).toBe(2);
    expect(res.testsTotal).toBe(2);
  });

  it('submits code and awards XP idempotently on success', async () => {
    await prisma.userProgress.deleteMany({
      where: { userId: testUserId, itemId: 'two-sum-array' },
    });
    await prisma.userReward.deleteMany({ where: { userId: testUserId } });
    await prisma.userBadge.deleteMany({ where: { userId: testUserId } });

    const mock = new MockSandboxClient({
      customHandler: () => ({
        stdout:
          'TEST_PASSED: sample-1\nTEST_PASSED: sample-2\nTEST_PASSED: hidden-1\nTEST_PASSED: hidden-2\nTEST_PASSED: hidden-3',
        stderr: '',
        exitCode: 0,
        timeMs: 15,
        memoryKb: 1024,
        status: 'SUCCESS',
      }),
    });

    // 1st Submission: should award +100 XP
    const sub1 = await submitPracticeCode(testUserId, 'two-sum-array', 'class Solution {}', mock);
    expect(sub1.passed).toBe(true);
    expect(sub1.status).toBe('PASSED');
    expect(sub1.xpAwarded).toBe(100);
    expect(sub1.newlyAwardedBadges).toContain('first_code_run');

    // 2nd Submission of same problem: should award 0 XP (IDEMPOTENT!)
    const sub2 = await submitPracticeCode(testUserId, 'two-sum-array', 'class Solution {}', mock);
    expect(sub2.passed).toBe(true);
    expect(sub2.xpAwarded).toBe(0); // 0 duplicate XP!
  });

  it('calculates streaks correctly', () => {
    const today = '2026-11-06';
    const yesterday = '2026-11-05';
    const threeDaysAgo = '2026-11-03';

    // First activity
    expect(calculateStreak(null, today)).toBe(1);
    // Same day activity -> no increment
    expect(calculateStreak(today, today)).toBe(0);
    // Yesterday activity -> increment by 1
    expect(calculateStreak(yesterday, today)).toBe(1);
    // Missed a day -> reset (-1)
    expect(calculateStreak(threeDaysAgo, today)).toBe(-1);
  });

  it('records flashcards and updates interval via SM-2', async () => {
    await prisma.userFlashcard.deleteMany({ where: { userId: testUserId } });

    await recordMistakeFlashcard(
      testUserId,
      'What is an interface in Java?',
      'A contract specifying method signatures without implementation (prior to default methods).',
      'quiz_mistake',
      'interfaces-abstract',
    );

    const due = await getDueFlashcards(testUserId);
    expect(due.length).toBeGreaterThan(0);
    const card = due.find((c) => c.front.includes('interface in Java'));
    expect(card).toBeDefined();

    if (card) {
      // Review with rating 4 (good recall)
      const reviewResult = await reviewFlashcard(testUserId, card.id, 4);
      expect(reviewResult.intervalDays).toBeGreaterThanOrEqual(1);
      expect(reviewResult.easeFactor).toBeGreaterThan(1.3);
    }
  });

  it('saves, searches, and deletes library bookmarks with private notes', async () => {
    const saved = await saveLibraryItem(testUserId, {
      itemType: 'problem',
      itemId: 'two-sum-array',
      title: 'Two Sum Array Problem Notes',
      notes: 'Remember to use HashMap for O(n) lookup time instead of O(n^2) nested loops.',
      tags: ['arrays', 'hashmap', 'core_java'],
      bookmarked: true,
    });

    expect(saved.bookmarked).toBe(true);
    expect(saved.tags).toContain('hashmap');

    const searchResults = await getLibraryItems(testUserId, 'HashMap');
    expect(searchResults.length).toBeGreaterThan(0);
    expect(searchResults[0]?.title).toBe('Two Sum Array Problem Notes');
  });

  it('retrieves and updates user settings and generates export', async () => {
    const initial = await getUserSettings(testUserId);
    expect(initial).not.toBeNull();

    const updated = await updateUserSettings(testUserId, {
      displayName: 'Master Java Developer',
      theme: 'dark',
      defaultJavaVersion: '21',
      gamificationEnabled: true,
      consentImprove: false,
    });

    expect(updated.displayName).toBe('Master Java Developer');
    expect(updated.theme).toBe('dark');
    expect(updated.defaultJavaVersion).toBe('21');

    const exportData = await generateUserDataExport(testUserId);
    expect(exportData.user).toBeDefined();
    expect(exportData.submissions).toBeDefined();
    expect(exportData.progress).toBeDefined();
  });

  describe('Topic Mastery Calculation and Track Scoping (High Fix 3)', () => {
    let cleanLearnerId: string;

    beforeAll(async () => {
      const u = await prisma.user.upsert({
        where: { email: 'topic_mastery_learner@javaverse.local' },
        update: {},
        create: {
          email: 'topic_mastery_learner@javaverse.local',
          displayName: 'Topic Mastery Learner',
          role: 'MEMBER',
        },
      });
      cleanLearnerId = u.id;
    });

    beforeEach(async () => {
      await prisma.userProgress.deleteMany({ where: { userId: cleanLearnerId } });
      await prisma.userReward.deleteMany({ where: { userId: cleanLearnerId } });
    });

    it('calculates zero progress accurately across all tracks', async () => {
      const overview = await getUserProgressOverview(cleanLearnerId);
      expect(overview.topicMastery).toBeDefined();

      for (const track of ['foundations', 'oop', 'dsa', 'advanced_java']) {
        const stat = overview.topicMastery[track];
        expect(stat).toBeDefined();
        expect(stat?.completedLessons).toBe(0);
        expect(stat?.completedProblems).toBe(0);
        expect(stat?.masteryPercent).toBe(0);
        expect(stat?.tier).toBe('NOVICE');
        expect(stat?.totalLessons).toBeGreaterThan(0);
        expect(stat?.totalProblems).toBeGreaterThan(0);
      }
    });

    it('calculates partial progress correctly', async () => {
      await prisma.userProgress.create({
        data: {
          userId: cleanLearnerId,
          itemType: 'lesson',
          itemId: 'primitive-types:quiz',
          completed: true,
          score: 100,
        },
      });

      const overview = await getUserProgressOverview(cleanLearnerId);
      const foundations = overview.topicMastery['foundations'];
      expect(foundations).toBeDefined();
      expect(foundations?.completedLessons).toBe(1);
      expect(foundations?.completedProblems).toBe(0);
      const expectedTotal = foundations!.totalLessons + foundations!.totalProblems;
      const expectedPercent = Math.round((1 / expectedTotal) * 100);
      expect(foundations?.masteryPercent).toBe(expectedPercent);
      expect(foundations?.masteryPercent).toBeGreaterThan(0);
    });

    it('bounds full progress to exactly 100%', async () => {
      const oopLessons = await prisma.curriculumLesson.findMany({
        where: { track: 'oop', published: true },
        select: { slug: true },
      });
      const oopProblems = await prisma.practiceProblem.findMany({
        where: { topic: 'OOP', published: true },
        select: { slug: true },
      });

      for (const l of oopLessons) {
        await prisma.userProgress.create({
          data: {
            userId: cleanLearnerId,
            itemType: 'lesson',
            itemId: `${l.slug}:quiz`,
            completed: true,
          },
        });
        await prisma.userProgress.create({
          data: {
            userId: cleanLearnerId,
            itemType: 'lesson',
            itemId: `${l.slug}:challenge`,
            completed: true,
          },
        });
      }

      for (const p of oopProblems) {
        await prisma.userProgress.create({
          data: {
            userId: cleanLearnerId,
            itemType: 'problem',
            itemId: p.slug,
            completed: true,
          },
        });
      }

      const overview = await getUserProgressOverview(cleanLearnerId);
      const oop = overview.topicMastery['oop'];
      expect(oop?.completedLessons).toBe(oopLessons.length);
      expect(oop?.completedProblems).toBe(oopProblems.length);
      expect(oop?.masteryPercent).toBe(100);
      expect(oop?.tier).toBe('MASTER');
    });

    it('isolates activity across multiple tracks without cross-topic inflation', async () => {
      await prisma.userProgress.create({
        data: {
          userId: cleanLearnerId,
          itemType: 'lesson',
          itemId: 'primitive-types:quiz',
          completed: true,
        },
      });

      const dsaProblem = await prisma.practiceProblem.findFirst({
        where: { topic: 'DSA', published: true },
        select: { slug: true },
      });
      expect(dsaProblem).not.toBeNull();

      await prisma.userProgress.create({
        data: {
          userId: cleanLearnerId,
          itemType: 'problem',
          itemId: dsaProblem!.slug,
          completed: true,
        },
      });

      const overview = await getUserProgressOverview(cleanLearnerId);

      expect(overview.topicMastery['foundations']?.completedLessons).toBe(1);
      expect(overview.topicMastery['foundations']?.completedProblems).toBe(0);

      expect(overview.topicMastery['dsa']?.completedLessons).toBe(0);
      expect(overview.topicMastery['dsa']?.completedProblems).toBe(1);

      expect(overview.topicMastery['oop']?.completedLessons).toBe(0);
      expect(overview.topicMastery['oop']?.completedProblems).toBe(0);
      expect(overview.topicMastery['advanced_java']?.completedLessons).toBe(0);
      expect(overview.topicMastery['advanced_java']?.completedProblems).toBe(0);
    });

    it('excludes unpublished lessons from totals and completed counts', async () => {
      const unpublishedSlug = `unpublished-test-lesson-${Date.now()}`;
      await prisma.curriculumLesson.create({
        data: {
          slug: unpublishedSlug,
          title: 'Unpublished Lesson Draft',
          track: 'foundations',
          module: 'Module 1',
          orderIndex: 999,
          published: false,
          difficulty: 'EASY',
          hook: 'Draft hook',
          contentSimple: 'Simple',
          contentStandard: 'Standard',
          contentDeep: 'Deep',
          visualization: {},
          codeStarter: 'class Draft {}',
          commonMistakes: [],
          quiz: { questions: [] },
          challenge: { prompt: 'Solve draft', starterCode: '', tests: [] },
          metadata: {},
        },
      });

      try {
        const overviewBefore = await getUserProgressOverview(cleanLearnerId);
        const totalLessonsBefore = overviewBefore.topicMastery['foundations']!.totalLessons;

        await prisma.userProgress.create({
          data: {
            userId: cleanLearnerId,
            itemType: 'lesson',
            itemId: `${unpublishedSlug}:quiz`,
            completed: true,
          },
        });

        const overviewAfter = await getUserProgressOverview(cleanLearnerId);
        expect(overviewAfter.topicMastery['foundations']!.totalLessons).toBe(totalLessonsBefore);
        expect(overviewAfter.topicMastery['foundations']!.completedLessons).toBe(0);
      } finally {
        await prisma.curriculumLesson.deleteMany({ where: { slug: unpublishedSlug } });
      }
    });
  });
});
