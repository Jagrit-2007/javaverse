'use client';

import React from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import styles from './Error.module.css';

interface ErrorPageProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function ErrorPage({ error, reset }: ErrorPageProps) {
  return (
    <main
      id="main-content"
      className={styles.container}
      role="alert"
      aria-labelledby="error-heading"
    >
      <div className={styles.card}>
        <div className={styles.iconCircle} aria-hidden="true">
          <AlertTriangle size={36} />
        </div>
        <h1 id="error-heading" className={styles.title}>
          Something went wrong
        </h1>
        <p className={styles.message}>
          An unexpected error occurred while rendering this view. Our observability system records
          this incident for diagnosis.
        </p>

        {error.digest && (
          <div className={styles.digestBox}>
            <span className={styles.digestLabel}>Incident Reference:</span>
            <code className={styles.digestCode}>{error.digest}</code>
          </div>
        )}

        <div className={styles.actions}>
          <Button variant="primary" onClick={reset}>
            <RotateCcw size={16} aria-hidden="true" />
            <span>Try Again</span>
          </Button>
        </div>
      </div>
    </main>
  );
}
