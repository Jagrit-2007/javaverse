import React from 'react';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { cookies } from 'next/headers';
import { resolveSession, SESSION_COOKIE_NAME } from '@/lib/auth';
import { createCsrfToken } from '@/lib/csrf';
import { getPracticeProblemBySlug } from '@/lib/practice';
import { PracticeWorkspace } from './PracticeWorkspace';

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const problem = await getPracticeProblemBySlug(slug);

  if (!problem) {
    return {
      title: 'Practice Problem Not Found — JavaVerse',
    };
  }

  return {
    title: `${problem.title} — JavaVerse Practice`,
    description: `Solve ${problem.title} in Java 21 with real container sandboxing and automated tests.`,
  };
}

export default async function PracticeProblemPage({ params }: Props) {
  const { slug } = await params;
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  let userId: string | undefined;
  let csrfToken = '';

  if (sessionToken) {
    const auth = await resolveSession(sessionToken);
    if (auth) {
      userId = auth.user.id;
      csrfToken = createCsrfToken({ sessionId: auth.session.publicId });
    }
  }

  const problem = await getPracticeProblemBySlug(slug, userId);

  if (!problem) {
    notFound();
  }

  return (
    <div style={{ padding: 'var(--space-6) var(--space-4)' }}>
      <PracticeWorkspace problem={problem} csrfToken={csrfToken} />
    </div>
  );
}
