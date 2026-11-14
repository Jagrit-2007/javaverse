'use client';

import React from 'react';
import type { VizStep } from '@javaverse/schemas';
import styles from '../Visualizer.module.css';

interface StackQueueVisualizerProps {
  kind: 'stack' | 'queue' | string;
  initial?: Record<string, unknown> | undefined;
  stepData?: VizStep | null | undefined;
}

export function StackQueueVisualizer({ kind, initial, stepData }: StackQueueVisualizerProps) {
  const state = stepData?.state || {};

  let items: Array<string | number> = [];
  if (Array.isArray(state.items)) {
    items = state.items as Array<string | number>;
  } else if (Array.isArray(state.queue)) {
    items = state.queue as Array<string | number>;
  } else if (Array.isArray(initial?.items)) {
    items = initial.items as Array<string | number>;
  }

  const isStack = kind === 'stack';

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 'var(--space-2)',
      }}
    >
      <span style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--text-secondary)' }}>
        {isStack ? 'LIFO Call / Data Stack' : 'FIFO Task / Buffer Queue'}
      </span>

      {isStack ? (
        <div className={styles.stackBox} role="region" aria-label="Stack elements">
          {items.map((item, idx) => (
            <div key={idx} className={styles.stackItem}>
              {item}
              {idx === items.length - 1 && (
                <span
                  style={{
                    fontSize: 9,
                    display: 'block',
                    opacity: 0.8,
                    textTransform: 'uppercase',
                  }}
                >
                  Top
                </span>
              )}
            </div>
          ))}
          {items.length === 0 && (
            <div
              style={{
                color: 'var(--text-muted)',
                fontSize: 'var(--text-xs)',
                textAlign: 'center',
                padding: 'var(--space-4)',
              }}
            >
              Stack Empty
            </div>
          )}
        </div>
      ) : (
        <div className={styles.queueBox} role="region" aria-label="Queue elements">
          <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)' }}>Front →</span>
          {items.map((item, idx) => (
            <div key={idx} className={styles.stackItem}>
              {item}
            </div>
          ))}
          {items.length === 0 && (
            <div
              style={{
                color: 'var(--text-muted)',
                fontSize: 'var(--text-xs)',
                padding: 'var(--space-2)',
              }}
            >
              Queue Empty
            </div>
          )}
          <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)' }}>→ Rear</span>
        </div>
      )}
    </div>
  );
}
