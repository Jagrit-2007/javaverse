import React from 'react';
import type { Metadata } from 'next';
import { getLessonsList } from '@/lib/lessons';
import { CurriculumCatalog } from './CurriculumCatalog';

export const metadata: Metadata = {
  title: 'Curriculum Tracks — JavaVerse',
  description:
    'Interactive, structured Java learning tracks from foundations to advanced JVM concurrency.',
};

export default async function DashboardLearnPage() {
  const lessons = await getLessonsList();

  return (
    <div style={{ padding: 'var(--space-6) var(--space-4)' }}>
      <CurriculumCatalog initialLessons={lessons} />
    </div>
  );
}
