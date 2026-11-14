'use client';

import React from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import styles from '../Auth.module.css';

export default function SuspendedAccountPage() {
  const handleLogout = async () => {
    try {
      const csrfRes = await fetch('/api/v1/auth/csrf');
      const csrfData = await csrfRes.json();
      const res = await fetch('/api/v1/auth/logout', {
        method: 'POST',
        headers: {
          'x-csrf-token': csrfData?.data?.csrfToken || '',
        },
      });
      if (res.ok) {
        if (typeof window !== 'undefined') {
          sessionStorage.removeItem('external_ai_consent');
        }
        window.location.href = '/auth/login';
      }
    } catch {
      // Do not navigate away if logout fails
    }
  };

  return (
    <div className={styles.authContainer}>
      <div className={styles.authCard}>
        <div className={styles.authHeader}>
          <h1 className={styles.authTitle}>Account Suspended</h1>
          <p className={styles.authSubtitle}>
            This account is currently unavailable. Account recovery is not yet supported in the
            JavaVerse interface.
          </p>
        </div>

        <div role="alert" className={`${styles.alertBox} ${styles.alertError}`}>
          This account is currently unavailable. Account recovery is not yet supported in the
          JavaVerse interface.
        </div>

        <div style={{ marginTop: 'var(--space-6)' }}>
          <Button type="button" variant="secondary" onClick={handleLogout} fullWidth>
            Return to Sign in
          </Button>
        </div>

        <div className={styles.authFooter}>
          <p>
            Need help?{' '}
            <Link href="/contact" className={styles.authLink}>
              Contact support
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
