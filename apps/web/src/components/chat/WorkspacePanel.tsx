'use client';

import React, { useState, useEffect } from 'react';
import { Code, Eye, BookOpen, Edit3, Copy, Check } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import type { VisualizationSpec, Approach, VizStep } from '@javaverse/schemas';
import { ConceptVisualizer } from '@/components/visualizations/ConceptVisualizer';
import styles from './WorkspacePanel.module.css';

export type { VisualizationSpec, Approach, VizStep };

export interface AnalysisDetails {
  schemaVersion?: number;
  meta?: {
    topic?: string;
    subtopics?: string[];
    difficulty?: string;
    questionType?: string;
    javaVersion?: string;
    confidence?: number;
  };
  understanding?: {
    restatement?: string;
    inputs?: string[];
    outputs?: string[];
    constraints?: string[];
    examples?: Array<{ input?: string; output?: string; explanation?: string }>;
    edgeCases?: string[];
    assumptions?: string[];
  };
  prerequisites?: Array<{ concept?: string; explanation?: string }>;
  approaches?: Approach[];
  solution?: {
    code?: string;
    explanation?: Array<{ fromLine?: number; toLine?: number; text?: string }>;
    tests?: Array<{ name?: string; input?: string; expectedOutput?: string }>;
    dryRun?: Array<{ step?: number; line?: number; vars?: Record<string, unknown>; note?: string }>;
  };
  visualizations?: VisualizationSpec[];
  pitfalls?: string[];
  followUps?: string[];
  relatedLessons?: string[];
  practice?: Array<{ prompt?: string; difficulty?: string }>;
}

interface WorkspacePanelProps {
  activeTab: 'workspace' | 'visualize' | 'explanation' | 'notes';
  onTabChange: (tab: 'workspace' | 'visualize' | 'explanation' | 'notes') => void;
  solutionCode?: string | null;
  analysis?: AnalysisDetails | null | undefined;
  vizStep: number;
  onVizStepChange: (step: number) => void;
  notes: string;
  onNotesChange: (notes: string) => void;
}

