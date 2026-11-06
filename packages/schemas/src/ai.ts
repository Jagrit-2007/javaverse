import { z } from 'zod';

export const VizStepSchema = z.object({
  line: z.number().int().nonnegative().optional(),
  text: z.string().optional(),
  state: z.record(z.string(), z.unknown()).optional(),
});

export const VisualizationSpecSchema = z.object({
  kind: z.string(),
  title: z.string(),
  summary: z.string().optional(),
  initial: z.record(z.string(), z.unknown()).optional(),
  steps: z.array(VizStepSchema).optional(),
});

export const ApproachSchema = z.object({
  name: z.string(),
  pattern: z.string().optional(),
  idea: z.string(),
  steps: z.array(z.string()).optional(),
  time: z.string(),
  space: z.string(),
  pros: z.array(z.string()).optional(),
  cons: z.array(z.string()).optional(),
  recommended: z.boolean().default(false),
});

export const SolutionSchema = z.object({
  code: z.string(),
  explanation: z
    .array(
      z.object({
        fromLine: z.number().int().nonnegative().optional(),
        toLine: z.number().int().nonnegative().optional(),
        text: z.string(),
      }),
    )
    .optional(),
  tests: z
    .array(
      z.object({
        name: z.string(),
        input: z.string(),
        expectedOutput: z.string(),
      }),
    )
    .optional(),
  dryRun: z
    .array(
      z.object({
        step: z.number().int().positive().optional(),
        line: z.number().int().nonnegative().optional(),
        vars: z.record(z.string(), z.unknown()).optional(),
        note: z.string().optional(),
      }),
    )
    .optional(),
});

export const PedagogicalAnalysisSchema = z.object({
  schemaVersion: z.literal(1).default(1),
  meta: z.object({
    topic: z.string(),
    subtopics: z.array(z.string()).default([]),
    difficulty: z
      .enum(['BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'EASY', 'MEDIUM', 'HARD'])
      .default('MEDIUM'),
    questionType: z.string().default('CODING'),
    javaVersion: z.string().default('21'),
    confidence: z.number().min(0).max(1).default(1),
  }),
  understanding: z.object({
    restatement: z.string(),
    inputs: z.array(z.string()).default([]),
    outputs: z.array(z.string()).default([]),
    constraints: z.array(z.string()).default([]),
    examples: z
      .array(
        z.object({
          input: z.string().optional(),
          output: z.string().optional(),
          explanation: z.string().optional(),
        }),
      )
      .default([]),
    edgeCases: z.array(z.string()).default([]),
    assumptions: z.array(z.string()).default([]),
  }),
  prerequisites: z
    .array(
      z.object({
        concept: z.string(),
        explanation: z.string(),
      }),
    )
    .default([]),
  approaches: z.array(ApproachSchema).min(1),
  solution: SolutionSchema,
  visualizations: z.array(VisualizationSpecSchema).default([]),
  pitfalls: z.array(z.string()).default([]),
  followUps: z.array(z.string()).default([]),
  relatedLessons: z.array(z.string()).default([]),
  practice: z
    .array(
      z.object({
        prompt: z.string(),
        difficulty: z.string(),
      }),
    )
    .default([]),
});

export type VizStep = z.infer<typeof VizStepSchema>;
export type VisualizationSpec = z.infer<typeof VisualizationSpecSchema>;
export type Approach = z.infer<typeof ApproachSchema>;
export type Solution = z.infer<typeof SolutionSchema>;
export type PedagogicalAnalysis = z.infer<typeof PedagogicalAnalysisSchema>;
export const JavaVerseResponseSchema = PedagogicalAnalysisSchema;
