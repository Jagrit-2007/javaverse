import { prisma } from '@javaverse/db';
import { scrubPii } from '@javaverse/security';
import { recordAuditEvent } from './audit';
import type { KbCandidateAction } from '@javaverse/schemas';

export interface KbSourceResult {
  id: string;
  title: string;
  topic: string;
  excerpt: string;
  sourceType: 'KB_ITEM' | 'CURRICULUM_LESSON';
  sourceId: string;
  score: number;
}

/**
 * Propose a verified analysis as a Knowledge Base candidate.
 * Strictly enforces learner consent (consentImprove == true) and verificationStatus ('VERIFIED').
 */
export async function proposeKbCandidate(analysisId: string, userId: string) {
  // 1. Check user consent
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, consentImprove: true },
  });

  if (!user || !user.consentImprove) {
    throw new Error('Consent required: User has not opted into data improvement.');
  }

  // 2. Fetch analysis and ensure it was verified in sandbox
  const analysis = await prisma.analysis.findUnique({
    where: { id: analysisId },
    include: { message: true },
  });

  if (!analysis) {
    throw new Error('Analysis not found');
  }

  if (analysis.verificationStatus !== 'VERIFIED_CORRECT') {
    throw new Error('Analysis must be verified in sandbox before becoming a KB candidate');
  }

  const rawResult = analysis.result as {
    understanding?: { restatement?: string };
    solution?: {
      code?: string;
      explanation?: Array<{ text: string }>;
    };
    meta?: {
      topic?: string;
      subtopics?: string[];
    };
  };
  const questionText =
    analysis.message?.content || rawResult?.understanding?.restatement || 'Java Question';
  const solutionText = rawResult?.solution?.code || '';
  const explanationText =
    rawResult?.solution?.explanation?.map((e) => e.text).join('\n') ||
    rawResult?.understanding?.restatement ||
    '';
  const topic = rawResult?.meta?.topic || 'CORE_JAVA';
  const subtopics = Array.isArray(rawResult?.meta?.subtopics) ? rawResult.meta.subtopics : [];
  const title =
    rawResult?.understanding?.restatement?.slice(0, 100) || 'Java Technique and Verified Solution';

  // 3. Scrub PII from learner input and explanation
  const scrubbedQuestion = scrubPii(questionText).text;
  const scrubbedExplanation = scrubPii(explanationText).text;

  // 4. Create candidate
  const candidate = await prisma.kbCandidate.create({
    data: {
      analysisId: analysis.id,
      userId: user.id,
      status: 'PROPOSED',
      topic,
      subtopics,
      title,
      anonymizedQuestion: scrubbedQuestion,
      verifiedSolution: solutionText,
      explanation: scrubbedExplanation,
    },
  });

  await recordAuditEvent({
    actorType: 'USER',
    actorUserId: userId,
    action: 'KB_CANDIDATE_PROPOSED',
    metadata: { candidateId: candidate.id, topic, analysisId },
  });

  return candidate;
}

/**
 * Review a KB candidate (Approve, Reject, Demote, Edit).
 */
export async function reviewKbCandidate(params: {
  candidateId: string;
  reviewerUserId: string;
  action: KbCandidateAction;
  title?: string | undefined;
  topic?: string | undefined;
  subtopics?: string[] | undefined;
  anonymizedQuestion?: string | undefined;
  verifiedSolution?: string | undefined;
  explanation?: string | undefined;
  rejectionReason?: string | undefined;
}) {
  const { candidateId, reviewerUserId, action } = params;

  const candidate = await prisma.kbCandidate.findUnique({
    where: { id: candidateId },
  });

  if (!candidate) {
    throw new Error('Candidate not found');
  }

  const title = params.title || candidate.title;
  const topic = params.topic || candidate.topic;
  const explanation = params.explanation || candidate.explanation;
  const verifiedSolution = params.verifiedSolution || candidate.verifiedSolution;
  const anonymizedQuestion = params.anonymizedQuestion || candidate.anonymizedQuestion;
  const subtopics = params.subtopics || candidate.subtopics;

  if (action === 'APPROVE') {
    const updatedCandidate = await prisma.kbCandidate.update({
      where: { id: candidateId },
      data: {
        status: 'APPROVED',
        reviewedBy: reviewerUserId,
        reviewedAt: new Date(),
        title,
        topic,
        subtopics,
        explanation,
        verifiedSolution,
        anonymizedQuestion,
      },
    });

    const content = `${explanation}\n\n\`\`\`java\n${verifiedSolution}\n\`\`\``;

    await prisma.kbItem.upsert({
      where: { candidateId },
      create: {
        candidateId,
        title,
        topic,
        content,
        published: true,
        sourceType: 'APPROVED_ANALYSIS',
        sourceId: candidateId,
      },
      update: {
        title,
        topic,
        content,
        published: true,
      },
    });

    await recordAuditEvent({
      actorType: 'USER',
      actorUserId: reviewerUserId,
      action: 'KB_CANDIDATE_APPROVED',
      metadata: { candidateId, topic, title },
    });

    return updatedCandidate;
  }

  if (action === 'REJECT') {
    const updated = await prisma.kbCandidate.update({
      where: { id: candidateId },
      data: {
        status: 'REJECTED',
        rejectionReason: params.rejectionReason || null,
        reviewedBy: reviewerUserId,
        reviewedAt: new Date(),
      },
    });

    await prisma.kbItem.updateMany({
      where: { candidateId },
      data: { published: false },
    });

    await recordAuditEvent({
      actorType: 'USER',
      actorUserId: reviewerUserId,
      action: 'KB_CANDIDATE_REJECTED',
      metadata: { candidateId, reason: params.rejectionReason },
    });

    return updated;
  }

  if (action === 'DEMOTE') {
    const updated = await prisma.kbCandidate.update({
      where: { id: candidateId },
      data: {
        status: 'DEMOTED',
        reviewedBy: reviewerUserId,
        reviewedAt: new Date(),
      },
    });

    await prisma.kbItem.updateMany({
      where: { candidateId },
      data: { published: false },
    });

    await recordAuditEvent({
      actorType: 'USER',
      actorUserId: reviewerUserId,
      action: 'KB_CANDIDATE_DEMOTED',
      metadata: { candidateId },
    });

    return updated;
  }

  // EDIT
  const updated = await prisma.kbCandidate.update({
    where: { id: candidateId },
    data: {
      title,
      topic,
      subtopics,
      anonymizedQuestion,
      verifiedSolution,
      explanation,
    },
  });

  const content = `${explanation}\n\n\`\`\`java\n${verifiedSolution}\n\`\`\``;
  await prisma.kbItem.updateMany({
    where: { candidateId },
    data: { title, topic, content },
  });

  await recordAuditEvent({
    actorType: 'USER',
    actorUserId: reviewerUserId,
    action: 'KB_CANDIDATE_EDITED',
    metadata: { candidateId, title, topic },
  });

  return updated;
}

