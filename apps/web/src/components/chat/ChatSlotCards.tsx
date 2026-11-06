'use client';

import React from 'react';
import { Plus, MessageSquare, Loader2, CheckCircle2 } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import styles from './ChatSlotCards.module.css';

export interface ChatSlotItem {
  id: string;
  slot: number;
  title: string;
  badgeStatus: 'idle' | 'working' | 'ready';
  latestMessage?: { content: string; createdAt: string } | null;
}

interface ChatSlotCardsProps {
  slots: (ChatSlotItem | null)[];
  activeChatId: string | null;
  onSelectChat: (chatId: string) => void;
  onNewChatClick: () => void;
}

export function ChatSlotCards({
  slots,
  activeChatId,
  onSelectChat,
  onNewChatClick,
}: ChatSlotCardsProps) {
  // Always render 3 slots (1, 2, 3)
  const slotIndices = [1, 2, 3];

  return (
    <nav className={styles.slotGrid} aria-label="Persistent Question Slots">
      {slotIndices.map((slotNum) => {
        const item = slots.find((s) => s && s.slot === slotNum);
        const isActive = item ? item.id === activeChatId : false;

        if (!item) {
          return (
            <button
              key={`empty-slot-${slotNum}`}
              type="button"
              className={`${styles.slotCard} ${styles.emptySlotCard}`}
              onClick={onNewChatClick}
            >
              <Plus size={16} aria-hidden="true" />
              <span>+ Slot {slotNum}: New Question</span>
            </button>
          );
        }

        return (
          <button
            key={item.id}
            type="button"
            aria-current={isActive ? 'true' : undefined}
            className={`${styles.slotCard} ${isActive ? styles.slotCardActive : ''}`}
            onClick={() => onSelectChat(item.id)}
          >
            <div className={styles.slotHeader}>
              <span className={styles.slotNumber}>Slot {item.slot}</span>
              {item.badgeStatus === 'working' && (
                <Badge variant="warning" size="sm">
                  <Loader2 size={12} className="animate-spin" aria-hidden="true" />
                  <span>Analyzing...</span>
                </Badge>
              )}
              {item.badgeStatus === 'ready' && (
                <Badge variant="success" size="sm">
                  <CheckCircle2 size={12} aria-hidden="true" />
                  <span>Answer Ready</span>
                </Badge>
              )}
              {item.badgeStatus === 'idle' && (
                <Badge variant="neutral" size="sm">
                  <span>Idle</span>
                </Badge>
              )}
            </div>
            <div className={styles.slotTitle} title={item.title}>
              {item.title}
            </div>
            <div className={styles.slotMeta}>
              <MessageSquare size={13} aria-hidden="true" />
              <span>
                {item.latestMessage
                  ? item.latestMessage.content.slice(0, 32) + '...'
                  : 'No messages yet'}
              </span>
            </div>
          </button>
        );
      })}
    </nav>
  );
}
