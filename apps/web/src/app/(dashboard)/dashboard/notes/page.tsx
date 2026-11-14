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
      subtitle="Personal study notes and code annotations are scheduled for a future milestone."
      phaseBadge="Feature Preview · Scheduled for future release"
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: '#10b981' }}>
        <FileText size={24} aria-hidden="true" />
        <h2 style={{ fontSize: 'var(--text-lg)', fontWeight: 700, color: 'var(--text-primary)' }}>
          Learner Notebook Interface (Planned)
        </h2>
      </div>
      <p style={{ color: 'var(--text-secondary)', lineHeight: 'var(--leading-relaxed)' }}>
        Study notes and personal code annotations are scheduled for a future milestone. When
        implemented, notes taken while stepping through diagrams or debugging JVM stack traces will
        be saved here, allowing you to build your own personal Java reference handbook.
      </p>
    </PreviewShell>
  );
}
