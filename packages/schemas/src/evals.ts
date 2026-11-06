import { z } from 'zod';

export const FeedbackIssueTypeEnum = z.enum([
  'INCORRECT_CODE',
  'CONFUSING_EXPLANATION',
  'BROKEN_VISUALIZATION',
  'POLICY_VIOLATION',
  'OTHER',
]);

export type FeedbackIssueType = z.infer<typeof FeedbackIssueTypeEnum>;

export const FeedbackReportInputSchema = z.object({
  analysisId: z.string().uuid().optional(),
  messageId: z.string().uuid().optional(),
  issueType: FeedbackIssueTypeEnum,
  details: z.string().trim().min(5, 'Details must be at least 5 characters').max(5000),
});

export type FeedbackReportInput = z.infer<typeof FeedbackReportInputSchema>;

export const KbCandidateActionEnum = z.enum(['APPROVE', 'REJECT', 'DEMOTE', 'EDIT']);
export type KbCandidateAction = z.infer<typeof KbCandidateActionEnum>;

export const KbCandidateActionSchema = z.object({
  action: KbCandidateActionEnum,
  title: z.string().trim().min(3).max(255).optional(),
  topic: z.string().trim().min(2).max(64).optional(),
  subtopics: z.array(z.string().trim().min(1).max(64)).optional(),
  anonymizedQuestion: z.string().trim().min(10).optional(),
  verifiedSolution: z.string().trim().min(10).optional(),
  explanation: z.string().trim().min(10).optional(),
  rejectionReason: z.string().trim().max(2000).optional(),
});

export type KbCandidateActionRequest = z.infer<typeof KbCandidateActionSchema>;

export const KbSearchQuerySchema = z.object({
  q: z.string().trim().min(1, 'Search query cannot be empty').max(200),
  topic: z.string().trim().max(64).optional(),
  limit: z.coerce.number().int().min(1).max(20).default(5),
});

export type KbSearchQuery = z.infer<typeof KbSearchQuerySchema>;

export const GoldenCaseCategoryEnum = z.enum(['CORE_JAVA', 'OOP', 'DSA', 'CONCURRENCY']);
export type GoldenCaseCategory = z.infer<typeof GoldenCaseCategoryEnum>;

export const GoldenCaseSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  category: GoldenCaseCategoryEnum,
  prompt: z.string().min(5),
  expectedConcepts: z.array(z.string().min(1)).min(1),
  testCode: z.string().min(10),
  expectedBigO: z.object({
    time: z.string().min(1),
    space: z.string().min(1),
  }),
  expectedVisualizer: z.string().min(1),
});

export type GoldenCase = z.infer<typeof GoldenCaseSchema>;

export const EvalCaseResultSchema = z.object({
  caseId: z.string(),
  category: GoldenCaseCategoryEnum,
  passed: z.boolean(),
  failures: z.array(z.string()),
  durationMs: z.number().int().min(0),
});

export type EvalCaseResult = z.infer<typeof EvalCaseResultSchema>;

export const EvalRunResultSchema = z.object({
  suiteName: z.string().min(1),
  model: z.string().min(1),
  promptVersion: z.string().min(1),
  totalCases: z.number().int().min(1),
  passedCases: z.number().int().min(0),
  score: z.number().min(0).max(100),
  details: z.array(EvalCaseResultSchema),
});

export type EvalRunResult = z.infer<typeof EvalRunResultSchema>;
