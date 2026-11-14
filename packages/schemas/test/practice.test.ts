import { describe, it, expect } from 'vitest';
import {
  PracticeProblemSummarySchema,
  PracticeProblemDetailSchema,
  RunProblemRequestSchema,
  SubmitProblemRequestSchema,
  FlashcardReviewRequestSchema,
  UpdateUserSettingsRequestSchema,
} from '../src/practice';

describe('Practice and Progress Schemas', () => {
  it('validates a valid practice problem summary', () => {
    const summary = {
      id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
      slug: 'two-sum-array',
      title: 'Two Sum Array',
      topic: 'CORE_JAVA' as const,
      difficulty: 'EASY' as const,
      orderIndex: 1,
      published: true,
      isCompleted: false,
    };
    const res = PracticeProblemSummarySchema.safeParse(summary);
    expect(res.success).toBe(true);
  });

  it('rejects invalid difficulty or topic', () => {
    const summary = {
      id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
      slug: 'two-sum-array',
      title: 'Two Sum Array',
      topic: 'INVALID_TOPIC',
      difficulty: 'SUPER_HARD',
      orderIndex: 1,
      published: true,
    };
    const res = PracticeProblemSummarySchema.safeParse(summary);
    expect(res.success).toBe(false);
  });

  it('validates detail schema with sample tests and hints', () => {
    const detail = {
      id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
      slug: 'palindrome-number',
      title: 'Palindrome Number',
      topic: 'CORE_JAVA' as const,
      difficulty: 'EASY' as const,
      orderIndex: 2,
      published: true,
      prompt: 'Is it a palindrome?',
      starterCode: 'class Solution {}',
      sampleTests: [{ id: 'sample-1', name: 'Sample 1', input: '121', expectedOutput: 'true' }],
      hints: ['Hint 1', 'Hint 2'],
    };
    const res = PracticeProblemDetailSchema.safeParse(detail);
    expect(res.success).toBe(true);
  });

  it('validates run and submit requests', () => {
    expect(RunProblemRequestSchema.safeParse({ code: 'class Solution {}' }).success).toBe(true);
    expect(RunProblemRequestSchema.safeParse({ code: '' }).success).toBe(false);
    expect(SubmitProblemRequestSchema.safeParse({ code: 'class Solution {}' }).success).toBe(true);
    expect(SubmitProblemRequestSchema.safeParse({ code: '' }).success).toBe(false);
  });

  it('validates flashcard review rating 0-5', () => {
    expect(FlashcardReviewRequestSchema.safeParse({ rating: 4 }).success).toBe(true);
    expect(FlashcardReviewRequestSchema.safeParse({ rating: 0 }).success).toBe(true);
    expect(FlashcardReviewRequestSchema.safeParse({ rating: 5 }).success).toBe(true);
    expect(FlashcardReviewRequestSchema.safeParse({ rating: 6 }).success).toBe(false);
    expect(FlashcardReviewRequestSchema.safeParse({ rating: -1 }).success).toBe(false);
  });

  it('validates user settings update request', () => {
    const valid = {
      displayName: 'Java Ninja',
      theme: 'dark' as const,
      defaultJavaVersion: '21' as const,
      gamificationEnabled: false,
    };
    expect(UpdateUserSettingsRequestSchema.safeParse(valid).success).toBe(true);
    expect(UpdateUserSettingsRequestSchema.safeParse({ theme: 'neon' }).success).toBe(false);
  });
});
