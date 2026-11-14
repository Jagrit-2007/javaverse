import React from 'react';
import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { prisma } from '@javaverse/db';
import { resolveSession, getSessionTokenFromCookies, getSafeDisplayName } from '@/lib/auth';
import { getUserProgressOverview } from '@/lib/progress';
import { CANONICAL_TRACKS } from '@javaverse/schemas';
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
  type RecentLessonItem,
  type ProgressBreakdown,
  type LearningPathItem,
} from '@/components/fixtures/dashboardData';
import styles from './DashboardPage.module.css';

export const metadata: Metadata = {
  title: 'Learning Dashboard',
  description: 'JavaVerse visual learning progress, daily challenge, and study tracks.',
};

function formatRelativeTime(date: Date): string {
  const now = Date.now();
  const diffSec = Math.max(0, Math.floor((now - date.getTime()) / 1000));
  if (diffSec < 60) return 'Just now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}

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
          primaryActionText="Start Learning"
          primaryActionHref="/dashboard/learn"
        />
        <QuickActions />
        <EmptyState />
      </div>
    );
  }

  // 4. Test-State: Explicit standard fixture override
  if (fixtureState === 'standard') {
    const data = DETERMINISTIC_DASHBOARD_DATA;
    return (
      <div className={styles.dashboardContainer}>
        <HeroBanner
          greeting={data.greeting}
          headline={data.headline}
          subheadline={data.subheadline}
        />
        <QuickActions />
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
            <MotivationCard
              quote={data.motivationQuote.text}
              author={data.motivationQuote.author}
            />
          </div>
        </div>
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

  // 5. Real User-Specific Learning Dashboard (Part 6)
  const cookieStore = await cookies();
  const sessionToken = getSessionTokenFromCookies(cookieStore);
  const sessionCtx = sessionToken ? await resolveSession(sessionToken) : null;
  const userId = sessionCtx?.user?.id ?? null;
  const displayName = sessionCtx ? getSafeDisplayName(sessionCtx.user) : 'Learner';

  let overallProgress = 0;
  let progressBreakdowns: ProgressBreakdown[] = [
    { category: 'Java Fundamentals', percentage: 0, color: '#0ea5e9' },
    { category: 'Object-Oriented Programming', percentage: 0, color: '#10b981' },
    { category: 'Data Structures & Algorithms', percentage: 0, color: '#f59e0b' },
    { category: 'Advanced Java', percentage: 0, color: '#ec4899' },
  ];
  let featuredPaths: LearningPathItem[] = [
    {
      id: 'foundations',
      title: 'Java Foundations',
      description: 'Syntax, data types, control flow, and memory model.',
      href: '/dashboard/learn',
      category: 'Foundations',
      lessonsCount: 6,
      progressPercent: 0,
    },
    {
      id: 'oop',
      title: 'Object-Oriented Programming',
      description: 'Classes, inheritance, polymorphism, and interfaces.',
      href: '/dashboard/learn',
      category: 'OOP',
      lessonsCount: 14,
      progressPercent: 0,
    },
    {
      id: 'dsa',
      title: 'Data Structures',
      description: 'Arrays, lists, trees, graphs, and algorithmic problem-solving.',
      href: '/dashboard/learn',
      category: 'DSA',
      lessonsCount: 18,
      progressPercent: 0,
    },
    {
      id: 'advanced',
      title: 'Advanced Java',
      description: 'Concurrency, streams, generics, and performance tuning.',
      href: '/dashboard/learn',
      category: 'Advanced',
      lessonsCount: 16,
      progressPercent: 0,
    },
  ];
  let recentLessons: RecentLessonItem[] = [];
  let totalCompletedCount = 0;

  if (userId) {
    const [overview, userProgressItems] = await Promise.all([
      getUserProgressOverview(userId),
      prisma.userProgress.findMany({
        where: { userId, itemType: 'lesson' },
        orderBy: { lastAttemptedAt: 'desc' },
        take: 5,
      }),
    ]);

    let totalItems = 0;
    let completedItems = 0;

    for (const track of CANONICAL_TRACKS) {
      const stat = overview.topicMastery[track];
      if (stat) {
        totalItems += stat.totalLessons + stat.totalProblems;
        completedItems += stat.completedLessons + stat.completedProblems;
      }
    }

    totalCompletedCount = completedItems;
    overallProgress =
      totalItems > 0 ? Math.min(100, Math.round((completedItems / totalItems) * 100)) : 0;

    const coreJavaMastery = overview.topicMastery['core_java']?.masteryPercent ?? 0;
    const oopMastery = overview.topicMastery['oop']?.masteryPercent ?? 0;
    const dsaMastery = overview.topicMastery['dsa']?.masteryPercent ?? 0;
    const advMastery = overview.topicMastery['advanced_java']?.masteryPercent ?? 0;

    progressBreakdowns = [
      { category: 'Java Fundamentals', percentage: coreJavaMastery, color: '#0ea5e9' },
      { category: 'Object-Oriented Programming', percentage: oopMastery, color: '#10b981' },
      { category: 'Data Structures & Algorithms', percentage: dsaMastery, color: '#f59e0b' },
      { category: 'Advanced Java', percentage: advMastery, color: '#ec4899' },
    ];

    featuredPaths = [
      {
        id: 'foundations',
        title: 'Java Foundations',
        description: 'Syntax, data types, control flow, and memory model.',
        href: '/dashboard/learn',
        category: 'Foundations',
        lessonsCount: overview.topicMastery['core_java']?.totalLessons || 6,
        progressPercent: coreJavaMastery,
      },
      {
        id: 'oop',
        title: 'Object-Oriented Programming',
        description: 'Classes, inheritance, polymorphism, and interfaces.',
        href: '/dashboard/learn',
        category: 'OOP',
        lessonsCount: overview.topicMastery['oop']?.totalLessons || 14,
        progressPercent: oopMastery,
      },
      {
        id: 'dsa',
        title: 'Data Structures',
        description: 'Arrays, lists, trees, graphs, and algorithmic problem-solving.',
        href: '/dashboard/learn',
        category: 'DSA',
        lessonsCount: overview.topicMastery['dsa']?.totalLessons || 18,
        progressPercent: dsaMastery,
      },
      {
        id: 'advanced',
        title: 'Advanced Java',
        description: 'Concurrency, streams, generics, and performance tuning.',
        href: '/dashboard/learn',
        category: 'Advanced',
        lessonsCount: overview.topicMastery['advanced_java']?.totalLessons || 16,
        progressPercent: advMastery,
      },
    ];

    if (userProgressItems.length > 0) {
      const lessonSlugs = userProgressItems.map((p) =>
        p.itemId.includes(':') ? p.itemId.split(':')[0]! : p.itemId,
      );
      const lessons = await prisma.curriculumLesson.findMany({
        where: { slug: { in: lessonSlugs } },
        select: { slug: true, title: true, track: true },
      });
      const lessonMap = new Map(lessons.map((l) => [l.slug, l]));

      recentLessons = userProgressItems.map((item) => {
        const slug = item.itemId.includes(':') ? item.itemId.split(':')[0]! : item.itemId;
        const lesson = lessonMap.get(slug);
        const title = lesson?.title || slug;
        const track = lesson?.track || 'General';
        const status = item.completed ? 'completed' : 'in_progress';
        const date = item.completedAt || item.lastAttemptedAt;
        const relativeTime = date ? formatRelativeTime(date) : 'Recently';

        return {
          id: item.itemId,
          title,
          track,
          status,
          relativeTime,
        };
      });
    }
  }

  const hasProgress = totalCompletedCount > 0;
  const greeting = hasProgress
    ? `Welcome back, ${displayName}!`
    : displayName && displayName !== 'Learner'
      ? `Welcome, ${displayName}!`
      : 'Welcome to JavaVerse!';
  const primaryActionText = hasProgress ? 'Continue Learning' : 'Start Learning';
  const primaryActionHref = '/dashboard/learn';

  return (
    <div className={styles.dashboardContainer}>
      {/* Hero Banner: Dynamic Start/Continue Learning action */}
      <HeroBanner
        greeting={greeting}
        headline={DETERMINISTIC_DASHBOARD_DATA.headline}
        subheadline={DETERMINISTIC_DASHBOARD_DATA.subheadline}
        primaryActionText={primaryActionText}
        primaryActionHref={primaryActionHref}
      />

      {/* Quick Action Navigation Cards */}
      <QuickActions />

      {/* Middle Row: Progress Donut + Challenge + Motivation */}
      <div className={styles.middleRow}>
        <div className={styles.progressCol}>
          <ProgressOverview overallProgress={overallProgress} breakdowns={progressBreakdowns} />
        </div>
        <div className={styles.challengeCol}>
          <DailyChallenge
            title={DETERMINISTIC_DASHBOARD_DATA.todaysChallenge.title}
            estimatedMinutes={DETERMINISTIC_DASHBOARD_DATA.todaysChallenge.estimatedMinutes}
            description={DETERMINISTIC_DASHBOARD_DATA.todaysChallenge.description}
          />
        </div>
        <div className={styles.motivationCol}>
          <MotivationCard
            quote={DETERMINISTIC_DASHBOARD_DATA.motivationQuote.text}
            author={DETERMINISTIC_DASHBOARD_DATA.motivationQuote.author}
          />
        </div>
      </div>

      {/* Bottom Row: Featured Paths + Recent Lessons */}
      <div className={styles.bottomRow}>
        <div className={styles.pathsCol}>
          <FeaturedPaths paths={featuredPaths} />
        </div>
        <div className={styles.recentCol}>
          <RecentLessons lessons={recentLessons} />
        </div>
      </div>
    </div>
  );
}
