import React from 'react';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { prisma } from '@javaverse/db';
import { resolveSession, SESSION_COOKIE_NAME } from '@/lib/auth';
import { createCsrfToken } from '@/lib/csrf';
import { getUserProgressOverview, getDueFlashcards } from '@/lib/progress';
import { ProgressDashboard } from './ProgressDashboard';

export const metadata = {
  title: 'Progress & Mastery | JavaVerse',
  description:
    'Track topic mastery, streaks, achievements, and review spaced repetition flashcards.',
};

export default async function ProgressPage() {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  let userId: string | null = null;
  let csrfToken = '';

  if (sessionToken) {
    const auth = await resolveSession(sessionToken);
    if (auth) {
      userId = auth.user.id;
      csrfToken = createCsrfToken({ sessionId: auth.session.publicId });
    }
  }

  if (!userId && process.env.E2E_FIXTURES_ENABLED === 'true') {
    let demoUser = await prisma.user.findFirst();
    if (!demoUser) {
      demoUser = await prisma.user.create({
        data: {
          email: 'demo@javaverse.local',
          displayName: 'Demo User',
          role: 'MEMBER',
          status: 'ACTIVE',
        },
      });
    }
    userId = demoUser.id;
    csrfToken = createCsrfToken({ flow: 'e2e-demo' });
  }

  if (!userId) {
    redirect('/auth/login?redirect=/dashboard/progress');
  }

  const [overview, dueFlashcards] = await Promise.all([
    getUserProgressOverview(userId),
    getDueFlashcards(userId),
  ]);

  return (
    <ProgressDashboard
      initialOverview={overview}
      initialDueFlashcards={dueFlashcards}
      csrfToken={csrfToken}
    />
  );
}
