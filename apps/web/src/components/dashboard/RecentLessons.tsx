import React from 'react';
import Link from 'next/link';
import { CheckCircle2, CircleDot, PlayCircle, ArrowRight } from 'lucide-react';
import { Card } from '../ui/Card';
import type { RecentLessonItem } from '../fixtures/dashboardData';
import styles from './RecentLessons.module.css';

interface RecentLessonsProps {
  lessons?: RecentLessonItem[];
}

export function RecentLessons({ lessons = [] }: RecentLessonsProps) {
  return (
    <Card as="section" aria-labelledby="recent-lessons-heading" className={styles.container}>
      <div className={styles.header}>
        <h2 id="recent-lessons-heading" className={styles.title}>
          Recent Lessons
        </h2>
        <Link href="/dashboard/learn" className={styles.viewAllLink}>
          <span>View all</span>
          <ArrowRight size={14} aria-hidden="true" />
        </Link>
      </div>

      <ul className={styles.list}>
        {lessons.map((lesson) => {
          return (
            <li key={lesson.id} className={styles.item}>
              <div className={styles.statusIcon} aria-hidden="true">
                {lesson.status === 'completed' ? (
                  <CheckCircle2 size={18} color="#10b981" />
                ) : lesson.status === 'in_progress' ? (
                  <CircleDot size={18} color="#0ea5e9" />
                ) : (
                  <PlayCircle size={18} color="var(--text-muted)" />
                )}
              </div>
              <div className={styles.info}>
                <Link href="/dashboard/learn" className={styles.lessonLink}>
                  {lesson.title}
                </Link>
                <span className={styles.relativeTime}>{lesson.relativeTime}</span>
              </div>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
