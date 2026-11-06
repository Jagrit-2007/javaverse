import { prisma } from '@javaverse/db';
import { recordAuditEvent } from './audit';
import type { FeedbackIssueType } from '@javaverse/schemas';

export interface SubmitFeedbackParams {
  userId: string;
  analysisId?: string | undefined;
  messageId?: string | undefined;
  issueType: FeedbackIssueType;
  details: string;
}

export async function submitFeedbackReport(params: SubmitFeedbackParams) {
  const { userId, analysisId, messageId, issueType, details } = params;

  const report = await prisma.feedbackReport.create({
    data: {
      userId,
      analysisId: analysisId || null,
      messageId: messageId || null,
      issueType,
      details,
      status: 'PENDING',
    },
  });

  await recordAuditEvent({
    actorType: 'USER',
    actorUserId: userId,
    action: 'FEEDBACK_REPORT_SUBMITTED',
    metadata: {
      reportId: report.id,
      issueType,
      analysisId,
      messageId,
    },
  });

  return report;
}

export interface ListFeedbackOptions {
  status?: string | undefined;
  limit?: number | undefined;
}

export async function listFeedbackReports(options?: ListFeedbackOptions) {
  const { status, limit = 50 } = options || {};

  return prisma.feedbackReport.findMany({
    ...(status ? { where: { status } } : {}),
    orderBy: { createdAt: 'desc' },
    take: limit,
    include: {
      user: {
        select: {
          id: true,
          displayName: true,
        },
      },
    },
  });
}

export async function resolveFeedbackReport(params: {
  reportId: string;
  reviewerUserId: string;
  resolution: 'RESOLVED' | 'DISMISSED';
}) {
  const { reportId, reviewerUserId, resolution } = params;

  const report = await prisma.feedbackReport.update({
    where: { id: reportId },
    data: {
      status: resolution,
      resolvedBy: reviewerUserId,
      resolvedAt: new Date(),
    },
  });

  await recordAuditEvent({
    actorType: 'USER',
    actorUserId: reviewerUserId,
    action: 'FEEDBACK_REPORT_RESOLVED',
    metadata: {
      reportId,
      resolution,
    },
  });

  return report;
}
