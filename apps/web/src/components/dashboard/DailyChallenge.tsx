'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Target, Clock, ArrowRight } from 'lucide-react';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Dialog } from '../ui/Dialog';
import styles from './DailyChallenge.module.css';

interface DailyChallengeProps {
  title?: string;
  estimatedMinutes?: number;
  description?: string;
}

export function DailyChallenge({
  title = 'Reverse a String',
  estimatedMinutes = 5,
  description = 'Write a Java program to reverse a string without using built-in reverse functions.',
}: DailyChallengeProps) {
  const [isHintsOpen, setIsHintsOpen] = useState(false);

  return (
    <Card as="section" aria-labelledby="challenge-heading" className={styles.container}>
      <div className={styles.header}>
        <div className={styles.titleGroup}>
          <div className={styles.targetIcon} aria-hidden="true">
            <Target size={20} />
          </div>
          <h2 id="challenge-heading" className={styles.title}>
            Today&apos;s Challenge
          </h2>
        </div>
        <Badge variant="neutral" size="sm" className={styles.timeBadge}>
          <Clock size={12} aria-hidden="true" />
          <span>{estimatedMinutes} min</span>
        </Badge>
      </div>

      <div className={styles.body}>
        <h3 className={styles.challengeTitle}>{title}</h3>
        <p className={styles.description}>{description}</p>
      </div>

      <div className={styles.actions}>
        <Link href="/dashboard/practice" className={styles.tryNowLink}>
          <span>Try Now</span>
          <ArrowRight size={16} aria-hidden="true" />
        </Link>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={() => setIsHintsOpen(true)}
          aria-haspopup="dialog"
        >
          View Hints
        </Button>
      </div>

      <Dialog
        isOpen={isHintsOpen}
        onClose={() => setIsHintsOpen(false)}
        title={`Hints: ${title}`}
        description="Think about indexing and two-pointer traversal in Java."
      >
        <div className={styles.hintsList}>
          <p>
            <strong>Hint 1:</strong> Strings in Java are immutable. Converting to a
            <code>char[]</code> with <code>str.toCharArray()</code> allows in-place swaps.
          </p>
          <p>
            <strong>Hint 2:</strong> Use a two-pointer approach: one starting at index{' '}
            <code>0</code> and the other at <code>length - 1</code>.
          </p>
          <p>
            <strong>Hint 3:</strong> Swap the characters at both pointers and move toward the center
            until they cross.
          </p>
        </div>
      </Dialog>
    </Card>
  );
}
