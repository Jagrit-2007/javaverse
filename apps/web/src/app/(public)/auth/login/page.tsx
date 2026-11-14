'use client';

import React, { useState, useEffect, useRef } from 'react';
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
  const [_csrfToken, setCsrfToken] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [createdNotice, setCreatedNotice] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const csrfTokenRef = useRef<string>('');

  const fetchCsrfToken = async (): Promise<string> => {
    try {
      const res = await fetch('/api/v1/auth/csrf?flow=login', {
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

    if (typeof window !== 'undefined') {
      const sp = new URLSearchParams(window.location.search);
      const ret = sp.get('returnUrl');
      if (ret && ret.startsWith('/dashboard')) {
        setReturnUrl(ret);
      }
      if (sp.get('created') === '1' || sp.get('created') === 'true') {
        setCreatedNotice(true);
      }
    }

    fetchCsrfToken();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setError(null);
    setCreatedNotice(false);
    setSubmitting(true);

    try {
      let activeCsrfToken = csrfTokenRef.current;
      if (!activeCsrfToken) {
        activeCsrfToken = await fetchCsrfToken();
      }

      const submitLogin = async (token: string) => {
        return fetch('/api/v1/auth/login', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-csrf-token': token,
          },
          body: JSON.stringify({ email: email.trim(), password }),
        });
      };

      let res = await submitLogin(activeCsrfToken);
      let data = await res.json().catch(() => null);

      // Safe one-time automatic retry on recognized pre-auth CSRF failure
      if (!res.ok && data?.error?.code === 'CSRF_ERROR') {
        const freshToken = await fetchCsrfToken();
        if (freshToken) {
          res = await submitLogin(freshToken);
          data = await res.json().catch(() => null);
        }
      }

      if (!res.ok) {
        if (data?.error?.code === 'CSRF_ERROR') {
          setError('Your secure sign-in session expired. Please try again.');
        } else {
          setError(data?.error?.message || 'Invalid email or password');
        }
        return;
      }

      if (data?.data?.mfaRequired) {
        router.push('/auth/mfa');
      } else {
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

        {createdNotice && (
          <div role="status" className={`${styles.alertBox} ${styles.alertSuccess}`}>
            Account created successfully. Sign in with your email and password.
          </div>
        )}

        {error && (
          <div role="alert" className={`${styles.alertBox} ${styles.alertError}`}>
            {error}
          </div>
        )}

        <form method="POST" onSubmit={handleSubmit} className={styles.authForm} noValidate>
          <Input
            id="login-email"
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
            id="login-password"
            name="password"
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
            Don&apos;t have an account?{' '}
            <Link href="/auth/signup" className={styles.authLink}>
              Create account
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
