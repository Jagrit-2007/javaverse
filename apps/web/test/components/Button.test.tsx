import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Button } from '../../src/components/ui/Button';

describe('Button Component', () => {
  it('renders with accessible text name and button role', () => {
    render(<Button>Click Me</Button>);
    const button = screen.getByRole('button', { name: 'Click Me' });
    expect(button).toBeDefined();
    expect(button.tagName).toBe('BUTTON');
  });

  it('handles click events when enabled', async () => {
    const user = userEvent.setup();
    const handleClick = vi.fn();
    render(<Button onClick={handleClick}>Submit</Button>);

    await user.click(screen.getByRole('button', { name: 'Submit' }));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('prevents interaction and reflects disabled state', async () => {
    const user = userEvent.setup();
    const handleClick = vi.fn();
    render(
      <Button disabled onClick={handleClick}>
        Disabled Button
      </Button>,
    );

    const button = screen.getByRole('button', { name: 'Disabled Button' }) as HTMLButtonElement;
    expect(button.disabled).toBe(true);
    expect(button.getAttribute('aria-disabled')).toBe('true');

    await user.click(button);
    expect(handleClick).not.toHaveBeenCalled();
  });

  it('applies primary variant styling with dark ink on warm amber', () => {
    render(<Button variant="primary">Continue Learning</Button>);
    const button = screen.getByRole('button', { name: 'Continue Learning' });
    expect(button.className).toContain('primary');
  });
});
