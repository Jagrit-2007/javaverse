'use client';

import React from 'react';
import type { VizStep } from '@javaverse/schemas';
import styles from '../Visualizer.module.css';

interface LinkedListVisualizerProps {
  initial?: Record<string, unknown> | undefined;
  stepData?: VizStep | null | undefined;
}

export function LinkedListVisualizer({ initial, stepData }: LinkedListVisualizerProps) {
  const state = stepData?.state || {};

  let nodes: Array<{ val: string | number; id?: string }> = [];
  if (Array.isArray(state.nodes)) {
    nodes = state.nodes as Array<{ val: string | number; id?: string }>;
  } else if (Array.isArray(initial?.nodes)) {
    nodes = initial.nodes as Array<{ val: string | number; id?: string }>;
  } else {
    nodes = [{ val: 12 }, { val: 99 }, { val: 37 }, { val: 42 }];
  }

  const currentIdx = typeof state.currentIndex === 'number' ? state.currentIndex : -1;
  const highlightIdx = typeof state.highlightIndex === 'number' ? state.highlightIndex : -1;

  return (
    <div
      className={styles.linkedListRow}
      role="region"
      aria-label="Singly Linked List Visualization"
    >
      <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--brand-amber-500)' }}>HEAD →</span>
      {nodes.map((node, idx) => {
        const isCurrent = idx === currentIdx;
        const isHighlight = idx === highlightIdx;

        return (
          <React.Fragment key={idx}>
            <div
              className={`${styles.nodeBox} ${isCurrent ? styles.cellFound : isHighlight ? styles.cellHighlight : ''}`}
            >
              <span className={styles.nodeVal}>{node.val}</span>
              <span className={styles.nodeNext}>next</span>
            </div>
            <span className={styles.arrowRight} aria-hidden="true">
              →
            </span>
          </React.Fragment>
        );
      })}
      <span
        style={{
          padding: '6px 10px',
          background: 'var(--surface-default)',
          border: '1px dashed var(--border-default)',
          borderRadius: 'var(--radius-sm)',
          fontSize: 11,
          fontWeight: 700,
          color: 'var(--text-muted)',
        }}
      >
        null
      </span>
    </div>
  );
}
