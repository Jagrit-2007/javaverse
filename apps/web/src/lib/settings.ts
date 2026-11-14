import { prisma } from '@javaverse/db';
import type { UserSettings, UpdateUserSettingsRequest } from '@javaverse/schemas';
import { propagateConsentWithdrawal } from './kb';

/**
 * Fetch current user settings, preferences, and gamification state
 */
export async function getUserSettings(userId: string): Promise<UserSettings | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { rewards: true },
  });

  if (!user) {
    return null;
  }

  return {
    displayName: user.displayName,
    email: user.email,
    theme: (user.theme as 'light' | 'dark' | 'system') || 'system',
    defaultJavaVersion: user.defaultJavaVersion || '21',
    consentImprove: user.consentImprove,
    gamificationEnabled: user.rewards?.gamificationEnabled ?? true,
  };
}

/**
 * Update user profile preferences, theme, and gamification toggle
 */
export async function updateUserSettings(
  userId: string,
  data: UpdateUserSettingsRequest,
): Promise<UserSettings> {
  const updateUserData: {
    displayName?: string;
    theme?: string;
    defaultJavaVersion?: string;
    consentImprove?: boolean;
  } = {};

  if (typeof data.displayName !== 'undefined') updateUserData.displayName = data.displayName;
  if (typeof data.theme !== 'undefined') updateUserData.theme = data.theme;
  if (typeof data.defaultJavaVersion !== 'undefined')
    updateUserData.defaultJavaVersion = data.defaultJavaVersion;
  if (typeof data.consentImprove !== 'undefined') {
    updateUserData.consentImprove = data.consentImprove;
    if (data.consentImprove === false) {
      await propagateConsentWithdrawal(userId);
    }
  }

  await prisma.user.update({
    where: { id: userId },
    data: updateUserData,
  });

  if (typeof data.gamificationEnabled !== 'undefined') {
    await prisma.userReward.upsert({
      where: { userId },
      update: { gamificationEnabled: data.gamificationEnabled },
      create: {
        userId,
        gamificationEnabled: data.gamificationEnabled,
      },
    });
  }

  const refreshedUser = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    include: { rewards: true },
  });

  return {
    displayName: refreshedUser.displayName,
    email: refreshedUser.email,
    theme: (refreshedUser.theme as 'light' | 'dark' | 'system') || 'system',
    defaultJavaVersion: refreshedUser.defaultJavaVersion || '21',
    consentImprove: refreshedUser.consentImprove,
    gamificationEnabled: refreshedUser.rewards?.gamificationEnabled ?? true,
  };
}

/**
 * Generates privacy-safe comprehensive user data export package
 */
export async function generateUserDataExport(userId: string): Promise<Record<string, unknown>> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      displayName: true,
      consentImprove: true,
      theme: true,
      defaultJavaVersion: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  const chats = await prisma.chat.findMany({
    where: { userId },
    include: {
      messages: {
        select: {
          id: true,
          role: true,
          content: true,
          createdAt: true,
        },
      },
    },
  });

  const progress = await prisma.userProgress.findMany({
    where: { userId },
  });

  const submissions = await prisma.practiceSubmission.findMany({
    where: { userId },
    select: {
      id: true,
      problemId: true,
      status: true,
      testsPassed: true,
      testsTotal: true,
      code: true,
      createdAt: true,
    },
  });

  const rewards = await prisma.userReward.findUnique({
    where: { userId },
  });

  const badges = await prisma.userBadge.findMany({
    where: { userId },
  });

  const library = await prisma.libraryItem.findMany({
    where: { userId },
  });

  const flashcards = await prisma.userFlashcard.findMany({
    where: { userId },
  });

  return {
    exportDate: new Date().toISOString(),
    user,
    chats,
    progress,
    submissions,
    rewards,
    badges,
    library,
    flashcards,
  };
}
