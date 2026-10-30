import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { Sprout, Box, GitBranch, Cpu, ArrowRight } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import styles from './LearnPage.module.css';

export const metadata: Metadata = {
  title: 'Curriculum Preview',
  description:
    'Explore structured JavaVerse learning tracks from foundations to advanced concurrency.',
};

const TRACKS = [
  {
    id: 'foundations',
    title: 'Java Foundations',
    level: 'Beginner',
    lessons: 6,
    icon: Sprout,
    color: '#10b981',
    description:
      'Master primitive types, variables, arithmetic operators, branching logic, loops, and stack/heap memory fundamentals.',
    topics: ['Primitive Data Types', 'Control Flow', 'Method Declarations', 'Memory Allocation'],
  },
  {
    id: 'oop',
    title: 'Object-Oriented Programming',
    level: 'Intermediate',
    lessons: 14,
    icon: Box,
    color: '#0ea5e9',
    description:
      'Learn encapsulation, constructors, method overloading, inheritance hierarchies, abstract classes, and interface contracts.',
    topics: ['Classes & References', 'Inheritance & Super', 'Polymorphism', 'Interfaces'],
  },
  {
    id: 'dsa',
    title: 'Data Structures & Algorithms',
    level: 'Intermediate',
    lessons: 18,
    icon: GitBranch,
    color: '#f59e0b',
    description:
      'Implement core collections: ArrayLists, LinkedLists, HashMaps, Binary Search Trees, and common algorithmic paradigms.',
    topics: ['List Implementations', 'Hash Tables', 'Binary Trees', 'Big-O Complexity'],
  },
  {
    id: 'advanced',
    title: 'Advanced Java & JVM',
    level: 'Advanced',
    lessons: 16,
    icon: Cpu,
    color: '#8b5cf6',
    description:
      'Modern Java features: Generics, Lambdas, Stream pipelines, Concurrency threads, and garbage collection mechanisms.',
    topics: ['Generics & Wildcards', 'Stream Pipelines', 'Concurrency Primitives', 'JVM Internals'],
  },
];

export default function PublicLearnPage() {
  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <Badge variant="neutral" size="sm">
          Curriculum Catalog
        </Badge>
        <h1 className={styles.title}>Java Learning Tracks</h1>
        <p className={styles.subtitle}>
          Preview the four foundational tracks designed to guide you from syntax fundamentals to
          production-ready JVM architecture.
        </p>
      </header>

      <div className={styles.tracksGrid}>
        {TRACKS.map((track) => {
          const Icon = track.icon;
          return (
            <Card key={track.id} as="article" className={styles.trackCard}>
              <div className={styles.cardTop}>
                <div
                  className={styles.iconCircle}
                  style={{ backgroundColor: `${track.color}15`, color: track.color }}
                  aria-hidden="true"
                >
                  <Icon size={24} />
                </div>
                <Badge variant="neutral" size="sm">
                  {track.level}
                </Badge>
              </div>

              <div className={styles.cardBody}>
                <h2 className={styles.trackTitle}>{track.title}</h2>
                <p className={styles.trackDesc}>{track.description}</p>

                <div className={styles.topicsList}>
                  <span className={styles.topicsLabel}>Core Topics:</span>
                  <ul className={styles.topicsTags}>
                    {track.topics.map((topic) => (
                      <li key={topic} className={styles.topicTag}>
                        {topic}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className={styles.cardBottom}>
                <span className={styles.lessonCount}>{track.lessons} comprehensive lessons</span>
                <Link href="/dashboard" className={styles.trackLink}>
                  <span>Start in Demo Shell</span>
                  <ArrowRight size={16} aria-hidden="true" />
                </Link>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
