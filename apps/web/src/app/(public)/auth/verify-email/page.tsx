'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import styles from '../Auth.module.css';

export default function VerifyEmailPage() {
  const [status, setStatus] = useState<'verifying' | 'success' | 'error'>('verifying');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    const hash = window.location.hash.substring(1);
    const params = new URLSearchParams(hash);
    const token = params.get('token');

    if (!token) {
      setStatus('error');
      setErrorMessage('Verification token is missing from the link.');
      return;
    }

    // Immediately strip token fragment
    window.history.replaceState(null, '', window.location.pathname);

    // Fetch CSRF and verify
    fetch('/api/v1/auth/csrf?flow=verify_email')
      .then((res) => res.json())
      .then(async (csrfData) => {
        const csrfToken = csrfData?.data?.csrfToken || '';
        const verifyRes = await fetch('/api/v1/auth/email/verify', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-csrf-token': csrfToken,
          },
          body: JSON.stringify({ token }),
        });

        const data = await verifyRes.json();
        if (verifyRes.ok) {
          setStatus('success');
        } else {
          setStatus('error');
          setErrorMessage(data?.error?.message || 'Verification link is invalid or expired.');
        }
      })
      .catch(() => {
        setStatus('error');
        setErrorMessage('Failed to connect to verification service.');
      });
  }, []);

  return (
    <div className={styles.authContainer}>
      <div className={styles.authCard}>
        <div className={styles.authHeader}>
          <h1 className={styles.authTitle}>Email Verification</h1>
          <p className={styles.authSubtitle}>
            {status === 'verifying' && 'Confirming your email address...'}
            {status === 'success' && 'Your email address has been successfully verified!'}
            {status === 'error' && 'Verification could not be completed.'}
          </p>
        </div>

        {status === 'verifying' && (
          <div style={{ textAlign: 'center', padding: 'var(--space-6) 0' }}>
            <p>Please wait while we verify your account...</p>
          </div>
        )}

        {status === 'success' && (
          <div>
            <div role="status" className={`${styles.alertBox} ${styles.alertSuccess}`}>
              Your email is verified. You now have full access to JavaVerse.
            </div>
            <Button
              type="button"
              variant="primary"
              onClick={() => {
                window.location.href = '/dashboard';
              }}
              fullWidth
            >
              Continue to Dashboard
            </Button>
          </div>
        )}

        {status === 'error' && (
          <div>
            <div role="alert" className={`${styles.alertBox} ${styles.alertError}`}>
              {errorMessage}
            </div>
            <div className={styles.authFooter}>
              <Link href="/auth/login" className={styles.authLink}>
                Return to Sign In
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
