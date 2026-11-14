'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { ChatSlotCards, type ChatSlotItem } from './ChatSlotCards';
import { ChatLimitDialog } from './ChatLimitDialog';
import { ChatConversation, type ChatMessage } from './ChatConversation';
import { WorkspacePanel } from './WorkspacePanel';
import { VisuallyHidden } from '@/components/ui/VisuallyHidden';
import { Button } from '@/components/ui/Button';
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

  // AI Provider info & Consent state
  const [aiProviderInfo, setAiProviderInfo] = useState<{
    activeProvider: string;
    activeModel: string;
    externalAiEnabled: boolean;
  }>({
    activeProvider: 'mock',
    activeModel: 'mock-analyzer-v1',
    externalAiEnabled: false,
  });
  const [showConsentModal, setShowConsentModal] = useState(false);
  const [consentRemember, setConsentRemember] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const pendingContentRef = useRef<string | null>(null);

  const searchParams = useSearchParams();

  useEffect(() => {
    fetch('/api/v1/ai/providers')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.data) {
          setAiProviderInfo({
            activeProvider: data.data.activeProvider || 'mock',
            activeModel: data.data.activeModel || 'mock-analyzer-v1',
            externalAiEnabled: Boolean(data.data.externalAiEnabled),
          });
        }
      })
      .catch(() => {});
  }, []);

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

  const ensureCsrfToken = useCallback(async (): Promise<string> => {
    if (csrfTokenRef.current) return csrfTokenRef.current;
    try {
      const res = await fetch('/api/v1/auth/csrf');
      if (res.ok) {
        const data = await res.json();
        const token = data.data?.csrfToken || '';
        csrfTokenRef.current = token;
        return token;
      }
    } catch {
      // Ignored
    }
    return '';
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
          const csrfToken = await ensureCsrfToken();
          await fetch(`/api/v1/chats/${activeChatId}/state`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              'x-csrf-token': csrfToken,
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
      const csrfToken = await ensureCsrfToken();
      const res = await fetch('/api/v1/chats', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-csrf-token': csrfToken,
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
      const csrfToken = await ensureCsrfToken();
      const delRes = await fetch(`/api/v1/chats/${chatIdToDelete}`, {
        method: 'DELETE',
        headers: {
          'x-csrf-token': csrfToken,
        },
      });

      if (delRes.ok) {
        // Create new chat in freed slot
        const createRes = await fetch('/api/v1/chats', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-csrf-token': csrfToken,
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
  async function executeSendMessage(content: string) {
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
      const csrfToken = await ensureCsrfToken();
      const res = await fetch(`/api/v1/chats/${activeChatId}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-csrf-token': csrfToken,
        },
        body: JSON.stringify({ content }),
      });

      if (res.ok) {
        setErrorMessage(null);
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
        const json = await res.json().catch(() => null);
        const msg = json?.error?.message || 'Failed to send message';
        setErrorMessage(msg);
        await loadChatDetails(activeChatId);
      }
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Network error');
      await loadChatDetails(activeChatId);
    }
  }

  async function handleSendMessage(content: string): Promise<boolean> {
    if (!activeChatId) return false;

    // External AI Consent check (Part 11F)
    if (aiProviderInfo.activeProvider !== 'mock' && aiProviderInfo.externalAiEnabled) {
      const consentGiven =
        typeof window !== 'undefined' && sessionStorage.getItem('external_ai_consent') === 'true';
      if (!consentGiven) {
        pendingContentRef.current = content;
        setShowConsentModal(true);
        return false;
      }
    }

    await executeSendMessage(content);
    return true;
  }

  const handleConsentConfirm = async () => {
    if (consentRemember && typeof window !== 'undefined') {
      sessionStorage.setItem('external_ai_consent', 'true');
    }
    setShowConsentModal(false);
    const content = pendingContentRef.current;
    pendingContentRef.current = null;
    if (content) {
      setDraftMessage('');
      await executeSendMessage(content);
    }
  };

  const handleConsentCancel = () => {
    setShowConsentModal(false);
    pendingContentRef.current = null;
  };

  // Cancel Job
  async function handleCancelJob() {
    if (!activeChatId) return;
    try {
      const csrfToken = await ensureCsrfToken();
      await fetch(`/api/v1/chats/${activeChatId}/cancel`, {
        method: 'POST',
        headers: {
          'x-csrf-token': csrfToken,
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
      const csrfToken = await ensureCsrfToken();
      await fetch(`/api/v1/chats/${activeChatId}/retry`, {
        method: 'POST',
        headers: {
          'x-csrf-token': csrfToken,
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
      const csrfToken = await ensureCsrfToken();
      await fetch(`/api/v1/chats/${activeChatId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-csrf-token': csrfToken,
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

      {/* AI Mode Banner (Part 11E) */}
      <div
        role="status"
        aria-label="AI Provider Mode"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: 'var(--space-2) var(--space-4)',
          borderRadius: 'var(--radius-md)',
          fontSize: 'var(--text-xs)',
          backgroundColor: 'var(--bg-surface-subtle)',
          border: '1px solid var(--border-subtle)',
          color: 'var(--text-secondary)',
          margin: 'var(--space-2) 0',
        }}
        data-testid="ai-mode-banner"
      >
        {aiProviderInfo.activeProvider === 'gemini' ? (
          <span>
            <strong>AI Provider: Gemini</strong> · Model: {aiProviderInfo.activeModel} · Type:
            External · Requests are sent to an external AI provider and may consume API quota.
          </span>
        ) : aiProviderInfo.activeProvider === 'anthropic' ? (
          <span>
            <strong>AI Provider: Anthropic</strong> · Model: {aiProviderInfo.activeModel} · Type:
            External · Requests are sent to an external AI provider and may consume API quota.
          </span>
        ) : (
          <span>
            <strong>AI Provider: Local Mock</strong> · Model: {aiProviderInfo.activeModel} · Type:
            Local · No external AI request or paid token usage.
          </span>
        )}
      </div>

      {errorMessage && (
        <div
          role="alert"
          style={{
            padding: 'var(--space-3) var(--space-4)',
            borderRadius: 'var(--radius-md)',
            backgroundColor: 'var(--status-danger-subtle, #fef2f2)',
            border: '1px solid var(--status-danger, #ef4444)',
            color: 'var(--status-danger-text, #991b1b)',
            fontSize: 'var(--text-sm)',
            margin: 'var(--space-2) 0',
          }}
          data-testid="ask-error-banner"
        >
          {errorMessage}
        </div>
      )}

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

      {/* External AI Consent Modal (Part 11F) */}
      {showConsentModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="ai-consent-title"
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
          data-testid="external-ai-consent-dialog"
        >
          <div
            style={{
              backgroundColor: 'var(--bg-surface)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-lg)',
              padding: 'var(--space-6)',
              maxWidth: '480px',
              width: '90%',
              boxShadow: 'var(--shadow-lg)',
            }}
          >
            <h2
              id="ai-consent-title"
              style={{
                fontSize: 'var(--text-lg)',
                fontWeight: 700,
                marginBottom: 'var(--space-2)',
              }}
            >
              External AI Service Notice
            </h2>
            <p
              style={{
                fontSize: 'var(--text-sm)',
                color: 'var(--text-secondary)',
                lineHeight: 1.5,
                marginBottom: 'var(--space-3)',
              }}
            >
              Your question and relevant Java code snippets will be sent to{' '}
              <strong>
                {aiProviderInfo.activeProvider === 'gemini' ? 'Google Gemini' : 'Anthropic Claude'}
              </strong>{' '}
              for pedagogical analysis.
            </p>
            <ul
              style={{
                fontSize: 'var(--text-xs)',
                color: 'var(--text-muted)',
                marginBottom: 'var(--space-4)',
                paddingLeft: 'var(--space-4)',
              }}
            >
              <li>External AI terms of service and privacy policies apply.</li>
              <li>Token usage and potential API costs apply.</li>
              <li>
                JavaVerse applies automated redaction and structured prompt boundaries. Automated
                detection may not identify every sensitive value. Do not submit passwords, API keys,
                confidential code, or private information.
              </li>
            </ul>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--space-2)',
                marginBottom: 'var(--space-4)',
              }}
            >
              <input
                type="checkbox"
                id="consent-remember"
                checked={consentRemember}
                onChange={(e) => setConsentRemember(e.target.checked)}
              />
              <label
                htmlFor="consent-remember"
                style={{
                  fontSize: 'var(--text-xs)',
                  color: 'var(--text-secondary)',
                  cursor: 'pointer',
                }}
              >
                Remember for this browser session
              </label>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-3)' }}>
              <Button variant="secondary" size="sm" onClick={handleConsentCancel}>
                Cancel
              </Button>
              <Button variant="primary" size="sm" onClick={handleConsentConfirm}>
                {aiProviderInfo.activeProvider === 'gemini'
                  ? 'Continue with Gemini'
                  : aiProviderInfo.activeProvider === 'anthropic'
                    ? 'Continue with Anthropic'
                    : 'Continue'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
