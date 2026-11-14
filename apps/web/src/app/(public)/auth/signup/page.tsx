'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import styles from '../Auth.module.css';

export default function SignupPage() {
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [_csrfToken, setCsrfToken] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const csrfTokenRef = useRef<string>('');

  const fetchCsrfToken = async (): Promise<string> => {
    try {
      const res = await fetch('/api/v1/auth/csrf?flow=signup', {
        cache: 'no-store',
        headers: { Pragma: 'no-cache' },
      });
      const data = await res.json();
      const token = data?.data?.csrfToken || '';
      if (token) {
        csrfTokenRef.current = token;
        setCsrfToken(token);
      }
      return token;
    } catch {
      return '';
    }
  };

  useEffect(() => {
    // Canonical host enforcement: redirect 127.0.0.1 to localhost before form interaction
    if (typeof window !== 'undefined' && window.location.hostname === '127.0.0.1') {
      const canonicalUrl = window.location.href.replace('//127.0.0.1:', '//localhost:');
      window.location.replace(canonicalUrl);
      return;
    }

    fetchCsrfToken();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setError(null);

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setSubmitting(true);

    try {
      let activeCsrfToken = csrfTokenRef.current;
      if (!activeCsrfToken) {
        activeCsrfToken = await fetchCsrfToken();
      }

      const submitSignup = async (token: string) => {
        return fetch('/api/v1/auth/signup', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-csrf-token': token,
          },
          body: JSON.stringify({
            displayName: displayName.trim() || undefined,
            email: email.trim(),
            password,
            confirmPassword,
          }),
        });
      };

      let res = await submitSignup(activeCsrfToken);
      let data = await res.json().catch(() => null);

      // Safe one-time automatic retry on recognized pre-auth CSRF failure
      if (!res.ok && data?.error?.code === 'CSRF_ERROR') {
        const freshToken = await fetchCsrfToken();
        if (freshToken) {
          res = await submitSignup(freshToken);
          data = await res.json().catch(() => null);
        }
      }

      if (!res.ok) {
        if (data?.error?.code === 'CSRF_ERROR') {
          setError('Your secure signup session expired. Please try again.');
        } else {
          setError(data?.error?.message || 'Failed to create account');
        }
        return;
      }

      window.location.href = '/auth/login?created=1';
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
            name="displayName"
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
            name="email"
            type="email"
            label="Email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="username"
            disabled={submitting}
          />

          <Input
            id="signup-password"
            name="password"
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
            name="confirmPassword"
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
