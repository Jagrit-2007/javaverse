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

interface InvitationItem {
  id: string;
  email: string;
  role: string;
  status: string;
  expiresAt: string;
}

export default function SecuritySettingsPage() {
  const [sessions, setSessions] = useState<SessionItem[]>([]);
  const [invitations, setInvitations] = useState<InvitationItem[]>([]);
  const [isOwner, setIsOwner] = useState(false);
  const [csrfToken, setCsrfToken] = useState('');

  // Password change state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [passwordMsg, setPasswordMsg] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);
  const [passwordSubmitting, setPasswordSubmitting] = useState(false);

  // Reauth prompt state
  const [reauthPassword, setReauthPassword] = useState('');
  const [showReauthModal, setShowReauthModal] = useState(false);
  const [pendingAction, setPendingAction] = useState<(() => Promise<void>) | null>(null);

  // Invite state
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteMsg, setInviteMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(
    null,
  );
  const [inviteSubmitting, setInviteSubmitting] = useState(false);

  const fetchSessionInfo = async () => {
    try {
      const res = await fetch('/api/v1/auth/session');
      const data = await res.json();
      if (data?.data?.user?.role === 'OWNER') {
        setIsOwner(true);
        loadInvitations();
      }
    } catch {}
  };

  const loadSessions = async () => {
    try {
      const res = await fetch('/api/v1/auth/sessions');
      const data = await res.json();
      if (data?.data?.sessions) {
        setSessions(data.data.sessions);
      }
    } catch {}
  };

  const loadInvitations = async () => {
    try {
      const res = await fetch('/api/v1/invitations');
      const data = await res.json();
      if (data?.data?.invitations) {
        setInvitations(data.data.invitations);
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
    fetchSessionInfo();
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
      window.location.href = '/auth/login';
    };
    await action();
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordMsg(null);
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

  const handleCreateInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setInviteMsg(null);
    setInviteSubmitting(true);

    try {
      const res = await fetch('/api/v1/invitations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-csrf-token': csrfToken,
        },
        body: JSON.stringify({ email: inviteEmail.trim() }),
      });

      const data = await res.json();
      if (!res.ok) {
        setInviteMsg({ type: 'error', text: data?.error?.message || 'Failed to send invitation' });
        return;
      }

      setInviteMsg({ type: 'success', text: `Invitation sent to ${inviteEmail}!` });
      setInviteEmail('');
      loadInvitations();
    } catch {
      setInviteMsg({ type: 'error', text: 'Failed to create invitation.' });
    } finally {
      setInviteSubmitting(false);
    }
  };

  const handleRevokeInvite = async (id: string) => {
    try {
      await fetch(`/api/v1/invitations/${id}`, {
        method: 'DELETE',
        headers: { 'x-csrf-token': csrfToken },
      });
      loadInvitations();
    } catch {}
  };

  const handleResendInvite = async (id: string) => {
    try {
      await fetch('/api/v1/invitations/resend', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-csrf-token': csrfToken,
        },
        body: JSON.stringify({ invitationId: id }),
      });
      loadInvitations();
    } catch {}
  };

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1 className={styles.title}>Account Security &amp; Sessions</h1>
        <p className={styles.subtitle}>
          Manage active login sessions, credentials, and workspace memberships.
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
                type="password"
                label="Account Password"
                value={reauthPassword}
                onChange={(e) => setReauthPassword(e.target.value)}
                required
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
            type="password"
            label="Current Password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            required
            disabled={passwordSubmitting}
          />
          <Input
            id="new-pw"
            type="password"
            label="New Password"
            description="Minimum 12 characters"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
            disabled={passwordSubmitting}
          />
          <Button type="submit" variant="primary" disabled={passwordSubmitting}>
            {passwordSubmitting ? 'Updating...' : 'Update Password'}
          </Button>
        </form>
      </section>

      {/* Workspace Member Invitations (Owner Only) */}
      {isOwner && (
        <section aria-labelledby="invitations-heading" className={styles.section}>
          <h2 id="invitations-heading" className={styles.sectionTitle}>
            Workspace Learner Invitations
          </h2>
          <p className={styles.sectionSubtitle}>
            Invite new learners to your private JavaVerse workspace. Each active invitation reserves
            one seat.
          </p>

          {inviteMsg && (
            <div
              role="alert"
              style={{
                padding: '0.75rem 1rem',
                borderRadius: 'var(--radius-md)',
                marginBottom: '1rem',
                fontSize: 'var(--text-sm)',
                backgroundColor:
                  inviteMsg.type === 'error' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(34, 197, 94, 0.1)',
                color: inviteMsg.type === 'error' ? '#ef4444' : '#22c55e',
              }}
            >
              {inviteMsg.text}
            </div>
          )}

          <form
            onSubmit={handleCreateInvite}
            style={{ display: 'flex', gap: '0.5rem', maxWidth: '520px', marginBottom: '1.5rem' }}
          >
            <div style={{ flex: 1 }}>
              <Input
                id="invite-email"
                type="email"
                label="Learner Email"
                hideLabel
                placeholder="learner@example.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                required
                disabled={inviteSubmitting}
              />
            </div>
            <Button type="submit" variant="primary" disabled={inviteSubmitting}>
              {inviteSubmitting ? 'Sending...' : 'Invite'}
            </Button>
          </form>

          <div className={styles.invitationList}>
            {invitations.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', fontSize: 'var(--text-sm)' }}>
                No pending invitations.
              </p>
            ) : (
              invitations.map((inv) => (
                <Card key={inv.id} padding="md" className={styles.sessionCard}>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <div>
                      <span style={{ fontWeight: 600 }}>{inv.email}</span>
                      <div
                        style={{
                          fontSize: 'var(--text-xs)',
                          color: 'var(--text-muted)',
                          marginTop: '0.25rem',
                        }}
                      >
                        Role: {inv.role} · Expires: {new Date(inv.expiresAt).toLocaleDateString()}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => handleResendInvite(inv.id)}
                      >
                        Resend
                      </Button>
                      <Button variant="danger" size="sm" onClick={() => handleRevokeInvite(inv.id)}>
                        Revoke
                      </Button>
                    </div>
                  </div>
                </Card>
              ))
            )}
          </div>
        </section>
      )}
    </div>
  );
}
