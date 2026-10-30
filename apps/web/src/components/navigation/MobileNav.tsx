'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, BookOpen, Code2, Sparkles, BarChart3, Menu, Bell } from 'lucide-react';
import { Logo } from '../brand/Logo';
import { MobileDrawer } from './MobileDrawer';
import styles from './MobileNav.module.css';

const MOBILE_NAV_TABS = [
  { label: 'Home', href: '/dashboard', icon: Home },
  { label: 'Learn', href: '/dashboard/learn', icon: BookOpen },
  { label: 'Practice', href: '/dashboard/practice', icon: Code2 },
  { label: 'Ask AI', href: '/dashboard/ask', icon: Sparkles },
  { label: 'Progress', href: '/dashboard/progress', icon: BarChart3 },
];

export function MobileNav() {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const pathname = usePathname();

  return (
    <>
      {/* Mobile Top Header */}
      <header className={styles.mobileHeader} aria-label="Mobile Application Header">
        <Link href="/dashboard" className={styles.mobileLogoLink} aria-label="JavaVerse Home">
          <Logo size={24} showWordmark={true} />
        </Link>
        <div className={styles.mobileHeaderActions}>
          <button type="button" className={styles.mobileIconBtn} aria-label="Notifications">
            <Bell size={20} aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={() => setIsDrawerOpen(true)}
            aria-label="Open navigation menu"
            aria-expanded={isDrawerOpen}
            className={styles.mobileIconBtn}
          >
            <Menu size={22} aria-hidden="true" />
          </button>
        </div>
      </header>

      {/* Mobile Bottom Navigation Bar (5 core destinations) */}
      <nav className={styles.bottomNav} aria-label="Mobile Bottom Navigation">
        <ul className={styles.bottomNavList}>
          {MOBILE_NAV_TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive =
              tab.href === '/dashboard' ? pathname === '/dashboard' : pathname.startsWith(tab.href);

            return (
              <li key={tab.href} className={styles.bottomNavItem}>
                <Link
                  href={tab.href}
                  className={`${styles.bottomNavLink} ${isActive ? styles.activeTab : ''}`}
                  aria-current={isActive ? 'page' : undefined}
                >
                  <Icon size={20} aria-hidden="true" className={styles.tabIcon} />
                  <span className={styles.tabLabel}>{tab.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <MobileDrawer isOpen={isDrawerOpen} onClose={() => setIsDrawerOpen(false)} />
    </>
  );
}
