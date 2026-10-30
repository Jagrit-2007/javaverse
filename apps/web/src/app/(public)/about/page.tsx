import React from 'react';
import type { Metadata } from 'next';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import styles from './AboutPage.module.css';

export const metadata: Metadata = {
  title: 'About JavaVerse',
  description: 'The mission, architecture, and principles behind JavaVerse.',
};

export default function AboutPage() {
  return (
    <article className={styles.container}>
      <header className={styles.header}>
        <Badge variant="neutral" size="sm">
          Project Mission
        </Badge>
        <h1 className={styles.title}>About JavaVerse</h1>
        <p className={styles.subtitle}>
          An open-source, provider-neutral Java education platform created to make core programming
          concepts intuitive, structured, and visually engaging.
        </p>
      </header>

      <section className={styles.section} aria-labelledby="why-heading">
        <h2 id="why-heading" className={styles.sectionTitle}>
          Why Visual Intuition Matters
        </h2>
        <p className={styles.paragraph}>
          Learning Java often bogs down in boilerplate syntax, abstract object references, and
          memory mechanics. Many learners memorize keywords without developing a clear mental model
          of how the Java Virtual Machine executes their programs.
        </p>
        <p className={styles.paragraph}>
          JavaVerse connects theory and execution by accompanying code examples with interactive
          diagrams. When learners see stack frames, heap allocations, and inheritance trees visually
          mapped, concepts become memorable and intuitive.
        </p>
      </section>

      <section className={styles.section} aria-labelledby="principles-heading">
        <h2 id="principles-heading" className={styles.sectionTitle}>
          Core Architectural Principles
        </h2>

        <div className={styles.principlesGrid}>
          <Card as="div" padding="md" className={styles.principleCard}>
            <h3 className={styles.principleTitle}>1. Self-Hosted &amp; Open-Source</h3>
            <p className={styles.principleDesc}>
              JavaVerse is built to be self-hosted with Docker Compose or Kubernetes, giving
              educational institutions and individual developers complete sovereignty over their
              data and infrastructure.
            </p>
          </Card>

          <Card as="div" padding="md" className={styles.principleCard}>
            <h3 className={styles.principleTitle}>2. Provider-Neutral Architecture</h3>
            <p className={styles.principleDesc}>
              AI functionality is abstracted behind clean provider interfaces. Deployments can
              leverage deterministic mock providers, hosted frontier models, or future local
              inference engines without vendor lock-in.
            </p>
          </Card>

          <Card as="div" padding="md" className={styles.principleCard}>
            <h3 className={styles.principleTitle}>3. Rigorous Safety &amp; Isolation</h3>
            <p className={styles.principleDesc}>
              Learner code and untrusted inputs are strictly isolated from application processes
              through sandboxed execution environments, protecting host integrity.
            </p>
          </Card>
        </div>
      </section>
    </article>
  );
}
