'use client';

import React, { useState } from 'react';
import type { UserSettings } from '@javaverse/schemas';

interface SettingsViewProps {
  initialSettings: UserSettings;
  csrfToken?: string;
}

export function SettingsView({ initialSettings, csrfToken = '' }: SettingsViewProps) {
  const [displayName, setDisplayName] = useState<string>(initialSettings.displayName || '');
  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>(initialSettings.theme);
  const [javaVersion, setJavaVersion] = useState<string>(initialSettings.defaultJavaVersion);
  const [gamificationEnabled, setGamificationEnabled] = useState<boolean>(
    initialSettings.gamificationEnabled,
  );
  const [consentImprove, setConsentImprove] = useState<boolean>(initialSettings.consentImprove);

  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  async function handleSavePreferences(e: React.FormEvent) {
    e.preventDefault();
    setIsSaving(true);
    setStatusMessage(null);

    try {
      const res = await fetch('/api/v1/settings', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(csrfToken ? { 'x-csrf-token': csrfToken } : {}),
        },
        body: JSON.stringify({
          displayName: displayName.trim(),
          theme,
          defaultJavaVersion: javaVersion,
          gamificationEnabled,
          consentImprove,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setStatusMessage({ type: 'error', text: data.error?.message || 'Failed to save settings' });
        return;
      }

      setStatusMessage({ type: 'success', text: 'Preferences saved successfully!' });
    } catch {
      setStatusMessage({ type: 'error', text: 'Network error saving preferences' });
    } finally {
      setIsSaving(false);
    }
  }

  async function handleExportData() {
    setIsExporting(true);
    try {
      const res = await fetch('/api/v1/settings/export', {
        method: 'POST',
        headers: {
          ...(csrfToken ? { 'x-csrf-token': csrfToken } : {}),
        },
      });

      const data = await res.json();
      if (res.ok) {
        const blob = new Blob([JSON.stringify(data.data.export, null, 2)], {
          type: 'application/json',
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `javaverse-export-${new Date().toISOString().slice(0, 10)}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
    } catch {
      setStatusMessage({ type: 'error', text: 'Failed to download data export' });
    } finally {
      setIsExporting(false);
    }
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '2rem',
        maxWidth: '720px',
        width: '100%',
      }}
    >
      <header>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>
          Account Settings & Learning Preferences
        </h1>
        <p style={{ fontSize: '1rem', color: '#475569', margin: '0.25rem 0 0 0' }}>
          Manage your profile, theme, sandbox Java version, gamification controls, and data privacy.
        </p>
      </header>

      {statusMessage && (
        <div
          style={{
            padding: '0.75rem 1rem',
            borderRadius: '0.375rem',
            backgroundColor: statusMessage.type === 'success' ? '#ecfdf5' : '#fef2f2',
            border: `1px solid ${statusMessage.type === 'success' ? '#a7f3d0' : '#fecaca'}`,
            color: statusMessage.type === 'success' ? '#047857' : '#b91c1c',
            fontSize: '0.875rem',
            fontWeight: 600,
          }}
          role="status"
        >
          {statusMessage.text}
        </div>
      )}

      <form
        onSubmit={handleSavePreferences}
        style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}
      >
        {/* Profile Section */}
        <section
          style={{
            backgroundColor: '#ffffff',
            padding: '1.5rem',
            borderRadius: '0.5rem',
            border: '1px solid #e2e8f0',
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem',
          }}
          aria-labelledby="profile-heading"
        >
          <h2
            id="profile-heading"
            style={{ fontSize: '1.125rem', fontWeight: 600, color: '#0f172a', margin: 0 }}
          >
            Profile Details
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
            <label
              htmlFor="display-name"
              style={{ fontSize: '0.875rem', fontWeight: 600, color: '#334155' }}
            >
              Display Name
            </label>
            <input
              id="display-name"
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="e.g. Java Explorer"
              maxLength={64}
              style={{
                padding: '0.5rem 0.75rem',
                fontSize: '0.875rem',
                border: '1px solid #cbd5e1',
                borderRadius: '0.375rem',
              }}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
            <label
              htmlFor="email-readonly"
              style={{ fontSize: '0.875rem', fontWeight: 600, color: '#334155' }}
            >
              Email Address (Account Identifier)
            </label>
            <input
              id="email-readonly"
              type="text"
              value={initialSettings.email}
              disabled
              style={{
                padding: '0.5rem 0.75rem',
                fontSize: '0.875rem',
                border: '1px solid #e2e8f0',
                borderRadius: '0.375rem',
                backgroundColor: '#f8fafc',
                color: '#64748b',
              }}
            />
          </div>
        </section>

        {/* Preferences Section */}
        <section
          style={{
            backgroundColor: '#ffffff',
            padding: '1.5rem',
            borderRadius: '0.5rem',
            border: '1px solid #e2e8f0',
            display: 'flex',
            flexDirection: 'column',
            gap: '1.25rem',
          }}
          aria-labelledby="preferences-heading"
        >
          <h2
            id="preferences-heading"
            style={{ fontSize: '1.125rem', fontWeight: 600, color: '#0f172a', margin: 0 }}
          >
            Learning & Appearance Defaults
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
            <label
              htmlFor="theme-select"
              style={{ fontSize: '0.875rem', fontWeight: 600, color: '#334155' }}
            >
              Appearance Theme
            </label>
            <select
              id="theme-select"
              value={theme}
              onChange={(e) => setTheme(e.target.value as 'light' | 'dark' | 'system')}
              style={{
                padding: '0.5rem 0.75rem',
                fontSize: '0.875rem',
                border: '1px solid #cbd5e1',
                borderRadius: '0.375rem',
              }}
            >
              <option value="system">System Default</option>
              <option value="light">Light</option>
              <option value="dark">Dark</option>
            </select>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
            <label
              htmlFor="java-version"
              style={{ fontSize: '0.875rem', fontWeight: 600, color: '#334155' }}
            >
              Default Sandbox JDK Version
            </label>
            <select
              id="java-version"
              value={javaVersion}
              onChange={(e) => setJavaVersion(e.target.value)}
              style={{
                padding: '0.5rem 0.75rem',
                fontSize: '0.875rem',
                border: '1px solid #cbd5e1',
                borderRadius: '0.375rem',
              }}
            >
              <option value="21">Java 21 (LTS) - Recommended</option>
              <option value="17">Java 17 (LTS)</option>
              <option value="11">Java 11 (LTS)</option>
              <option value="8">Java 8</option>
              <option value="25">Java 25 (Early Access)</option>
            </select>
          </div>

          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
            <input
              id="gamification-check"
              type="checkbox"
              checked={gamificationEnabled}
              onChange={(e) => setGamificationEnabled(e.target.checked)}
              style={{ marginTop: '0.25rem' }}
            />
            <div>
              <label
                htmlFor="gamification-check"
                style={{ fontSize: '0.875rem', fontWeight: 600, color: '#0f172a' }}
              >
                Enable Gamification (XP, Streaks, Badges)
              </label>
              <p style={{ fontSize: '0.8125rem', color: '#64748b', margin: '0.125rem 0 0 0' }}>
                Turn off to learn without gaming elements. We never use dark patterns or pressure to
                continue streaks.
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
            <input
              id="consent-check"
              type="checkbox"
              checked={consentImprove}
              onChange={(e) => setConsentImprove(e.target.checked)}
              style={{ marginTop: '0.25rem' }}
            />
            <div>
              <label
                htmlFor="consent-check"
                style={{ fontSize: '0.875rem', fontWeight: 600, color: '#0f172a' }}
              >
                Allow anonymized questions to improve JavaVerse AI models (Optional)
              </label>
              <p style={{ fontSize: '0.8125rem', color: '#64748b', margin: '0.125rem 0 0 0' }}>
                Default is OFF. If enabled, questions are stripped of PII and used strictly for open
                Java curriculum quality evaluations.
              </p>
            </div>
          </div>
        </section>

        <button
          type="submit"
          disabled={isSaving}
          style={{
            alignSelf: 'flex-start',
            padding: '0.625rem 1.25rem',
            fontSize: '0.875rem',
            fontWeight: 600,
            borderRadius: '0.375rem',
            backgroundColor: '#2563eb',
            color: '#ffffff',
            border: 'none',
            cursor: isSaving ? 'not-allowed' : 'pointer',
            opacity: isSaving ? 0.7 : 1,
          }}
        >
          {isSaving ? 'Saving Changes...' : 'Save Preferences'}
        </button>
      </form>

      {/* Data Export & Privacy Section */}
      <section
        style={{
          backgroundColor: '#ffffff',
          padding: '1.5rem',
          borderRadius: '0.5rem',
          border: '1px solid #e2e8f0',
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem',
        }}
        aria-labelledby="privacy-heading"
      >
        <h2
          id="privacy-heading"
          style={{ fontSize: '1.125rem', fontWeight: 600, color: '#0f172a', margin: 0 }}
        >
          Privacy, Export & Account Deletion
        </h2>
        <p style={{ fontSize: '0.875rem', color: '#475569', margin: 0 }}>
          You own your learning data. You can download a complete JSON archive of all chats,
          messages, submissions, progress, and bookmarks at any time.
        </p>

        <button
          type="button"
          onClick={handleExportData}
          disabled={isExporting}
          style={{
            alignSelf: 'flex-start',
            padding: '0.5rem 1rem',
            fontSize: '0.875rem',
            fontWeight: 600,
            borderRadius: '0.375rem',
            border: '1px solid #cbd5e1',
            backgroundColor: '#f8fafc',
            color: '#334155',
            cursor: isExporting ? 'not-allowed' : 'pointer',
          }}
        >
          {isExporting ? 'Preparing Archive...' : 'Download My Data (JSON)'}
        </button>
      </section>
    </div>
  );
}
