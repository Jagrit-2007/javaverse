'use client';

import React, { useState } from 'react';
import { Dialog } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { Trash2, AlertTriangle, Loader2 } from 'lucide-react';
import type { ChatSlotItem } from './ChatSlotCards';

interface ChatLimitDialogProps {
  isOpen: boolean;
  onClose: () => void;
  chats: ChatSlotItem[];
  onDeleteAndReplace: (chatIdToDelete: string) => Promise<void>;
}

export function ChatLimitDialog({
  isOpen,
  onClose,
  chats,
  onDeleteAndReplace,
}: ChatLimitDialogProps) {
  const [selectedToDelete, setSelectedToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  async function handleConfirmDelete() {
    if (!selectedToDelete) return;
    setIsDeleting(true);
    try {
      await onDeleteAndReplace(selectedToDelete);
      setSelectedToDelete(null);
      onClose();
    } catch {
      // Handled by parent
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <Dialog
      isOpen={isOpen}
      onClose={() => {
        if (!isDeleting) {
          setSelectedToDelete(null);
          onClose();
        }
      }}
      title="Chat Limit Reached (3 of 3 Active)"
      description="You can keep up to 3 persistent chats. Delete one to start a new question."
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
        <p
          style={{
            color: 'var(--text-secondary)',
            fontSize: 'var(--text-sm)',
            lineHeight: 'var(--leading-relaxed)',
          }}
        >
          To maintain deep conceptual persistence without clutter, JavaVerse limits you to three
          concurrent questions. Deleting a chat will permanently remove its message history and
          visualizations.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
          {chats.map((c) => {
            const isSelected = selectedToDelete === c.id;
            return (
              <div
                key={c.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: 'var(--space-3) var(--space-4)',
                  backgroundColor: isSelected
                    ? 'var(--status-danger-bg)'
                    : 'var(--bg-surface-subtle)',
                  border: `1px solid ${isSelected ? 'var(--status-danger-border)' : 'var(--border-subtle)'}`,
                  borderRadius: 'var(--radius-md)',
                  transition: 'background-color 0.15s ease',
                }}
              >
                <div>
                  <div
                    style={{
                      fontWeight: 600,
                      fontSize: 'var(--text-sm)',
                      color: 'var(--text-primary)',
                    }}
                  >
                    Slot {c.slot}: {c.title}
                  </div>
                  <div
                    style={{
                      fontSize: 'var(--text-xs)',
                      color: 'var(--text-muted)',
                      marginTop: '2px',
                    }}
                  >
                    Status: {c.badgeStatus}
                  </div>
                </div>

                <Button
                  variant={isSelected ? 'danger' : 'secondary'}
                  size="sm"
                  onClick={() => setSelectedToDelete(isSelected ? null : c.id)}
                  disabled={isDeleting}
                  aria-pressed={isSelected}
                >
                  <Trash2 size={14} aria-hidden="true" />
                  <span>{isSelected ? 'Selected' : 'Choose to Replace'}</span>
                </Button>
              </div>
            );
          })}
        </div>

        {selectedToDelete && (
          <div
            style={{
              padding: 'var(--space-3)',
              backgroundColor: 'var(--status-danger-bg)',
              border: '1px solid var(--status-danger-border)',
              borderRadius: 'var(--radius-md)',
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--space-3)',
              color: 'var(--status-danger-text)',
              fontSize: 'var(--text-xs)',
            }}
          >
            <AlertTriangle size={18} aria-hidden="true" style={{ flexShrink: 0 }} />
            <span>
              Confirmation: Replacing this chat will permanently erase all its code, notes, and
              interactive visualizations.
            </span>
          </div>
        )}

        <div
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
            gap: 'var(--space-3)',
            marginTop: 'var(--space-2)',
          }}
        >
          <Button variant="secondary" onClick={onClose} disabled={isDeleting}>
            Cancel
          </Button>
          <Button
            variant="danger"
            disabled={!selectedToDelete || isDeleting}
            onClick={handleConfirmDelete}
          >
            {isDeleting ? (
              <>
                <Loader2 size={16} className="animate-spin" aria-hidden="true" />
                <span>Deleting & Creating...</span>
              </>
            ) : (
              <span>Permanently Delete & Start New</span>
            )}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
