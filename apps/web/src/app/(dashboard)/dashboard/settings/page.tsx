import React from 'react';
import type { Metadata } from 'next';
import { PreviewShell } from '@/components/dashboard/PreviewShell';
import { ThemeSelector } from '@/components/theme/ThemeSelector';

export const metadata: Metadata = {
  title: 'Preferences & Settings — JavaVerse',
  description: 'Manage appearance and learning environment preferences.',
};

export default function DashboardSettingsPage() {
  return (
    <PreviewShell
      title="Preferences &amp; Settings"
      subtitle="Customize your learning environment, theme, and visual display options."
      phaseBadge="Phase 2 Shell Preview · Account persistence activates in Phase 3"
    >
      <section
        aria-labelledby="appearance-heading"
        style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}
      >
        <h2
          id="appearance-heading"
          style={{ fontSize: 'var(--text-lg)', fontWeight: 700, color: 'var(--text-primary)' }}
        >
          Appearance &amp; Theme
        </h2>
        <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>
          Choose your preferred interface theme. In System mode, JavaVerse follows your operating
          system&apos;s light or dark mode setting.
        </p>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginTop: '0.5rem' }}>
          <span style={{ fontSize: 'var(--text-sm)', fontWeight: 600 }}>Active Theme:</span>
          <ThemeSelector />
        </div>
      </section>

      <hr
        style={{ border: 'none', borderTop: '1px solid var(--border-subtle)', margin: '1rem 0' }}
      />

      <section
        aria-labelledby="learning-pref-heading"
        style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}
      >
        <h2
          id="learning-pref-heading"
          style={{ fontSize: 'var(--text-lg)', fontWeight: 700, color: 'var(--text-primary)' }}
        >
          Learning Environment Preferences
        </h2>
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '0.75rem',
            fontSize: 'var(--text-sm)',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '0.75rem',
              backgroundColor: 'var(--bg-surface-subtle)',
              borderRadius: 'var(--radius-md)',
            }}
          >
            <div>
              <span style={{ fontWeight: 600, display: 'block' }}>Default Java Version</span>
              <span style={{ color: 'var(--text-muted)', fontSize: 'var(--text-xs)' }}>
                Runtime target for practice problems
              </span>
            </div>
            <span style={{ fontWeight: 700, color: 'var(--status-info-text)' }}>Java 21 (LTS)</span>
          </div>

          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '0.75rem',
              backgroundColor: 'var(--bg-surface-subtle)',
              borderRadius: 'var(--radius-md)',
            }}
          >
            <div>
              <span style={{ fontWeight: 600, display: 'block' }}>Code Font Indentation</span>
              <span style={{ color: 'var(--text-muted)', fontSize: 'var(--text-xs)' }}>
                Standard Java formatting standard
              </span>
            </div>
            <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>4 spaces</span>
          </div>
        </div>
      </section>
    </PreviewShell>
  );
}
