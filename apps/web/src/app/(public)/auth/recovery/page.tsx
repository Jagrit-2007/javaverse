'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import styles from '../Auth.module.css';

export default function MfaRecoveryPage() {
  const [recoveryCode, setRecoveryCode] = useState('');
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
      const res = await fetch('/api/v1/auth/mfa/recovery', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-csrf-token': csrfToken,
        },
        body: JSON.stringify({ recoveryCode: recoveryCode.trim() }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data?.error?.message || 'Invalid or already used recovery code');
        return;
      }

      window.location.href = '/dashboard';
    } catch {
      setError('An unexpected error occurred during recovery.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={styles.authContainer}>
      <div className={styles.authCard}>
        <div className={styles.authHeader}>
          <h1 className={styles.authTitle}>Emergency Recovery</h1>
          <p className={styles.authSubtitle}>
            Enter one of your 16-character backup recovery codes to access your account.
          </p>
        </div>

        {error && (
          <div role="alert" className={`${styles.alertBox} ${styles.alertError}`}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className={styles.authForm} noValidate>
          <Input
            id="recovery-code"
            type="text"
            label="Recovery Code"
            description="Format: XXXX-XXXX-XXXX-XXXX (dashes optional)"
            value={recoveryCode}
            onChange={(e) => setRecoveryCode(e.target.value)}
            required
            disabled={submitting}
            autoComplete="off"
          />

          <Button type="submit" variant="primary" disabled={submitting} fullWidth>
            {submitting ? 'Authenticating...' : 'Sign In with Recovery Code'}
          </Button>
        </form>

        <div className={styles.authFooter}>
          <p>
            Have your authenticator device?{' '}
            <Link href="/auth/mfa" className={styles.authLink}>
              Use TOTP code
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
