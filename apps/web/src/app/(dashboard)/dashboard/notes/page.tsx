import React from 'react';
import type { Metadata } from 'next';
import { FileText } from 'lucide-react';
import { PreviewShell } from '@/components/dashboard/PreviewShell';

export const metadata: Metadata = {
  title: 'Learning Notes — JavaVerse',
  description: 'Personal study notes and code annotations preview.',
};

export default function DashboardNotesPage() {
  return (
    <PreviewShell
      title="Study Notes & Annotations"
      subtitle="Review personal annotations made during visual lessons and coding challenges."
      phaseBadge="Phase 2 Shell Preview · Notebook features activate in Phase 8"
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: '#10b981' }}>
        <FileText size={24} aria-hidden="true" />
        <h2 style={{ fontSize: 'var(--text-lg)', fontWeight: 700, color: 'var(--text-primary)' }}>
          Learner Notebook Interface
        </h2>
      </div>
      <p style={{ color: 'var(--text-secondary)', lineHeight: 'var(--leading-relaxed)' }}>
        Notes taken while stepping through diagrams or debugging JVM stack traces will be saved
        here, allowing you to build your own personal Java reference handbook.
      </p>
    </PreviewShell>
  );
}
