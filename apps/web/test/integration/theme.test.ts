import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { prisma } from '@javaverse/db';
import { renderHook, act } from '@testing-library/react';
import React from 'react';
import { ThemeProvider, useTheme } from '@/components/theme/ThemeProvider';
import {
  PATCH as handleSettingsPatch,
  GET as handleSettingsGet,
} from '@/app/api/v1/settings/route';
import { generateSessionTokens, createSessionRow, SESSION_COOKIE_NAME } from '@/lib/auth';
import { createCsrfToken } from '@/lib/csrf';
import {
  buildStaticCsp,
  buildDynamicNonceCsp,
  STATIC_THEME_SCRIPT_HASH,
} from '@javaverse/security/csp';

function mockMatchMedia(matchesDark: boolean) {
  const listeners = new Set<(e: { matches: boolean }) => void>();
  return {
    matches: matchesDark,
    media: '(prefers-color-scheme: dark)',
    addEventListener: vi.fn((event: string, cb: (e: { matches: boolean }) => void) => {
      if (event === 'change') listeners.add(cb);
    }),
    removeEventListener: vi.fn((event: string, cb: (e: { matches: boolean }) => void) => {
      if (event === 'change') listeners.delete(cb);
    }),
    dispatchEvent: (matches: boolean) => {
      listeners.forEach((cb) => cb({ matches }));
    },
  };
}

