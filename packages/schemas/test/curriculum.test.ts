import { describe, it, expect } from 'vitest';
import {
  CurriculumLessonSummarySchema,
  CurriculumLessonDetailSchema,
  PublicCurriculumLessonDetailSchema,
  PublicLessonQuizQuestionSchema,
  PublicLessonChallengeSchema,
  QuizSubmissionSchema,
  QuizResultSchema,
  ChallengeResultSchema,
} from '../src/curriculum';

describe('Curriculum Schemas', () => {
  const validSummary = {
    id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    slug: 'primitive-types',
    title: 'Java Primitive Types & Memory Layout',
    track: 'foundations',
    module: 'Types & Variables',
    orderIndex: 1,
    published: true,
    difficulty: 'EASY',
    estimatedMinutes: 15,
    hook: 'Think of primitive variables as fixed-size personal lockers.',
  };

  const validDetail = {
    ...validSummary,
    contentSimple: '# Primitives\nSimple explanation.',
    contentStandard: '# Standard\nStandard depth explanation.',
    contentDeep: '# Deep\nBytecode and Hotspot internals.',
    visualization: {
      kind: 'array',
      title: 'Primitive Sizes',
      summary: 'Comparison of primitive sizes in memory',
      initial: {
        array: [1, 2, 4, 8],
        highlights: [0],
        pointers: { current: 0 },
        labels: { 0: 'byte', 1: 'short', 2: 'int', 3: 'long' },
      },
      steps: [
        {
          line: 1,
          text: 'byte occupies 1 byte (8 bits)',
          state: {
            array: [1, 2, 4, 8],
            highlights: [0],
            pointers: { current: 0 },
            labels: { 0: 'byte', 1: 'short', 2: 'int', 3: 'long' },
          },
        },
      ],
    },
    codeStarter: 'public class Main { public static void main(String[] args) {} }',
    codeSolution: 'public class Main { public static void main(String[] args) {} }',
    commonMistakes: [
      {
        mistake: 'Integer overflow',
        explanation: 'Multiplication can silently wrap around.',
        badCode: 'int big = 2_000_000_000 * 2;',
        goodCode: 'long big = 2_000_000_000L * 2;',
      },
    ],
    quiz: [
      {
        id: 'q1',
        question: 'How many bits does an int take in Java?',
        options: ['8', '16', '32', '64'],
        answerIndex: 2,
        explanation: 'In Java, an int is always a 32-bit signed two-complement integer.',
      },
      {
        id: 'q2',
        question: 'What is the default value of a boolean field?',
        options: ['true', 'false', 'null', '0'],
        answerIndex: 1,
        explanation: 'Uninitialized boolean fields default to false.',
      },
      {
        id: 'q3',
        question: 'Which of the following is NOT a Java primitive type?',
        options: ['boolean', 'byte', 'String', 'char'],
        answerIndex: 2,
        explanation: 'String is a reference type (class), not a primitive.',
      },
      {
        id: 'q4',
        question: 'What is the value of (byte) 128 in Java?',
        options: ['128', '-128', '0', 'Compilation error'],
        answerIndex: 1,
        explanation: '128 overflows the signed byte range (-128 to 127) and wraps to -128.',
      },
      {
        id: 'q5',
        question: 'Does Java have unsigned primitive types?',
        options: [
          'Yes, all types have unsigned variants',
          'Only char is unsigned',
          'No primitives are unsigned',
          'Only long is unsigned',
        ],
        answerIndex: 1,
        explanation: 'char is a 16-bit unsigned integer type representing UTF-16 code units.',
      },
    ],
    challenge: {
      prompt: 'Check whether adding two integers will cause an overflow.',
      starterCode:
        'public class Solution { public static boolean willOverflow(int a, int b) { return false; } }',
      solutionCode:
        'public class Solution { public static boolean willOverflow(int a, int b) { return (long) a + b > Integer.MAX_VALUE || (long) a + b < Integer.MIN_VALUE; } }',
      testCode:
        'public class Test { public static void main(String[] args) { assert Solution.willOverflow(Integer.MAX_VALUE, 1) == true; } }',
      hints: ['Cast one of the operands to long before addition.'],
    },
    javaVersion: '21',
    metadata: {
      author: 'JavaVerse Editorial',
      license: 'Apache-2.0',
      source: 'Original JavaVerse Content',
      reviewStatus: 'REVIEWED',
      lastReviewedAt: '2026-11-06T00:00:00Z',
    },
  };

  it('validates a correct lesson summary', () => {
    const parsed = CurriculumLessonSummarySchema.parse(validSummary);
    expect(parsed.slug).toBe('primitive-types');
    expect(parsed.track).toBe('foundations');
  });

  it('validates a complete lesson detail with 5 quiz questions', () => {
    const parsed = CurriculumLessonDetailSchema.parse(validDetail);
    expect(parsed.quiz.length).toBe(5);
    expect(parsed.commonMistakes.length).toBe(1);
    expect(parsed.visualization.kind).toBe('array');
  });

  it('rejects lesson detail if quiz does not have exactly 5 questions', () => {
    const invalid = {
      ...validDetail,
      quiz: validDetail.quiz.slice(0, 4),
    };
    expect(() => CurriculumLessonDetailSchema.parse(invalid)).toThrow();
  });

  it('validates quiz submission and results', () => {
    const submission = QuizSubmissionSchema.parse({
      answers: { q1: 2, q2: 1 },
    });
    expect(submission.answers['q1']).toBe(2);

    const result = QuizResultSchema.parse({
      score: 5,
      total: 5,
      passed: true,
      results: [
        { id: 'q1', correct: true, selectedIndex: 2, correctIndex: 2, explanation: 'Correct!' },
      ],
    });
    expect(result.passed).toBe(true);
  });

  it('validates challenge result schema', () => {
    const result = ChallengeResultSchema.parse({
      passed: true,
      stdout: 'All tests passed',
      stderr: '',
      exitCode: 0,
      timeMs: 42,
    });
    expect(result.passed).toBe(true);
    expect(result.exitCode).toBe(0);
  });

  it('validates public lesson detail schema without private assessment data', () => {
    const publicDetail = {
      ...validSummary,
      contentSimple: '# Primitives\nSimple explanation.',
      contentStandard: '# Standard\nStandard depth explanation.',
      contentDeep: '# Deep\nBytecode and Hotspot internals.',
      visualization: validDetail.visualization,
      codeStarter: 'public class Main {}',
      commonMistakes: validDetail.commonMistakes,
      quiz: validDetail.quiz.map((q) => ({
        id: q.id,
        question: q.question,
        options: q.options,
      })),
      challenge: {
        prompt: 'Solve it',
        starterCode: 'class Solution {}',
        hints: ['Hint 1'],
      },
      javaVersion: '21',
      metadata: validDetail.metadata,
    };

    const parsed = PublicCurriculumLessonDetailSchema.parse(publicDetail);
    expect(parsed.slug).toBe('primitive-types');
    expect(PublicLessonQuizQuestionSchema.parse(parsed.quiz[0])).toBeDefined();
    expect(PublicLessonChallengeSchema.parse(parsed.challenge)).toBeDefined();
    expect(parsed.quiz[0]).not.toHaveProperty('answerIndex');
    expect(parsed.quiz[0]).not.toHaveProperty('explanation');
    expect(parsed.challenge).not.toHaveProperty('solutionCode');
    expect(parsed.challenge).not.toHaveProperty('testCode');
    expect(parsed).not.toHaveProperty('codeSolution');
  });
});
