import React from 'react';
import type { Metadata } from 'next';
import { PreviewShell } from '@/components/dashboard/PreviewShell';
import { FeaturedPaths } from '@/components/dashboard/FeaturedPaths';
import { DETERMINISTIC_DASHBOARD_DATA } from '@/components/fixtures/dashboardData';

export const metadata: Metadata = {
  title: 'Curriculum Tracks — JavaVerse',
  description: 'Structured Java learning paths preview.',
};

export default function DashboardLearnPage() {
  return (
    <PreviewShell
      title="Curriculum & Learning Paths"
      subtitle="Explore progressive Java tracks structured from syntax foundations to advanced JVM concurrency."
      phaseBadge="Phase 2 Shell Preview · Content Engine activates in Phase 8"
    >
      <p style={{ color: 'var(--text-secondary)', lineHeight: 'var(--leading-relaxed)' }}>
        In Phase 8, this view hosts interactive lesson modules with tabbed explanations, verified
        code snippets, and concept visualizations. Below are the planned curriculum tracks:
      </p>
      <div style={{ marginTop: '1rem' }}>
        <FeaturedPaths paths={DETERMINISTIC_DASHBOARD_DATA.featuredPaths} />
      </div>
    </PreviewShell>
  );
}
