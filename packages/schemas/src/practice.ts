import { z } from 'zod';

export const TestCaseSchema = z.object({
  id: z.string(),
  name: z.string(),
  input: z.string(),
  expectedOutput: z.string(),
});
export type TestCase = z.infer<typeof TestCaseSchema>;

export const PracticeProblemSummarySchema = z.object({
  id: z.string().uuid(),
  slug: z.string(),
  title: z.string(),
  topic: z.enum(['CORE_JAVA', 'OOP', 'DSA', 'ADVANCED_JAVA']),
  difficulty: z.enum(['EASY', 'MEDIUM', 'HARD']),
  orderIndex: z.number().int(),
  published: z.boolean(),
  isCompleted: z.boolean().optional(),
});
export type PracticeProblemSummary = z.infer<typeof PracticeProblemSummarySchema>;

export const PracticeProblemDetailSchema = PracticeProblemSummarySchema.extend({
  prompt: z.string(),
  starterCode: z.string(),
  sampleTests: z.array(TestCaseSchema),
  hints: z.array(z.string()),
});
export type PracticeProblemDetail = z.infer<typeof PracticeProblemDetailSchema>;

export const RunProblemRequestSchema = z.object({
  code: z.string().min(1, 'Code cannot be empty').max(50000, 'Code too large'),
});
export type RunProblemRequest = z.infer<typeof RunProblemRequestSchema>;

export const SubmitProblemRequestSchema = z.object({
  code: z.string().min(1, 'Code cannot be empty').max(50000, 'Code too large'),
});
export type SubmitProblemRequest = z.infer<typeof SubmitProblemRequestSchema>;

export const TestCaseResultSchema = z.object({
  id: z.string(),
  name: z.string(),
  passed: z.boolean(),
  input: z.string(),
  expectedOutput: z.string(),
  actualOutput: z.string().optional(),
  error: z.string().optional(),
});
export type TestCaseResult = z.infer<typeof TestCaseResultSchema>;

export const RunProblemResponseSchema = z.object({
  passed: z.boolean(),
  testsPassed: z.number().int(),
  testsTotal: z.number().int(),
  testResults: z.array(TestCaseResultSchema),
  stdout: z.string(),
  stderr: z.string(),
  timeMs: z.number().int(),
});
export type RunProblemResponse = z.infer<typeof RunProblemResponseSchema>;

export const SubmitProblemResponseSchema = z.object({
  submissionId: z.string().uuid(),
  status: z.enum(['PASSED', 'FAILED', 'ERROR', 'TIMEOUT']),
  passed: z.boolean(),
  testsPassed: z.number().int(),
  testsTotal: z.number().int(),
  testResults: z.array(TestCaseResultSchema),
  stdout: z.string(),
  stderr: z.string(),
  timeMs: z.number().int(),
  xpAwarded: z.number().int(),
  newXp: z.number().int(),
  newLevel: z.number().int(),
  streakDays: z.number().int(),
  newlyAwardedBadges: z.array(z.string()),
});
export type SubmitProblemResponse = z.infer<typeof SubmitProblemResponseSchema>;

export const TopicMasteryStatSchema = z.object({
  completedLessons: z.number().int(),
  totalLessons: z.number().int(),
  completedProblems: z.number().int(),
  totalProblems: z.number().int(),
  masteryPercent: z.number().int().min(0).max(100),
  tier: z.enum(['NOVICE', 'APPRENTICE', 'PROFICIENT', 'MASTER']),
});
export type TopicMasteryStat = z.infer<typeof TopicMasteryStatSchema>;

export const UserBadgeViewSchema = z.object({
  badgeKey: z.string(),
  name: z.string(),
  description: z.string(),
  icon: z.string(),
  awardedAt: z.string().nullable(),
});
export type UserBadgeView = z.infer<typeof UserBadgeViewSchema>;

export const UserProgressOverviewSchema = z.object({
  xp: z.number().int(),
  level: z.number().int(),
  streakDays: z.number().int(),
  lastActivityDate: z.string().nullable(),
  gamificationEnabled: z.boolean(),
  topicMastery: z.record(z.string(), TopicMasteryStatSchema),
  badges: z.array(UserBadgeViewSchema),
  dueFlashcardsCount: z.number().int(),
});
export type UserProgressOverview = z.infer<typeof UserProgressOverviewSchema>;

export const FlashcardSchema = z.object({
  id: z.string().uuid(),
  front: z.string(),
  back: z.string(),
  sourceType: z.string().nullable().optional(),
  intervalDays: z.number().int(),
  easeFactor: z.number(),
  reviewCount: z.number().int(),
  nextReviewAt: z.string(),
});
export type Flashcard = z.infer<typeof FlashcardSchema>;

export const FlashcardReviewRequestSchema = z.object({
  rating: z.number().int().min(0).max(5),
});
export type FlashcardReviewRequest = z.infer<typeof FlashcardReviewRequestSchema>;

export const LibraryItemSchema = z.object({
  id: z.string().uuid(),
  itemType: z.enum(['analysis', 'lesson', 'problem']),
  itemId: z.string(),
  title: z.string(),
  notes: z.string().nullable(),
  tags: z.array(z.string()),
  bookmarked: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type LibraryItem = z.infer<typeof LibraryItemSchema>;

export const SaveLibraryItemRequestSchema = z.object({
  itemType: z.enum(['analysis', 'lesson', 'problem']),
  itemId: z.string().min(1),
  title: z.string().min(1).max(255),
  notes: z.string().max(10000).optional(),
  tags: z.array(z.string().max(32)).max(10).optional(),
  bookmarked: z.boolean().optional(),
});
export type SaveLibraryItemRequest = z.infer<typeof SaveLibraryItemRequestSchema>;

export const UserSettingsSchema = z.object({
  displayName: z.string().nullable(),
  email: z.string().email(),
  role: z.string(),
  theme: z.enum(['light', 'dark', 'system']),
  defaultJavaVersion: z.string(),
  consentImprove: z.boolean(),
  gamificationEnabled: z.boolean(),
});
export type UserSettings = z.infer<typeof UserSettingsSchema>;

export const UpdateUserSettingsRequestSchema = z.object({
  displayName: z.string().max(64).optional(),
  theme: z.enum(['light', 'dark', 'system']).optional(),
  defaultJavaVersion: z.enum(['8', '11', '17', '21', '25']).optional(),
  consentImprove: z.boolean().optional(),
  gamificationEnabled: z.boolean().optional(),
});
export type UpdateUserSettingsRequest = z.infer<typeof UpdateUserSettingsRequestSchema>;
