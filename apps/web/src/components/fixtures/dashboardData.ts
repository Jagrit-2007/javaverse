export interface LearningPathItem {
  id: string;
  title: string;
  description: string;
  href: string;
  category: string;
  lessonsCount: number;
  progressPercent: number;
}

export interface RecentLessonItem {
  id: string;
  title: string;
  track: string;
  status: 'completed' | 'in_progress' | 'not_started';
  relativeTime: string;
}

export interface ProgressBreakdown {
  category: string;
  percentage: number;
  color: string;
}

export interface DashboardData {
  greeting: string;
  headline: string;
  subheadline: string;
  overallProgress: number;
  progressBreakdowns: ProgressBreakdown[];
  todaysChallenge: {
    id: string;
    title: string;
    estimatedMinutes: number;
    description: string;
  };
  motivationQuote: {
    text: string;
    author?: string | undefined;
  };
  featuredPaths: LearningPathItem[];
  recentLessons: RecentLessonItem[];
}

export const DETERMINISTIC_DASHBOARD_DATA: DashboardData = {
  greeting: 'Welcome back, learner.',
  headline: "Let's make Java click today.",
  subheadline:
    'Learn concepts visually, practice with real problems, and build the confidence to solve anything in Java.',
  overallProgress: 35,
  progressBreakdowns: [
    { category: 'Java Fundamentals', percentage: 70, color: '#0ea5e9' },
    { category: 'Object-Oriented Programming', percentage: 40, color: '#10b981' },
    { category: 'Data Structures & Algorithms', percentage: 20, color: '#f59e0b' },
    { category: 'Advanced Java', percentage: 10, color: '#ec4899' },
  ],
  todaysChallenge: {
    id: 'reverse-string',
    title: 'Reverse a String',
    estimatedMinutes: 5,
    description:
      'Write a Java program to reverse a string without using built-in reverse functions.',
  },
  motivationQuote: {
    text: 'Small progress, practiced consistently, builds real understanding.',
  },
  featuredPaths: [
    {
      id: 'foundations',
      title: 'Java Foundations',
      description: 'Syntax, data types, control flow, and memory model.',
      href: '/dashboard/learn',
      category: 'Foundations',
      lessonsCount: 6,
      progressPercent: 70,
    },
    {
      id: 'oop',
      title: 'Object-Oriented Programming',
      description: 'Classes, inheritance, polymorphism, and interfaces.',
      href: '/dashboard/learn',
      category: 'OOP',
      lessonsCount: 14,
      progressPercent: 40,
    },
    {
      id: 'dsa',
      title: 'Data Structures',
      description: 'Arrays, lists, trees, graphs, and algorithmic problem-solving.',
      href: '/dashboard/learn',
      category: 'DSA',
      lessonsCount: 18,
      progressPercent: 20,
    },
    {
      id: 'advanced',
      title: 'Advanced Java',
      description: 'Concurrency, streams, generics, and performance tuning.',
      href: '/dashboard/learn',
      category: 'Advanced',
      lessonsCount: 16,
      progressPercent: 10,
    },
  ],
  recentLessons: [
    {
      id: 'intro-java',
      title: 'Introduction to Java',
      track: 'Java Foundations',
      status: 'completed',
      relativeTime: 'Completed 2 days ago',
    },
    {
      id: 'classes-objects',
      title: 'Classes and Objects',
      track: 'OOP',
      status: 'in_progress',
      relativeTime: 'In progress · 1 hr ago',
    },
    {
      id: 'inheritance',
      title: 'Inheritance in Java',
      track: 'OOP',
      status: 'not_started',
      relativeTime: 'Not started',
    },
  ],
};

export type DashboardFixtureState = 'standard' | 'loading' | 'empty' | 'error';

/**
 * Returns the active dashboard fixture state.
 * Strictly gated by E2E_FIXTURES_ENABLED=true to prevent production backdoors.
 */
export function getDashboardFixtureState(searchParams?: {
  [key: string]: string | string[] | undefined;
}): DashboardFixtureState {
  if (process.env.E2E_FIXTURES_ENABLED === 'true' && searchParams) {
    const fixture = searchParams['_fixture'];
    if (fixture === 'loading' || fixture === 'empty' || fixture === 'error') {
      return fixture;
    }
  }
  return 'standard';
}
