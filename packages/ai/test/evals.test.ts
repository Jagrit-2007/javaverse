import { describe, it, expect } from 'vitest';
import { GOLDEN_EVAL_SET } from '../src/evals/goldenSet';
import { runGoldenEvaluation } from '../src/evals/runner';
import { MockProvider } from '../src/providers/mock';
import { MockSandboxClient } from '@javaverse/sandbox';

describe('Golden Evaluation Suite and Runner', () => {
  it('contains at least 50 complete golden cases across all required categories', () => {
    expect(GOLDEN_EVAL_SET.length).toBeGreaterThanOrEqual(50);

    const categories = new Set(GOLDEN_EVAL_SET.map((c) => c.category));
    expect(categories.has('CORE_JAVA')).toBe(true);
    expect(categories.has('OOP')).toBe(true);
    expect(categories.has('DSA')).toBe(true);
    expect(categories.has('CONCURRENCY')).toBe(true);

    for (const c of GOLDEN_EVAL_SET) {
      expect(c.id).toBeDefined();
      expect(c.title).toBeDefined();
      expect(c.prompt.length).toBeGreaterThan(5);
      expect(c.expectedConcepts.length).toBeGreaterThan(0);
      expect(c.testCode).toContain('class Harness');
      expect(c.testCode).toContain('PASS');
    }
  });

  it('successfully evaluates sample cases with MockProvider and MockSandbox', async () => {
    const provider = new MockProvider();
    const sandbox = new MockSandboxClient({
      customHandler: () => ({
        status: 'SUCCESS',
        stdout: 'PASS\n',
        stderr: '',
        exitCode: 0,
        timeMs: 45,
        memoryKb: 1024,
      }),
    });

    const result = await runGoldenEvaluation({
      provider,
      sandboxClient: sandbox,
      maxCases: 5,
      passThreshold: 90,
    });

    expect(result.totalCases).toBe(5);
    expect(result.passedCases).toBe(5);
    expect(result.score).toBe(100);
    expect(result.regressionDetected).toBe(false);
  });

  it('detects regression and records failures when code execution fails or schema fails', async () => {
    const provider = new MockProvider();
    const brokenSandbox = new MockSandboxClient({
      customHandler: () => ({
        status: 'COMPILATION_ERROR',
        stdout: '',
        stderr: 'Compilation error: cannot find symbol Solution\n',
        exitCode: 1,
        timeMs: 20,
        memoryKb: 512,
      }),
    });

    const result = await runGoldenEvaluation({
      provider,
      sandboxClient: brokenSandbox,
      maxCases: 3,
      passThreshold: 90,
    });

    expect(result.totalCases).toBe(3);
    expect(result.passedCases).toBe(0);
    expect(result.score).toBe(0);
    expect(result.regressionDetected).toBe(true);
    expect(result.details[0]?.failures.length).toBeGreaterThan(0);
    expect(result.details[0]?.failures[0]).toContain('Execution failed');
  });
});
