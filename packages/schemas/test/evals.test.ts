import { describe, it, expect } from 'vitest';
import {
  FeedbackReportInputSchema,
  KbCandidateActionSchema,
  KbSearchQuerySchema,
  GoldenCaseSchema,
  EvalRunResultSchema,
} from '../src/evals';

describe('Evals and Admin Schemas', () => {
  it('validates valid feedback report input', () => {
    const valid = {
      analysisId: 'a1b2c3d4-e5f6-4a1b-8c2d-3e4f5a6b7c8d',
      issueType: 'INCORRECT_CODE',
      details: 'The solution uses bubble sort instead of quicksort for large inputs.',
    };
    const parsed = FeedbackReportInputSchema.safeParse(valid);
    expect(parsed.success).toBe(true);
  });

  it('rejects feedback report with short details', () => {
    const invalid = {
      issueType: 'OTHER',
      details: 'bad',
    };
    const parsed = FeedbackReportInputSchema.safeParse(invalid);
    expect(parsed.success).toBe(false);
  });

  it('validates candidate approval and rejection actions', () => {
    const approve = { action: 'APPROVE' };
    expect(KbCandidateActionSchema.safeParse(approve).success).toBe(true);

    const reject = { action: 'REJECT', rejectionReason: 'Incomplete explanation' };
    expect(KbCandidateActionSchema.safeParse(reject).success).toBe(true);

    const edit = {
      action: 'EDIT',
      title: 'Updated title',
      anonymizedQuestion: 'How to reverse a string in Java efficiently?',
      verifiedSolution: 'public class Solution {}',
      explanation: 'Detailed explanation here.',
    };
    expect(KbCandidateActionSchema.safeParse(edit).success).toBe(true);
  });

  it('validates knowledge base search queries', () => {
    const parsed = KbSearchQuerySchema.parse({ q: 'binary search tree', limit: '10' });
    expect(parsed.q).toBe('binary search tree');
    expect(parsed.limit).toBe(10);
  });

  it('validates golden evaluation case structure', () => {
    const validCase = {
      id: 'golden-core-01',
      title: 'String Immutability and StringBuilder',
      category: 'CORE_JAVA',
      prompt: 'Explain string immutability and concatenate 1000 strings efficiently.',
      expectedConcepts: ['immutability', 'StringBuilder', 'heap memory'],
      testCode: 'public class Test { public static void main(String[] args) {} }',
      expectedBigO: { time: 'O(n)', space: 'O(n)' },
      expectedVisualizer: 'array',
    };
    const parsed = GoldenCaseSchema.safeParse(validCase);
    expect(parsed.success).toBe(true);
  });

  it('validates evaluation run results schema', () => {
    const validRun = {
      suiteName: 'javaverse-golden-v1',
      model: 'claude-3-5-sonnet',
      promptVersion: '1.0.0',
      totalCases: 50,
      passedCases: 48,
      score: 96,
      details: [
        {
          caseId: 'golden-core-01',
          category: 'CORE_JAVA',
          passed: true,
          failures: [],
          durationMs: 420,
        },
      ],
    };
    const parsed = EvalRunResultSchema.safeParse(validRun);
    expect(parsed.success).toBe(true);
  });
});
