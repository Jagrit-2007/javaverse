import React from 'react';
import type { Metadata } from 'next';
import { FolderKanban } from 'lucide-react';
import { PreviewShell } from '@/components/dashboard/PreviewShell';

export const metadata: Metadata = {
  title: 'Resource Library — JavaVerse',
  description: 'Bookmarked resources and Java documentation library preview.',
};

export default function DashboardLibraryPage() {
  return (
    <PreviewShell
      title="Saved Library & Reference"
      subtitle="Access your bookmarked lessons, saved code snippets, and Java API documentation summaries."
      phaseBadge="Phase 2 Shell Preview · Knowledge Retrieval activates in Phase 9"
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: '#8b5cf6' }}>
        <FolderKanban size={24} aria-hidden="true" />
        <h2 style={{ fontSize: 'var(--text-lg)', fontWeight: 700, color: 'var(--text-primary)' }}>
          Personalized Reference Repository
        </h2>
      </div>
      <p style={{ color: 'var(--text-secondary)', lineHeight: 'var(--leading-relaxed)' }}>
        In later phases, your approved knowledge base entries, saved concept cards, and cheat sheets
        will be indexed here for quick full-text search.
      </p>
    </PreviewShell>
  );
}
