import React from 'react';
import type { Metadata } from 'next';
import { PreviewShell } from '@/components/dashboard/PreviewShell';
import { ProgressOverview } from '@/components/dashboard/ProgressOverview';
import { DETERMINISTIC_DASHBOARD_DATA } from '@/components/fixtures/dashboardData';

export const metadata: Metadata = {
  title: 'Learning Progress — JavaVerse',
  description: 'Detailed progress metrics, topic breakdowns, and mastery stats preview.',
};

export default function DashboardProgressPage() {
  const data = DETERMINISTIC_DASHBOARD_DATA;

  return (
    <PreviewShell
      title="Progress & Domain Mastery"
      subtitle="Track your completion rates, mastery scores, and review intervals across all Java domains."
      phaseBadge="Phase 2 Shell Preview · Progress Engine activates in Phase 8"
    >
      <p style={{ color: 'var(--text-secondary)', lineHeight: 'var(--leading-relaxed)' }}>
        This page visualizes domain retention and mastery curves. Here are your deterministic demo
        progress metrics:
      </p>
      <div style={{ marginTop: '1rem' }}>
        <ProgressOverview
          overallProgress={data.overallProgress}
          breakdowns={data.progressBreakdowns}
        />
      </div>
    </PreviewShell>
  );
}
