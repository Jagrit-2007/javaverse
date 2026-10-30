import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { Home, BookOpen, AlertCircle } from 'lucide-react';
import styles from './NotFound.module.css';

export const metadata: Metadata = {
  title: 'Page Not Found — JavaVerse',
  description: 'The requested page could not be found.',
};

export default function NotFound() {
  return (
    <main id="main-content" className={styles.container} aria-labelledby="not-found-heading">
      <div className={styles.content}>
        <div className={styles.iconCircle} aria-hidden="true">
          <AlertCircle size={40} />
        </div>
        <h1 id="not-found-heading" className={styles.title}>
          404 — Page Not Found
        </h1>
        <p className={styles.description}>
          The page or learning resource you are looking for does not exist or may have been
          relocated.
        </p>

        <div className={styles.actions}>
          <Link href="/" className={styles.primaryLink}>
            <Home size={18} aria-hidden="true" />
            <span>Return to Home</span>
          </Link>
          <Link href="/learn" className={styles.secondaryLink}>
            <BookOpen size={18} aria-hidden="true" />
            <span>Browse Curriculum</span>
          </Link>
        </div>
      </div>
    </main>
  );
}
