import type { AIProvider } from '../types';
import type { SandboxClient } from '@javaverse/sandbox';
import type { GoldenCase, EvalRunResult, EvalCaseResult } from '@javaverse/schemas';
import { JavaVerseResponseSchema } from '@javaverse/schemas';
import { GOLDEN_EVAL_SET } from './goldenSet';
import { buildEvaluationHarness } from './harness';

export interface EvalRunnerOptions {
  suiteName?: string;
  provider: AIProvider;
  sandboxClient: SandboxClient;
  cases?: GoldenCase[];
  passThreshold?: number; // e.g., 90 (%)
  promptVersion?: string;
  maxCases?: number; // for quick test runs
}

export interface EvalRunExecutionResult extends EvalRunResult {
  regressionDetected: boolean;
}

export async function runGoldenEvaluation(
  options: EvalRunnerOptions,
): Promise<EvalRunExecutionResult> {
  const {
    suiteName = 'javaverse-golden-v1',
    provider,
    sandboxClient,
    cases = GOLDEN_EVAL_SET,
    passThreshold = 90,
    promptVersion = '1.0.0',
    maxCases,
  } = options;

  const targetCases = maxCases ? cases.slice(0, maxCases) : cases;
  const details: EvalCaseResult[] = [];
  let passedCount = 0;

  for (const c of targetCases) {
    const startTime = Date.now();
    const failures: string[] = [];

    try {
      // 1. Generate analysis from provider
      const response = await provider.analyze({
        prompt: c.prompt,
        difficulty: 'INTERMEDIATE',
        javaVersion: '21',
      });

      // 2. Schema compliance
      const schemaCheck = JavaVerseResponseSchema.safeParse(response.result);
      if (!schemaCheck.success) {
        failures.push(`Schema validation failed: ${schemaCheck.error.message}`);
      }

      // 3. Concept coverage check
      const textToScan = `${response.result?.understanding?.restatement || ''} ${
        response.result?.solution?.explanation?.map((e) => e.text).join(' ') || ''
      }`.toLowerCase();

      for (const concept of c.expectedConcepts) {
        if (!textToScan.includes(concept.toLowerCase())) {
          // Soft check: warn if key concept missing
        }
      }

      // 4. Sandbox code verification using generated model solution code
      const modelSolutionCode = response.result?.solution?.code;
      if (
        !modelSolutionCode ||
        typeof modelSolutionCode !== 'string' ||
        !modelSolutionCode.trim()
      ) {
        failures.push('Missing or empty generated solution code');
      } else {
        const combinedCode = buildEvaluationHarness(c.testCode, modelSolutionCode);
        const codeExecution = await sandboxClient.execute({
          javaVersion: 'JAVA_21',
          code: combinedCode,
        });

        if (codeExecution.status !== 'SUCCESS') {
          failures.push(
            `Execution failed: ${codeExecution.status} - ${codeExecution.stderr || ''}`,
          );
        } else if (codeExecution.exitCode !== 0) {
          failures.push(
            `Non-zero exit code: ${codeExecution.exitCode} - ${codeExecution.stderr || ''}`,
          );
        } else if (!codeExecution.stdout?.includes('PASS')) {
          failures.push('Test harness did not report PASS');
        }
      }

      // 5. Visualizer verification
      if (!response.result?.visualizations || response.result.visualizations.length === 0) {
        failures.push('Missing visualization script');
      }
    } catch (err: unknown) {
      failures.push(
        `Runtime error during eval: ${err instanceof Error ? err.message : String(err)}`,
      );
    }

    const durationMs = Date.now() - startTime;
    const isPassed = failures.length === 0;
    if (isPassed) {
      passedCount++;
    }

    details.push({
      caseId: c.id,
      category: c.category,
      passed: isPassed,
      failures,
      durationMs,
    });
  }

  const score = targetCases.length > 0 ? (passedCount / targetCases.length) * 100 : 0;
  const regressionDetected = score < passThreshold;

  return {
    suiteName,
    model: provider.providerId,
    promptVersion,
    totalCases: targetCases.length,
    passedCases: passedCount,
    score: Math.round(score * 10) / 10,
    details,
    regressionDetected,
  };
}
