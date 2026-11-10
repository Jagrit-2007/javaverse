import React from 'react';
import { cookies } from 'next/headers';
import { resolveSession, getSessionTokenFromCookies } from '@/lib/auth';
import { getPracticeProblemsList } from '@/lib/practice';
import { PracticeCatalog } from './PracticeCatalog';

export const metadata = {
  title: 'Practice & Coding Challenges | JavaVerse',
  description: 'Sharpen your Java problem-solving skills across OOP, DSA, and Core Java.',
};

export default async function PracticePage() {
  const cookieStore = await cookies();
  const sessionToken = getSessionTokenFromCookies(cookieStore);
  let userId: string | undefined;

  if (sessionToken) {
    const auth = await resolveSession(sessionToken);
    userId = auth?.user.id;
  }

  const initialProblems = await getPracticeProblemsList(userId);

  return <PracticeCatalog initialProblems={initialProblems} />;
}
