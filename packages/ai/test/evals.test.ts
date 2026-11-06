import { describe, it, expect } from 'vitest';
import { GOLDEN_EVAL_SET } from '../src/evals/goldenSet';
import { runGoldenEvaluation } from '../src/evals/runner';
import { buildEvaluationHarness } from '../src/evals/harness';
import { MockProvider } from '../src/providers/mock';
import type { AIProvider, AnalysisRequest, AnalysisResponse } from '../src/types';
import { MockSandboxClient } from '@javaverse/sandbox';

class TestCodeProvider implements AIProvider {
  public readonly providerId = 'mock' as const;

  constructor(private solutionCode: string) {}

  async analyze(request: AnalysisRequest): Promise<AnalysisResponse> {
    const mock = new MockProvider();
    const res = await mock.analyze(request);
    return {
      ...res,
      result: {
        ...res.result,
        solution: {
          ...res.result.solution,
          code: this.solutionCode,
        },
      },
    };
  }
}

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

  describe('Model-Generated Code Execution in Evaluations (High Fix 2)', () => {
    const createInspectingSandbox = () =>
      new MockSandboxClient({
        customHandler: (req) => {
          // If request.code does not contain the model code marker, it means static
          // testCode was passed without model code (the old buggy behavior).
          if (!req.code.includes('MODEL_CODE_MARKER')) {
            // Under old implementation this would return PASS, causing false positive!
            return { status: 'SUCCESS', stdout: 'PASS\n', exitCode: 0 };
          }
          if (req.code.includes('INVALID_SYNTAX')) {
            return {
              status: 'COMPILATION_ERROR',
              exitCode: 1,
              stderr: 'javac error: syntax error on line 4',
            };
          }
          if (req.code.includes('FAILING_ASSERTION')) {
            return {
              status: 'RUNTIME_ERROR',
              exitCode: 1,
              stderr: 'java.lang.RuntimeException: Fail 1: expected true but was false',
            };
          }
          if (req.code.includes('THROWS_EXCEPTION')) {
            return {
              status: 'RUNTIME_ERROR',
              exitCode: 1,
              stderr: 'java.lang.NullPointerException: Cannot invoke method',
            };
          }
          if (req.code.includes('INFINITE_LOOP')) {
            return {
              status: 'TIMEOUT',
              exitCode: 124,
              stderr: 'Execution timed out after 5000ms',
            };
          }
          if (req.code.includes('VALID_SOLUTION')) {
            return { status: 'SUCCESS', stdout: 'PASS\n', exitCode: 0 };
          }
          return { status: 'RUNTIME_ERROR', exitCode: 1, stderr: 'Unknown error' };
        },
      });

    it('passes evaluation when model returns valid Java code', async () => {
      const provider = new TestCodeProvider(`
        // MODEL_CODE_MARKER
        // VALID_SOLUTION
        public class Solution {
            public static boolean isPalindrome(String s) {
                return true;
            }
        }
      `);
      const sandbox = createInspectingSandbox();

      const result = await runGoldenEvaluation({
        provider,
        sandboxClient: sandbox,
        maxCases: 1,
      });

      expect(result.passedCases).toBe(1);
      expect(result.score).toBe(100);
      expect(result.regressionDetected).toBe(false);
      expect(result.details[0]?.passed).toBe(true);
      expect(result.details[0]?.failures).toEqual([]);
    });

    it('fails evaluation when model returns invalid Java syntax (compilation error)', async () => {
      const provider = new TestCodeProvider(`
        // MODEL_CODE_MARKER
        // INVALID_SYNTAX
        public class Solution {
            syntax error here !!!
        }
      `);
      const sandbox = createInspectingSandbox();

      const result = await runGoldenEvaluation({
        provider,
        sandboxClient: sandbox,
        maxCases: 1,
      });

      expect(result.passedCases).toBe(0);
      expect(result.score).toBe(0);
      expect(result.regressionDetected).toBe(true);
      expect(result.details[0]?.passed).toBe(false);
      expect(result.details[0]?.failures.some((f) => f.includes('COMPILATION_ERROR'))).toBe(true);
    });

    it('fails evaluation when model returns compilable but incorrect Java (assertion failure)', async () => {
      const provider = new TestCodeProvider(`
        // MODEL_CODE_MARKER
        // FAILING_ASSERTION
        public class Solution {
            public static boolean isPalindrome(String s) {
                return false;
            }
        }
      `);
      const sandbox = createInspectingSandbox();

      const result = await runGoldenEvaluation({
        provider,
        sandboxClient: sandbox,
        maxCases: 1,
      });

      expect(result.passedCases).toBe(0);
      expect(result.score).toBe(0);
      expect(result.regressionDetected).toBe(true);
      expect(result.details[0]?.passed).toBe(false);
      expect(result.details[0]?.failures.some((f) => f.includes('RUNTIME_ERROR'))).toBe(true);
    });

    it('fails evaluation when model returns code that throws a runtime exception', async () => {
      const provider = new TestCodeProvider(`
        // MODEL_CODE_MARKER
        // THROWS_EXCEPTION
        public class Solution {
            public static boolean isPalindrome(String s) {
                throw new NullPointerException();
            }
        }
      `);
      const sandbox = createInspectingSandbox();

      const result = await runGoldenEvaluation({
        provider,
        sandboxClient: sandbox,
        maxCases: 1,
      });

      expect(result.passedCases).toBe(0);
      expect(result.score).toBe(0);
      expect(result.regressionDetected).toBe(true);
      expect(result.details[0]?.passed).toBe(false);
      expect(result.details[0]?.failures.some((f) => f.includes('RUNTIME_ERROR'))).toBe(true);
    });

    it('fails evaluation when model returns code causing timeout (infinite loop)', async () => {
      const provider = new TestCodeProvider(`
        // MODEL_CODE_MARKER
        // INFINITE_LOOP
        public class Solution {
            public static boolean isPalindrome(String s) {
                while (true) {}
            }
        }
      `);
      const sandbox = createInspectingSandbox();

      const result = await runGoldenEvaluation({
        provider,
        sandboxClient: sandbox,
        maxCases: 1,
      });

      expect(result.passedCases).toBe(0);
      expect(result.score).toBe(0);
      expect(result.regressionDetected).toBe(true);
      expect(result.details[0]?.passed).toBe(false);
      expect(result.details[0]?.failures.some((f) => f.includes('TIMEOUT'))).toBe(true);
    });

    it('fails evaluation when model solution code is empty or missing', async () => {
      const provider = new TestCodeProvider('');
      const sandbox = createInspectingSandbox();

      const result = await runGoldenEvaluation({
        provider,
        sandboxClient: sandbox,
        maxCases: 1,
      });

      expect(result.passedCases).toBe(0);
      expect(result.score).toBe(0);
      expect(result.regressionDetected).toBe(true);
      expect(result.details[0]?.passed).toBe(false);
      expect(
        result.details[0]?.failures.some((f) =>
          f.includes('Missing or empty generated solution code'),
        ),
      ).toBe(true);
    });
  });

  describe('buildEvaluationHarness unit tests', () => {
    it('combines test harness and model code while removing duplicate imports and public modifiers', () => {
      const testCode = `
import java.util.List;
import java.util.ArrayList;

public class Harness {
    public static void main(String[] args) {
        System.out.println("PASS");
    }
}
class Solution {
    public static void foo() {}
}
`;
      const modelCode = `
import java.util.List;
import java.util.Map;

public class Solution {
    public static void foo() {
        System.out.println("custom model");
    }
}
`;
      const harness = buildEvaluationHarness(testCode, modelCode);
      expect(harness).toContain('import java.util.ArrayList;');
      expect(harness).toContain('import java.util.List;');
      expect(harness).toContain('import java.util.Map;');
      expect(harness).toContain('public class Harness');
      expect(harness).toContain('class Solution');
      // Public class Solution was stripped to package-private class Solution
      expect(harness).not.toMatch(/public\s+class\s+Solution/);
      expect(harness).toContain('custom model');
    });

    it('strips markdown fences from model code', () => {
      const testCode = `
public class Harness {
    public static void main(String[] args) {
        System.out.println("PASS");
    }
}
`;
      const modelCode = '```java\nclass Solution {}\n```';
      const harness = buildEvaluationHarness(testCode, modelCode);
      expect(harness).not.toContain('```');
      expect(harness).toContain('class Solution');
    });

    it('preserves non-solution support fixtures when not defined in model', () => {
      const testCode = `
public class Harness {
    public static void main(String[] args) {
        ListNode n = new ListNode();
    }
}
class ListNode {
    int val;
}
class Solution {
    public static void solve() {}
}
`;
      const modelCode = `
class Solution {
    public static void solve() {
        // model solution
    }
}
`;
      const harness = buildEvaluationHarness(testCode, modelCode);
      expect(harness).toContain('class ListNode');
      expect(harness).toContain('model solution');
    });

    it('throws if model code is completely empty or whitespace', () => {
      const testCode = `public class Harness { public static void main(String[] args) {} }`;
      expect(() => buildEvaluationHarness(testCode, '')).toThrow(
        'Model solution code must not be empty',
      );
      expect(() => buildEvaluationHarness(testCode, '   \n  ')).toThrow(
        'Model solution code must not be empty',
      );
    });
  });
});
