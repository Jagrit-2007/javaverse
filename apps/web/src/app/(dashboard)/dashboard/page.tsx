import React from 'react';
import type { Metadata } from 'next';
import { HeroBanner } from '@/components/dashboard/HeroBanner';
import { QuickActions } from '@/components/dashboard/QuickActions';
import { ProgressOverview } from '@/components/dashboard/ProgressOverview';
import { DailyChallenge } from '@/components/dashboard/DailyChallenge';
import { MotivationCard } from '@/components/dashboard/MotivationCard';
import { FeaturedPaths } from '@/components/dashboard/FeaturedPaths';
import { RecentLessons } from '@/components/dashboard/RecentLessons';
import { EmptyState } from '@/components/dashboard/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import {
  DETERMINISTIC_DASHBOARD_DATA,
  getDashboardFixtureState,
} from '@/components/fixtures/dashboardData';
import styles from './DashboardPage.module.css';

export const metadata: Metadata = {
  title: 'Learning Dashboard',
  description: 'JavaVerse visual learning progress, daily challenge, and study tracks.',
};

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const resolvedParams = await searchParams;
  const fixtureState = getDashboardFixtureState(resolvedParams);

  // 1. Gated Test-State: Loading Skeleton
  if (fixtureState === 'loading') {
    return (
      <div className={styles.dashboardContainer} aria-busy="true" aria-label="Loading dashboard">
        <span className="sr-only">Loading JavaVerse learning dashboard...</span>
        {/* Hero Skeleton */}
        <Card padding="lg" className={styles.skeletonHero}>
          <Skeleton height={28} width="35%" />
          <Skeleton height={36} width="60%" />
          <Skeleton height={20} width="80%" />
          <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
            <Skeleton height={44} width={160} />
            <Skeleton height={44} width={140} />
          </div>
        </Card>

        {/* Quick Actions Skeleton */}
        <div className={styles.skeletonGrid4}>
          <Skeleton height={72} />
          <Skeleton height={72} />
          <Skeleton height={72} />
          <Skeleton height={72} />
        </div>

        {/* Middle Row Skeleton */}
        <div className={styles.middleRow}>
          <Skeleton height={220} className={styles.progressCol} />
          <Skeleton height={220} className={styles.challengeCol} />
          <Skeleton height={220} className={styles.motivationCol} />
        </div>

        {/* Bottom Row Skeleton */}
        <div className={styles.bottomRow}>
          <Skeleton height={240} className={styles.pathsCol} />
          <Skeleton height={240} className={styles.recentCol} />
        </div>
      </div>
    );
  }

  // 2. Gated Test-State: Localized Error State
  if (fixtureState === 'error') {
    return (
      <div className={styles.dashboardContainer}>
        <HeroBanner
          greeting={DETERMINISTIC_DASHBOARD_DATA.greeting}
          headline={DETERMINISTIC_DASHBOARD_DATA.headline}
          subheadline={DETERMINISTIC_DASHBOARD_DATA.subheadline}
        />
        <Card as="section" padding="md" className={styles.errorFallbackCard} role="alert">
          <h2 className={styles.errorTitle}>Learning metrics are temporarily unavailable</h2>
          <p className={styles.errorDesc}>
            Your learning data could not be loaded. Other dashboard features remain available.
          </p>
          <div style={{ marginTop: '0.75rem' }}>
            <Button variant="primary">Retry Loading Metrics</Button>
          </div>
        </Card>
      </div>
    );
  }

  // 3. Gated Test-State: Empty Progress State
  if (fixtureState === 'empty') {
    return (
      <div className={styles.dashboardContainer}>
        <HeroBanner
          greeting="Welcome to JavaVerse!"
          headline="Your Java journey starts today."
          subheadline="Learn concepts visually, practice with real problems, and build the confidence to solve anything in Java."
        />
        <QuickActions />
        <EmptyState />
      </div>
    );
  }

  // 4. Standard Learning-First Dashboard (Figure R-1)
  const data = DETERMINISTIC_DASHBOARD_DATA;

  return (
    <div className={styles.dashboardContainer}>
      {/* Hero Banner: Continue Learning is primary, Ask JavaVerse secondary */}
      <HeroBanner
        greeting={data.greeting}
        headline={data.headline}
        subheadline={data.subheadline}
      />

      {/* Quick Action Navigation Cards */}
      <QuickActions />

      {/* Middle Row: Progress Donut + Challenge + Motivation */}
      <div className={styles.middleRow}>
        <div className={styles.progressCol}>
          <ProgressOverview
            overallProgress={data.overallProgress}
            breakdowns={data.progressBreakdowns}
          />
        </div>
        <div className={styles.challengeCol}>
          <DailyChallenge
            title={data.todaysChallenge.title}
            estimatedMinutes={data.todaysChallenge.estimatedMinutes}
            description={data.todaysChallenge.description}
          />
        </div>
        <div className={styles.motivationCol}>
          <MotivationCard quote={data.motivationQuote.text} author={data.motivationQuote.author} />
        </div>
      </div>

      {/* Bottom Row: Featured Paths + Recent Lessons */}
      <div className={styles.bottomRow}>
        <div className={styles.pathsCol}>
          <FeaturedPaths paths={data.featuredPaths} />
        </div>
        <div className={styles.recentCol}>
          <RecentLessons lessons={data.recentLessons} />
        </div>
      </div>
    </div>
  );
}
