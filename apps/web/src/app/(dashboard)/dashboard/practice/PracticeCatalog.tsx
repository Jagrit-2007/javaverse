'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import type { PracticeProblemSummary } from '@javaverse/schemas';
import styles from './Practice.module.css';

interface PracticeCatalogProps {
  initialProblems: PracticeProblemSummary[];
}

export function PracticeCatalog({ initialProblems }: PracticeCatalogProps) {
  const [topicFilter, setTopicFilter] = useState<string>('ALL');
  const [diffFilter, setDiffFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const filteredProblems = initialProblems.filter((p) => {
    if (topicFilter !== 'ALL' && p.topic !== topicFilter) return false;
    if (diffFilter !== 'ALL' && p.difficulty !== diffFilter) return false;
    if (statusFilter === 'SOLVED' && !p.isCompleted) return false;
    if (statusFilter === 'UNSOLVED' && p.isCompleted) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      if (!p.title.toLowerCase().includes(q) && !p.slug.toLowerCase().includes(q)) {
        return false;
      }
    }
    return true;
  });

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1 className={styles.title}>Practice & Coding Challenges</h1>
        <p className={styles.subtitle}>
          Master Core Java, OOP, Data Structures, and Advanced concurrency through hands-on
          problems.
        </p>
      </header>

      <section className={styles.filtersRow} aria-label="Problem filters and search">
        <div className={styles.filterGroup}>
          <span style={{ fontSize: '0.875rem', fontWeight: 600, color: '#475569' }}>Topic:</span>
          {['ALL', 'CORE_JAVA', 'OOP', 'DSA', 'ADVANCED_JAVA'].map((t) => (
            <button
              key={t}
              type="button"
              className={`${styles.filterButton} ${topicFilter === t ? styles.filterButtonActive : ''}`}
              onClick={() => setTopicFilter(t)}
            >
              {t === 'ALL' ? 'All Topics' : t.replace('_', ' ')}
            </button>
          ))}
        </div>

        <div className={styles.filterGroup}>
          <span style={{ fontSize: '0.875rem', fontWeight: 600, color: '#475569' }}>
            Difficulty:
          </span>
          {['ALL', 'EASY', 'MEDIUM', 'HARD'].map((d) => (
            <button
              key={d}
              type="button"
              className={`${styles.filterButton} ${diffFilter === d ? styles.filterButtonActive : ''}`}
              onClick={() => setDiffFilter(d)}
            >
              {d === 'ALL' ? 'All' : d}
            </button>
          ))}
        </div>

        <div className={styles.filterGroup}>
          <span style={{ fontSize: '0.875rem', fontWeight: 600, color: '#475569' }}>Status:</span>
          {['ALL', 'SOLVED', 'UNSOLVED'].map((s) => (
            <button
              key={s}
              type="button"
              className={`${styles.filterButton} ${statusFilter === s ? styles.filterButtonActive : ''}`}
              onClick={() => setStatusFilter(s)}
            >
              {s === 'ALL' ? 'All' : s}
            </button>
          ))}
        </div>

        <div className={styles.filterGroup}>
          <input
            type="search"
            className={styles.searchInput}
            placeholder="Search problems..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            aria-label="Search practice problems by title or topic"
          />
        </div>
      </section>

      <section className={styles.grid} aria-label="Practice problems list">
        {filteredProblems.length === 0 ? (
          <div
            style={{ padding: '2rem', textAlign: 'center', color: '#64748b', gridColumn: '1 / -1' }}
          >
            No practice problems match the selected filters.
          </div>
        ) : (
          filteredProblems.map((p) => {
            const diffClass =
              p.difficulty === 'EASY'
                ? styles.easy
                : p.difficulty === 'MEDIUM'
                  ? styles.medium
                  : styles.hard;

            return (
              <article key={p.id} className={styles.card}>
                <div className={styles.cardHeader}>
                  <div className={styles.cardTop}>
                    <div className={styles.badges}>
                      <span className={`${styles.badge} ${diffClass}`}>{p.difficulty}</span>
                      <span className={`${styles.badge} ${styles.topicBadge}`}>
                        {p.topic.replace('_', ' ')}
                      </span>
                    </div>
                    {p.isCompleted && <span className={styles.solvedBadge}>Solved ✅</span>}
                  </div>
                  <h2 className={styles.cardTitle}>{p.title}</h2>
                </div>

                <Link
                  href={`/dashboard/practice/${p.slug}`}
                  className={styles.solveLink}
                  aria-label={`${p.isCompleted ? 'Review Solution' : 'Solve Challenge'} for ${p.title}`}
                >
                  {p.isCompleted ? 'Review Solution' : 'Solve Challenge'}
                </Link>
              </article>
            );
          })
        )}
      </section>
    </div>
  );
}
