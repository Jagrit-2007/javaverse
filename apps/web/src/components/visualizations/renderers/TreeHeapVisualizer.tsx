'use client';

import React from 'react';
import type { VizStep } from '@javaverse/schemas';
import styles from '../Visualizer.module.css';

interface TreeHeapVisualizerProps {
  kind: 'binary_tree' | 'heap' | string;
  initial?: Record<string, unknown> | undefined;
  stepData?: VizStep | null | undefined;
}

export function TreeHeapVisualizer({ kind, initial, stepData }: TreeHeapVisualizerProps) {
  const state = stepData?.state || {};

  // Standard representation: level-order array or tree structure
  let nodes: Array<string | number> = [];
  if (Array.isArray(state.tree)) {
    nodes = state.tree as Array<string | number>;
  } else if (Array.isArray(state.heap)) {
    nodes = state.heap as Array<string | number>;
  } else if (Array.isArray(initial?.tree)) {
    nodes = initial.tree as Array<string | number>;
  } else {
    nodes = [50, 30, 70, 20, 40, 60, 80];
  }

  const activeIdx = typeof state.activeNodeIndex === 'number' ? state.activeNodeIndex : -1;
  const isHeap = kind === 'heap';

  return (
    <div className={styles.treeCanvas} role="region" aria-label="Binary Tree / Heap Visualization">
      {isHeap && (
        <div style={{ display: 'flex', gap: 4, marginBottom: 8, flexWrap: 'wrap' }}>
          <span
            style={{
              fontSize: 10,
              fontWeight: 700,
              color: 'var(--text-muted)',
              alignSelf: 'center',
            }}
          >
            Array View:
          </span>
          {nodes.map((v, i) => (
            <div
              key={i}
              style={{
                padding: '2px 8px',
                border: '1px solid var(--border-default)',
                borderRadius: 2,
                fontSize: 11,
                fontWeight: 600,
                background: i === activeIdx ? 'var(--brand-amber-500)' : 'var(--surface-elevated)',
                color: i === activeIdx ? '#111827' : 'inherit',
              }}
            >
              {v}
            </div>
          ))}
        </div>
      )}

      {/* Level 0: Root */}
      {nodes.length > 0 && (
        <div className={styles.treeLevel}>
          <div className={`${styles.treeNode} ${activeIdx === 0 ? styles.treeNodeHighlight : ''}`}>
            {nodes[0]}
          </div>
        </div>
      )}

      {/* Level 1: Left, Right */}
      {nodes.length > 1 && (
        <div className={styles.treeLevel} style={{ gap: 'var(--space-12)' }}>
          {nodes.slice(1, 3).map((val, idx) => (
            <div
              key={idx}
              className={`${styles.treeNode} ${activeIdx === idx + 1 ? styles.treeNodeHighlight : ''}`}
            >
              {val}
            </div>
          ))}
        </div>
      )}

      {/* Level 2: Children */}
      {nodes.length > 3 && (
        <div className={styles.treeLevel} style={{ gap: 'var(--space-4)' }}>
          {nodes.slice(3, 7).map((val, idx) => (
            <div
              key={idx}
              className={`${styles.treeNode} ${activeIdx === idx + 3 ? styles.treeNodeHighlight : ''}`}
            >
              {val}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
