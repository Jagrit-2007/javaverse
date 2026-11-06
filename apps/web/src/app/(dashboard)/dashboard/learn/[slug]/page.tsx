import React from 'react';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getLessonBySlug, toPublicLessonDetail } from '@/lib/lessons';
import { LessonView } from './LessonView';

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const lesson = await getLessonBySlug(slug);

  if (!lesson) {
    return {
      title: 'Lesson Not Found — JavaVerse',
    };
  }

  return {
    title: `${lesson.title} — JavaVerse Curriculum`,
    description: lesson.hook,
  };
}

export default async function LessonPage({ params }: Props) {
  const { slug } = await params;
  const lesson = await getLessonBySlug(slug);

  if (!lesson) {
    notFound();
  }

  return (
    <div style={{ padding: 'var(--space-6) var(--space-4)' }}>
      <LessonView lesson={toPublicLessonDetail(lesson)} />
    </div>
  );
}
