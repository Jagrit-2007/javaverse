import React from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import styles from './PreviewShell.module.css';

interface PreviewShellProps {
  title: string;
  subtitle: string;
  phaseBadge: string;
  children?: React.ReactNode;
}

export function PreviewShell({ title, subtitle, phaseBadge, children }: PreviewShellProps) {
  return (
    <div className={styles.container}>
      <div className={styles.topNav}>
        <Link href="/dashboard" className={styles.backLink}>
          <ArrowLeft size={16} aria-hidden="true" />
          <span>Back to Dashboard</span>
        </Link>
      </div>

      <header className={styles.header}>
        <div className={styles.badgeRow}>
          <Badge variant="neutral" size="sm">
            {phaseBadge}
          </Badge>
        </div>
        <h1 className={styles.title}>{title}</h1>
        <p className={styles.subtitle}>{subtitle}</p>
      </header>

      <Card as="section" padding="lg" className={styles.contentCard}>
        {children}
      </Card>
    </div>
  );
}
