'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { ChatSlotCards, type ChatSlotItem } from './ChatSlotCards';
import { ChatLimitDialog } from './ChatLimitDialog';
import { ChatConversation, type ChatMessage } from './ChatConversation';
import { WorkspacePanel } from './WorkspacePanel';
import { VisuallyHidden } from '@/components/ui/VisuallyHidden';
import styles from './AskWorkspace.module.css';

export function AskWorkspace() {
  const [chats, setChats] = useState<(ChatSlotItem | null)[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [activeChat, setActiveChat] = useState<{
    id: string;
    slot: number;
    title: string;
    messages: ChatMessage[];
    activeJob: { id: string; status: string; stage?: string | null; progress?: number } | null;
  } | null>(null);

  const [activeTab, setActiveTab] = useState<'workspace' | 'visualize' | 'explanation' | 'notes'>(
    'workspace',
  );
  const [vizStep, setVizStep] = useState<number>(0);
  const [draftMessage, setDraftMessage] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [isLimitDialogOpen, setIsLimitDialogOpen] = useState(false);

  const searchParams = useSearchParams();

  useEffect(() => {
    const initialPrompt = searchParams.get('prompt');
    if (initialPrompt) {
      setDraftMessage(initialPrompt);
    }
  }, [searchParams]);

  const csrfTokenRef = useRef<string>('');
  const lastEventIdRef = useRef<string>('');
  const autosaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // 1. Fetch CSRF token
  const fetchCsrfToken = useCallback(async () => {
    try {
      const res = await fetch('/api/v1/auth/csrf');
      if (res.ok) {
        const data = await res.json();
        csrfTokenRef.current = data.data?.csrfToken || '';
      }
    } catch {
      // Ignored
    }
  }, []);

  // 2. Fetch all user chats
  const loadChats = useCallback(async () => {
    try {
      const res = await fetch('/api/v1/chats');
      if (res.ok) {
        const json = await res.json();
        const list: ChatSlotItem[] = json.data?.chats || [];
        setChats(list);

        // Select first active chat if none currently selected
        if (!activeChatId && list.length > 0 && list[0]) {
          setActiveChatId(list[0].id);
        }
      }
    } catch {
      // Ignored
    }
  }, [activeChatId]);

  // 3. Fetch single chat details
  const loadChatDetails = useCallback(async (chatId: string) => {
    try {
      const res = await fetch(`/api/v1/chats/${chatId}`);
      if (res.ok) {
        const json = await res.json();
        const chatData = json.data?.chat;
        const stateData = json.data?.state?.uiState || {};
        const messagesData = json.data?.messages || [];
        const activeJobData = json.data?.activeJob || null;

        setActiveChat({
          id: chatData.id,
          slot: chatData.slot,
          title: chatData.title,
          messages: messagesData,
          activeJob: activeJobData,
        });

        // Restore state from server
        if (stateData.activeTab) setActiveTab(stateData.activeTab);
        if (typeof stateData.vizStep === 'number') setVizStep(stateData.vizStep);
        if (stateData.draftMessage) setDraftMessage(stateData.draftMessage);
        if (stateData.notes) setNotes(stateData.notes);
      }
    } catch {
      // Ignored
    }
  }, []);

  // Initial load
  useEffect(() => {
    fetchCsrfToken();
    loadChats();
  }, [fetchCsrfToken, loadChats]);

  // Load details when activeChatId changes
  useEffect(() => {
    if (activeChatId) {
      loadChatDetails(activeChatId);
    } else {
      setActiveChat(null);
    }
  }, [activeChatId, loadChatDetails]);

  // 4. Connect to SSE Stream
  useEffect(() => {
    let es: EventSource | null = null;
    let isMounted = true;

    function connectSSE() {
      const url = lastEventIdRef.current
        ? `/api/v1/events?lastEventId=${encodeURIComponent(lastEventIdRef.current)}`
        : '/api/v1/events';

      es = new EventSource(url);

      es.onmessage = (e) => {
        if (!isMounted) return;
        if (e.lastEventId) {
          lastEventIdRef.current = e.lastEventId;
        }
      };

      es.addEventListener('stage_changed', (e: MessageEvent) => {
        if (!isMounted) return;
        if (e.lastEventId) lastEventIdRef.current = e.lastEventId;
        try {
          const data = JSON.parse(e.data);
          // Update active chat if matching
          setActiveChat((prev) => {
            if (!prev || (prev.activeJob && prev.activeJob.id !== data.jobId)) return prev;
            return {
              ...prev,
              activeJob: {
                id: data.jobId,
                status: 'RUNNING',
                stage: data.stage,
                progress: data.progress,
              },
            };
          });

          // Update slot cards badge
          setChats((prev) =>
            prev.map((c) => {
              if (c && c.id === data.chatId) {
                return { ...c, badgeStatus: 'working' };
              }
              return c;
            }),
          );
        } catch {
          // Ignored
        }
      });

      es.addEventListener('job_completed', (e: MessageEvent) => {
        if (!isMounted) return;
        if (e.lastEventId) lastEventIdRef.current = e.lastEventId;
        try {
          const data = JSON.parse(e.data);
          if (activeChatId === data.chatId) {
            loadChatDetails(data.chatId);
          }
          setChats((prev) =>
            prev.map((c) => {
              if (c && c.id === data.chatId) {
                return { ...c, badgeStatus: 'ready' };
              }
              return c;
            }),
          );
        } catch {
          // Ignored
        }
      });

      es.addEventListener('job_cancelled', (e: MessageEvent) => {
        if (!isMounted) return;
        if (e.lastEventId) lastEventIdRef.current = e.lastEventId;
        try {
          const data = JSON.parse(e.data);
          if (activeChatId === data.chatId) {
            loadChatDetails(data.chatId);
          }
          setChats((prev) =>
            prev.map((c) => {
              if (c && c.id === data.chatId) {
                return { ...c, badgeStatus: 'idle' };
              }
              return c;
            }),
          );
        } catch {
          // Ignored
        }
      });

      es.onerror = () => {
        if (es) {
          es.close();
          // Reconnect with backoff
          setTimeout(() => {
            if (isMounted) connectSSE();
          }, 3000);
        }
      };
    }

    connectSSE();

    return () => {
      isMounted = false;
      if (es) es.close();
    };
  }, [activeChatId, loadChatDetails]);

  // 5. Debounced Autosave of UI State
  const triggerAutosave = useCallback(
    (updates: { tab?: typeof activeTab; step?: number; draft?: string; notesText?: string }) => {
      if (!activeChatId) return;

      if (autosaveTimeoutRef.current) {
        clearTimeout(autosaveTimeoutRef.current);
      }

      autosaveTimeoutRef.current = setTimeout(async () => {
        const payload = {
          uiState: {
            activeTab: updates.tab ?? activeTab,
            vizStep: updates.step ?? vizStep,
            draftMessage: updates.draft ?? draftMessage,
            notes: updates.notesText ?? notes,
          },
        };

        try {
          await fetch(`/api/v1/chats/${activeChatId}/state`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              'x-csrf-token': csrfTokenRef.current,
            },
            body: JSON.stringify(payload),
          });
        } catch {
          // Non-fatal if autosave fails
        }
      }, 1000);
    },
    [activeChatId, activeTab, vizStep, draftMessage, notes],
  );

  // Tab change handler
  function handleTabChange(tab: typeof activeTab) {
    setActiveTab(tab);
    triggerAutosave({ tab });
  }

  // Viz step handler
  function handleVizStepChange(step: number) {
    setVizStep(step);
    triggerAutosave({ step });
  }

  // Draft change handler
  function handleDraftChange(draft: string) {
    setDraftMessage(draft);
    triggerAutosave({ draft });
  }

  // Notes change handler
  function handleNotesChange(newNotes: string) {
    setNotes(newNotes);
    triggerAutosave({ notesText: newNotes });
  }

  // New Chat Click
  async function handleNewChatClick() {
    const occupiedCount = chats.filter(Boolean).length;
    if (occupiedCount >= 3) {
      setIsLimitDialogOpen(true);
      return;
    }

    try {
      const res = await fetch('/api/v1/chats', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-csrf-token': csrfTokenRef.current,
        },
        body: JSON.stringify({}),
      });

      if (res.ok) {
        const json = await res.json();
        const newChat = json.data?.chat;
        await loadChats();
        setActiveChatId(newChat.id);
      } else if (res.status === 409) {
        setIsLimitDialogOpen(true);
      }
    } catch {
      // Ignored
    }
  }

  // Delete & Replace
  async function handleDeleteAndReplace(chatIdToDelete: string) {
    try {
      const delRes = await fetch(`/api/v1/chats/${chatIdToDelete}`, {
        method: 'DELETE',
        headers: {
          'x-csrf-token': csrfTokenRef.current,
        },
      });

      if (delRes.ok) {
        // Create new chat in freed slot
        const createRes = await fetch('/api/v1/chats', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-csrf-token': csrfTokenRef.current,
          },
          body: JSON.stringify({}),
        });

        if (createRes.ok) {
          const json = await createRes.json();
          await loadChats();
          setActiveChatId(json.data?.chat?.id);
        }
      }
    } catch {
      // Ignored
    }
  }

  // Send Message
  async function handleSendMessage(content: string) {
    if (!activeChatId) return;

    // Optimistically show user message and assistant placeholder
    const tempUserMsgId = `temp-user-${Date.now()}`;
    const tempAssistantMsgId = `temp-asst-${Date.now()}`;

    setActiveChat((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        messages: [
          ...prev.messages,
          {
            id: tempUserMsgId,
            role: 'user',
            content,
            status: 'SENT',
            createdAt: new Date().toISOString(),
          },
          {
            id: tempAssistantMsgId,
            role: 'assistant',
            content: '',
            status: 'PROCESSING',
            createdAt: new Date().toISOString(),
          },
        ],
        activeJob: {
          id: 'temp-job',
          status: 'PENDING',
          stage: 'reading',
          progress: 5,
        },
      };
    });

    try {
      const res = await fetch(`/api/v1/chats/${activeChatId}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-csrf-token': csrfTokenRef.current,
        },
        body: JSON.stringify({ content }),
      });

      if (res.ok) {
        const json = await res.json();
        const jobId = json.data?.jobId;
        setActiveChat((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            activeJob: {
              id: jobId,
              status: 'RUNNING',
              stage: 'reading',
              progress: 10,
            },
          };
        });
      } else {
        await loadChatDetails(activeChatId);
      }
    } catch {
      await loadChatDetails(activeChatId);
    }
  }

  // Cancel Job
  async function handleCancelJob() {
    if (!activeChatId) return;
    try {
      await fetch(`/api/v1/chats/${activeChatId}/cancel`, {
        method: 'POST',
        headers: {
          'x-csrf-token': csrfTokenRef.current,
        },
      });
      await loadChatDetails(activeChatId);
    } catch {
      // Ignored
    }
  }

  // Retry Job
  async function handleRetryJob() {
    if (!activeChatId) return;
    try {
      await fetch(`/api/v1/chats/${activeChatId}/retry`, {
        method: 'POST',
        headers: {
          'x-csrf-token': csrfTokenRef.current,
        },
      });
      await loadChatDetails(activeChatId);
    } catch {
      // Ignored
    }
  }

  // Rename Title
  async function handleUpdateTitle(newTitle: string) {
    if (!activeChatId) return;
    try {
      await fetch(`/api/v1/chats/${activeChatId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-csrf-token': csrfTokenRef.current,
        },
        body: JSON.stringify({ title: newTitle }),
      });
      await loadChats();
    } catch {
      // Ignored
    }
  }

  const latestAnalysis = activeChat?.messages
    ?.slice()
    ?.reverse()
    ?.find((m) => m.analysis)?.analysis?.result;

  const solutionCode = latestAnalysis?.solution?.code || null;

  return (
    <div className={styles.workspaceLayout}>
      <VisuallyHidden as="h1">Ask JavaVerse</VisuallyHidden>
      <ChatSlotCards
        slots={chats}
        activeChatId={activeChatId}
        onSelectChat={(id) => setActiveChatId(id)}
        onNewChatClick={handleNewChatClick}
      />

      <div className={styles.splitPane}>
        {activeChat ? (
          <>
            <ChatConversation
              chatId={activeChat.id}
              title={activeChat.title}
              slot={activeChat.slot}
              messages={activeChat.messages}
              activeJob={activeChat.activeJob}
              onSendMessage={handleSendMessage}
              onCancelJob={handleCancelJob}
              onRetryJob={handleRetryJob}
              onUpdateTitle={handleUpdateTitle}
              draftMessage={draftMessage}
              onDraftChange={handleDraftChange}
            />

            <WorkspacePanel
              activeTab={activeTab}
              onTabChange={handleTabChange}
              solutionCode={solutionCode}
              analysis={latestAnalysis}
              vizStep={vizStep}
              onVizStepChange={handleVizStepChange}
              notes={notes}
              onNotesChange={handleNotesChange}
            />
          </>
        ) : (
          <div
            style={{
              gridColumn: '1 / -1',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 'var(--space-12)',
              backgroundColor: 'var(--bg-surface)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-lg)',
              textAlign: 'center',
              color: 'var(--text-secondary)',
            }}
          >
            <h2
              style={{ fontSize: 'var(--text-lg)', fontWeight: 700, color: 'var(--text-primary)' }}
            >
              No Active Question Selected
            </h2>
            <p
              style={{ marginTop: 'var(--space-2)', fontSize: 'var(--text-sm)', maxWidth: '400px' }}
            >
              Select an active slot card above or click "+ New Question" to begin learning with
              JavaVerse.
            </p>
          </div>
        )}
      </div>

      <ChatLimitDialog
        isOpen={isLimitDialogOpen}
        onClose={() => setIsLimitDialogOpen(false)}
        chats={chats.filter((c): c is ChatSlotItem => c !== null)}
        onDeleteAndReplace={handleDeleteAndReplace}
      />
    </div>
  );
}
