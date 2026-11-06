import { prisma } from '@javaverse/db';
import { getSandboxClient, type SandboxClient } from '@javaverse/sandbox';
import type {
  PracticeProblemSummary,
  PracticeProblemDetail,
  TestCaseResult,
  RunProblemResponse,
  SubmitProblemResponse,
} from '@javaverse/schemas';
import { assembleJavaSource } from './lessons';
import { awardPracticeProgressRewards } from './progress';

/**
 * Fetch list of published practice problems with optional filters and user completion state
 */
export async function getPracticeProblemsList(
  userId?: string,
  topic?: string,
  difficulty?: string,
  status?: string,
): Promise<PracticeProblemSummary[]> {
  const whereClause: {
    published: boolean;
    topic?: string;
    difficulty?: string;
  } = {
    published: true,
    ...(topic && topic !== 'ALL' ? { topic } : {}),
    ...(difficulty && difficulty !== 'ALL' ? { difficulty } : {}),
  };

  const problems = await prisma.practiceProblem.findMany({
    where: whereClause,
    orderBy: [{ topic: 'asc' }, { orderIndex: 'asc' }],
    select: {
      id: true,
      slug: true,
      title: true,
      topic: true,
      difficulty: true,
      orderIndex: true,
      published: true,
    },
  });

  let completedSlugs = new Set<string>();
  if (userId) {
    const completions = await prisma.userProgress.findMany({
      where: {
        userId,
        itemType: 'problem',
        completed: true,
      },
      select: { itemId: true },
    });
    completedSlugs = new Set(completions.map((c) => c.itemId));
  }

  const results: PracticeProblemSummary[] = problems.map((p) => ({
    id: p.id,
    slug: p.slug,
    title: p.title,
    topic: p.topic as 'CORE_JAVA' | 'OOP' | 'DSA' | 'ADVANCED_JAVA',
    difficulty: p.difficulty as 'EASY' | 'MEDIUM' | 'HARD',
    orderIndex: p.orderIndex,
    published: p.published,
    ...(userId ? { isCompleted: completedSlugs.has(p.slug) } : {}),
  }));

  if (status === 'COMPLETED') {
    return results.filter((p) => p.isCompleted);
  }
  if (status === 'UNSOLVED') {
    return results.filter((p) => !p.isCompleted);
  }

  return results;
}

/**
 * Fetch public problem detail by slug, strictly omitting hidden tests and test harness
 */
export async function getPracticeProblemBySlug(
  slug: string,
  userId?: string,
): Promise<PracticeProblemDetail | null> {
  const problem = await prisma.practiceProblem.findUnique({
    where: { slug },
  });

  if (!problem || !problem.published) {
    return null;
  }

  let isCompleted = false;
  if (userId) {
    const progress = await prisma.userProgress.findUnique({
      where: {
        userId_itemType_itemId: {
          userId,
          itemType: 'problem',
          itemId: slug,
        },
      },
    });
    isCompleted = Boolean(progress?.completed);
  }

  return {
    id: problem.id,
    slug: problem.slug,
    title: problem.title,
    topic: problem.topic as 'CORE_JAVA' | 'OOP' | 'DSA' | 'ADVANCED_JAVA',
    difficulty: problem.difficulty as 'EASY' | 'MEDIUM' | 'HARD',
    orderIndex: problem.orderIndex,
    published: problem.published,
    prompt: problem.prompt,
    starterCode: problem.starterCode,
    sampleTests: problem.sampleTests as unknown as PracticeProblemDetail['sampleTests'],
    hints: problem.hints as unknown as string[],
    isCompleted,
  };
}

/**
 * Execute code against sample test cases only
 */
