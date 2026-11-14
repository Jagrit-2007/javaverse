'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Badge } from '@/components/ui/Badge';
import { ArrowRight, BookOpen, Clock } from 'lucide-react';
import type { CurriculumLessonSummary } from '@javaverse/schemas';
import styles from './LearnDashboard.module.css';

interface Props {
  initialLessons: CurriculumLessonSummary[];
}

const TRACK_LABELS: Record<string, { title: string; desc: string }> = {
  foundations: {
    title: 'Foundations',
    desc: 'Master primitive types, control flow, branching logic, and call stack execution.',
  },
  oop: {
    title: 'Object-Oriented Programming',
    desc: 'Encapsulation, class hierarchies, dynamic dispatch, and interface contracts.',
  },
  dsa: {
    title: 'Data Structures & Algorithms',
    desc: 'Arrays, amortized complexity, LIFO/FIFO queues, and divide-and-conquer search.',
  },
  advanced_java: {
    title: 'Advanced Java & JVM',
    desc: 'Type erasure, generics, stream pipelines, and HotSpot generational memory.',
  },
};

export function CurriculumCatalog({ initialLessons }: Props) {
  const [selectedTrack, setSelectedTrack] = useState<string>('all');

  const filteredLessons =
    selectedTrack === 'all'
      ? initialLessons
      : initialLessons.filter((l) => l.track === selectedTrack);

  const tracks = ['foundations', 'oop', 'dsa', 'advanced_java'];

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Badge variant="info" size="sm">
            Curriculum Catalog
          </Badge>
          <Badge variant="neutral" size="sm">
            Java 21 LTS
          </Badge>
        </div>
        <h1 className={styles.title}>Curriculum & Learning Paths</h1>
        <p className={styles.subtitle}>
          Explore progressive, interactive Java lessons. Each lesson includes three-depth conceptual
          explanations, interactive algorithm visualizers, editable runnable code, common pitfalls,
          a 5-question quiz, and a coding challenge.
        </p>

        <div className={styles.trackFilters} role="tablist" aria-label="Curriculum Tracks">
          <button
            type="button"
            role="tab"
            aria-selected={selectedTrack === 'all'}
            className={`${styles.filterBtn} ${selectedTrack === 'all' ? styles.filterBtnActive : ''}`}
            onClick={() => setSelectedTrack('all')}
          >
            All Tracks ({initialLessons.length})
          </button>
          {tracks.map((t) => {
            const count = initialLessons.filter((l) => l.track === t).length;
            return (
              <button
                key={t}
                type="button"
                role="tab"
                aria-selected={selectedTrack === t}
                className={`${styles.filterBtn} ${selectedTrack === t ? styles.filterBtnActive : ''}`}
                onClick={() => setSelectedTrack(t)}
              >
                {TRACK_LABELS[t]?.title || t} ({count})
              </button>
            );
          })}
        </div>
      </header>

      <div className={styles.tracksContainer}>
        {tracks
          .filter((t) => selectedTrack === 'all' || selectedTrack === t)
          .map((t) => {
            const trackLessons = filteredLessons.filter((l) => l.track === t);
            if (trackLessons.length === 0) return null;

            return (
              <section key={t} className={styles.trackSection} aria-labelledby={`track-${t}`}>
                <div className={styles.trackHeader}>
                  <div className={styles.trackTitleArea}>
                    <h2 id={`track-${t}`} className={styles.trackTitle}>
                      {TRACK_LABELS[t]?.title}
                    </h2>
                    <Badge variant="neutral" size="sm">
                      {trackLessons.length} Lessons
                    </Badge>
                  </div>
                  <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)' }}>
                    {TRACK_LABELS[t]?.desc}
                  </span>
                </div>

                <div className={styles.lessonGrid}>
                  {trackLessons.map((lesson) => (
                    <article key={lesson.slug} className={styles.lessonCard}>
                      <div className={styles.cardTop}>
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
                        <span className={styles.timeEstimate}>
                          <Clock size={12} style={{ display: 'inline', marginRight: 4 }} />
                          {lesson.estimatedMinutes} min
                        </span>
                      </div>

                      <div className={styles.cardBody}>
                        <h3 className={styles.lessonTitle}>{lesson.title}</h3>
                        <p className={styles.lessonHook}>{lesson.hook}</p>
                      </div>

                      <div className={styles.cardFooter}>
                        <span
                          style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}
                        >
                          <BookOpen size={12} style={{ display: 'inline', marginRight: 4 }} />
                          {lesson.module}
                        </span>
                        <Link
                          href={`/dashboard/learn/${lesson.slug}`}
                          className={styles.startLink}
                          aria-label={`Explore lesson: ${lesson.title}`}
                        >
                          <span>Explore</span>
                          <ArrowRight size={14} />
                        </Link>
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            );
          })}
      </div>
    </div>
  );
}
