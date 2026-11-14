'use client';

import React from 'react';
import type { VizStep } from '@javaverse/schemas';
import styles from '../Visualizer.module.css';

interface GraphVisualizerProps {
  initial?: Record<string, unknown> | undefined;
  stepData?: VizStep | null | undefined;
}

export function GraphVisualizer({ initial, stepData }: GraphVisualizerProps) {
  const state = stepData?.state || {};

  const nodes: string[] = (state.nodes as string[]) ||
    (initial?.nodes as string[]) || ['A', 'B', 'C', 'D', 'E'];
  const visited: string[] = (state.visited as string[]) || [];
  const currentNode = (state.current as string) || '';
  const edges: Array<[string, string]> = (state.edges as Array<[string, string]>) || [
    ['A', 'B'],
    ['A', 'C'],
    ['B', 'D'],
    ['C', 'D'],
    ['D', 'E'],
  ];

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 'var(--space-4)',
        width: '100%',
      }}
      role="region"
      aria-label="Graph Traversal Visualization"
    >
      <div
        style={{
          display: 'flex',
          gap: 'var(--space-4)',
          flexWrap: 'wrap',
          justifyContent: 'center',
        }}
      >
        {nodes.map((node) => {
          const isCurrent = node === currentNode;
          const isVisited = visited.includes(node);

          return (
            <div
              key={node}
              className={`${styles.treeNode} ${isCurrent ? styles.cellFound : isVisited ? styles.cellHighlight : ''}`}
            >
              {node}
            </div>
          );
        })}
      </div>

      <div
        style={{
          display: 'flex',
          gap: 'var(--space-2)',
          fontSize: 'var(--text-xs)',
          color: 'var(--text-secondary)',
          flexWrap: 'wrap',
        }}
      >
        <span style={{ fontWeight: 700 }}>Active Edges:</span>
        {edges.map(([u, v], i) => (
          <span
            key={i}
            style={{
              padding: '2px 6px',
              background: 'var(--surface-elevated)',
              border: '1px solid var(--border-default)',
              borderRadius: 3,
            }}
          >
            {u} ↔ {v}
          </span>
        ))}
      </div>

      <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
        Visited Set: [{visited.join(', ')}]
      </div>
    </div>
  );
}
