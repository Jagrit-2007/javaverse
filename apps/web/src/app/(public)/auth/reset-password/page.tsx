'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import styles from '../Auth.module.css';

export default function ResetPasswordPage() {
  const router = useRouter();
  const [token, setToken] = useState<string>('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [csrfToken, setCsrfToken] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [tokenMissing, setTokenMissing] = useState(false);

  useEffect(() => {
    // Extract token from hash fragment #token=...
    const hash = window.location.hash.substring(1);
    const params = new URLSearchParams(hash);
    const extractedToken = params.get('token');

    if (extractedToken) {
      setToken(extractedToken);
      // Immediately strip fragment
      window.history.replaceState(null, '', window.location.pathname);
    } else {
      setTokenMissing(true);
    }

    fetch('/api/v1/auth/csrf?flow=reset_password')
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
      setError('Password reset token is missing. Please use the original email link.');
      return;
    }

    if (password.length < 12) {
      setError('Use at least 12 characters.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setError(null);
    setSubmitting(true);

    try {
      const res = await fetch('/api/v1/auth/password/reset', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-csrf-token': csrfToken,
        },
        body: JSON.stringify({ token, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data?.error?.message || 'Failed to reset password');
        return;
      }

      setSuccess(true);
      setTimeout(() => {
        router.push('/auth/login');
      }, 2500);
    } catch {
      setError('An unexpected error occurred while resetting your password.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={styles.authContainer}>
      <div className={styles.authCard}>
        <div className={styles.authHeader}>
          <h1 className={styles.authTitle}>Choose New Password</h1>
          <p className={styles.authSubtitle}>
            Create a secure new password for your JavaVerse account.
          </p>
        </div>

        {tokenMissing && (
          <div role="alert" className={`${styles.alertBox} ${styles.alertError}`}>
            Reset token is missing from the link. Please check your reset email.
          </div>
        )}

        {error && (
          <div role="alert" className={`${styles.alertBox} ${styles.alertError}`}>
            {error}
          </div>
        )}

        {success && (
          <div role="status" className={`${styles.alertBox} ${styles.alertSuccess}`}>
            Password successfully reset! Redirecting to sign in...
          </div>
        )}

        {!success && (
          <form onSubmit={handleSubmit} className={styles.authForm} noValidate>
            <Input
              id="new-password"
              name="password"
              type="password"
              label="New Password"
              description="Minimum 12 characters. Must not be common or compromised."
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="new-password"
              disabled={submitting || tokenMissing}
            />

            <Input
              id="confirm-new-password"
              name="confirmPassword"
              type="password"
              label="Confirm New Password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              autoComplete="new-password"
              disabled={submitting || tokenMissing}
            />

            <Button type="submit" variant="primary" disabled={submitting || tokenMissing} fullWidth>
              {submitting ? 'Resetting Password...' : 'Save New Password'}
            </Button>
          </form>
        )}

        <div className={styles.authFooter}>
          <p>
            <Link href="/auth/login" className={styles.authLink}>
              Return to Sign In
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
