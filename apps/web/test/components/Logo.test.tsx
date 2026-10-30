import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Logo } from '../../src/components/brand/Logo';

describe('Original Geometric JavaVerse Logo', () => {
  it('renders correctly at 16px, 24px, 32px, and 40px dimensions', () => {
    const { rerender, container } = render(<Logo size={16} showWordmark={false} />);
    let svg = container.querySelector('svg');
    expect(svg?.getAttribute('width')).toBe('16');
    expect(svg?.getAttribute('height')).toBe('16');

    rerender(<Logo size={24} showWordmark={false} />);
    svg = container.querySelector('svg');
    expect(svg?.getAttribute('width')).toBe('24');

    rerender(<Logo size={32} showWordmark={false} />);
    svg = container.querySelector('svg');
    expect(svg?.getAttribute('width')).toBe('32');

    rerender(<Logo size={40} showWordmark={false} />);
    svg = container.querySelector('svg');
    expect(svg?.getAttribute('width')).toBe('40');
  });

  it('sets aria-hidden="true" on SVG when wordmark is present to avoid duplicate announcements', () => {
    const { container } = render(<Logo size={32} showWordmark={true} />);
    const svg = container.querySelector('svg');
    expect(svg?.getAttribute('aria-hidden')).toBe('true');
    expect(screen.getByText('JavaVerse')).toBeDefined();
    expect(screen.getByText('Learn Java. Build Your Thinking.')).toBeDefined();
  });

  it('sets role="img" and aria-label="JavaVerse" when rendered standalone without wordmark', () => {
    const { container } = render(<Logo size={32} showWordmark={false} />);
    const svg = container.querySelector('svg');
    expect(svg?.getAttribute('role')).toBe('img');
    expect(svg?.getAttribute('aria-label')).toBe('JavaVerse');
    expect(svg?.getAttribute('aria-hidden')).toBeNull();
  });
});
