'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Send, StopCircle, RefreshCw, CheckCircle2, Clock, Check } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { ProgressBar } from '@/components/ui/ProgressBar';
import type { AnalysisDetails } from './WorkspacePanel';
import styles from './ChatConversation.module.css';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  status: string;
  createdAt: string;
  analysis?: { result?: AnalysisDetails } | null;
}

interface ChatConversationProps {
  chatId: string;
  title: string;
  slot: number;
  messages: ChatMessage[];
  activeJob: { id: string; status: string; stage?: string | null; progress?: number } | null;
  onSendMessage: (content: string) => Promise<void>;
  onCancelJob: () => Promise<void>;
  onRetryJob: () => Promise<void>;
  onUpdateTitle: (title: string) => Promise<void>;
  draftMessage: string;
  onDraftChange: (draft: string) => void;
}

const STAGES = [
  { id: 'reading', label: '1. Reading' },
  { id: 'understanding', label: '2. Understanding' },
  { id: 'choosing_technique', label: '3. Choosing Technique' },
  { id: 'writing_solution', label: '4. Writing Solution' },
  { id: 'testing_sandbox', label: '5. Testing in Sandbox' },
  { id: 'building_visuals', label: '6. Building Visuals' },
];

export function ChatConversation({
  title,
  slot,
  messages,
  activeJob,
  onSendMessage,
  onCancelJob,
  onRetryJob,
  onUpdateTitle,
  draftMessage,
  onDraftChange,
}: ChatConversationProps) {
  const [currentTitle, setCurrentTitle] = useState(title);
  const [isSending, setIsSending] = useState(false);
  const messageEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setCurrentTitle(title);
  }, [title]);

  useEffect(() => {
    messageEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, activeJob?.stage]);

  const isWorking = activeJob?.status === 'RUNNING' || activeJob?.status === 'PENDING';
  const isFailed = activeJob?.status === 'FAILED';

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!draftMessage.trim() || isSending || isWorking) return;

    setIsSending(true);
    try {
      await onSendMessage(draftMessage);
      onDraftChange('');
    } finally {
      setIsSending(false);
    }
  }

  function handleTitleBlur() {
    if (currentTitle.trim() && currentTitle !== title) {
      onUpdateTitle(currentTitle.trim());
    }
  }

  const currentStageIndex = activeJob?.stage
    ? STAGES.findIndex((s) => s.id === activeJob.stage)
    : -1;

  return (
    <div className={styles.conversationContainer}>
      <div className={styles.chatHeader}>
        <div className={styles.titleArea}>
          <Badge variant="neutral" size="sm">
            Slot {slot}
          </Badge>
          <input
            type="text"
            className={styles.titleInput}
            value={currentTitle}
            onChange={(e) => setCurrentTitle(e.target.value)}
            onBlur={handleTitleBlur}
            onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
            aria-label="Rename Chat Title"
          />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
          <Badge variant="neutral" size="sm">
            Java 21 LTS
          </Badge>
          {isWorking && (
            <Button variant="secondary" size="sm" onClick={onCancelJob}>
              <StopCircle size={14} aria-hidden="true" />
              <span>Cancel</span>
            </Button>
          )}
          {isFailed && (
            <Button variant="danger" size="sm" onClick={onRetryJob}>
              <RefreshCw size={14} aria-hidden="true" />
              <span>Retry</span>
            </Button>
          )}
        </div>
      </div>

      <div
        className={styles.messageList}
        role="log"
        aria-live="polite"
        aria-label="Conversation messages"
      >
        {messages.length === 0 && !isWorking && (
          <div
            style={{
              textAlign: 'center',
              color: 'var(--text-muted)',
              margin: 'auto',
              padding: 'var(--space-8)',
            }}
          >
            <p
              style={{
                fontSize: 'var(--text-base)',
                fontWeight: 600,
                color: 'var(--text-secondary)',
              }}
            >
              Ask JavaVerse about any Java question
            </p>
            <p style={{ fontSize: 'var(--text-sm)', marginTop: 'var(--space-2)' }}>
              Paste code, algorithmic problems, or conceptual questions. You will receive a verified
              Java solution and an interactive visualization walkthrough.
            </p>
          </div>
        )}

        {messages.map((msg) => {
          const roleUpper = msg.role.toUpperCase();
          if (roleUpper === 'USER') {
            return (
              <div key={msg.id} className={styles.userMessage}>
                {msg.content}
              </div>
            );
          }

          const isStreaming = msg.status === 'STREAMING' || msg.status === 'PENDING';
          const isDone = msg.status === 'SENT' && !!msg.content;

          return (
            <div key={msg.id} className={styles.assistantMessage}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                <Badge variant="info" size="sm">
                  JavaVerse Tutor
                </Badge>
                {isDone && (
                  <Badge variant="success" size="sm">
                    <CheckCircle2 size={12} aria-hidden="true" />
                    <span>Verified</span>
                  </Badge>
                )}
                {msg.status === 'FAILED' && (
                  <Badge variant="danger" size="sm">
                    Failed / Cancelled
                  </Badge>
                )}
              </div>

              {isStreaming && (
                <div className={styles.stageStepper}>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: 'var(--space-1)',
                    }}
                  >
                    <span
                      style={{
                        fontSize: 'var(--text-xs)',
                        fontWeight: 600,
                        color: 'var(--text-primary)',
                      }}
                    >
                      Analyzing Java Problem ({activeJob?.progress || 10}%)
                    </span>
                    <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                      Stage: {activeJob?.stage || 'reading'}
                    </span>
                  </div>
                  <ProgressBar label="Analysis Progress" value={activeJob?.progress || 10} />

                  <div className={styles.stageList} style={{ marginTop: 'var(--space-2)' }}>
                    {STAGES.map((stage, idx) => {
                      const isCompleted = idx < currentStageIndex;
                      const isCurrent = idx === currentStageIndex;
                      return (
                        <div
                          key={stage.id}
                          className={`${styles.stageItem} ${
                            isCompleted
                              ? styles.stageItemCompleted
                              : isCurrent
                                ? styles.stageItemActive
                                : ''
                          }`}
                        >
                          {isCompleted ? (
                            <Check size={12} aria-hidden="true" />
                          ) : isCurrent ? (
                            <Clock size={12} className="animate-spin" aria-hidden="true" />
                          ) : (
                            <span style={{ width: 12, height: 12, display: 'inline-block' }}>
                              •
                            </span>
                          )}
                          <span>{stage.label}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {msg.content && (
                <div style={{ whiteSpace: 'pre-wrap', lineHeight: 'var(--leading-relaxed)' }}>
                  {msg.content}
                </div>
              )}
            </div>
          );
        })}

        <div ref={messageEndRef} />
      </div>

      <form className={styles.composer} onSubmit={handleSend}>
        <textarea
          className={styles.textarea}
          value={draftMessage}
          onChange={(e) => onDraftChange(e.target.value.slice(0, 10000))}
          placeholder="Paste or describe your Java question (e.g. Binary search, Stack validation, or OOP encapsulation)..."
          disabled={isWorking || isSending}
          rows={3}
          aria-label="Your Java Question"
        />

        <div className={styles.composerFooter}>
          <span className={styles.charCount}>{draftMessage.length} / 10,000 characters</span>
          <Button
            type="submit"
            variant="primary"
            size="sm"
            disabled={!draftMessage.trim() || isWorking || isSending}
          >
            <Send size={14} aria-hidden="true" />
            <span>{isWorking ? 'Processing...' : 'Send Question'}</span>
          </Button>
        </div>
      </form>
    </div>
  );
}
