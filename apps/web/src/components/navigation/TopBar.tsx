'use client';

import React, { useState } from 'react';
import { Search, Bell, LogOut } from 'lucide-react';
import { ThemeSelector } from '../theme/ThemeSelector';
import styles from './TopBar.module.css';

interface TopBarProps {
  onSearchClick?: () => void;
  user?: {
    displayName: string;
    role: string;
  };
}

export function TopBar({ onSearchClick, user }: TopBarProps) {
  const [loggingOut, setLoggingOut] = useState(false);
  const displayName = user?.displayName || 'Learner';
  const initial = displayName.charAt(0).toUpperCase();

  const handleLogout = async () => {
    if (loggingOut) return;
    setLoggingOut(true);
    try {
      const csrfRes = await fetch('/api/v1/auth/csrf');
      const csrfData = await csrfRes.json();
      const token = csrfData?.data?.csrfToken;

      await fetch('/api/v1/auth/logout', {
        method: 'POST',
        headers: {
          'x-csrf-token': token || '',
        },
      });
    } catch {
      // Proceed with redirection even if network fails
    } finally {
      window.location.href = '/auth/login';
    }
  };

  return (
    <header className={styles.topBar} aria-label="Dashboard Header">
      <div className={styles.searchWrapper}>
        <button type="button" onClick={onSearchClick} className={styles.searchButton}>
          <Search size={16} aria-hidden="true" className={styles.searchIcon} />
          <span className={styles.searchPlaceholder}>
            Search lessons, topics, or ask a question...
          </span>
          <kbd className={styles.searchShortcut} aria-hidden="true">
            Ctrl K
          </kbd>
        </button>
      </div>

      <div className={styles.actionsGroup}>
        <ThemeSelector />

        <button
          type="button"
          className={styles.iconButton}
          aria-label="Notifications: No unread messages"
          title="Notifications"
        >
          <Bell size={18} aria-hidden="true" />
        </button>

        <button
          type="button"
          onClick={handleLogout}
          className={styles.iconButton}
          aria-label="Sign out of JavaVerse"
          title="Sign out"
          disabled={loggingOut}
        >
          <LogOut size={18} aria-hidden="true" />
        </button>

        <div
          className={styles.avatarButton}
          role="img"
          aria-label={`${displayName} profile (${user?.role || 'Member'})`}
          title={`${displayName} (${user?.role || 'Member'})`}
        >
          <span aria-hidden="true">{initial}</span>
        </div>
      </div>
    </header>
  );
}
