import { describe, it, expect, beforeEach } from 'vitest';
import { prisma } from '@javaverse/db';
import {
  proposeKbCandidate,
  reviewKbCandidate,
  searchKnowledgeBase,
  propagateConsentWithdrawal,
} from '@/lib/kb';
import { submitFeedbackReport, resolveFeedbackReport, listFeedbackReports } from '@/lib/feedback';
import { runGoldenEvaluation } from '@javaverse/ai';
import { MockProvider } from '@javaverse/ai';
import { MockSandboxClient } from '@javaverse/sandbox';

describe('Phase 10: KB, Feedback, and Evals Integration', () => {
  let consentedUser: any;
  let nonConsentedUser: any;
  let reviewerUser: any;
  let verifiedAnalysis: any;
  let unverifiedAnalysis: any;

  beforeEach(async () => {
    // 1. Create test users
    consentedUser = await prisma.user.create({
      data: {
        email: `consented-${Date.now()}@test.local`,
        displayName: 'Consented Learner',
        consentImprove: true,
      },
    });

    nonConsentedUser = await prisma.user.create({
      data: {
        email: `non-consented-${Date.now()}@test.local`,
        displayName: 'Private Learner',
        consentImprove: false,
      },
    });

    reviewerUser = await prisma.user.create({
      data: {
        email: `reviewer-${Date.now()}@test.local`,
        displayName: 'Reviewer User',
      },
    });

    // 2. Create chats and messages
    const chat = await prisma.chat.create({
      data: {
        userId: consentedUser.id,
        slot: 1,
        title: 'Java Test Chat',
      },
    });

    const msg = await prisma.message.create({
      data: {
        chatId: chat.id,
        role: 'ASSISTANT',
        content: 'Please contact me at admin@secretcorp.com. Here is the solution.',
      },
    });

    // 3. Create verified and unverified analyses
    verifiedAnalysis = await prisma.analysis.create({
      data: {
        messageId: msg.id,
        modelId: 'mock-model',
        promptVersion: '1.0.0',
        verificationStatus: 'VERIFIED_CORRECT',
        result: {
          meta: { topic: 'CORE_JAVA', subtopics: ['Strings'] },
          understanding: { restatement: 'How to reverse a string efficiently in Java' },
          solution: {
            code: 'public class Solution { public static String reverse(String s) { return new StringBuilder(s).reverse().toString(); } }',
            explanation: [
              {
                text: 'Use StringBuilder for in-place reverse. Contact john.doe@javaverse.local if errors occur.',
              },
            ],
          },
          visualizations: [{ kind: 'array', title: 'String Reversal' }],
        },
      },
    });

    const unverifiedChat = await prisma.chat.create({
      data: {
        userId: consentedUser.id,
        slot: 2,
        title: 'Unverified Chat',
      },
    });

    const unverifiedMsg = await prisma.message.create({
      data: {
        chatId: unverifiedChat.id,
        role: 'ASSISTANT',
        content: 'Unverified content',
      },
    });

    unverifiedAnalysis = await prisma.analysis.create({
      data: {
        messageId: unverifiedMsg.id,
        modelId: 'mock-model',
        promptVersion: '1.0.0',
        verificationStatus: 'UNVERIFIED',
        result: {
          meta: { topic: 'OOP' },
          understanding: { restatement: 'Unverified problem' },
        },
      },
    });
  });

  it('enforces learner consent: rejects candidate creation if consentImprove is false', async () => {
    await expect(proposeKbCandidate(verifiedAnalysis.id, nonConsentedUser.id)).rejects.toThrow(
      'Consent required',
    );
  });

  it('enforces verification status: rejects unverified analyses from becoming KB candidates', async () => {
    await expect(proposeKbCandidate(unverifiedAnalysis.id, consentedUser.id)).rejects.toThrow(
      'must be verified in sandbox',
    );
  });

  it('scrubs PII when proposing candidate and enters PROPOSED status', async () => {
    const candidate = await proposeKbCandidate(verifiedAnalysis.id, consentedUser.id);

    expect(candidate.status).toBe('PROPOSED');
    expect(candidate.anonymizedQuestion).not.toContain('admin@secretcorp.com');
    expect(candidate.anonymizedQuestion).toContain('[REDACTED_EMAIL]');
    expect(candidate.explanation).not.toContain('john.doe@javaverse.local');
    expect(candidate.explanation).toContain('[REDACTED_EMAIL]');
    expect(candidate.verifiedSolution).toContain('StringBuilder');
  });

  it('supports full review lifecycle: Approve -> Publish -> Search -> Demote -> Unpublish', async () => {
    const candidate = await proposeKbCandidate(verifiedAnalysis.id, consentedUser.id);

    // 1. Approve candidate
    const approved = await reviewKbCandidate({
      candidateId: candidate.id,
      reviewerUserId: reviewerUser.id,
      action: 'APPROVE',
    });
    expect(approved.status).toBe('APPROVED');

    // Verify published in kb_items
    const kbItem = await prisma.kbItem.findUnique({
      where: { candidateId: candidate.id },
    });
    expect(kbItem).toBeDefined();
    expect(kbItem?.published).toBe(true);

    // 2. Full-text search retrieves the approved item
    const searchResults = await searchKnowledgeBase('reverse string', { limit: 5 });
    expect(searchResults.length).toBeGreaterThanOrEqual(1);
    const found = searchResults.find((r) => r.sourceId === candidate.id);
    expect(found).toBeDefined();
    expect(found?.title).toContain('reverse');

    // 3. Demote candidate
    const demoted = await reviewKbCandidate({
      candidateId: candidate.id,
      reviewerUserId: reviewerUser.id,
      action: 'DEMOTE',
    });
    expect(demoted.status).toBe('DEMOTED');

    const demotedItem = await prisma.kbItem.findUnique({
      where: { candidateId: candidate.id },
    });
    expect(demotedItem?.published).toBe(false);

    // 4. Search does not return demoted item
    const searchAfterDemote = await searchKnowledgeBase('reverse string', { limit: 5 });
    const foundAfterDemote = searchAfterDemote.find((r) => r.sourceId === candidate.id);
    expect(foundAfterDemote).toBeUndefined();
  });

  it('propagates consent withdrawal by deleting all derived candidates and KB items', async () => {
    const candidate = await proposeKbCandidate(verifiedAnalysis.id, consentedUser.id);
    await reviewKbCandidate({
      candidateId: candidate.id,
      reviewerUserId: reviewerUser.id,
      action: 'APPROVE',
    });

    expect(await prisma.kbCandidate.count({ where: { userId: consentedUser.id } })).toBe(1);
    expect(await prisma.kbItem.count({ where: { candidateId: candidate.id } })).toBe(1);

    // Learner withdraws consent
    const res = await propagateConsentWithdrawal(consentedUser.id);
    expect(res.deletedCount).toBe(1);

    expect(await prisma.kbCandidate.count({ where: { userId: consentedUser.id } })).toBe(0);
    expect(await prisma.kbItem.count({ where: { candidateId: candidate.id } })).toBe(0);
  });

  it('records and resolves feedback reports from learners', async () => {
    const report = await submitFeedbackReport({
      userId: consentedUser.id,
      analysisId: verifiedAnalysis.id,
      issueType: 'INCORRECT_CODE',
      details: 'The solution misses handling null inputs.',
    });

    expect(report.status).toBe('PENDING');

    const pendingList = await listFeedbackReports({ status: 'PENDING' });
    expect(pendingList.some((r) => r.id === report.id)).toBe(true);

    const resolved = await resolveFeedbackReport({
      reportId: report.id,
      reviewerUserId: reviewerUser.id,
      resolution: 'RESOLVED',
    });

    expect(resolved.status).toBe('RESOLVED');
    expect(resolved.resolvedBy).toBe(reviewerUser.id);
  });

  it('enforces golden evaluation regression gate: flags regression when score drops below threshold', async () => {
    const provider = new MockProvider();
    let callCount = 0;
    const sandbox = new MockSandboxClient({
      customHandler: () => {
        callCount++;
        // Fail exactly the first case
        if (callCount === 1) {
          return { status: 'COMPILATION_ERROR', exitCode: 1, stderr: 'Assertion failure' };
        }
        return { status: 'SUCCESS', stdout: 'PASS\n', exitCode: 0 };
      },
    });

    const result = await runGoldenEvaluation({
      provider,
      sandboxClient: sandbox,
      maxCases: 4,
      passThreshold: 90, // 3/4 = 75% which is < 90%
    });

    expect(result.regressionDetected).toBe(true);
    expect(result.score).toBe(75);
    expect(result.passedCases).toBe(3);
    expect(result.totalCases).toBe(4);
  });
});
