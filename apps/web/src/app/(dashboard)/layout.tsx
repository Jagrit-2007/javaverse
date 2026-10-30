import React from 'react';
import { Sidebar } from '@/components/navigation/Sidebar';
import { TopBar } from '@/components/navigation/TopBar';
import { MobileNav } from '@/components/navigation/MobileNav';
import styles from './DashboardLayout.module.css';

export const dynamic = 'force-dynamic';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={styles.layoutWrapper}>
      {/* Desktop Fixed Left Sidebar */}
      <Sidebar />

      {/* Main Content Area */}
      <div className={styles.contentColumn}>
        {/* Mobile Header */}
        <MobileNav />

        {/* Desktop TopBar */}
        <div className={styles.topBarWrapper}>
          <TopBar />
        </div>

        {/* Page Canvas */}
        <main id="main-content" tabIndex={-1} className={styles.mainCanvas}>
          {children}
        </main>
      </div>
    </div>
  );
}