/**
 * PostgreSQL Full-Text Search across APPROVED Knowledge Base items and published lessons.
 */
export async function searchKnowledgeBase(
  query: string,
  options?: { topic?: string | undefined; limit?: number | undefined },
): Promise<KbSourceResult[]> {
  const limit = options?.limit || 5;
  const sanitized = query.trim().replace(/['"\\]/g, ' ');

  if (!sanitized) return [];

  const results: KbSourceResult[] = [];

  try {
    // 1. PostgreSQL Full-Text Search on published kb_items
    const rows = await prisma.$queryRaw<
      Array<{
        id: string;
        candidate_id: string | null;
        title: string;
        topic: string;
        content: string;
        rank: number;
      }>
    >`
      SELECT id, candidate_id, title, topic, content,
             ts_rank(to_tsvector('english', title || ' ' || content), plainto_tsquery('english', ${sanitized})) AS rank
      FROM kb_items
      WHERE published = true
        AND to_tsvector('english', title || ' ' || content) @@ plainto_tsquery('english', ${sanitized})
      ORDER BY rank DESC
      LIMIT ${limit};
    `;

    for (const r of rows) {
      results.push({
        id: r.id,
        title: r.title,
        topic: r.topic,
        excerpt: r.content.slice(0, 200) + '...',
        sourceType: 'KB_ITEM',
        sourceId: r.candidate_id || r.id,
        score: Math.round(Number(r.rank) * 100) / 100,
      });
    }
  } catch {
    // Fallback to simple ILIKE search if tsquery syntax fails
    const fallbackItems = await prisma.kbItem.findMany({
      where: {
        published: true,
        OR: [
          { title: { contains: sanitized, mode: 'insensitive' } },
          { content: { contains: sanitized, mode: 'insensitive' } },
        ],
      },
      take: limit,
    });

    for (const item of fallbackItems) {
      results.push({
        id: item.id,
        title: item.title,
        topic: item.topic,
        excerpt: item.content.slice(0, 200) + '...',
        sourceType: 'KB_ITEM',
        sourceId: item.candidateId || item.id,
        score: 1.0,
      });
    }
  }

  // 2. Also search published curriculum lessons
  const matchingLessons = await prisma.curriculumLesson.findMany({
    where: {
      published: true,
      OR: [
        { title: { contains: sanitized, mode: 'insensitive' } },
        { hook: { contains: sanitized, mode: 'insensitive' } },
      ],
    },
    take: 3,
  });

  for (const l of matchingLessons) {
    results.push({
      id: l.id,
      title: l.title,
      topic: l.track,
      excerpt: l.hook.slice(0, 200) + '...',
      sourceType: 'CURRICULUM_LESSON',
      sourceId: l.slug,
      score: 0.9,
    });
  }

  return results.slice(0, limit);
}

/**
 * Propagate consent withdrawal: Immediately purge any KB candidates and items derived from this user's data.
 */
export async function propagateConsentWithdrawal(userId: string) {
  // Cascading foreign keys will delete kb_items attached to kb_candidates
  const deleted = await prisma.kbCandidate.deleteMany({
    where: { userId },
  });

  await recordAuditEvent({
    actorType: 'USER',
    actorUserId: userId,
    action: 'CONSENT_WITHDRAWAL_PROPAGATED',
    metadata: { deletedCandidatesCount: deleted.count },
  });

  return { deletedCount: deleted.count };
}
