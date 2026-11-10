import React from 'react';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { prisma } from '@javaverse/db';
import { resolveSession, getSessionTokenFromCookies } from '@/lib/auth';
import { createCsrfToken } from '@/lib/csrf';
import { getLibraryItems } from '@/lib/library';
import { LibraryView } from './LibraryView';

export const metadata = {
  title: 'Library & Bookmarks | JavaVerse',
  description: 'Manage bookmarked analyses, lessons, and practice problems with private notes.',
};

export default async function LibraryPage() {
  const cookieStore = await cookies();
  const sessionToken = getSessionTokenFromCookies(cookieStore);

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
          status: 'ACTIVE',
        },
      });
    }
    userId = demoUser.id;
    csrfToken = createCsrfToken({ flow: 'e2e-demo' });
  }

  if (!userId) {
    redirect('/auth/login?redirect=/dashboard/library');
  }

  const items = await getLibraryItems(userId);

  return <LibraryView initialItems={items} csrfToken={csrfToken} />;
}
