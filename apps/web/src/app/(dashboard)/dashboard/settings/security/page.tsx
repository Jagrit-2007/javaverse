'use client';

import React, { useState, useEffect } from 'react';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import styles from './SecuritySettings.module.css';

interface SessionItem {
  publicId: string;
  createdAt: string;
  lastSeenAt: string;
  isCurrent: boolean;
}

export default function SecuritySettingsPage() {
  const [sessions, setSessions] = useState<SessionItem[]>([]);
  const [csrfToken, setCsrfToken] = useState('');

  // Password change state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [passwordMsg, setPasswordMsg] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);
  const [passwordSubmitting, setPasswordSubmitting] = useState(false);

  // Reauth prompt state
  const [reauthPassword, setReauthPassword] = useState('');
  const [showReauthModal, setShowReauthModal] = useState(false);
  const [pendingAction, setPendingAction] = useState<(() => Promise<void>) | null>(null);

  const loadSessions = async () => {
    try {
      const res = await fetch('/api/v1/auth/sessions');
      const data = await res.json();
      if (data?.data?.sessions) {
        setSessions(data.data.sessions);
      }
    } catch {}
  };

  const refreshCsrf = async () => {
    try {
      const res = await fetch('/api/v1/auth/csrf');
      const data = await res.json();
      if (data?.data?.csrfToken) {
        setCsrfToken(data.data.csrfToken);
      }
    } catch {}
  };

  useEffect(() => {
    refreshCsrf();
    loadSessions();
  }, []);

  const handleReauthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/v1/auth/reauth', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-csrf-token': csrfToken,
        },
        body: JSON.stringify({ password: reauthPassword }),
      });

      if (res.ok) {
        setShowReauthModal(false);
        setReauthPassword('');
        if (pendingAction) {
          await pendingAction();
          setPendingAction(null);
        }
      } else {
        alert('Incorrect password. Reauthentication failed.');
      }
    } catch {
      alert('Error during reauthentication.');
    }
  };

  const handleRevokeSession = async (publicId: string) => {
    const action = async () => {
      const res = await fetch(`/api/v1/auth/sessions/${publicId}`, {
        method: 'DELETE',
        headers: { 'x-csrf-token': csrfToken },
      });
      const data = await res.json();
      if (res.status === 403 && data?.error?.code === 'REAUTH_REQUIRED') {
        setPendingAction(() => () => handleRevokeSession(publicId));
        setShowReauthModal(true);
        return;
      }
      loadSessions();
    };
    await action();
  };

  const handleLogoutAll = async () => {
    const action = async () => {
      const res = await fetch('/api/v1/auth/logout-all', {
        method: 'POST',
        headers: { 'x-csrf-token': csrfToken },
      });
      const data = await res.json();
      if (res.status === 403 && data?.error?.code === 'REAUTH_REQUIRED') {
        setPendingAction(() => () => handleLogoutAll());
        setShowReauthModal(true);
        return;
      }
      if (res.ok) {
        if (typeof window !== 'undefined') {
          sessionStorage.removeItem('external_ai_consent');
        }
        window.location.href = '/auth/login';
      }
    };
    await action();
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordMsg(null);

    if (newPassword !== confirmNewPassword) {
      setPasswordMsg({ type: 'error', text: 'Passwords do not match.' });
      return;
    }

    setPasswordSubmitting(true);

    try {
      const res = await fetch('/api/v1/auth/password/change', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-csrf-token': csrfToken,
        },
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      const data = await res.json();
      if (res.status === 403 && data?.error?.code === 'REAUTH_REQUIRED') {
        setPendingAction(() => () => handlePasswordChange(e));
        setShowReauthModal(true);
        return;
      }

      if (!res.ok) {
        setPasswordMsg({
          type: 'error',
          text: data?.error?.message || 'Failed to change password',
        });
        return;
      }

      setPasswordMsg({
        type: 'success',
        text: 'Password successfully changed! Other sessions have been revoked.',
      });
      setCurrentPassword('');
      setNewPassword('');
      loadSessions();
    } catch {
      setPasswordMsg({ type: 'error', text: 'An unexpected error occurred.' });
    } finally {
      setPasswordSubmitting(false);
    }
  };

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1 className={styles.title}>Account Security &amp; Sessions</h1>
        <p className={styles.subtitle}>
          Manage active login sessions and update your account password.
        </p>
      </header>

      {/* Reauth Modal */}
      {showReauthModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="reauth-modal-title"
          className={styles.modalBackdrop}
        >
          <div className={styles.modalContent}>
            <h2 id="reauth-modal-title" className={styles.modalTitle}>
              Confirm Your Password
            </h2>
            <p className={styles.modalDescription}>
              This sensitive security operation requires recent reauthentication. Please enter your
              account password.
            </p>
            <form
              onSubmit={handleReauthSubmit}
              style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}
            >
              <Input
                id="reauth-pw"
                name="password"
                type="password"
                label="Account Password"
                value={reauthPassword}
                onChange={(e) => setReauthPassword(e.target.value)}
                required
                autoComplete="current-password"
                autoFocus
              />
              <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                <Button type="button" variant="secondary" onClick={() => setShowReauthModal(false)}>
                  Cancel
                </Button>
                <Button type="submit" variant="primary">
                  Confirm Password
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Active Sessions Section */}
      <section aria-labelledby="sessions-heading" className={styles.section}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2 id="sessions-heading" className={styles.sectionTitle}>
              Active Sessions
            </h2>
            <p className={styles.sectionSubtitle}>
              Logged in devices currently authenticated to your account. Touching any session
              updates its last seen time.
            </p>
          </div>
          <Button variant="secondary" onClick={handleLogoutAll}>
            Log Out All Other Sessions
          </Button>
        </div>

        <div className={styles.sessionList}>
          {sessions.map((sess) => (
            <Card key={sess.publicId} padding="md" className={styles.sessionCard}>
              <div
                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span className={styles.sessionId}>ID: {sess.publicId.slice(0, 8)}...</span>
                    {sess.isCurrent && <Badge variant="info">Current Session</Badge>}
                  </div>
                  <div
                    style={{
                      fontSize: 'var(--text-xs)',
                      color: 'var(--text-muted)',
                      marginTop: '0.25rem',
                    }}
                  >
                    Created: {new Date(sess.createdAt).toLocaleString()} · Last Seen:{' '}
                    {new Date(sess.lastSeenAt).toLocaleString()}
                  </div>
                </div>
                {!sess.isCurrent && (
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => handleRevokeSession(sess.publicId)}
                  >
                    Revoke
                  </Button>
                )}
              </div>
            </Card>
          ))}
        </div>
      </section>

      {/* Change Password Section */}
      <section aria-labelledby="password-heading" className={styles.section}>
        <h2 id="password-heading" className={styles.sectionTitle}>
          Change Password
        </h2>
        <p className={styles.sectionSubtitle}>
          Ensure your password has at least 12 characters and is not easily guessable.
        </p>

        {passwordMsg && (
          <div
            role="alert"
            style={{
              padding: '0.75rem 1rem',
              borderRadius: 'var(--radius-md)',
              marginBottom: '1rem',
              fontSize: 'var(--text-sm)',
              backgroundColor:
                passwordMsg.type === 'error' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(34, 197, 94, 0.1)',
              color: passwordMsg.type === 'error' ? '#ef4444' : '#22c55e',
            }}
          >
            {passwordMsg.text}
          </div>
        )}

        <form
          onSubmit={handlePasswordChange}
          style={{ maxWidth: '440px', display: 'flex', flexDirection: 'column', gap: '1rem' }}
        >
          <Input
            id="current-pw"
            name="currentPassword"
            type="password"
            label="Current Password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            required
            autoComplete="current-password"
            disabled={passwordSubmitting}
          />
          <Input
            id="new-pw"
            name="newPassword"
            type="password"
            label="New Password"
            description="Minimum 12 characters. Must not be common or compromised."
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
            autoComplete="new-password"
            disabled={passwordSubmitting}
          />
          <Input
            id="confirm-new-pw"
            name="confirmPassword"
            type="password"
            label="Confirm New Password"
            value={confirmNewPassword}
            onChange={(e) => setConfirmNewPassword(e.target.value)}
            required
            autoComplete="new-password"
            disabled={passwordSubmitting}
          />
          <Button type="submit" variant="primary" disabled={passwordSubmitting}>
            {passwordSubmitting ? 'Updating...' : 'Update Password'}
          </Button>
        </form>
      </section>
    </div>
  );
}