export function WorkspacePanel({
  activeTab,
  onTabChange,
  solutionCode,
  analysis,
  vizStep,
  onVizStepChange,
  notes,
  onNotesChange,
}: WorkspacePanelProps) {
  const [copied, setCopied] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);

  const vizSpec = analysis?.visualizations?.[0];
  const totalSteps = vizSpec?.steps?.length || 0;

  // Auto-play timer
  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;
    if (isPlaying && totalSteps > 0) {
      timer = setInterval(() => {
        onVizStepChange((vizStep + 1) % totalSteps);
      }, 1500 / playbackSpeed);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [isPlaying, vizStep, totalSteps, playbackSpeed, onVizStepChange]);

  async function handleCopy() {
    if (!solutionCode) return;
    try {
      await navigator.clipboard.writeText(solutionCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Ignored
    }
  }

  return (
    <div className={styles.workspaceContainer}>
      <div className={styles.tabList} role="tablist" aria-label="Workspace secondary views">
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'workspace'}
          className={`${styles.tabButton} ${activeTab === 'workspace' ? styles.tabButtonActive : ''}`}
          onClick={() => onTabChange('workspace')}
        >
          <Code size={16} aria-hidden="true" />
          <span>Code</span>
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'visualize'}
          className={`${styles.tabButton} ${activeTab === 'visualize' ? styles.tabButtonActive : ''}`}
          onClick={() => onTabChange('visualize')}
        >
          <Eye size={16} aria-hidden="true" />
          <span>Visualize</span>
          {vizSpec && (
            <Badge variant="info" size="sm">
              {vizSpec.kind}
            </Badge>
          )}
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'explanation'}
          className={`${styles.tabButton} ${activeTab === 'explanation' ? styles.tabButtonActive : ''}`}
          onClick={() => onTabChange('explanation')}
        >
          <BookOpen size={16} aria-hidden="true" />
          <span>Explanation</span>
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'notes'}
          className={`${styles.tabButton} ${activeTab === 'notes' ? styles.tabButtonActive : ''}`}
          onClick={() => onTabChange('notes')}
        >
          <Edit3 size={16} aria-hidden="true" />
          <span>Notes</span>
        </button>
      </div>

      <div className={styles.tabContent}>
        {/* TAB 1: CODE */}
        {activeTab === 'workspace' && (
          <div
            style={{
              position: 'relative',
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 'var(--space-2)',
              }}
            >
              <span
                style={{
                  fontSize: 'var(--text-xs)',
                  fontWeight: 600,
                  color: 'var(--text-secondary)',
                }}
              >
                Java 21 Source Code (Verified in Sandbox)
              </span>
              <Button variant="secondary" size="sm" onClick={handleCopy} disabled={!solutionCode}>
                {copied ? (
                  <Check size={14} aria-hidden="true" />
                ) : (
                  <Copy size={14} aria-hidden="true" />
                )}
                <span>{copied ? 'Copied' : 'Copy Code'}</span>
              </Button>
            </div>

            <pre className={styles.codeArea}>
              <code>
                {solutionCode ||
                  '// Awaiting question submission...\n// The verified Java solution will be displayed here.'}
              </code>
            </pre>
          </div>
        )}

        {/* TAB 2: VISUALIZE */}
        {activeTab === 'visualize' && (
          <div className={styles.vizContainer}>
            {!vizSpec ? (
              <div
                style={{
                  textAlign: 'center',
                  color: 'var(--text-muted)',
                  margin: 'auto',
                  padding: 'var(--space-8)',
                }}
              >
                <Eye size={36} aria-hidden="true" style={{ margin: '0 auto var(--space-2)' }} />
                <p style={{ fontWeight: 600 }}>Interactive Concept Visualization</p>
                <p style={{ fontSize: 'var(--text-sm)', marginTop: 'var(--space-1)' }}>
                  Submit a question to generate an interactive visual execution trace.
                </p>
              </div>
            ) : (
              <ConceptVisualizer
                spec={vizSpec}
                currentStep={vizStep}
                onStepChange={onVizStepChange}
                isPlaying={isPlaying}
                onTogglePlay={() => setIsPlaying(!isPlaying)}
                playbackSpeed={playbackSpeed}
                onSpeedChange={setPlaybackSpeed}
              />
            )}
          </div>
        )}

        {/* TAB 3: EXPLANATION */}
        {activeTab === 'explanation' && (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 'var(--space-4)',
              fontSize: 'var(--text-sm)',
              lineHeight: 'var(--leading-relaxed)',
            }}
          >
            {!analysis ? (
              <p style={{ color: 'var(--text-muted)' }}>
                Explanation will populate upon question analysis.
              </p>
            ) : (
              <>
                <section>
                  <h3
                    style={{
                      fontSize: 'var(--text-base)',
                      fontWeight: 700,
                      color: 'var(--text-primary)',
                      marginBottom: 'var(--space-2)',
                    }}
                  >
                    Problem Restatement
                  </h3>
                  <p style={{ color: 'var(--text-secondary)' }}>
                    {analysis.understanding?.restatement}
                  </p>
                </section>

                <section>
                  <h3
                    style={{
                      fontSize: 'var(--text-base)',
                      fontWeight: 700,
                      color: 'var(--text-primary)',
                      marginBottom: 'var(--space-2)',
                    }}
                  >
                    Algorithmic Approaches
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                    {(analysis.approaches || []).map((app: Approach, idx: number) => (
                      <div
                        key={idx}
                        style={{
                          padding: 'var(--space-3)',
                          border: `1px solid ${app.recommended ? 'var(--brand-amber-500)' : 'var(--border-subtle)'}`,
                          borderRadius: 'var(--radius-md)',
                          backgroundColor: app.recommended
                            ? 'var(--bg-surface-raised)'
                            : 'var(--bg-surface-subtle)',
                        }}
                      >
                        <div
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                          }}
                        >
                          <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                            {app.name}
                          </span>
                          {app.recommended && (
                            <Badge variant="info" size="sm">
                              Recommended
                            </Badge>
                          )}
                        </div>
                        <p
                          style={{
                            fontSize: 'var(--text-xs)',
                            color: 'var(--text-secondary)',
                            marginTop: 'var(--space-1)',
                          }}
                        >
                          {app.idea}
                        </p>
                        <div
                          style={{
                            display: 'flex',
                            gap: 'var(--space-4)',
                            marginTop: 'var(--space-2)',
                            fontSize: 'var(--text-xs)',
                            color: 'var(--text-muted)',
                          }}
                        >
                          <span>
                            Time: <strong>{app.time}</strong>
                          </span>
                          <span>
                            Space: <strong>{app.space}</strong>
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>

                {analysis.pitfalls && analysis.pitfalls.length > 0 && (
                  <section>
                    <h3
                      style={{
                        fontSize: 'var(--text-base)',
                        fontWeight: 700,
                        color: 'var(--status-warning-text)',
                        marginBottom: 'var(--space-2)',
                      }}
                    >
                      Common Pitfalls
                    </h3>
                    <ul style={{ paddingLeft: 'var(--space-4)', color: 'var(--text-secondary)' }}>
                      {analysis.pitfalls.map((p: string, idx: number) => (
                        <li key={idx} style={{ marginBottom: 'var(--space-1)' }}>
                          {p}
                        </li>
                      ))}
                    </ul>
                  </section>
                )}
              </>
            )}
          </div>
        )}

        {/* TAB 4: NOTES */}
        {activeTab === 'notes' && (
          <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <span
              style={{
                fontSize: 'var(--text-xs)',
                color: 'var(--text-muted)',
                marginBottom: 'var(--space-2)',
              }}
            >
              Personal notes for this chat slot (autosaved to your account):
            </span>
            <textarea
              className={styles.notesTextarea}
              value={notes}
              onChange={(e) => onNotesChange(e.target.value)}
              placeholder="Jot down notes, questions, or key takeaways for this problem..."
              aria-label="Personal Notes"
            />
          </div>
        )}
      </div>
    </div>
  );
}
