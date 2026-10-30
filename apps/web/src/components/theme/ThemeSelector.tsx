'use client';

import React from 'react';
import { useTheme, type Theme } from './ThemeProvider';
import { Sun, Moon, Laptop } from 'lucide-react';
import styles from './ThemeSelector.module.css';

export function ThemeSelector({ id }: { id?: string | undefined } = {}) {
  const generatedId = React.useId();
  const selectId = id || generatedId;
  const { theme, resolvedTheme, setTheme } = useTheme();

  return (
    <div className={styles.container}>
      <label htmlFor={selectId} className="sr-only">
        Select color theme
      </label>
      <div className={styles.iconWrapper} aria-hidden="true">
        {theme === 'system' ? (
          <Laptop size={16} />
        ) : resolvedTheme === 'dark' ? (
          <Moon size={16} />
        ) : (
          <Sun size={16} />
        )}
      </div>
      <select
        id={selectId}
        className={styles.select}
        value={theme}
        onChange={(e) => setTheme(e.target.value as Theme)}
        aria-label="Select color theme"
      >
        <option value="light">Light</option>
        <option value="dark">Dark</option>
        <option value="system">System</option>
      </select>
    </div>
  );
}
