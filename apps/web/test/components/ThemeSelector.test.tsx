import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider } from '../../src/components/theme/ThemeProvider';
import { ThemeSelector } from '../../src/components/theme/ThemeSelector';

describe('ThemeSelector Component', () => {
  it('renders native select with accessible label and 3 theme options', () => {
    render(
      <ThemeProvider>
        <ThemeSelector />
      </ThemeProvider>,
    );

    const select = screen.getByRole('combobox', { name: 'Select color theme' });
    expect(select).toBeDefined();

    const options = screen.getAllByRole('option');
    expect(options).toHaveLength(3);
    expect(options[0]?.textContent).toBe('Light');
    expect(options[1]?.textContent).toBe('Dark');
    expect(options[2]?.textContent).toBe('System');
  });

  it('updates theme state upon user selection', async () => {
    const user = userEvent.setup();
    render(
      <ThemeProvider>
        <ThemeSelector />
      </ThemeProvider>,
    );

    const select = screen.getByRole('combobox', { name: 'Select color theme' });
    await user.selectOptions(select, 'dark');

    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
  });
});
