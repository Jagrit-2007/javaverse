import React from 'react';
import type { Metadata } from 'next';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import styles from './LegalPage.module.css';

export const metadata: Metadata = {
  title: 'Privacy Policy (Template)',
  description: 'JavaVerse template privacy policy documentation awaiting operator legal review.',
};

export default function PrivacyPage() {
  return (
    <article className={styles.container}>
      <header className={styles.header}>
        <div className={styles.badgeRow}>
          <Badge variant="warning" size="md">
            Project Template — Requires Legal Review
          </Badge>
        </div>
        <h1 className={styles.title}>Privacy Policy (Template)</h1>
        <p className={styles.subtitle}>
          This document serves as an open-source reference template for self-hosted JavaVerse
          operators. It does not constitute legal counsel and must be reviewed against applicable
          local regulations before public deployment.
        </p>
      </header>

      <Card as="div" padding="lg" className={styles.contentCard}>
        <section className={styles.section}>
          <h2>1. Overview of Data Processing</h2>
          <p>
            JavaVerse is designed as self-hosted software. In a standard self-hosted deployment, the
            operator of the server controls all databases, caches, and storage buckets. The upstream
            open-source project does not receive or harvest learner telemetry.
          </p>
        </section>

        <section className={styles.section}>
          <h2>2. Learner Data Collected by Host Operators</h2>
          <p>
            When self-hosted, the platform stores account credentials (hashed using
            industry-standard password derivation), session state, submitted coding exercises, and
            learning progress records in PostgreSQL.
          </p>
        </section>

        <section className={styles.section}>
          <h2>3. Third-Party Model Providers</h2>
          <p>
            When configured with external AI providers (such as Anthropic or Gemini), submitted
            questions and code snippets may be transmitted to the respective API endpoints in
            accordance with the operator&apos;s API service agreements.
          </p>
        </section>

        <section className={styles.section}>
          <h2>4. Operator Responsibilities</h2>
          <p>
            Operators deploying JavaVerse in production are responsible for ensuring compliance with
            relevant data privacy laws (such as GDPR, CCPA, and India DPDP) applicable to their
            jurisdictions.
          </p>
        </section>
      </Card>
    </article>
  );
}
