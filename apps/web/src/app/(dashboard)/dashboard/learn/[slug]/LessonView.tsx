'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Badge } from '@/components/ui/Badge';
import { ConceptVisualizer } from '@/components/visualizations/ConceptVisualizer';
import {
  Sparkles,
  Play,
  CheckCircle2,
  XCircle,
  Clock,
  ArrowLeft,
  Lightbulb,
  AlertTriangle,
} from 'lucide-react';
import type { PublicCurriculumLessonDetail, QuizResult, ChallengeResult } from '@javaverse/schemas';
import styles from './LessonView.module.css';

interface Props {
  lesson: PublicCurriculumLessonDetail;
}

export function LessonView({ lesson }: Props) {
  // Three-depth tab state
  const [activeDepth, setActiveDepth] = useState<'simple' | 'standard' | 'deep'>('simple');

  // Visualization state
  const [vizStep, setVizStep] = useState(0);
  const [isVizPlaying, setIsVizPlaying] = useState(false);
  const [vizSpeed, setVizSpeed] = useState(1);

  // Interactive playground state
  const [playgroundCode, setPlaygroundCode] = useState(lesson.codeStarter);
  const [isRunningPlayground, setIsRunningPlayground] = useState(false);
  const [playgroundOutput, setPlaygroundOutput] = useState<string | null>(null);

  // Quiz state
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, number>>({});
  const [isSubmittingQuiz, setIsSubmittingQuiz] = useState(false);
  const [quizResult, setQuizResult] = useState<QuizResult | null>(null);

  // Challenge state
  const [challengeCode, setChallengeCode] = useState(lesson.challenge.starterCode);
  const [isRunningChallenge, setIsRunningChallenge] = useState(false);
  const [challengeResult, setChallengeResult] = useState<ChallengeResult | null>(null);

  // Run playground code
  async function handleRunPlayground() {
    setIsRunningPlayground(true);
    setPlaygroundOutput('Compiling and running in sandbox container...');
    try {
      const res = await fetch('/api/v1/sandbox/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: playgroundCode, javaVersion: lesson.javaVersion }),
      });
      const data = await res.json();
      if (data.ok && data.data?.result) {
        const r = data.data.result;
        setPlaygroundOutput(
          `Status: ${r.passed ? 'SUCCESS' : 'FAILED'} (Execution Time: ${r.timeMs}ms)\n\n` +
            (r.stdout ? `STDOUT:\n${r.stdout}\n` : '') +
            (r.stderr ? `STDERR:\n${r.stderr}` : ''),
        );
      } else {
        setPlaygroundOutput(`Error: ${data.error?.message || 'Execution failed'}`);
      }
    } catch (err) {
      setPlaygroundOutput(`Network error: ${err instanceof Error ? err.message : 'Unknown'}`);
    } finally {
      setIsRunningPlayground(false);
    }
  }

  // Submit quiz
  async function handleSubmitQuiz() {
    setIsSubmittingQuiz(true);
    try {
      const res = await fetch(`/api/v1/lessons/${lesson.slug}/quiz`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answers: selectedAnswers }),
      });
      const data = await res.json();
      if (data.ok && data.data?.result) {
        setQuizResult(data.data.result);
      }
    } catch (err) {
      console.error('Quiz submit failed:', err);
    } finally {
      setIsSubmittingQuiz(false);
    }
  }

  // Run challenge tests
  async function handleRunChallenge() {
    setIsRunningChallenge(true);
    try {
      const res = await fetch(`/api/v1/lessons/${lesson.slug}/challenge`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: challengeCode }),
      });
      const data = await res.json();
      if (data.ok && data.data?.result) {
        setChallengeResult(data.data.result);
      }
    } catch (err) {
      console.error('Challenge run failed:', err);
    } finally {
      setIsRunningChallenge(false);
    }
  }

  return (
    <article className={styles.container}>
      {/* Breadcrumb Navigation */}
      <nav aria-label="Breadcrumb" className={styles.breadcrumbs}>
        <Link href="/dashboard" className={styles.breadcrumbLink}>
          Dashboard
        </Link>
        <span>/</span>
        <Link href="/dashboard/learn" className={styles.breadcrumbLink}>
          Curriculum
        </Link>
        <span>/</span>
        <span style={{ textTransform: 'capitalize' }}>{lesson.track.replace('_', ' ')}</span>
        <span>/</span>
        <span aria-current="page" style={{ color: 'var(--text-primary)', fontWeight: 600 }}>
          {lesson.title}
        </span>
      </nav>

      {/* Lesson Header */}
      <header className={styles.header}>
        <div className={styles.badgeGroup}>
          <Badge variant="info" size="sm">
            {lesson.track.toUpperCase()}
          </Badge>
          <Badge variant="neutral" size="sm">
            {lesson.module}
          </Badge>
          <Badge
            variant={
              lesson.difficulty === 'EASY'
                ? 'success'
                : lesson.difficulty === 'MEDIUM'
                  ? 'warning'
                  : 'neutral'
            }
            size="sm"
          >
            {lesson.difficulty}
          </Badge>
          <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)' }}>
            <Clock size={12} style={{ display: 'inline', marginRight: 4 }} />
            {lesson.estimatedMinutes} min
          </span>
          <Badge variant="neutral" size="sm">
            JDK {lesson.javaVersion}
          </Badge>
        </div>

        <div className={styles.titleArea}>
          <h1 className={styles.title}>{lesson.title}</h1>
          <Link
            href={`/dashboard/ask?prompt=Explain%20the%20core%20concept%20of%20${encodeURIComponent(lesson.title)}&lesson=${lesson.slug}`}
            className={styles.askAiBtn}
            id="ask-ai-lesson-btn"
          >
            <Sparkles size={16} />
            <span>Ask AI About This Lesson</span>
          </Link>
        </div>

        {/* Real-World Analogy / Hook */}
        <div className={styles.hookBox}>
          <Lightbulb size={24} style={{ color: 'var(--brand-primary)', flexShrink: 0 }} />
          <p className={styles.hookText}>{lesson.hook}</p>
        </div>
      </header>

      {/* Three-Depth Conceptual Explanations */}
      <section className={styles.depthSection} aria-label="Conceptual Explanations">
        <div className={styles.depthTabs} role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={activeDepth === 'simple'}
            className={`${styles.depthTab} ${activeDepth === 'simple' ? styles.depthTabActive : ''}`}
            onClick={() => setActiveDepth('simple')}
          >
            Simple Explanation
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeDepth === 'standard'}
            className={`${styles.depthTab} ${activeDepth === 'standard' ? styles.depthTabActive : ''}`}
            onClick={() => setActiveDepth('standard')}
          >
            Standard Depth
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeDepth === 'deep'}
            className={`${styles.depthTab} ${activeDepth === 'deep' ? styles.depthTabActive : ''}`}
            onClick={() => setActiveDepth('deep')}
          >
            Deep Dive (Internals)
          </button>
        </div>

        <div
          role="tabpanel"
          className={styles.contentPanel}
          tabIndex={0}
          aria-label={`${activeDepth} explanation`}
        >
          {activeDepth === 'simple' && (
            <div style={{ whiteSpace: 'pre-line' }}>{lesson.contentSimple}</div>
          )}
          {activeDepth === 'standard' && (
            <div style={{ whiteSpace: 'pre-line' }}>{lesson.contentStandard}</div>
          )}
          {activeDepth === 'deep' && (
            <div style={{ whiteSpace: 'pre-line' }}>{lesson.contentDeep}</div>
          )}
        </div>
      </section>

      {/* Interactive Concept Visualization */}
      <section className={styles.section} aria-label="Interactive Concept Visualization">
        <h2 className={styles.sectionTitle}>Interactive Concept Visualization</h2>
        <div
          style={{
            background: 'var(--surface-raised)',
            borderRadius: 'var(--radius-lg)',
            padding: 'var(--space-4)',
          }}
        >
          <ConceptVisualizer
            spec={lesson.visualization}
            currentStep={vizStep}
            onStepChange={setVizStep}
            isPlaying={isVizPlaying}
            onTogglePlay={() => setIsVizPlaying(!isVizPlaying)}
            playbackSpeed={vizSpeed}
            onSpeedChange={setVizSpeed}
          />
        </div>
      </section>

      {/* Runnable Code Playground */}
      <section className={styles.section} aria-label="Runnable Code Playground">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h2 className={styles.sectionTitle}>Editable, Runnable Code</h2>
          <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>
            Executes inside isolated Java 21 container
          </span>
        </div>

        <div className={styles.codeRunnerBox}>
          <div className={styles.codeRunnerHeader}>
            <span
              style={{
                fontSize: 'var(--text-xs)',
                fontWeight: 600,
                color: 'var(--text-secondary)',
              }}
            >
              Java 21 Source File
            </span>
            <button
              type="button"
              className={styles.runBtn}
              onClick={handleRunPlayground}
              disabled={isRunningPlayground}
              id="run-code-btn"
            >
              <Play size={14} />
              <span>{isRunningPlayground ? 'Running...' : 'Run Code'}</span>
            </button>
          </div>
          <textarea
            className={styles.codeTextarea}
            value={playgroundCode}
            onChange={(e) => setPlaygroundCode(e.target.value)}
            aria-label="Editable Java Code"
            spellCheck={false}
          />
          {playgroundOutput && (
            <div className={styles.outputTerminal} role="region" aria-label="Terminal Output">
              {playgroundOutput}
            </div>
          )}
        </div>
      </section>

      {/* Common Mistakes & Pitfalls */}
      <section className={styles.section} aria-label="Common Mistakes and Pitfalls">
        <h2 className={styles.sectionTitle}>Common Mistakes & Pitfalls</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          {lesson.commonMistakes.map((m, idx) => (
            <div key={idx} className={styles.mistakeCard}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <AlertTriangle size={18} style={{ color: 'var(--color-error, #ef4444)' }} />
                <h3 className={styles.mistakeTitle}>{m.mistake}</h3>
              </div>
              <p style={{ margin: 0, fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>
                {m.explanation}
              </p>
              {m.badCode && (
                <div style={{ marginTop: '0.5rem' }}>
                  <span style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: '#b91c1c' }}>
                    ✕ Pitfall Code:
                  </span>
                  <pre
                    style={{
                      background: 'rgba(239, 68, 68, 0.05)',
                      borderColor: 'rgba(239, 68, 68, 0.2)',
                      margin: '0.25rem 0',
                    }}
                  >
                    <code>{m.badCode}</code>
                  </pre>
                </div>
              )}
              {m.goodCode && (
                <div style={{ marginTop: '0.25rem' }}>
                  <span style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: '#047857' }}>
                    ✓ Recommended Pattern:
                  </span>
                  <pre
                    style={{
                      background: 'rgba(16, 185, 129, 0.05)',
                      borderColor: 'rgba(16, 185, 129, 0.2)',
                      margin: '0.25rem 0',
                    }}
                  >
                    <code>{m.goodCode}</code>
                  </pre>
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* 5-Question Quiz */}
      <section className={styles.section} aria-label="Check Your Understanding Quiz">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h2 className={styles.sectionTitle}>Check Your Understanding (5-Question Quiz)</h2>
          {quizResult && (
            <Badge variant={quizResult.passed ? 'success' : 'neutral'} size="sm">
              Score: {quizResult.score} / {quizResult.total} (
              {quizResult.passed ? 'Passed!' : 'Keep practicing'})
            </Badge>
          )}
        </div>

        <div className={styles.quizContainer}>
          {lesson.quiz.map((q, qIndex) => {
            const resultItem = quizResult?.results.find((r) => r.id === q.id);
            return (
              <fieldset key={q.id} className={styles.quizQuestion}>
                <legend
                  style={{
                    fontWeight: 700,
                    fontSize: 'var(--text-base)',
                    color: 'var(--text-primary)',
                    marginBottom: '0.5rem',
                  }}
                >
                  {qIndex + 1}. {q.question}
                </legend>

                <div className={styles.quizOptions}>
                  {q.options.map((option, optIdx) => {
                    const isSelected = selectedAnswers[q.id] === optIdx;
                    return (
                      <label
                        key={optIdx}
                        className={`${styles.quizOptionLabel} ${isSelected ? styles.quizOptionSelected : ''}`}
                      >
                        <input
                          type="radio"
                          name={`quiz-${q.id}`}
                          value={optIdx}
                          checked={isSelected}
                          onChange={() =>
                            setSelectedAnswers((prev) => ({ ...prev, [q.id]: optIdx }))
                          }
                        />
                        <span>{option}</span>
                      </label>
                    );
                  })}
                </div>

                {resultItem && (
                  <div
                    className={`${styles.quizExplanation} ${
                      resultItem.correct ? styles.explanationCorrect : styles.explanationIncorrect
                    }`}
                  >
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        marginBottom: '0.25rem',
                      }}
                    >
                      {resultItem.correct ? (
                        <>
                          <CheckCircle2 size={16} />
                          <strong>Correct!</strong>
                        </>
                      ) : (
                        <>
                          <XCircle size={16} />
                          <strong>
                            Incorrect. Correct answer: {q.options[resultItem.correctIndex]}
                          </strong>
                        </>
                      )}
                    </div>
                    <span>{resultItem.explanation}</span>
                  </div>
                )}
              </fieldset>
            );
          })}

          <button
            type="button"
            className={styles.runBtn}
            onClick={handleSubmitQuiz}
            disabled={isSubmittingQuiz}
            style={{ alignSelf: 'flex-start' }}
            id="submit-quiz-btn"
          >
            <span>{isSubmittingQuiz ? 'Submitting...' : 'Submit Quiz Answers'}</span>
          </button>
        </div>
      </section>

      {/* Mini Challenge */}
      <section className={styles.section} aria-label="Mini Challenge">
        <h2 className={styles.sectionTitle}>Mini Challenge: Hands-On Practice</h2>
        <p
          style={{
            color: 'var(--text-secondary)',
            fontSize: 'var(--text-sm)',
            lineHeight: 'var(--leading-relaxed)',
          }}
        >
          {lesson.challenge.prompt}
        </p>

        <div className={styles.codeRunnerBox}>
          <div className={styles.codeRunnerHeader}>
            <span
              style={{
                fontSize: 'var(--text-xs)',
                fontWeight: 600,
                color: 'var(--text-secondary)',
              }}
            >
              Challenge Implementation
            </span>
            <button
              type="button"
              className={styles.runBtn}
              onClick={handleRunChallenge}
              disabled={isRunningChallenge}
              id="run-challenge-btn"
            >
              <Play size={14} />
              <span>{isRunningChallenge ? 'Running Tests...' : 'Run Challenge Tests'}</span>
            </button>
          </div>
          <textarea
            className={styles.codeTextarea}
            value={challengeCode}
            onChange={(e) => setChallengeCode(e.target.value)}
            aria-label="Challenge Code"
            spellCheck={false}
          />
          {challengeResult && (
            <div className={styles.outputTerminal} role="region" aria-label="Challenge Test Output">
              {challengeResult.passed ? (
                <div style={{ color: '#4ade80' }}>
                  ✓ All challenge assertions passed successfully! (Time: {challengeResult.timeMs}ms)
                </div>
              ) : (
                <div style={{ color: '#f87171' }}>
                  ✕ Test execution failed:
                  <pre style={{ margin: '0.5rem 0', whiteSpace: 'pre-wrap' }}>
                    {challengeResult.stderr || challengeResult.stdout || challengeResult.error}
                  </pre>
                </div>
              )}
            </div>
          )}
        </div>
      </section>

      {/* Navigation Footer */}
      <footer
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          paddingTop: 'var(--space-6)',
          borderTop: '1px solid var(--border-subtle)',
        }}
      >
        <Link href="/dashboard/learn" className={styles.startLink}>
          <ArrowLeft size={16} />
          <span>Back to Curriculum Catalog</span>
        </Link>
      </footer>
    </article>
  );
}
