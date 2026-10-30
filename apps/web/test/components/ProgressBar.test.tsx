import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ProgressBar } from '../../src/components/ui/ProgressBar';

describe('ProgressBar Component', () => {
  it('renders horizontal progressbar with accessible attributes', () => {
    render(<ProgressBar value={70} label="Java Fundamentals progress" variant="horizontal" />);
    const bar = screen.getByRole('progressbar', { name: 'Java Fundamentals progress' });

    expect(bar).toBeDefined();
    expect(bar.getAttribute('aria-valuenow')).toBe('70');
    expect(bar.getAttribute('aria-valuemin')).toBe('0');
    expect(bar.getAttribute('aria-valuemax')).toBe('100');
  });

  it('renders radial donut progressbar with percentage text', () => {
    render(<ProgressBar value={35} label="Overall Java Learning Progress" variant="radial" />);
    const bar = screen.getByRole('progressbar', { name: 'Overall Java Learning Progress' });

    expect(bar).toBeDefined();
    expect(bar.getAttribute('aria-valuenow')).toBe('35');
    expect(screen.getByText('35%')).toBeDefined();
  });

  it('clamps values below 0 and above 100 correctly', () => {
    render(<ProgressBar value={120} label="Clamped progress" variant="horizontal" />);
    const bar = screen.getByRole('progressbar', { name: 'Clamped progress' });
    expect(bar.getAttribute('aria-valuenow')).toBe('100');
  });
});
