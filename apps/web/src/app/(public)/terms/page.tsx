import React from 'react';
import type { Metadata } from 'next';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import styles from './LegalPage.module.css';

export const metadata: Metadata = {
  title: 'Terms of Service (Template)',
  description: 'JavaVerse template terms of service documentation awaiting operator legal review.',
};

export default function TermsPage() {
  return (
    <article className={styles.container}>
      <header className={styles.header}>
        <div className={styles.badgeRow}>
          <Badge variant="warning" size="md">
            Project Template — Requires Legal Review
          </Badge>
        </div>
        <h1 className={styles.title}>Terms of Service (Template)</h1>
        <p className={styles.subtitle}>
          This terms of service document is a reference template provided for self-hosted instances
          of JavaVerse. Each self-hosted deployment operator must customize and review these terms
          with qualified legal counsel.
        </p>
      </header>

      <Card as="div" padding="lg" className={styles.contentCard}>
        <section className={styles.section}>
          <h2>1. Acceptance of Terms</h2>
          <p>
            By accessing or using this self-hosted JavaVerse deployment, you agree to comply with
            the acceptable use guidelines established by your deployment operator.
          </p>
        </section>

        <section className={styles.section}>
          <h2>2. Permitted Use &amp; Code Execution Sandbox</h2>
          <p>
            JavaVerse provides a sandboxed execution environment strictly for learning Java
            programming concepts. Users may not attempt container breakouts, denial-of-service
            attacks, port scanning, or malicious code execution against the host or connected
            network services.
          </p>
        </section>

        <section className={styles.section}>
          <h2>3. Intellectual Property &amp; Open Source</h2>
          <p>
            JavaVerse source code is distributed under an open-source software license. Learner
            exercise solutions remain the intellectual property of their respective authors, subject
            to license terms agreed upon with the deployment host.
          </p>
        </section>

        <section className={styles.section}>
          <h2>4. Disclaimer of Warranty</h2>
          <p>
            The software is provided &quot;as is&quot;, without warranty of any kind, express or
            implied. In no event shall the authors or copyright holders be liable for any claim,
            damages, or other liability.
          </p>
        </section>
      </Card>
    </article>
  );
}
