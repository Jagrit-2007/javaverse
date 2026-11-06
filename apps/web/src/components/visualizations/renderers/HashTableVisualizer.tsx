'use client';

import React from 'react';
import type { VizStep } from '@javaverse/schemas';
import styles from '../Visualizer.module.css';

interface HashTableVisualizerProps {
  initial?: Record<string, unknown> | undefined;
  stepData?: VizStep | null | undefined;
}

export function HashTableVisualizer({ initial, stepData }: HashTableVisualizerProps) {
  const state = stepData?.state || {};

  const numBuckets = (state.numBuckets as number) || (initial?.numBuckets as number) || 8;
  const buckets: Record<
    number,
    Array<{ key: string; value: string | number }>
  > = (state.buckets as Record<number, Array<{ key: string; value: string | number }>>) || {
    1: [{ key: 'apple', value: 5 }],
    3: [
      { key: 'banana', value: 12 },
      { key: 'berry', value: 8 },
    ],
    6: [{ key: 'cherry', value: 20 }],
  };

  const activeBucket = typeof state.activeBucket === 'number' ? state.activeBucket : -1;

  const bucketIndices = Array.from({ length: numBuckets }, (_, i) => i);

  return (
    <div
      className={styles.hashTableGrid}
      role="region"
      aria-label="Hash Table Buckets Visualization"
    >
      {bucketIndices.map((bIdx) => {
        const entries = buckets[bIdx] || [];
        const isActive = bIdx === activeBucket;

        return (
          <div key={bIdx} className={styles.bucketRow}>
            <span
              className={styles.bucketLabel}
              style={{ color: isActive ? 'var(--brand-amber-500)' : 'inherit' }}
            >
              [{bIdx}]
            </span>
            <div className={styles.bucketItems}>
              {entries.length === 0 ? (
                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>— empty —</span>
              ) : (
                entries.map((entry, eIdx) => (
                  <span
                    key={eIdx}
                    className={`${styles.bucketEntry} ${isActive ? styles.cellHighlight : ''}`}
                  >
                    <strong>{entry.key}</strong>: {entry.value}
                  </span>
                ))
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