export async function runPracticeCode(
  slug: string,
  userCode: string,
  sandboxClient?: SandboxClient,
): Promise<RunProblemResponse> {
  const problem = await prisma.practiceProblem.findUnique({
    where: { slug },
  });

  if (!problem) {
    return {
      passed: false,
      testsPassed: 0,
      testsTotal: 0,
      testResults: [],
      stdout: '',
      stderr: 'Problem not found',
      timeMs: 0,
    };
  }

  const client = sandboxClient || getSandboxClient();
  const assembled = assembleJavaSource([problem.testHarness, userCode]);

  const res = await client.execute({
    code: assembled,
    javaVersion: 'JAVA_21',
    timeoutMs: 5000,
  });

  const sampleTests = problem.sampleTests as Array<{
    id: string;
    name: string;
    input: string;
    expectedOutput: string;
  }>;
  const testResults: TestCaseResult[] = sampleTests.map((t) => {
    const passed = res.stdout.includes(`TEST_PASSED: ${t.id}`);
    const failureMatch = res.stderr.match(new RegExp(`TEST_FAILED:\\s*${t.id}\\s*(.*)`));
    return {
      id: t.id,
      name: t.name,
      passed,
      input: t.input,
      expectedOutput: t.expectedOutput,
      ...(failureMatch ? { error: failureMatch[1]?.trim() } : {}),
    };
  });

  const testsPassed = testResults.filter((r) => r.passed).length;
  const testsTotal = testResults.length;
  const allPassed = testsTotal > 0 && testsPassed === testsTotal && res.status === 'SUCCESS';

  return {
    passed: allPassed,
    testsPassed,
    testsTotal,
    testResults,
    stdout: res.stdout,
    stderr: res.stderr,
    timeMs: res.timeMs,
  };
}

/**
 * Submit code for full evaluation against both sample and hidden test cases
 */
export async function submitPracticeCode(
  userId: string,
  slug: string,
  userCode: string,
  sandboxClient?: SandboxClient,
): Promise<SubmitProblemResponse> {
  const problem = await prisma.practiceProblem.findUnique({
    where: { slug },
  });

  if (!problem) {
    throw new Error('Problem not found');
  }

  const client = sandboxClient || getSandboxClient();
  const assembled = assembleJavaSource([problem.testHarness, userCode]);

  const res = await client.execute({
    code: assembled,
    javaVersion: 'JAVA_21',
    timeoutMs: 8000,
  });

  const sampleTests = problem.sampleTests as Array<{
    id: string;
    name: string;
    input: string;
    expectedOutput: string;
  }>;
  const hiddenTests = problem.hiddenTests as Array<{
    id: string;
    name: string;
    input: string;
    expectedOutput: string;
  }>;
  const allTests = [...sampleTests, ...hiddenTests];

  const testResults: TestCaseResult[] = allTests.map((t) => {
    const passed = res.stdout.includes(`TEST_PASSED: ${t.id}`);
    const failureMatch = res.stderr.match(new RegExp(`TEST_FAILED:\\s*${t.id}\\s*(.*)`));
    return {
      id: t.id,
      name: t.name,
      passed,
      input: t.input,
      expectedOutput: t.expectedOutput,
      ...(failureMatch ? { error: failureMatch[1]?.trim() } : {}),
    };
  });

  const testsPassed = testResults.filter((r) => r.passed).length;
  const testsTotal = testResults.length;
  const passed = testsTotal > 0 && testsPassed === testsTotal && res.status === 'SUCCESS';

  let submissionStatus: 'PASSED' | 'FAILED' | 'ERROR' | 'TIMEOUT' = 'FAILED';
  if (res.status === 'TIMEOUT') {
    submissionStatus = 'TIMEOUT';
  } else if (res.status !== 'SUCCESS') {
    submissionStatus = 'ERROR';
  } else if (passed) {
    submissionStatus = 'PASSED';
  }

  // Record submission
  const submission = await prisma.practiceSubmission.create({
    data: {
      userId,
      problemId: problem.id,
      code: userCode,
      status: submissionStatus,
      testsPassed,
      testsTotal,
      timeMs: res.timeMs,
      stdout: res.stdout.slice(0, 5000),
      stderr: res.stderr.slice(0, 5000),
    },
  });

  let rewardInfo = {
    xpAwarded: 0,
    newXp: 0,
    newLevel: 1,
    streakDays: 0,
    newlyAwardedBadges: [] as string[],
  };

  if (passed) {
    rewardInfo = await awardPracticeProgressRewards(userId, slug);
  }

  return {
    submissionId: submission.id,
    status: submissionStatus,
    passed,
    testsPassed,
    testsTotal,
    testResults,
    stdout: res.stdout,
    stderr: res.stderr,
    timeMs: res.timeMs,
    xpAwarded: rewardInfo.xpAwarded,
    newXp: rewardInfo.newXp,
    newLevel: rewardInfo.newLevel,
    streakDays: rewardInfo.streakDays,
    newlyAwardedBadges: rewardInfo.newlyAwardedBadges,
  };
}
