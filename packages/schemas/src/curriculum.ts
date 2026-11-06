import { z } from 'zod';
import { VisualizationSpecSchema } from './ai';

export const TrackEnum = z.enum(['foundations', 'oop', 'dsa', 'advanced_java']);
export type Track = z.infer<typeof TrackEnum>;

export const CANONICAL_TRACKS = ['foundations', 'oop', 'dsa', 'advanced_java'] as const;
export type CanonicalTrack = (typeof CANONICAL_TRACKS)[number];

export const TRACK_TOPIC_MAP = {
  foundations: {
    track: 'foundations',
    practiceTopic: 'CORE_JAVA',
    label: 'Core Java',
  },
  oop: {
    track: 'oop',
    practiceTopic: 'OOP',
    label: 'Object-Oriented Programming',
  },
  dsa: {
    track: 'dsa',
    practiceTopic: 'DSA',
    label: 'Data Structures & Algorithms',
  },
  advanced_java: {
    track: 'advanced_java',
    practiceTopic: 'ADVANCED_JAVA',
    label: 'Advanced Java',
  },
} as const;

export const LessonDifficultyEnum = z.enum(['EASY', 'MEDIUM', 'HARD']);
export type LessonDifficulty = z.infer<typeof LessonDifficultyEnum>;

export const LessonQuizQuestionSchema = z.object({
  id: z.string().min(1),
  question: z.string().min(1),
  options: z.array(z.string().min(1)).min(2).max(6),
  answerIndex: z.number().int().min(0),
  explanation: z.string().min(1),
});
export type LessonQuizQuestion = z.infer<typeof LessonQuizQuestionSchema>;

export const PublicLessonQuizQuestionSchema = z.object({
  id: z.string().min(1),
  question: z.string().min(1),
  options: z.array(z.string().min(1)).min(2).max(6),
});
export type PublicLessonQuizQuestion = z.infer<typeof PublicLessonQuizQuestionSchema>;

export const LessonCommonMistakeSchema = z.object({
  mistake: z.string().min(1),
  explanation: z.string().min(1),
  badCode: z.string().optional(),
  goodCode: z.string().optional(),
});
export type LessonCommonMistake = z.infer<typeof LessonCommonMistakeSchema>;

export const LessonChallengeSchema = z.object({
  prompt: z.string().min(1),
  starterCode: z.string().min(1),
  solutionCode: z.string().min(1),
  testCode: z.string().min(1),
  hints: z.array(z.string()).default([]),
});
export type LessonChallenge = z.infer<typeof LessonChallengeSchema>;

export const PublicLessonChallengeSchema = z.object({
  prompt: z.string().min(1),
  starterCode: z.string().min(1),
  hints: z.array(z.string()).default([]),
});
export type PublicLessonChallenge = z.infer<typeof PublicLessonChallengeSchema>;

export const LessonMetadataSchema = z.object({
  author: z.string().min(1),
  license: z.string().min(1),
  source: z.string().min(1),
  reviewStatus: z.enum(['REVIEWED', 'DRAFT']).default('REVIEWED'),
  lastReviewedAt: z.string().min(1),
});
export type LessonMetadata = z.infer<typeof LessonMetadataSchema>;

export const CurriculumLessonSummarySchema = z.object({
  id: z.string().uuid(),
  slug: z.string().min(1),
  title: z.string().min(1),
  track: TrackEnum,
  module: z.string().min(1),
  orderIndex: z.number().int().min(0),
  published: z.boolean(),
  difficulty: LessonDifficultyEnum,
  estimatedMinutes: z.number().int().min(1),
  hook: z.string().min(1),
});
export type CurriculumLessonSummary = z.infer<typeof CurriculumLessonSummarySchema>;

export const CurriculumLessonDetailSchema = CurriculumLessonSummarySchema.extend({
  contentSimple: z.string().min(1),
  contentStandard: z.string().min(1),
  contentDeep: z.string().min(1),
  visualization: VisualizationSpecSchema,
  codeStarter: z.string().min(1),
  codeSolution: z.string().optional(),
  commonMistakes: z.array(LessonCommonMistakeSchema),
  quiz: z.array(LessonQuizQuestionSchema).length(5),
  challenge: LessonChallengeSchema,
  javaVersion: z.string().default('21'),
  metadata: LessonMetadataSchema,
});
export type CurriculumLessonDetail = z.infer<typeof CurriculumLessonDetailSchema>;

export const PublicCurriculumLessonDetailSchema = CurriculumLessonSummarySchema.extend({
  contentSimple: z.string().min(1),
  contentStandard: z.string().min(1),
  contentDeep: z.string().min(1),
  visualization: VisualizationSpecSchema,
  codeStarter: z.string().min(1),
  commonMistakes: z.array(LessonCommonMistakeSchema),
  quiz: z.array(PublicLessonQuizQuestionSchema).length(5),
  challenge: PublicLessonChallengeSchema,
  javaVersion: z.string().default('21'),
  metadata: LessonMetadataSchema,
});
export type PublicCurriculumLessonDetail = z.infer<typeof PublicCurriculumLessonDetailSchema>;

export const QuizSubmissionSchema = z.object({
  answers: z.record(z.string(), z.number().int().min(0)),
});
export type QuizSubmission = z.infer<typeof QuizSubmissionSchema>;

export const QuizQuestionResultSchema = z.object({
  id: z.string(),
  correct: z.boolean(),
  selectedIndex: z.number(),
  correctIndex: z.number(),
  explanation: z.string(),
});

export const QuizResultSchema = z.object({
  score: z.number().int().min(0),
  total: z.number().int().min(0),
  passed: z.boolean(),
  results: z.array(QuizQuestionResultSchema),
});
export type QuizResult = z.infer<typeof QuizResultSchema>;

export const ChallengeSubmissionSchema = z.object({
  code: z.string().min(1),
});
export type ChallengeSubmission = z.infer<typeof ChallengeSubmissionSchema>;

export const ChallengeResultSchema = z.object({
  passed: z.boolean(),
  stdout: z.string(),
  stderr: z.string(),
  exitCode: z.number(),
  timeMs: z.number(),
  error: z.string().optional(),
});
export type ChallengeResult = z.infer<typeof ChallengeResultSchema>;

export const ExecuteCodeSchema = z.object({
  code: z.string().min(1).max(65536),
  javaVersion: z.string().default('JAVA_21'),
});
export type ExecuteCodeRequest = z.infer<typeof ExecuteCodeSchema>;

export { z };
