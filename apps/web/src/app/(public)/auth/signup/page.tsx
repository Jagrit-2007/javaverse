'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import styles from '../Auth.module.css';

export default function SignupPage() {
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [csrfToken, setCsrfToken] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetch('/api/v1/auth/csrf?flow=signup')
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

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setSubmitting(true);

    try {
      let activeCsrfToken = csrfToken;
      if (!activeCsrfToken) {
        try {
          const csrfRes = await fetch('/api/v1/auth/csrf?flow=signup');
          const csrfData = await csrfRes.json();
          activeCsrfToken = csrfData?.data?.csrfToken || '';
          if (activeCsrfToken) {
            setCsrfToken(activeCsrfToken);
          }
        } catch {
          // Fall through to request attempt
        }
      }

      const res = await fetch('/api/v1/auth/signup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-csrf-token': activeCsrfToken,
        },
        body: JSON.stringify({
          displayName: displayName.trim() || undefined,
          email: email.trim(),
          password,
          confirmPassword,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data?.error?.message || 'Failed to create account');
        return;
      }

      window.location.href = '/dashboard';
    } catch {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={styles.authContainer}>
      <div className={styles.authCard}>
        <div className={styles.authHeader}>
          <h1 className={styles.authTitle}>Create your account</h1>
          <p className={styles.authSubtitle}>
            Accounts are stored in this local JavaVerse installation. Up to 5 accounts may be
            created. Existing users can continue signing in after the limit is reached.
          </p>
        </div>

        {error && (
          <div role="alert" className={`${styles.alertBox} ${styles.alertError}`}>
            {error}
          </div>
        )}

        <form method="POST" onSubmit={handleSubmit} className={styles.authForm} noValidate>
          <Input
            id="signup-name"
            type="text"
            label="Your Name (Optional)"
            description="Max 64 characters. Defaults to 'Learner'."
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            disabled={submitting}
            autoComplete="name"
          />

          <Input
            id="signup-email"
            type="email"
            label="Email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
            disabled={submitting}
          />

          <Input
            id="signup-password"
            type="password"
            label="Password"
            description="Minimum 12 characters. Must not be common or compromised."
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="new-password"
            disabled={submitting}
          />

          <Input
            id="signup-confirm-password"
            type="password"
            label="Confirm Password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            autoComplete="new-password"
            disabled={submitting}
          />

          <Button type="submit" variant="primary" disabled={submitting} fullWidth>
            {submitting ? 'Creating account...' : 'Create account'}
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
