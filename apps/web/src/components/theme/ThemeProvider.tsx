'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';

export type Theme = 'light' | 'dark' | 'system';
export type ResolvedTheme = 'light' | 'dark';

interface ThemeContextValue {
  theme: Theme;
  resolvedTheme: ResolvedTheme;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

const STORAGE_KEY = 'javaverse-theme';

function getStoredTheme(): Theme {
  if (typeof window === 'undefined') return 'system';
  try {
    const val = localStorage.getItem(STORAGE_KEY);
    if (val === 'dark' || val === 'system' || val === 'light') {
      return val;
    }
    return 'system';
  } catch {
    return 'system';
  }
}

function resolveTheme(theme: Theme): ResolvedTheme {
  if (theme === 'dark') return 'dark';
  if (theme === 'light') return 'light';
  if (typeof window !== 'undefined' && window.matchMedia) {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  return 'light';
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>('light');
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>('light');

  // Hydrate theme on mount and synchronize with authenticated settings if on dashboard
  useEffect(() => {
    const initialTheme = getStoredTheme();
    const resolved = resolveTheme(initialTheme);
    setThemeState(initialTheme);
    setResolvedTheme(resolved);
    document.documentElement.setAttribute('data-theme', resolved);

    // If on an authenticated route, check user preferences in database
    if (typeof window !== 'undefined' && window.location.pathname.startsWith('/dashboard')) {
      fetch('/api/v1/settings')
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          const userTheme = data?.data?.settings?.theme;
          if (
            userTheme &&
            (userTheme === 'dark' || userTheme === 'light' || userTheme === 'system')
          ) {
            setThemeState(userTheme);
            const userResolved = resolveTheme(userTheme);
            setResolvedTheme(userResolved);
            document.documentElement.setAttribute('data-theme', userResolved);
            try {
              localStorage.setItem(STORAGE_KEY, userTheme);
            } catch {
              // Ignore
            }
          } else if (initialTheme) {
            // No explicit user preference in DB, preserve visitor's local choice
            fetch('/api/v1/auth/csrf')
              .then((cRes) => (cRes.ok ? cRes.json() : null))
              .then((cData) => {
                const token = cData?.data?.csrfToken;
                if (token) {
                  fetch('/api/v1/settings', {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json', 'x-csrf-token': token },
                    body: JSON.stringify({ theme: initialTheme }),
                  }).catch(() => {});
                }
              })
              .catch(() => {});
          }
        })
        .catch(() => {});
    }
  }, []);

  // Manage OS theme listener: exists ONLY while 'system' is selected
  useEffect(() => {
    if (theme !== 'system') {
      return;
    }

    const mql = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e: MediaQueryListEvent) => {
      const nextResolved: ResolvedTheme = e.matches ? 'dark' : 'light';
      setResolvedTheme(nextResolved);
      document.documentElement.setAttribute('data-theme', nextResolved);
    };

    mql.addEventListener('change', handleChange);
    return () => {
      mql.removeEventListener('change', handleChange);
    };
  }, [theme]);

  const setTheme = (nextTheme: Theme) => {
    const nextResolved = resolveTheme(nextTheme);
    setThemeState(nextTheme);
    setResolvedTheme(nextResolved);

    try {
      localStorage.setItem(STORAGE_KEY, nextTheme);
    } catch {
      // LocalStorage access may fail in private mode
    }

    document.documentElement.setAttribute('data-theme', nextResolved);

    // Persist to PostgreSQL if authenticated on dashboard route
    if (typeof window !== 'undefined' && window.location.pathname.startsWith('/dashboard')) {
      fetch('/api/v1/auth/csrf')
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          const csrfToken = data?.data?.csrfToken;
          if (csrfToken) {
            fetch('/api/v1/settings', {
              method: 'PATCH',
              headers: {
                'Content-Type': 'application/json',
                'x-csrf-token': csrfToken,
              },
              body: JSON.stringify({ theme: nextTheme }),
            }).catch(() => {});
          }
        })
        .catch(() => {});
    }
  };

  return (
    <ThemeContext.Provider value={{ theme, resolvedTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
