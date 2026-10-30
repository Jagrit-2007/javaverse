'use client';

import React from 'react';
import { Search, Bell } from 'lucide-react';
import { ThemeSelector } from '../theme/ThemeSelector';
import styles from './TopBar.module.css';

interface TopBarProps {
  onSearchClick?: () => void;
}

export function TopBar({ onSearchClick }: TopBarProps) {
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
          className={styles.avatarButton}
          aria-label="Learner Profile Menu"
          title="Learner profile"
        >
          <span aria-hidden="true">L</span>
        </button>
      </div>
    </header>
  );
}
