import React from 'react';
import type { Metadata } from 'next';
import { Sparkles } from 'lucide-react';
import { PreviewShell } from '@/components/dashboard/PreviewShell';

export const metadata: Metadata = {
  title: 'Ask JavaVerse — JavaVerse',
  description: 'AI-assisted Java reasoning and debugging preview.',
};

export default function DashboardAskPage() {
  return (
    <PreviewShell
      title="Ask JavaVerse AI"
      subtitle="Engage with an intelligent Java educator for conceptual explanations and debugging guidance."
      phaseBadge="Phase 2 Shell Preview · AI Gateway activates in Phase 5"
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          color: 'var(--status-info-text)',
        }}
      >
        <Sparkles size={24} aria-hidden="true" />
        <h2 style={{ fontSize: 'var(--text-lg)', fontWeight: 700, color: 'var(--text-primary)' }}>
          Pedagogical Guidance Interface
        </h2>
      </div>
      <p style={{ color: 'var(--text-secondary)', lineHeight: 'var(--leading-relaxed)' }}>
        JavaVerse does not act as a generic chat wrapper. When activated in Phase 5, this workspace
        will analyze your Java questions, provide visual execution traces, and explain errors step
        by step.
      </p>
      <div
        style={{
          padding: 'var(--space-4)',
          backgroundColor: 'var(--bg-surface-subtle)',
          borderRadius: 'var(--radius-md)',
          border: '1px dashed var(--border-strong)',
          fontSize: 'var(--text-sm)',
          color: 'var(--text-muted)',
        }}
      >
        Input interface disabled in Phase 2. Runtime policy strictly enforces
        AI_PROVIDER_PRIMARY=mock.
      </div>
    </PreviewShell>
  );
}
