'use client';

import React, { useState } from 'react';
import type { UserProgressOverview, Flashcard } from '@javaverse/schemas';
import styles from './ProgressDashboard.module.css';

interface ProgressDashboardProps {
  initialOverview: UserProgressOverview;
  initialDueFlashcards: Flashcard[];
  csrfToken?: string;
}

export function ProgressDashboard({
  initialOverview,
  initialDueFlashcards,
  csrfToken = '',
}: ProgressDashboardProps) {
  const [overview, setOverview] = useState<UserProgressOverview>(initialOverview);
  const [dueCards, setDueCards] = useState<Flashcard[]>(initialDueFlashcards);
  const [currentCardIndex, setCurrentCardIndex] = useState<number>(0);
  const [isAnswerRevealed, setIsAnswerRevealed] = useState<boolean>(false);
  const [isUpdatingSettings, setIsUpdatingSettings] = useState<boolean>(false);

  const activeCard = dueCards[currentCardIndex] || null;

  async function handleToggleGamification() {
    setIsUpdatingSettings(true);
    const nextState = !overview.gamificationEnabled;
    try {
      const res = await fetch('/api/v1/settings', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(csrfToken ? { 'x-csrf-token': csrfToken } : {}),
        },
        body: JSON.stringify({ gamificationEnabled: nextState }),
      });
      if (res.ok) {
        setOverview({ ...overview, gamificationEnabled: nextState });
      }
    } catch {
      // Failed to toggle
    } finally {
      setIsUpdatingSettings(false);
    }
  }

  async function handleReviewRating(rating: number) {
    if (!activeCard) return;

    try {
      await fetch(`/api/v1/flashcards/${activeCard.id}/review`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(csrfToken ? { 'x-csrf-token': csrfToken } : {}),
        },
        body: JSON.stringify({ rating }),
      });

      // Move to next card
      setIsAnswerRevealed(false);
      const remaining = dueCards.filter((_, idx) => idx !== currentCardIndex);
      setDueCards(remaining);
      if (currentCardIndex >= remaining.length) {
        setCurrentCardIndex(0);
      }
    } catch {
      // Review failed
    }
  }

  return (
    <div className={styles.container}>
      <header className={styles.headerRow}>
        <div>
          <h1 className={styles.title}>Your Learning Journey & Progress</h1>
          <p className={styles.subtitle}>
            Track topic mastery, retain key Java concepts with spaced repetition, and review
            achievements.
          </p>
        </div>

        <label className={styles.gamificationToggle}>
          <input
            type="checkbox"
            checked={overview.gamificationEnabled}
            onChange={handleToggleGamification}
            disabled={isUpdatingSettings}
            aria-label="Toggle gamification features such as XP, streaks, and badges"
          />
          <span>Gamification (XP, Streaks, Badges)</span>
        </label>
      </header>

      {/* Gamification Stats */}
      {overview.gamificationEnabled && (
        <section className={styles.statsGrid} aria-label="Learning statistics summary">
          <div className={styles.statCard}>
            <span className={styles.statLabel}>Current Level</span>
            <span className={styles.statValue}>Level {overview.level}</span>
            <span className={styles.statSubtext}>
              {overview.xp % 100}/100 XP to Level {overview.level + 1}
            </span>
          </div>

          <div className={styles.statCard}>
            <span className={styles.statLabel}>Total Experience</span>
            <span className={styles.statValue}>{overview.xp} XP</span>
            <span className={styles.statSubtext}>Earned across lessons and practice</span>
          </div>

          <div className={styles.statCard}>
            <span className={styles.statLabel}>Active Streak</span>
            <span className={styles.statValue}>
              🔥 {overview.streakDays} Day{overview.streakDays === 1 ? '' : 's'}
            </span>
            <span className={styles.statSubtext}>
              {overview.lastActivityDate
                ? `Last active: ${overview.lastActivityDate}`
                : 'Start practice today!'}
            </span>
          </div>

          <div className={styles.statCard}>
            <span className={styles.statLabel}>Due Flashcards</span>
            <span className={styles.statValue}>🧠 {dueCards.length}</span>
            <span className={styles.statSubtext}>Spaced repetition reviews ready</span>
          </div>
        </section>
      )}

      {/* Topic Mastery Map */}
      <section aria-labelledby="topic-mastery-heading">
        <h2 id="topic-mastery-heading" className={styles.sectionTitle}>
          Topic Mastery Map
        </h2>
        <div className={styles.masteryGrid}>
          {Object.entries(overview.topicMastery).map(([topicKey, stat]) => {
            const tierClass =
              stat.tier === 'MASTER'
                ? styles.tierMaster
                : stat.tier === 'PROFICIENT'
                  ? styles.tierProficient
                  : stat.tier === 'APPRENTICE'
                    ? styles.tierApprentice
                    : styles.tierNovice;

            return (
              <div key={topicKey} className={styles.masteryCard}>
                <div className={styles.masteryHeader}>
                  <span className={styles.topicName}>{topicKey.replace('_', ' ')}</span>
                  <span className={`${styles.tierBadge} ${tierClass}`}>{stat.tier}</span>
                </div>

                <div className={styles.progressBarBg} aria-hidden="true">
                  <div
                    className={styles.progressBarFill}
                    style={{ width: `${stat.masteryPercent}%` }}
                  />
                </div>

                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontSize: '0.8125rem',
                    color: '#475569',
                  }}
                >
                  <span>{stat.masteryPercent}% Mastery</span>
                  <span>
                    {stat.completedProblems}/{stat.totalProblems} Problems
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Badges Shelf */}
      {overview.gamificationEnabled && (
        <section aria-labelledby="badges-shelf-heading">
          <h2 id="badges-shelf-heading" className={styles.sectionTitle}>
            Achievements & Badges
          </h2>
          <div className={styles.badgesGrid}>
            {overview.badges.map((b) => {
              const isUnlocked = Boolean(b.awardedAt);
              return (
                <div
                  key={b.badgeKey}
                  className={styles.badgeCard}
                  style={!isUnlocked ? { backgroundColor: '#f8fafc', borderColor: '#cbd5e1' } : {}}
                >
                  <span className={styles.badgeIcon} aria-hidden="true">
                    {isUnlocked ? b.icon : '🔒'}
                  </span>
                  <span className={styles.badgeName}>{b.name}</span>
                  <span className={styles.badgeDesc}>{b.description}</span>
                  <span
                    className={`${styles.badgeStatus} ${isUnlocked ? styles.unlocked : styles.locked}`}
                  >
                    {isUnlocked ? `Unlocked ${b.awardedAt?.slice(0, 10)}` : 'Locked'}
                  </span>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Spaced Repetition Flashcards Widget */}
      <section aria-labelledby="flashcards-heading">
        <h2 id="flashcards-heading" className={styles.sectionTitle}>
          Spaced Repetition Review (SM-2)
        </h2>

        {activeCard ? (
          <div className={styles.flashcardBox}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: '0.875rem',
                color: '#64748b',
              }}
            >
              <span>
                Card {currentCardIndex + 1} of {dueCards.length}
              </span>
              <span>Interval: {activeCard.intervalDays} day(s)</span>
            </div>

            <div className={styles.cardFront}>{activeCard.front}</div>

            {isAnswerRevealed ? (
              <div className={styles.cardBack}>{activeCard.back}</div>
            ) : (
              <button
                type="button"
                onClick={() => setIsAnswerRevealed(true)}
                style={{
                  alignSelf: 'flex-start',
                  padding: '0.5rem 1rem',
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  backgroundColor: '#2563eb',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '0.375rem',
                  cursor: 'pointer',
                }}
              >
                Reveal Explanation
              </button>
            )}

            {isAnswerRevealed && (
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.5rem',
                  marginTop: '0.5rem',
                }}
              >
                <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#475569' }}>
                  How easily did you recall this concept?
                </span>
                <div className={styles.ratingsRow}>
                  <button
                    type="button"
                    className={styles.ratingBtn}
                    onClick={() => handleReviewRating(1)}
                  >
                    1 - Complete Blackout
                  </button>
                  <button
                    type="button"
                    className={styles.ratingBtn}
                    onClick={() => handleReviewRating(2)}
                  >
                    2 - Incorrect
                  </button>
                  <button
                    type="button"
                    className={styles.ratingBtn}
                    onClick={() => handleReviewRating(3)}
                  >
                    3 - Hard / Hesitant
                  </button>
                  <button
                    type="button"
                    className={styles.ratingBtn}
                    onClick={() => handleReviewRating(4)}
                  >
                    4 - Good
                  </button>
                  <button
                    type="button"
                    className={styles.ratingBtn}
                    onClick={() => handleReviewRating(5)}
                  >
                    5 - Easy & Confident
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div
            style={{
              padding: '1.5rem',
              backgroundColor: '#ffffff',
              borderRadius: '0.5rem',
              border: '1px solid #e2e8f0',
              textAlign: 'center',
              color: '#475569',
            }}
          >
            🎉 All caught up on flashcard reviews! Mistake explanations from quizzes and code runs
            will automatically appear here for spaced repetition.
          </div>
        )}
      </section>
    </div>
  );
}
