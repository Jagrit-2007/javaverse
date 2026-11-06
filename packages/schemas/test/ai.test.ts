import { describe, it, expect } from 'vitest';
import { PedagogicalAnalysisSchema, AnalysisJobDataSchema } from '../src/ai';

describe('PedagogicalAnalysisSchema', () => {
  const validAnalysis = {
    schemaVersion: 1,
    meta: {
      topic: 'DSA',
      subtopics: ['Binary Search', 'Arrays'],
      difficulty: 'MEDIUM',
      questionType: 'CODING',
      javaVersion: '21',
      confidence: 0.95,
    },
    understanding: {
      restatement: 'Find index of target in sorted array.',
      inputs: ['int[] arr', 'int target'],
      outputs: ['int index'],
      constraints: ['O(log N) time', 'O(1) space'],
      examples: [{ input: 'arr=[1,3,5], target=3', output: '1', explanation: 'Found at index 1' }],
      edgeCases: ['Empty array', 'Single element'],
      assumptions: ['Array is sorted in ascending order'],
    },
    prerequisites: [{ concept: 'Array indexing', explanation: 'Direct memory addressing' }],
    approaches: [
      {
        name: 'Binary Search',
        pattern: 'Divide and Conquer',
        idea: 'Repeatedly halve the search interval',
        steps: ['Initialize low and high', 'Calculate mid', 'Compare and narrow'],
        time: 'O(log N)',
        space: 'O(1)',
        pros: ['Logarithmic complexity'],
        cons: ['Requires sorted array'],
        recommended: true,
      },
    ],
    solution: {
      code: 'public class Solution { public static int search(int[] nums, int target) { return 0; } }',
      explanation: [{ fromLine: 1, toLine: 1, text: 'Method declaration' }],
      tests: [{ name: 'Test 1', input: 'arr=[1,2], target=2', expectedOutput: '1' }],
      dryRun: [{ step: 1, line: 1, vars: { low: 0, high: 1 }, note: 'Initial setup' }],
    },
    visualizations: [
      {
        kind: 'array',
        title: 'Binary Search Step-by-Step',
        summary: 'Pointers converging on target',
        initial: { data: [1, 2, 3] },
        steps: [{ line: 1, text: 'Init low=0, high=2', state: { low: 0, high: 2 } }],
      },
    ],
    pitfalls: ['Integer overflow on (low + high) / 2'],
    followUps: ['Search in rotated sorted array'],
    relatedLessons: ['binary-search', 'arrays'],
    practice: [
      { prompt: 'Find first and last position of element in sorted array', difficulty: 'MEDIUM' },
    ],
  };

  it('validates a complete pedagogical analysis successfully', () => {
    const parsed = PedagogicalAnalysisSchema.parse(validAnalysis);
    expect(parsed.schemaVersion).toBe(1);
    expect(parsed.meta.topic).toBe('DSA');
    expect(parsed.approaches.length).toBe(1);
    expect(parsed.approaches[0]?.recommended).toBe(true);
  });

  it('rejects analysis missing required approaches', () => {
    const invalid = { ...validAnalysis, approaches: [] };
    expect(() => PedagogicalAnalysisSchema.parse(invalid)).toThrow();
  });

  it('rejects analysis with invalid schema version', () => {
    const invalid = { ...validAnalysis, schemaVersion: 2 };
    expect(() => PedagogicalAnalysisSchema.parse(invalid)).toThrow();
  });

  describe('AnalysisJobDataSchema', () => {
    it('validates a correct job payload with UUIDs and correlation ID', () => {
      const payload = {
        jobId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
        chatId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12',
        userId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a13',
        messageId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a14',
        correlationId: 'corr-12345',
      };
      const parsed = AnalysisJobDataSchema.parse(payload);
      expect(parsed.jobId).toBe(payload.jobId);
      expect(parsed.messageId).toBe(payload.messageId);
    });

    it('rejects payload missing messageId or non-UUID format', () => {
      const invalid = {
        jobId: 'not-a-uuid',
        chatId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12',
        userId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a13',
        correlationId: 'corr-12345',
      };
      expect(() => AnalysisJobDataSchema.parse(invalid)).toThrow();
    });
  });
});
