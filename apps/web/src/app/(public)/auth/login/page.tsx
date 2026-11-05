'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import styles from '../Auth.module.css';

export default function LoginPage() {
  const router = useRouter();
  const [returnUrl, setReturnUrl] = useState('/dashboard');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [csrfToken, setCsrfToken] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const sp = new URLSearchParams(window.location.search);
      const ret = sp.get('returnUrl');
      if (ret && ret.startsWith('/dashboard')) {
        setReturnUrl(ret);
      }
    }

    fetch('/api/v1/auth/csrf?flow=login')
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
      const res = await fetch('/api/v1/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-csrf-token': csrfToken,
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data?.error?.message || 'Invalid email or password');
        return;
      }

      if (data?.data?.mfaRequired) {
        router.push('/auth/mfa');
      } else {
        // Safe relative redirect
        const safeDestination = returnUrl.startsWith('/dashboard') ? returnUrl : '/dashboard';
        window.location.href = safeDestination;
      }
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
          <h1 className={styles.authTitle}>Sign in to JavaVerse</h1>
          <p className={styles.authSubtitle}>
            Welcome back! Enter your credentials to continue your learning journey.
          </p>
        </div>

        {error && (
          <div role="alert" className={`${styles.alertBox} ${styles.alertError}`}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className={styles.authForm} noValidate>
          <Input
            id="login-email"
            type="email"
            label="Email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
            disabled={submitting}
          />

          <Input
            id="login-password"
            type="password"
            label="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
            disabled={submitting}
          />

          <div style={{ textAlign: 'right', marginTop: '-0.5rem' }}>
            <Link href="/auth/forgot-password" className={styles.authLink}>
              Forgot password?
            </Link>
          </div>

          <Button type="submit" variant="primary" disabled={submitting} fullWidth>
            {submitting ? 'Signing in...' : 'Sign In'}
          </Button>
        </form>

        <div className={styles.authFooter}>
          <p>
            First time setting up the workspace?{' '}
            <Link href="/auth/bootstrap" className={styles.authLink}>
              Owner bootstrap
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
