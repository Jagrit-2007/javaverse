import React from 'react';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { prisma } from '@javaverse/db';
import { resolveSession, getSessionTokenFromCookies } from '@/lib/auth';
import { createCsrfToken } from '@/lib/csrf';
import { getUserSettings } from '@/lib/settings';
import { SettingsView } from './SettingsView';

export const metadata = {
  title: 'Settings & Privacy | JavaVerse',
  description: 'Manage your profile, theme, Java version, gamification controls, and data privacy.',
};

export default async function SettingsPage() {
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
    redirect('/auth/login?redirect=/dashboard/settings');
  }

  const settings = await getUserSettings(userId);

  if (!settings) {
    redirect('/auth/login?redirect=/dashboard/settings');
  }

  return <SettingsView initialSettings={settings} csrfToken={csrfToken} />;
}
