import { describe, it, expect } from 'vitest';
import crypto from 'crypto';
import { THEME_SCRIPT_CONTENT, THEME_SCRIPT_SHA256 } from '../../src/components/theme/ThemeScript';

describe('ThemeScript Integrity & Hash Verification', () => {
  it('computes exact SHA-256 hash matching the CSP static hash specification', () => {
    const computedHash = crypto.createHash('sha256').update(THEME_SCRIPT_CONTENT).digest('base64');

    expect(`'sha256-${computedHash}'`).toBe(THEME_SCRIPT_SHA256);
  });

  it('contains fallback logic that follows system prefers-color-scheme when unstored or system', () => {
    expect(THEME_SCRIPT_CONTENT).toContain("var t='light'");
    expect(THEME_SCRIPT_CONTENT).toContain("if(s==='dark'){t='dark'}");
    expect(THEME_SCRIPT_CONTENT).toContain("else if(s==='light'){t='light'}");
    expect(THEME_SCRIPT_CONTENT).toContain("else if(s==='system'||!s)");
    expect(THEME_SCRIPT_CONTENT).toContain("document.documentElement.setAttribute('data-theme',t)");
  });
});
