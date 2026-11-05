import React from 'react';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { resolveSession, SESSION_COOKIE_NAME, getSafeDisplayName } from '@/lib/auth';
import { Sidebar } from '@/components/navigation/Sidebar';
import { TopBar } from '@/components/navigation/TopBar';
import { MobileNav } from '@/components/navigation/MobileNav';
import styles from './DashboardLayout.module.css';

export const dynamic = 'force-dynamic';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(SESSION_COOKIE_NAME)?.value || null;
  const sessionCtx = await resolveSession(sessionToken);

  if (!sessionCtx) {
    if (process.env.E2E_FIXTURES_ENABLED === 'true') {
      const mockUser = {
        displayName: 'Demo User',
        role: 'OWNER',
        email: 'demo@javaverse.local',
      };
      return (
        <div className={styles.layoutWrapper}>
          <Sidebar user={mockUser} />
          <div className={styles.contentColumn}>
            <MobileNav />
            <div className={styles.topBarWrapper}>
              <TopBar user={mockUser} />
            </div>
            <main id="main-content" tabIndex={-1} className={styles.mainCanvas}>
              {children}
            </main>
          </div>
        </div>
      );
    }
    redirect('/auth/login');
  }

  if (sessionCtx.user.status === 'SUSPENDED') {
    redirect('/auth/suspended');
  }

  if (sessionCtx.user.role === 'OWNER' && sessionCtx.session.mfaVerifiedAt === null) {
    redirect('/auth/mfa');
  }

  const user = {
    displayName: getSafeDisplayName(sessionCtx.user),
    role: sessionCtx.user.role,
    email: sessionCtx.user.email,
  };

  return (
    <div className={styles.layoutWrapper}>
      {/* Desktop Fixed Left Sidebar */}
      <Sidebar user={user} />

      {/* Main Content Area */}
      <div className={styles.contentColumn}>
        {/* Mobile Header */}
        <MobileNav />

        {/* Desktop TopBar */}
        <div className={styles.topBarWrapper}>
          <TopBar user={user} />
        </div>

        {/* Page Canvas */}
        <main id="main-content" tabIndex={-1} className={styles.mainCanvas}>
          {children}
        </main>
      </div>
    </div>
  );
}
