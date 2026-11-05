'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import styles from '../Auth.module.css';

export default function InviteAcceptPage() {
  const [token, setToken] = useState<string>('');
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [csrfToken, setCsrfToken] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [tokenMissing, setTokenMissing] = useState(false);

  useEffect(() => {
    // 1. Extract token from hash fragment #token=...
    const hash = window.location.hash.substring(1);
    const params = new URLSearchParams(hash);
    const extractedToken = params.get('token');

    if (extractedToken) {
      setToken(extractedToken);
      // Immediately strip fragment to protect bearer secret from logs/history
      window.history.replaceState(null, '', window.location.pathname);
    } else {
      setTokenMissing(true);
    }

    // 2. Fetch CSRF token
    fetch('/api/v1/auth/csrf?flow=invite')
      .then((res) => res.json())
      .then((data) => {
        if (data?.data?.csrfToken) {
          setCsrfToken(data.data.csrfToken);
        }
      })
      .catch(() => {});
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) {
      setError('Invitation token is missing. Please use the original email link.');
      return;
    }

    setError(null);
    setSubmitting(true);

    try {
      const res = await fetch('/api/v1/invitations/accept', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-csrf-token': csrfToken,
        },
        body: JSON.stringify({
          token,
          password,
          displayName: displayName.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data?.error?.message || 'Failed to accept invitation');
        return;
      }

      window.location.href = '/dashboard';
    } catch {
      setError('An unexpected error occurred while accepting your invitation.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={styles.authContainer}>
      <div className={styles.authCard}>
        <div className={styles.authHeader}>
          <h1 className={styles.authTitle}>Accept Workspace Invitation</h1>
          <p className={styles.authSubtitle}>
            Complete your profile and choose a secure password to join JavaVerse.
          </p>
        </div>

        {tokenMissing && (
          <div role="alert" className={`${styles.alertBox} ${styles.alertError}`}>
            Invitation token is missing from the link. Please check your invitation email.
          </div>
        )}

        {error && (
          <div role="alert" className={`${styles.alertBox} ${styles.alertError}`}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className={styles.authForm} noValidate>
          <Input
            id="member-name"
            type="text"
            label="Your Name (Optional)"
            description="Max 64 characters. Defaults to 'Learner'."
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            disabled={submitting || tokenMissing}
            autoComplete="name"
          />

          <Input
            id="member-password"
            type="password"
            label="Choose a Password"
            description="Minimum 12 characters. Must not be common or compromised."
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="new-password"
            disabled={submitting || tokenMissing}
          />

          <Button type="submit" variant="primary" disabled={submitting || tokenMissing} fullWidth>
            {submitting ? 'Creating Account...' : 'Join Workspace'}
          </Button>
        </form>

        <div className={styles.authFooter}>
          <p>
            Already have an account?{' '}
            <Link href="/auth/login" className={styles.authLink}>
              Sign In
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
