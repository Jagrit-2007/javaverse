import { prisma } from '@javaverse/db';
import type { UserProgressOverview, Flashcard, TopicMasteryStat } from '@javaverse/schemas';

export const BADGE_DEFINITIONS: Record<
  string,
  { name: string; description: string; icon: string }
> = {
  first_lesson: {
    name: 'First Steps',
    description: 'Completed your first JavaVerse lesson',
    icon: '🌱',
  },
  first_code_run: {
    name: 'Hello World',
    description: 'Passed all test cases on your first practice problem',
    icon: '⚡',
  },
  problem_solver_5: {
    name: 'Problem Solver',
    description: 'Solved 5 or more Java practice problems',
    icon: '🏆',
  },
  streak_3: {
    name: 'On Fire',
    description: 'Maintained a 3-day active practice streak',
    icon: '🔥',
  },
  java_explorer: {
    name: 'Java Explorer',
    description: 'Completed exercises in Core Java, OOP, DSA, and Advanced Java',
    icon: '🧭',
  },
};

/**
 * Calculates updated streak days based on current UTC date and last activity date
 */
export function calculateStreak(lastActivityDate: string | null, currentUtcDate: string): number {
  if (!lastActivityDate) {
    return 1;
  }
  if (lastActivityDate === currentUtcDate) {
    // Already active today; streak stays same
    return 0; // 0 indicates "no increment"
  }

  const lastDate = new Date(`${lastActivityDate}T00:00:00Z`);
  const currDate = new Date(`${currentUtcDate}T00:00:00Z`);
  const diffDays = Math.round((currDate.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays === 1) {
    // Exactly yesterday -> increment
    return 1;
  }
  // Missed a day or more -> reset to 1
  return -1; // -1 indicates "reset to 1"
}

/**
 * Idempotently awards XP, updates streak, and awards badges when a practice problem is solved
 */
export async function awardPracticeProgressRewards(
  userId: string,
  problemSlug: string,
): Promise<{
  xpAwarded: number;
  newXp: number;
  newLevel: number;
  streakDays: number;
  newlyAwardedBadges: string[];
}> {
  // Atomic insert or conditional update to detect winning completion
  let isNewCompletion = false;
  try {
    await prisma.userProgress.create({
      data: {
        userId,
        itemType: 'problem',
        itemId: problemSlug,
        completed: true,
        score: 100,
        completedAt: new Date(),
        lastAttemptedAt: new Date(),
      },
    });
    isNewCompletion = true;
  } catch (err: unknown) {
    if (
      typeof err === 'object' &&
      err !== null &&
      'code' in err &&
      (err as { code: string }).code === 'P2002'
    ) {
      const updateResult = await prisma.userProgress.updateMany({
        where: {
          userId,
          itemType: 'problem',
          itemId: problemSlug,
          completed: false,
        },
        data: {
          completed: true,
          score: 100,
          completedAt: new Date(),
          lastAttemptedAt: new Date(),
        },
      });
      if (updateResult.count > 0) {
        isNewCompletion = true;
      }
    } else {
      throw err;
    }
  }

  // Fetch or initialize rewards safely under concurrent access
  const rewards = await prisma.userReward.upsert({
    where: { userId },
    create: {
      userId,
      xp: 0,
      streakDays: 0,
      lastActivityDate: null,
    },
    update: {},
  });

  // Calculate streak update
  const todayUtc = new Date().toISOString().slice(0, 10);
  const streakDelta = calculateStreak(rewards.lastActivityDate, todayUtc);
  let nextStreak = rewards.streakDays;
  if (streakDelta === 1) {
    nextStreak = rewards.streakDays + 1;
  } else if (streakDelta === -1) {
    nextStreak = 1;
  } else if (nextStreak === 0) {
    nextStreak = 1;
  }

  // Idempotent XP: only award if not already completed!
  const xpToAdd = isNewCompletion ? 100 : 0;
  let updatedXp = rewards.xp;

  if (isNewCompletion) {
    const updated = await prisma.userReward.update({
      where: { userId },
      data: {
        xp: { increment: 100 },
        streakDays: nextStreak,
        lastActivityDate: todayUtc,
      },
    });
    updatedXp = updated.xp;
  }

  // Evaluate badge awards
  const newlyAwardedBadges: string[] = [];

  async function grantBadge(badgeKey: string) {
    const existing = await prisma.userBadge.findUnique({
      where: {
        userId_badgeKey: {
          userId,
          badgeKey,
        },
      },
    });
    if (!existing) {
      try {
        await prisma.userBadge.create({
          data: {
            userId,
            badgeKey,
          },
        });
        newlyAwardedBadges.push(badgeKey);
      } catch {
        // Unique constraint prevents duplicate badge awards
      }
    }
  }

  // 1. first_code_run
  await grantBadge('first_code_run');

  // 2. streak_3
  if (nextStreak >= 3) {
    await grantBadge('streak_3');
  }

  // 3. problem_solver_5
  const completedCount = await prisma.userProgress.count({
    where: {
      userId,
      itemType: 'problem',
      completed: true,
    },
  });
  if (completedCount >= 5) {
    await grantBadge('problem_solver_5');
  }

  // 4. java_explorer
  const distinctTopics = await prisma.practiceProblem.findMany({
    where: {
      submissions: {
        some: {
          userId,
          status: 'PASSED',
        },
      },
    },
    select: { topic: true },
    distinct: ['topic'],
  });
  if (distinctTopics.length >= 4) {
    await grantBadge('java_explorer');
  }

  return {
    xpAwarded: xpToAdd,
    newXp: updatedXp,
    newLevel: Math.floor(updatedXp / 100) + 1,
    streakDays: nextStreak,
    newlyAwardedBadges,
  };
}

/**
 * Idempotently awards XP when a lesson quiz or challenge is passed
 */
export async function awardLessonProgressRewards(
  userId: string,
  lessonSlug: string,
  type: 'quiz' | 'challenge',
): Promise<{ xpAwarded: number; newlyAwardedBadges: string[] }> {
  const itemKey = `${lessonSlug}:${type}`;

  let isNewCompletion = false;
  try {
    await prisma.userProgress.create({
      data: {
        userId,
        itemType: 'lesson',
        itemId: itemKey,
        completed: true,
        completedAt: new Date(),
        lastAttemptedAt: new Date(),
      },
    });
    isNewCompletion = true;
  } catch (err: unknown) {
    if (
      typeof err === 'object' &&
      err !== null &&
      'code' in err &&
      (err as { code: string }).code === 'P2002'
    ) {
      const updateResult = await prisma.userProgress.updateMany({
        where: {
          userId,
          itemType: 'lesson',
          itemId: itemKey,
          completed: false,
        },
        data: {
          completed: true,
          completedAt: new Date(),
          lastAttemptedAt: new Date(),
        },
      });
      if (updateResult.count > 0) {
        isNewCompletion = true;
      }
    } else {
      throw err;
    }
  }

  if (!isNewCompletion) {
    return { xpAwarded: 0, newlyAwardedBadges: [] };
  }

  const xpEarned = type === 'quiz' ? 25 : 50;

  await prisma.userReward.upsert({
    where: { userId },
    update: {
      xp: { increment: xpEarned },
      lastActivityDate: new Date().toISOString().slice(0, 10),
    },
    create: {
      userId,
      xp: xpEarned,
      streakDays: 1,
      lastActivityDate: new Date().toISOString().slice(0, 10),
    },
  });

  const newlyAwardedBadges: string[] = [];
  try {
    await prisma.userBadge.create({
      data: {
        userId,
        badgeKey: 'first_lesson',
      },
    });
    newlyAwardedBadges.push('first_lesson');
  } catch {
    // Already awarded
  }

  return { xpAwarded: xpEarned, newlyAwardedBadges };
}

/**
 * Fetch complete progress overview: XP, streak, topic mastery map, badges, flashcards
 */
export async function getUserProgressOverview(userId: string): Promise<UserProgressOverview> {
  const rewards = await prisma.userReward.findUnique({
    where: { userId },
  });

  const xp = rewards?.xp ?? 0;
  const level = Math.floor(xp / 100) + 1;
  const streakDays = rewards?.streakDays ?? 0;
  const lastActivityDate = rewards?.lastActivityDate ?? null;
  const gamificationEnabled = rewards?.gamificationEnabled ?? true;

  // Topic mastery calculation
  const topics = ['CORE_JAVA', 'OOP', 'DSA', 'ADVANCED_JAVA'];
  const topicMastery: Record<string, TopicMasteryStat> = {};

  for (const topic of topics) {
    const totalLessons = await prisma.curriculumLesson.count({
      where: { track: topic, published: true },
    });
    const completedLessons = await prisma.userProgress.count({
      where: {
        userId,
        itemType: 'lesson',
        completed: true,
        itemId: { contains: ':' }, // e.g. "primitive-types:quiz"
      },
    });

    const totalProblems = await prisma.practiceProblem.count({
      where: { topic, published: true },
    });
    const completedProblems = await prisma.userProgress.count({
      where: {
        userId,
        itemType: 'problem',
        completed: true,
        itemId: {
          in: (
            await prisma.practiceProblem.findMany({ where: { topic }, select: { slug: true } })
          ).map((p) => p.slug),
        },
      },
    });

    const totalItems = totalLessons + totalProblems;
    const completedItems = Math.min(completedLessons, totalLessons) + completedProblems;
    const masteryPercent =
      totalItems > 0 ? Math.min(100, Math.round((completedItems / totalItems) * 100)) : 0;

    let tier: 'NOVICE' | 'APPRENTICE' | 'PROFICIENT' | 'MASTER' = 'NOVICE';
    if (masteryPercent >= 85) tier = 'MASTER';
    else if (masteryPercent >= 50) tier = 'PROFICIENT';
    else if (masteryPercent >= 25) tier = 'APPRENTICE';

    topicMastery[topic] = {
      completedLessons,
      totalLessons,
      completedProblems,
      totalProblems,
      masteryPercent,
      tier,
    };
  }

  // Badges view
  const userBadges = await prisma.userBadge.findMany({
    where: { userId },
    select: { badgeKey: true, awardedAt: true },
  });
  const awardedMap = new Map(userBadges.map((b) => [b.badgeKey, b.awardedAt.toISOString()]));

  const badges = Object.entries(BADGE_DEFINITIONS).map(([key, def]) => ({
    badgeKey: key,
    name: def.name,
    description: def.description,
    icon: def.icon,
    awardedAt: awardedMap.get(key) || null,
  }));

  // Due flashcards count
  const dueFlashcardsCount = await prisma.userFlashcard.count({
    where: {
      userId,
      nextReviewAt: { lte: new Date() },
    },
  });

  return {
    xp,
    level,
    streakDays,
    lastActivityDate,
    gamificationEnabled,
    topicMastery,
    badges,
    dueFlashcardsCount,
  };
}

/**
 * Fetch flashcards due for spaced repetition review
 */
export async function getDueFlashcards(userId: string): Promise<Flashcard[]> {
  const cards = await prisma.userFlashcard.findMany({
    where: {
      userId,
      nextReviewAt: { lte: new Date() },
    },
    orderBy: { nextReviewAt: 'asc' },
    take: 20,
  });

  return cards.map((c) => ({
    id: c.id,
    front: c.front,
    back: c.back,
    sourceType: c.sourceType,
    intervalDays: c.intervalDays,
    easeFactor: c.easeFactor,
    reviewCount: c.reviewCount,
    nextReviewAt: c.nextReviewAt.toISOString(),
  }));
}

/**
 * SuperMemo SM-2 spaced repetition review handler
 */
export async function reviewFlashcard(
  userId: string,
  cardId: string,
  rating: number,
): Promise<{ nextReviewAt: string; intervalDays: number; easeFactor: number }> {
  const card = await prisma.userFlashcard.findFirst({
    where: { id: cardId, userId },
  });

  if (!card) {
    throw new Error('Flashcard not found');
  }

  let intervalDays = card.intervalDays;
  let easeFactor = card.easeFactor;
  let reviewCount = card.reviewCount;

  if (rating < 3) {
    // Incorrect response: reset to 1 day interval
    intervalDays = 1;
    reviewCount = 0;
  } else {
    // Correct response (rating 3, 4, or 5)
    if (reviewCount === 0) {
      intervalDays = 1;
    } else if (reviewCount === 1) {
      intervalDays = 6;
    } else {
      intervalDays = Math.round(intervalDays * easeFactor);
    }

    // SM-2 Ease Factor calculation
    easeFactor = Math.max(1.3, easeFactor + (0.1 - (5 - rating) * (0.08 + (5 - rating) * 0.02)));
    reviewCount += 1;
  }

  const nextReviewAt = new Date(Date.now() + intervalDays * 24 * 60 * 60 * 1000);

  const updated = await prisma.userFlashcard.update({
    where: { id: cardId },
    data: {
      intervalDays,
      easeFactor,
      reviewCount,
      nextReviewAt,
    },
  });

  return {
    nextReviewAt: updated.nextReviewAt.toISOString(),
    intervalDays: updated.intervalDays,
    easeFactor: updated.easeFactor,
  };
}

/**
 * Adds a flashcard automatically when a learner makes a mistake in a quiz or submission
 */
export async function recordMistakeFlashcard(
  userId: string,
  front: string,
  back: string,
  sourceType: string,
  sourceId: string,
): Promise<void> {
  const existing = await prisma.userFlashcard.findFirst({
    where: {
      userId,
      front,
    },
  });

  if (existing) {
    return;
  }

  await prisma.userFlashcard.create({
    data: {
      userId,
      front,
      back,
      sourceType,
      sourceId,
      intervalDays: 1,
      easeFactor: 2.5,
      reviewCount: 0,
      nextReviewAt: new Date(),
    },
  });
}
