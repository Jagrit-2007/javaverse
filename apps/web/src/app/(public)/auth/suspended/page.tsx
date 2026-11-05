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
      await fetch('/api/v1/auth/logout', {
        method: 'POST',
        headers: {
          'x-csrf-token': csrfData?.data?.csrfToken || '',
        },
      });
    } catch {
      // Proceed with redirection
    } finally {
      window.location.href = '/auth/login';
    }
  };

  return (
    <div className={styles.authContainer}>
      <div className={styles.authCard}>
        <div className={styles.authHeader}>
          <h1 className={styles.authTitle}>Account Suspended</h1>
          <p className={styles.authSubtitle}>
            Your JavaVerse account has been temporarily suspended by the administrator.
          </p>
        </div>

        <div role="alert" className={`${styles.alertBox} ${styles.alertError}`}>
          Access to this workspace has been revoked. If you believe this is an error, please contact
          your workspace administrator or support.
        </div>

        <div style={{ marginTop: 'var(--space-6)' }}>
          <Button type="button" variant="secondary" onClick={handleLogout} fullWidth>
            Sign In with Another Account
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
