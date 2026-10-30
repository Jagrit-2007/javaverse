import React from 'react';
import Link from 'next/link';
import { Sprout, Box, GitBranch, Cpu, ChevronRight, ArrowRight } from 'lucide-react';
import { Card } from '../ui/Card';
import type { LearningPathItem } from '../fixtures/dashboardData';
import styles from './FeaturedPaths.module.css';

interface FeaturedPathsProps {
  paths?: LearningPathItem[] | undefined;
}

const ICONS = [Sprout, Box, GitBranch, Cpu];
const COLORS = ['#10b981', '#0ea5e9', '#ef4444', '#8b5cf6'];
const BG_COLORS = [
  'rgba(16, 185, 129, 0.1)',
  'rgba(14, 165, 233, 0.1)',
  'rgba(239, 68, 68, 0.1)',
  'rgba(139, 92, 246, 0.1)',
];

export function FeaturedPaths({ paths = [] }: FeaturedPathsProps) {
  return (
    <Card as="section" aria-labelledby="featured-paths-heading" className={styles.container}>
      <div className={styles.header}>
        <h2 id="featured-paths-heading" className={styles.title}>
          Featured Learning Paths
        </h2>
        <Link href="/dashboard/learn" className={styles.viewAllLink}>
          <span>View all</span>
          <ArrowRight size={14} aria-hidden="true" />
        </Link>
      </div>

      <div className={styles.grid}>
        {paths.map((path, idx) => {
          const Icon = ICONS[idx % ICONS.length] ?? Sprout;
          const color = COLORS[idx % COLORS.length] ?? '#10b981';
          const bgColor = BG_COLORS[idx % BG_COLORS.length] ?? 'rgba(16, 185, 129, 0.1)';

          return (
            <Link key={path.id} href={path.href} className={styles.pathCard}>
              <div
                className={styles.iconBox}
                style={{ backgroundColor: bgColor, color }}
                aria-hidden="true"
              >
                <Icon size={20} />
              </div>
              <div className={styles.info}>
                <span className={styles.pathTitle}>{path.title}</span>
                <span className={styles.lessonsCount}>{path.lessonsCount} lessons</span>
              </div>
              <ChevronRight size={16} aria-hidden="true" className={styles.chevron} />
            </Link>
          );
        })}
      </div>
    </Card>
  );
}
