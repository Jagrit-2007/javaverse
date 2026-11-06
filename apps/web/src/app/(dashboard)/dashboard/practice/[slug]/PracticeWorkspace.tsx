'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import type { PracticeProblemDetail, TestCaseResult } from '@javaverse/schemas';
import styles from './PracticeWorkspace.module.css';

interface PracticeWorkspaceProps {
  problem: PracticeProblemDetail;
  csrfToken?: string;
}

export function PracticeWorkspace({ problem, csrfToken = '' }: PracticeWorkspaceProps) {
  const [code, setCode] = useState<string>(problem.starterCode);
  const [revealedHints, setRevealedHints] = useState<number[]>([]);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [testResults, setTestResults] = useState<TestCaseResult[]>([]);
  const [statusMessage, setStatusMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);
  const [rewardBanner, setRewardBanner] = useState<{
    xpAwarded: number;
    newXp: number;
    newLevel: number;
    streakDays: number;
    newlyAwardedBadges: string[];
  } | null>(null);

  function toggleHint(index: number) {
    if (revealedHints.includes(index)) {
      setRevealedHints(revealedHints.filter((i) => i !== index));
    } else {
      setRevealedHints([...revealedHints, index]);
    }
  }

  async function handleRunSampleTests() {
    setIsRunning(true);
    setStatusMessage(null);
    setRewardBanner(null);

    try {
      const res = await fetch(`/api/v1/practice/${problem.slug}/run`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(csrfToken ? { 'x-csrf-token': csrfToken } : {}),
        },
        body: JSON.stringify({ code }),
      });

      const data = await res.json();
      if (!res.ok) {
        setStatusMessage({ type: 'error', text: data.error?.message || 'Execution error' });
        return;
      }

      setTestResults(data.data.testResults || []);
      if (data.data.passed) {
        setStatusMessage({
          type: 'success',
          text: `Sample Tests Passed (${data.data.testsPassed}/${data.data.testsTotal})! Ready to submit.`,
        });
      } else {
        setStatusMessage({
          type: 'error',
          text: `Failed ${data.data.testsTotal - data.data.testsPassed} of ${data.data.testsTotal} sample tests. Check error diagnostics below.`,
        });
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Network error';
      setStatusMessage({ type: 'error', text: msg });
    } finally {
      setIsRunning(false);
    }
  }

  async function handleSubmitSolution() {
    setIsSubmitting(true);
    setStatusMessage(null);
    setRewardBanner(null);

    try {
      const res = await fetch(`/api/v1/practice/${problem.slug}/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(csrfToken ? { 'x-csrf-token': csrfToken } : {}),
        },
        body: JSON.stringify({ code }),
      });

      const data = await res.json();
      if (!res.ok) {
        setStatusMessage({ type: 'error', text: data.error?.message || 'Submission error' });
        return;
      }

      const sub = data.data;
      setTestResults(sub.testResults || []);

      if (sub.passed) {
        setStatusMessage({
          type: 'success',
          text: `Accepted! Passed all ${sub.testsPassed}/${sub.testsTotal} test cases in ${sub.timeMs}ms.`,
        });
        setRewardBanner({
          xpAwarded: sub.xpAwarded,
          newXp: sub.newXp,
          newLevel: sub.newLevel,
          streakDays: sub.streakDays,
          newlyAwardedBadges: sub.newlyAwardedBadges,
        });
      } else {
        setStatusMessage({
          type: 'error',
          text: `Failed ${sub.testsTotal - sub.testsPassed} of ${sub.testsTotal} tests. Review errors below.`,
        });
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Network error';
      setStatusMessage({ type: 'error', text: msg });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className={styles.container}>
      <div className={styles.topBar}>
        <Link
          href="/dashboard/practice"
          className={styles.backLink}
          aria-label="Back to Practice Catalog"
        >
          ← Back to Practice Catalog
        </Link>
        <Link
          href={`/dashboard/ask?problem=${problem.slug}`}
          className={styles.aiLink}
          aria-label={`Ask AI mentor about ${problem.title}`}
        >
          <span>✨</span> Ask AI Mentor
        </Link>
      </div>

      <div className={styles.splitView}>
        {/* Left Pane: Instructions & Hints */}
        <section className={styles.leftPane} aria-label="Problem description and hints">
          <div className={styles.metaRow}>
            <span
              style={{
                fontSize: '0.75rem',
                fontWeight: 600,
                padding: '0.125rem 0.5rem',
                borderRadius: '9999px',
                backgroundColor: '#eff6ff',
                color: '#1d4ed8',
                border: '1px solid #bfdbfe',
              }}
            >
              {problem.topic.replace('_', ' ')}
            </span>
            <span
              style={{
                fontSize: '0.75rem',
                fontWeight: 600,
                padding: '0.125rem 0.5rem',
                borderRadius: '9999px',
                backgroundColor: '#f8fafc',
                color: '#475569',
                border: '1px solid #e2e8f0',
              }}
            >
              {problem.difficulty}
            </span>
            {problem.isCompleted && (
              <span
                style={{
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  color: '#047857',
                  backgroundColor: '#ecfdf5',
                  padding: '0.125rem 0.5rem',
                  borderRadius: '0.25rem',
                  border: '1px solid #a7f3d0',
                }}
              >
                Solved ✅
              </span>
            )}
          </div>

          <h1 className={styles.problemTitle}>{problem.title}</h1>
          <div className={styles.promptBody}>{problem.prompt}</div>

          {problem.hints && problem.hints.length > 0 && (
            <div className={styles.hintsSection}>
              <h2
                style={{
                  fontSize: '1rem',
                  fontWeight: 600,
                  color: '#0f172a',
                  margin: '0 0 0.5rem 0',
                }}
              >
                Progressive Hints
              </h2>
              {problem.hints.map((hint, idx) => {
                const isRevealed = revealedHints.includes(idx);
                return (
                  <div key={idx} className={styles.hintItem}>
                    <button
                      type="button"
                      className={styles.hintButton}
                      onClick={() => toggleHint(idx)}
                      aria-expanded={isRevealed}
                      aria-controls={`hint-content-${idx}`}
                    >
                      <span>
                        Hint {idx + 1}{' '}
                        {idx === 0 ? '(Approach)' : idx === 1 ? '(Algorithm)' : '(Edge Cases)'}
                      </span>
                      <span>{isRevealed ? '▲ Hide' : '▼ Reveal'}</span>
                    </button>
                    {isRevealed && (
                      <div id={`hint-content-${idx}`} className={styles.hintContent}>
                        {hint}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Right Pane: Code Editor & Runner */}
        <section className={styles.rightPane} aria-label="Code editor and test results">
          <label
            htmlFor="java-editor"
            style={{ fontSize: '0.875rem', fontWeight: 600, color: '#334155' }}
          >
            Java Solution (JDK 21)
          </label>
          <textarea
            id="java-editor"
            className={styles.editorArea}
            value={code}
            onChange={(e) => setCode(e.target.value)}
            spellCheck={false}
            aria-label="Java code editor"
          />

          <div className={styles.actionsRow}>
            <button
              type="button"
              className={styles.runButton}
              onClick={handleRunSampleTests}
              disabled={isRunning || isSubmitting}
            >
              {isRunning ? 'Running...' : 'Run Sample Tests'}
            </button>
            <button
              type="button"
              className={styles.submitButton}
              onClick={handleSubmitSolution}
              disabled={isRunning || isSubmitting}
            >
              {isSubmitting ? 'Evaluating...' : 'Submit Solution'}
            </button>
          </div>

          {rewardBanner && (
            <div
              style={{
                padding: '1rem',
                backgroundColor: '#ecfdf5',
                border: '1px solid #10b981',
                borderRadius: '0.5rem',
                color: '#064e3b',
              }}
              role="status"
            >
              <h3 style={{ margin: '0 0 0.25rem 0', fontSize: '1rem', fontWeight: 700 }}>
                🎉 Submission Accepted!
              </h3>
              <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.875rem' }}>
                {rewardBanner.xpAwarded > 0
                  ? `+${rewardBanner.xpAwarded} XP earned! Level ${rewardBanner.newLevel} (Total XP: ${rewardBanner.newXp}). Streak: ${rewardBanner.streakDays} day(s).`
                  : `Already completed previously. Total XP: ${rewardBanner.newXp}. Streak: ${rewardBanner.streakDays} day(s).`}
              </p>
              {rewardBanner.newlyAwardedBadges.length > 0 && (
                <div style={{ marginTop: '0.5rem', fontSize: '0.875rem', fontWeight: 600 }}>
                  Unlocked Badges: {rewardBanner.newlyAwardedBadges.join(', ')}!
                </div>
              )}
            </div>
          )}

          {statusMessage && (
            <div
              className={
                statusMessage.type === 'success'
                  ? styles.resultBannerSuccess
                  : styles.resultBannerFail
              }
              role="status"
            >
              {statusMessage.text}
            </div>
          )}

          {testResults.length > 0 && (
            <div className={styles.resultsPanel}>
              <h3 style={{ fontSize: '0.9375rem', fontWeight: 600, color: '#0f172a', margin: 0 }}>
                Test Case Breakdown
              </h3>
              <table className={styles.testsTable} aria-label="Test case outcomes table">
                <thead>
                  <tr>
                    <th>Test</th>
                    <th>Status</th>
                    <th>Input</th>
                    <th>Expected</th>
                  </tr>
                </thead>
                <tbody>
                  {testResults.map((t) => (
                    <tr key={t.id}>
                      <td style={{ fontWeight: 500 }}>{t.name}</td>
                      <td>
                        <span className={t.passed ? styles.passText : styles.failText}>
                          {t.passed ? 'PASSED ✅' : 'FAILED ❌'}
                        </span>
                        {t.error && (
                          <div
                            style={{ fontSize: '0.75rem', color: '#b91c1c', marginTop: '0.25rem' }}
                          >
                            {t.error}
                          </div>
                        )}
                      </td>
                      <td style={{ fontFamily: 'monospace', fontSize: '0.8125rem' }}>{t.input}</td>
                      <td style={{ fontFamily: 'monospace', fontSize: '0.8125rem' }}>
                        {t.expectedOutput}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
