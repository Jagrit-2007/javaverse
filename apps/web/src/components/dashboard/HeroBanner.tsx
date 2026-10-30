import React from 'react';
import Link from 'next/link';
import { Sparkles, ArrowRight } from 'lucide-react';
import styles from './HeroBanner.module.css';

interface HeroBannerProps {
  greeting?: string;
  headline?: string;
  subheadline?: string;
}

export function HeroBanner({
  greeting = 'Welcome back, learner.',
  headline = "Let's make Java click today.",
  subheadline = 'Learn concepts visually, practice with real problems, and build the confidence to solve anything in Java.',
}: HeroBannerProps) {
  return (
    <section className={styles.heroSection} aria-labelledby="hero-headline">
      <div className={styles.heroText}>
        <span className={styles.greeting}>{greeting}</span>
        <h1 id="hero-headline" className={styles.headline}>
          {headline}
        </h1>
        <p className={styles.subheadline}>{subheadline}</p>

        <div className={styles.actions}>
          <Link href="/dashboard/learn" className={styles.primaryAction}>
            <span>Continue Learning</span>
            <ArrowRight size={18} aria-hidden="true" />
          </Link>
          <Link href="/dashboard/ask" className={styles.secondaryAction}>
            <Sparkles size={16} aria-hidden="true" />
            <span>Ask JavaVerse</span>
          </Link>
        </div>
      </div>

      <div className={styles.heroVisual} aria-hidden="true">
        <div className={styles.visualCard}>
          <div className={styles.visualMotto}>
            <span className={styles.mottoMain}>Same Concepts.</span>
            <span className={styles.mottoSub}>Deeper Understanding.</span>
          </div>

          <div className={styles.illustration}>
            {/* Geometric Desk & Learner SVG */}
            <svg
              width="220"
              height="150"
              viewBox="0 0 220 150"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              {/* Desk */}
              <rect x="20" y="115" width="180" height="8" rx="4" fill="var(--border-strong)" />
              <rect x="35" y="123" width="6" height="25" fill="var(--border-subtle)" />
              <rect x="179" y="123" width="6" height="25" fill="var(--border-subtle)" />

              {/* Laptop */}
              <rect x="75" y="65" width="70" height="48" rx="4" fill="var(--brand-facet)" />
              <rect x="80" y="70" width="60" height="38" rx="2" fill="var(--bg-canvas)" />
              <path d="M65 113 L155 113 L150 117 L70 117 Z" fill="var(--border-strong)" />

              {/* Code lines on screen */}
              <rect x="85" y="75" width="25" height="3" rx="1" fill="var(--brand-amber)" />
              <rect x="85" y="81" width="40" height="2.5" rx="1" fill="var(--text-muted)" />
              <rect x="90" y="86" width="30" height="2.5" rx="1" fill="var(--text-muted)" />
              <rect
                x="85"
                y="91"
                width="35"
                height="2.5"
                rx="1"
                fill="var(--status-success-text)"
              />
              <rect x="90" y="96" width="20" height="2.5" rx="1" fill="var(--brand-amber)" />

              {/* Coffee / Notes Mug with simple geometric steam */}
              <rect
                x="155"
                y="95"
                width="14"
                height="18"
                rx="2"
                fill="var(--bg-surface-elevated)"
                stroke="var(--border-subtle)"
                strokeWidth="1.5"
              />
              <path
                d="M169 99 Q174 104 169 109"
                stroke="var(--border-subtle)"
                strokeWidth="1.5"
                fill="none"
              />

              {/* Plant Pot */}
              <path d="M42 100 L46 115 L38 115 Z" fill="var(--brand-amber)" />
              <circle cx="42" cy="94" r="5" fill="var(--status-success-text)" />
              <circle cx="39" cy="91" r="4" fill="var(--status-success-text)" />
              <circle cx="45" cy="90" r="4" fill="var(--status-success-text)" />
            </svg>
          </div>

          <div className={styles.badgeRow}>
            <span className={styles.microBadge}>Think</span>
            <span className={styles.microBadge}>Code</span>
            <span className={styles.microBadge}>Learn</span>
            <span className={styles.microBadge}>Repeat</span>
          </div>
        </div>
      </div>
    </section>
  );
}