describe('Complete Theme Architecture & Invariants', () => {
  beforeEach(async () => {
    localStorage.clear();
    document.documentElement.removeAttribute('data-theme');
    await prisma.session.deleteMany();
    await prisma.user.deleteMany();
  });

  describe('Client Theme State & Root HTML Marker', () => {
    it('applies data-theme="dark" when dark theme is selected', () => {
      const wrapper = ({ children }: { children: React.ReactNode }) =>
        React.createElement(ThemeProvider, null, children);
      const { result } = renderHook(() => useTheme(), { wrapper });

      act(() => {
        result.current.setTheme('dark');
      });

      expect(result.current.theme).toBe('dark');
      expect(result.current.resolvedTheme).toBe('dark');
      expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
      expect(localStorage.getItem('javaverse-theme')).toBe('dark');
    });

    it('applies data-theme="light" when light theme is selected', () => {
      const wrapper = ({ children }: { children: React.ReactNode }) =>
        React.createElement(ThemeProvider, null, children);
      const { result } = renderHook(() => useTheme(), { wrapper });

      act(() => {
        result.current.setTheme('light');
      });

      expect(result.current.theme).toBe('light');
      expect(result.current.resolvedTheme).toBe('light');
      expect(document.documentElement.getAttribute('data-theme')).toBe('light');
      expect(localStorage.getItem('javaverse-theme')).toBe('light');
    });

    it('resolves system theme from matchMedia: dark when OS is dark, light when OS is light', () => {
      // 1. OS prefers dark
      const mqlDark = mockMatchMedia(true);
      window.matchMedia = vi.fn().mockImplementation(() => mqlDark);

      const wrapper = ({ children }: { children: React.ReactNode }) =>
        React.createElement(ThemeProvider, null, children);
      const { result, unmount } = renderHook(() => useTheme(), { wrapper });

      act(() => {
        result.current.setTheme('system');
      });

      expect(result.current.theme).toBe('system');
      expect(result.current.resolvedTheme).toBe('dark');
      expect(document.documentElement.getAttribute('data-theme')).toBe('dark');

      unmount();

      // 2. OS prefers light
      const mqlLight = mockMatchMedia(false);
      window.matchMedia = vi.fn().mockImplementation(() => mqlLight);

      const { result: result2 } = renderHook(() => useTheme(), { wrapper });
      act(() => {
        result2.current.setTheme('system');
      });

      expect(result2.current.theme).toBe('system');
      expect(result2.current.resolvedTheme).toBe('light');
      expect(document.documentElement.getAttribute('data-theme')).toBe('light');
    });

    it('reacts dynamically when operating-system color scheme preference changes', () => {
      const mql = mockMatchMedia(false); // Initially light
      window.matchMedia = vi.fn().mockImplementation(() => mql);

      const wrapper = ({ children }: { children: React.ReactNode }) =>
        React.createElement(ThemeProvider, null, children);
      const { result } = renderHook(() => useTheme(), { wrapper });

      act(() => {
        result.current.setTheme('system');
      });
      expect(document.documentElement.getAttribute('data-theme')).toBe('light');

      // OS flips to dark
      act(() => {
        mql.dispatchEvent(true);
      });

      expect(result.current.resolvedTheme).toBe('dark');
      expect(document.documentElement.getAttribute('data-theme')).toBe('dark');

      // OS flips back to light
      act(() => {
        mql.dispatchEvent(false);
      });

      expect(result.current.resolvedTheme).toBe('light');
      expect(document.documentElement.getAttribute('data-theme')).toBe('light');
    });

    it('persists theme choice in localStorage across remount/refresh', () => {
      localStorage.setItem('javaverse-theme', 'dark');

      const wrapper = ({ children }: { children: React.ReactNode }) =>
        React.createElement(ThemeProvider, null, children);
      const { result } = renderHook(() => useTheme(), { wrapper });

      expect(result.current.theme).toBe('dark');
      expect(result.current.resolvedTheme).toBe('dark');
      expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    });
  });

  describe('Authenticated Settings API Persistence & Validation', () => {
    it('persists authenticated user theme choice in PostgreSQL and rejects invalid values', async () => {
      // 1. Create authenticated learner
      const user = await prisma.user.create({
        data: {
          email: 'theme-user@example.local',
          displayName: 'Theme Tester',
          status: 'ACTIVE',
          theme: 'light',
        },
      });

      const { rawToken, tokenDigest, publicId } = generateSessionTokens();
      await createSessionRow({
        userId: user.id,
        tokenDigest,
        publicId,
        isMfaVerified: false,
      });

      const csrfToken = createCsrfToken({ sessionId: publicId });

      // 2. PATCH /api/v1/settings with dark theme
      const patchReq = new NextRequest('http://localhost:3000/api/v1/settings', {
        method: 'PATCH',
        headers: {
          origin: 'http://localhost:3000',
          'Content-Type': 'application/json',
          'x-csrf-token': csrfToken,
          cookie: `${SESSION_COOKIE_NAME}=${rawToken}`,
        },
        body: JSON.stringify({ theme: 'dark' }),
      });

      const patchRes = await handleSettingsPatch(patchReq);
      expect(patchRes.status).toBe(200);
      const patchData = await patchRes.json();
      expect(patchData.data.settings.theme).toBe('dark');

      // Verify PostgreSQL row
      const updatedUser = await prisma.user.findUnique({ where: { id: user.id } });
      expect(updatedUser?.theme).toBe('dark');

      // 3. GET /api/v1/settings returns persisted theme
      const getReq = new NextRequest('http://localhost:3000/api/v1/settings', {
        headers: {
          cookie: `${SESSION_COOKIE_NAME}=${rawToken}`,
        },
      });
      const getRes = await handleSettingsGet(getReq);
      expect(getRes.status).toBe(200);
      const getData = await getRes.json();
      expect(getData.data.settings.theme).toBe('dark');

      // 4. Invalid theme values are rejected with 400
      const invalidReq = new NextRequest('http://localhost:3000/api/v1/settings', {
        method: 'PATCH',
        headers: {
          origin: 'http://localhost:3000',
          'Content-Type': 'application/json',
          'x-csrf-token': csrfToken,
          cookie: `${SESSION_COOKIE_NAME}=${rawToken}`,
        },
        body: JSON.stringify({ theme: 'neon-cyberpunk' }),
      });
      const invalidRes = await handleSettingsPatch(invalidReq);
      expect(invalidRes.status).toBe(400);

      // Verify DB was not corrupted
      const untouchedUser = await prisma.user.findUnique({ where: { id: user.id } });
      expect(untouchedUser?.theme).toBe('dark');
    });
  });

  describe('CSP Compliance & Static Hashes', () => {
    it('generates valid static and dynamic CSP containing approved theme script hash', () => {
      const staticCsp = buildStaticCsp();
      expect(staticCsp).toContain(`script-src 'self'`);
      expect(staticCsp).toContain(STATIC_THEME_SCRIPT_HASH.replace(/'/g, ''));
      expect(staticCsp).toContain("style-src 'self' 'unsafe-inline'");

      const dynamicCsp = buildDynamicNonceCsp('test-nonce-1234');
      expect(dynamicCsp).toContain("script-src 'self' 'nonce-test-nonce-1234'");
      expect(dynamicCsp).toContain(STATIC_THEME_SCRIPT_HASH.replace(/'/g, ''));
      expect(dynamicCsp).not.toContain("script-src 'self' 'unsafe-inline'");
    });
  });
});
