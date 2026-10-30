import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Dialog } from '../../src/components/ui/Dialog';

describe('Dialog Primitive', () => {
  it('renders modal dialog with accessible title and close button when open', () => {
    const handleClose = vi.fn();
    render(
      <Dialog
        isOpen={true}
        onClose={handleClose}
        title="Challenge Hints"
        description="Helper hints for string reversal"
      >
        <p>Use two pointers</p>
      </Dialog>,
    );

    expect(screen.getByRole('dialog', { name: 'Challenge Hints' })).toBeDefined();
    expect(screen.getByText('Use two pointers')).toBeDefined();
    expect(screen.getByRole('button', { name: 'Close dialog' })).toBeDefined();
  });

  it('triggers onClose when close button is clicked', async () => {
    const user = userEvent.setup();
    const handleClose = vi.fn();
    render(
      <Dialog isOpen={true} onClose={handleClose} title="Challenge Hints">
        <p>Content</p>
      </Dialog>,
    );

    await user.click(screen.getByRole('button', { name: 'Close dialog' }));
    expect(handleClose).toHaveBeenCalledTimes(1);
  });
});
