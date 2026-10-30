import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('Design Tokens Contract (Part R & Part S10)', () => {
  const tokensPath = path.resolve(__dirname, '../../src/styles/tokens.css');
  const tokensContent = fs.readFileSync(tokensPath, 'utf8');

  it('defines required semantic surface and text tokens for light and dark themes', () => {
    expect(tokensContent).toContain('--bg-canvas:');
    expect(tokensContent).toContain('--bg-surface:');
    expect(tokensContent).toContain('--bg-surface-elevated:');
    expect(tokensContent).toContain('--text-primary:');
    expect(tokensContent).toContain('--text-secondary:');
    expect(tokensContent).toContain('--text-muted:');
    expect(tokensContent).toContain('--border-subtle:');
    expect(tokensContent).toContain('--border-strong:');
  });

  it('defines accessible action tokens with dark ink on warm amber', () => {
    expect(tokensContent).toContain('--action-primary-bg: #f59e0b;');
    expect(tokensContent).toContain('--action-primary-text: #0f172a;');
    expect(tokensContent).toContain('--focus-ring:');
  });

  it('defines typography, spatial, and transition tokens', () => {
    expect(tokensContent).toContain('--font-sans:');
    expect(tokensContent).toContain('--font-mono:');
    expect(tokensContent).toContain('--text-xs:');
    expect(tokensContent).toContain('--text-sm:');
    expect(tokensContent).toContain('--text-base:');
    expect(tokensContent).toContain('--text-lg:');
    expect(tokensContent).toContain('--text-2xl:');
    expect(tokensContent).toContain('--text-3xl:');
    expect(tokensContent).toContain('--space-4:');
    expect(tokensContent).toContain('--radius-md:');
    expect(tokensContent).toContain('--radius-lg:');
    expect(tokensContent).toContain('--transition-fast:');
  });

  it('verifies primary CTA color contrast meets WCAG 2.2 AA (>= 7.0:1)', () => {
    // Relative luminance calculation
    function getLuminance(hex: string): number {
      const rgb = [0, 2, 4].map((offset) => {
        const val = parseInt(hex.slice(offset, offset + 2), 16) / 255;
        return val <= 0.03928 ? val / 12.92 : Math.pow((val + 0.055) / 1.055, 2.4);
      });
      const r = rgb[0] ?? 0;
      const g = rgb[1] ?? 0;
      const b = rgb[2] ?? 0;
      return 0.2126 * r + 0.7152 * g + 0.0722 * b;
    }

    const lumInk = getLuminance('0f172a'); // #0f172a
    const lumAmber = getLuminance('f59e0b'); // #f59e0b
    const ratio = (Math.max(lumInk, lumAmber) + 0.05) / (Math.min(lumInk, lumAmber) + 0.05);

    expect(ratio).toBeGreaterThan(7.0); // Strict AA threshold is 4.5:1, our dark ink on amber achieves ~8.2:1!
  });
});
