import React from 'react';
import Link from 'next/link';
import { Compass, ArrowRight } from 'lucide-react';
import { Card } from '../ui/Card';
import styles from './EmptyState.module.css';

export function EmptyState() {
  return (
    <Card as="section" aria-labelledby="empty-state-heading" className={styles.container}>
      <div className={styles.iconCircle} aria-hidden="true">
        <Compass size={36} />
      </div>
      <div className={styles.content}>
        <h2 id="empty-state-heading" className={styles.title}>
          Begin with Java Foundations
        </h2>
        <p className={styles.description}>
          You haven&apos;t started any lessons yet. Dive into Java Foundations to learn variables,
          control flow, and memory concepts visually.
        </p>
      </div>
      <Link href="/dashboard/learn" className={styles.startAction}>
        <span>Begin First Lesson</span>
        <ArrowRight size={18} aria-hidden="true" />
      </Link>
    </Card>
  );
}
