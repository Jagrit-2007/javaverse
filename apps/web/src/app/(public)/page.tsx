import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, Code2, Box, Sparkles, BookOpen, ShieldCheck } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { VisualConceptPreview } from '@/components/dashboard/VisualConceptPreview';
import styles from './LandingPage.module.css';

export const metadata: Metadata = {
  title: 'JavaVerse — Learn Java. Build Your Thinking.',
  description:
    'Open-source, self-hosted, visual-first Java learning platform. Master concepts through interactive intuition and practical problem solving.',
};

export default function LandingPage() {
  return (
    <div className={styles.container}>
      {/* Hero Section */}
      <section className={styles.hero} aria-labelledby="landing-hero-heading">
        <div className={styles.heroContent}>
          <Badge variant="neutral" size="md" className={styles.heroBadge}>
            <ShieldCheck size={14} aria-hidden="true" />
            <span>Open-Source &amp; Self-Hosted Java Learning</span>
          </Badge>

          <h1 id="landing-hero-heading" className={styles.heroTitle}>
            Master Java Through Intuition &amp; Practical Problem Solving
          </h1>

          <p className={styles.heroSubtitle}>
            Explore how JavaVerse brings together concept visualizations, structured learning paths,
            guided practice, and verified feedback. Built around understanding, practice, and
            durable problem-solving skills.
          </p>

          <div className={styles.heroActions}>
            <Link href="/dashboard" className={styles.primaryCta}>
              <span>View Demo Dashboard</span>
              <ArrowRight size={18} aria-hidden="true" />
            </Link>
            <Link href="/learn" className={styles.secondaryCta}>
              <BookOpen size={16} aria-hidden="true" />
              <span>Preview Curriculum</span>
            </Link>
          </div>
        </div>

        <div className={styles.heroPreview}>
          <VisualConceptPreview />
        </div>
      </section>

      {/* 3 Pillars Section */}
      <section className={styles.featuresSection} aria-labelledby="features-heading">
        <div className={styles.sectionHeader}>
          <span className={styles.sectionTag}>Learning-First Architecture</span>
          <h2 id="features-heading" className={styles.sectionTitle}>
            How JavaVerse Builds Real Developer Thinking
          </h2>
        </div>

        <div className={styles.featuresGrid}>
          <div className={styles.featureCard}>
            <div className={styles.featureIcon} style={{ color: '#0ea5e9' }} aria-hidden="true">
              <Box size={24} />
            </div>
            <h3 className={styles.featureTitle}>Concept Visualizations</h3>
            <p className={styles.featureDesc}>
              See class hierarchies, memory references, and data structures come alive through
              intuitive diagrams before writing code.
            </p>
          </div>

          <div className={styles.featureCard}>
            <div className={styles.featureIcon} style={{ color: '#8b5cf6' }} aria-hidden="true">
              <Code2 size={24} />
            </div>
            <h3 className={styles.featureTitle}>Targeted Practice</h3>
            <p className={styles.featureDesc}>
              Practise Java concepts through focused problems, guided reasoning, and clear feedback.
            </p>
          </div>

          <div className={styles.featureCard}>
            <div className={styles.featureIcon} style={{ color: '#10b981' }} aria-hidden="true">
              <Sparkles size={24} />
            </div>
            <h3 className={styles.featureTitle}>AI Guidance as a Mentor</h3>
            <p className={styles.featureDesc}>
              AI assistance is integrated as a thoughtful educator that helps you debug and reason,
              not a chatbot that generates code for you.
            </p>
          </div>
        </div>
      </section>

      {/* Curriculum Callout Banner */}
      <section className={styles.ctaBanner} aria-labelledby="cta-heading">
        <div className={styles.ctaInner}>
          <h2 id="cta-heading" className={styles.ctaTitle}>
            Ready to make Java click?
          </h2>
          <p className={styles.ctaSubtitle}>
            Browse our structured curriculum or jump directly into the learning dashboard demo
            shell.
          </p>
          <div className={styles.ctaActions}>
            <Link href="/dashboard" className={styles.primaryCta}>
              <span>Launch Demo Dashboard</span>
              <ArrowRight size={18} aria-hidden="true" />
            </Link>
            <Link href="/learn" className={styles.secondaryCta}>
              <span>Browse 4 Core Tracks</span>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
