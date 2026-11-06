import { NextRequest } from 'next/server';
import { prisma } from '@javaverse/db';
import { requireOwnerAuth } from '@/lib/adminAuth';
import { jsonOk, jsonError } from '@/lib/apiResponse';

export async function GET(request: NextRequest) {
  const auth = await requireOwnerAuth(request);
  if (!auth.ok) {
    return jsonError(auth.status === 403 ? 'FORBIDDEN' : 'UNAUTHORIZED', auth.error, auth.status);
  }

  try {
    const limits = await prisma.deploymentLimits.findFirst();
    const maxUsers = limits?.maxUsers ?? 5;
    const activeUsersCount = await prisma.user.count({ where: { status: 'ACTIVE' } });
    const pendingInvitationsCount = await prisma.invitation.count({ where: { status: 'PENDING' } });

    const totalAnalyses = await prisma.analysis.count();
    const totalExecutions = await prisma.execution.count();
    const pendingFeedbackCount = await prisma.feedbackReport.count({
      where: { status: 'PENDING' },
    });
    const proposedKbCount = await prisma.kbCandidate.count({ where: { status: 'PROPOSED' } });
    const approvedKbCount = await prisma.kbItem.count({ where: { published: true } });

    // Job queue status breakdown
    const jobStats = await prisma.durableJob.groupBy({
      by: ['status'],
      _count: true,
    });

    const jobsByStatus: Record<string, number> = {
      PENDING: 0,
      RUNNING: 0,
      COMPLETED: 0,
      FAILED: 0,
      CANCELLED: 0,
    };

    for (const j of jobStats) {
      jobsByStatus[j.status] = j._count;
    }

    return jsonOk({
      stats: {
        capacity: {
          maxUsers,
          activeUsers: activeUsersCount,
          pendingInvitations: pendingInvitationsCount,
          availableSeats: Math.max(0, maxUsers - activeUsersCount),
        },
        jobs: jobsByStatus,
        activity: {
          totalAnalyses,
          totalExecutions,
          pendingFeedback: pendingFeedbackCount,
          proposedKbCandidates: proposedKbCount,
          publishedKbItems: approvedKbCount,
        },
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to fetch admin stats';
    return jsonError('INTERNAL_ERROR', message, 500);
  }
}
