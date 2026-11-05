'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import styles from '../Auth.module.css';

export default function MfaChallengePage() {
  const [code, setCode] = useState('');
  const [csrfToken, setCsrfToken] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetch('/api/v1/auth/csrf?flow=mfa')
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
    setError(null);
    setSubmitting(true);

    try {
      const res = await fetch('/api/v1/auth/mfa/challenge', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-csrf-token': csrfToken,
        },
        body: JSON.stringify({ code: code.trim() }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data?.error?.message || 'Invalid or expired TOTP code');
        return;
      }

      window.location.href = '/dashboard';
    } catch {
      setError('An unexpected error occurred during verification.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={styles.authContainer}>
      <div className={styles.authCard}>
        <div className={styles.authHeader}>
          <h1 className={styles.authTitle}>Two-Factor Authentication</h1>
          <p className={styles.authSubtitle}>
            Enter the 6-digit verification code from your authenticator application.
          </p>
        </div>

        {error && (
          <div role="alert" className={`${styles.alertBox} ${styles.alertError}`}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className={styles.authForm} noValidate>
          <Input
            id="mfa-code"
            type="text"
            label="6-Digit Verification Code"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            required
            maxLength={6}
            disabled={submitting}
            autoComplete="one-time-code"
            description="Open your authenticator app to view the active code"
          />

          <Button type="submit" variant="primary" disabled={submitting || !csrfToken} fullWidth>
            {submitting ? 'Verifying...' : 'Verify Code'}
          </Button>
        </form>

        <div className={styles.authFooter}>
          <p>
            Lost your authenticator device?{' '}
            <Link href="/auth/recovery" className={styles.authLink}>
              Use a recovery code
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
