'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Home,
  BookOpen,
  Code2,
  Sparkles,
  FolderKanban,
  BarChart3,
  FileText,
  Settings,
} from 'lucide-react';
import { Logo } from '../brand/Logo';
import styles from './Sidebar.module.css';

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
}

export const SIDEBAR_NAV_ITEMS: NavItem[] = [
  { label: 'Home', href: '/dashboard', icon: Home },
  { label: 'Learn', href: '/dashboard/learn', icon: BookOpen },
  { label: 'Practice', href: '/dashboard/practice', icon: Code2 },
  { label: 'Ask AI', href: '/dashboard/ask', icon: Sparkles },
  { label: 'Library', href: '/dashboard/library', icon: FolderKanban },
  { label: 'Progress', href: '/dashboard/progress', icon: BarChart3 },
  { label: 'Notes', href: '/dashboard/notes', icon: FileText },
  { label: 'Settings', href: '/dashboard/settings', icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className={styles.sidebar} aria-label="Desktop Sidebar Navigation">
      <div className={styles.brandWrapper}>
        <Link href="/dashboard" className={styles.brandLink}>
          <Logo size={32} showWordmark={true} />
        </Link>
      </div>

      <nav className={styles.nav} aria-label="Dashboard navigation">
        <ul className={styles.navList}>
          {SIDEBAR_NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive =
              item.href === '/dashboard'
                ? pathname === '/dashboard'
                : pathname.startsWith(item.href);

            return (
              <li key={item.href} className={styles.navItem}>
                <Link
                  href={item.href}
                  className={`${styles.navLink} ${isActive ? styles.active : ''}`}
                  aria-current={isActive ? 'page' : undefined}
                >
                  <Icon size={18} aria-hidden="true" className={styles.navIcon} />
                  <span>{item.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className={styles.footer}>
        <div className={styles.profileCard}>
          <div className={styles.avatar} aria-hidden="true">
            L
          </div>
          <div className={styles.profileInfo}>
            <span className={styles.profileName}>Learner</span>
            <span className={styles.profileRole}>Preview Workspace</span>
          </div>
        </div>
        <div className={styles.quoteCard} aria-hidden="true">
          <p className={styles.quoteText}>Small steps. Big developers. You got this! 💙</p>
        </div>
      </div>
    </aside>
  );
}
