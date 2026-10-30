import React from 'react';
import Link from 'next/link';
import { Sprout, Code2, Box, Sparkles, ChevronRight } from 'lucide-react';
import styles from './QuickActions.module.css';

const QUICK_ACTIONS = [
  {
    id: 'path',
    title: 'Learning Path',
    subtitle: 'Follow a structured Java path',
    href: '/dashboard/learn',
    icon: Sprout,
    iconColor: '#10b981',
    bgColor: 'rgba(16, 185, 129, 0.1)',
  },
  {
    id: 'practice',
    title: 'Practice Problems',
    subtitle: 'Strengthen concepts through practice',
    href: '/dashboard/practice',
    icon: Code2,
    iconColor: '#8b5cf6',
    bgColor: 'rgba(139, 92, 246, 0.1)',
  },
  {
    id: 'viz',
    title: 'Visualizations',
    subtitle: 'Explore concepts visually',
    href: '/dashboard/learn',
    icon: Box,
    iconColor: '#f59e0b',
    bgColor: 'rgba(245, 158, 11, 0.1)',
  },
  {
    id: 'ai',
    title: 'AI Help',
    subtitle: 'Get step-by-step explanations',
    href: '/dashboard/ask',
    icon: Sparkles,
    iconColor: '#0ea5e9',
    bgColor: 'rgba(14, 165, 233, 0.1)',
  },
];

export function QuickActions() {
  return (
    <section className={styles.section} aria-label="Quick Learning Actions">
      <div className={styles.grid}>
        {QUICK_ACTIONS.map((item) => {
          const Icon = item.icon;
          return (
            <Link key={item.id} href={item.href} className={styles.card}>
              <div
                className={styles.iconWrapper}
                style={{ backgroundColor: item.bgColor, color: item.iconColor }}
                aria-hidden="true"
              >
                <Icon size={20} />
              </div>
              <div className={styles.cardContent}>
                <span className={styles.cardTitle}>{item.title}</span>
                <span className={styles.cardSubtitle}>{item.subtitle}</span>
              </div>
              <ChevronRight size={18} aria-hidden="true" className={styles.chevron} />
            </Link>
          );
        })}
      </div>
    </section>
  );
}
