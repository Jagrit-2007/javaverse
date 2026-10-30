import React from 'react';
import { Sparkles } from 'lucide-react';
import { Card } from '../ui/Card';
import styles from './MotivationCard.module.css';

interface MotivationCardProps {
  quote?: string | undefined;
  author?: string | undefined;
}

export function MotivationCard({
  quote = 'Small progress, practiced consistently, builds real understanding.',
}: MotivationCardProps) {
  return (
    <Card as="aside" aria-label="Learning Focus" className={styles.container}>
      <div className={styles.header}>
        <div className={styles.iconCircle} aria-hidden="true">
          <Sparkles size={16} />
        </div>
        <span className={styles.tag}>Learning Focus</span>
      </div>
      <p className={styles.productNote}>{quote}</p>
    </Card>
  );
}
