import React from 'react';
import type { Metadata } from 'next';
import { PreviewShell } from '@/components/dashboard/PreviewShell';
import { DailyChallenge } from '@/components/dashboard/DailyChallenge';
import { DETERMINISTIC_DASHBOARD_DATA } from '@/components/fixtures/dashboardData';

export const metadata: Metadata = {
  title: 'Practice Problems — JavaVerse',
  description: 'Java coding challenges and exercises preview.',
};

export default function DashboardPracticePage() {
  const challenge = DETERMINISTIC_DASHBOARD_DATA.todaysChallenge;

  return (
    <PreviewShell
      title="Practice Problems & Challenges"
      subtitle="Solve targeted Java problems with automated unit tests and instant compiler feedback."
      phaseBadge="Phase 2 Shell Preview · Sandbox Runner activates in Phase 6"
    >
      <p style={{ color: 'var(--text-secondary)', lineHeight: 'var(--leading-relaxed)' }}>
        In Phase 6, practice challenges will compile and execute inside isolated sandbox containers.
        Here is today&apos;s featured problem preview:
      </p>
      <div style={{ marginTop: '1rem' }}>
        <DailyChallenge
          title={challenge.title}
          estimatedMinutes={challenge.estimatedMinutes}
          description={challenge.description}
        />
      </div>
    </PreviewShell>
  );
}
