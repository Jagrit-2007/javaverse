import React from 'react';
import type { Metadata } from 'next';
import { GitBranch, MessageSquare, Mail } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import styles from './ContactPage.module.css';

export const metadata: Metadata = {
  title: 'Contact & Support',
  description: 'Connect with the JavaVerse open-source community and project maintainers.',
};

export default function ContactPage() {
  return (
    <article className={styles.container}>
      <header className={styles.header}>
        <Badge variant="neutral" size="sm">
          Community Support
        </Badge>
        <h1 className={styles.title}>Contact &amp; Issue Reporting</h1>
        <p className={styles.subtitle}>
          JavaVerse is maintained by an open-source community. Connect with maintainers and
          educators through our official channels.
        </p>
      </header>

      <div className={styles.cardsGrid}>
        <Card as="section" padding="md" className={styles.contactCard}>
          <div className={styles.iconCircle} aria-hidden="true">
            <GitBranch size={24} />
          </div>
          <h2 className={styles.cardTitle}>GitHub Repository</h2>
          <p className={styles.cardDesc}>
            Report defects, request architectural enhancements, and track ongoing milestone
            development in our issue tracker.
          </p>
          <a
            href="https://github.com/Jagrit-2007/javaverse"
            target="_blank"
            rel="noopener noreferrer"
            className={styles.cardLink}
          >
            Visit GitHub Repository &rarr;
          </a>
        </Card>

        <Card as="section" padding="md" className={styles.contactCard}>
          <div className={styles.iconCircle} aria-hidden="true">
            <MessageSquare size={24} />
          </div>
          <h2 className={styles.cardTitle}>Discussions &amp; Ideas</h2>
          <p className={styles.cardDesc}>
            Participate in learning pedagogy discussions, share visualization suggestions, and get
            pair-programming tips.
          </p>
          <a
            href="https://github.com/Jagrit-2007/javaverse/discussions"
            target="_blank"
            rel="noopener noreferrer"
            className={styles.cardLink}
          >
            Join Discussions &rarr;
          </a>
        </Card>

        <Card as="section" padding="md" className={styles.contactCard}>
          <div className={styles.iconCircle} aria-hidden="true">
            <Mail size={24} />
          </div>
          <h2 className={styles.cardTitle}>Operator Assistance</h2>
          <p className={styles.cardDesc}>
            For configuration questions or self-hosted deployment runbooks, consult our project
            documentation.
          </p>
          <a href="/about" className={styles.cardLink}>
            Read Documentation &rarr;
          </a>
        </Card>
      </div>
    </article>
  );
}
