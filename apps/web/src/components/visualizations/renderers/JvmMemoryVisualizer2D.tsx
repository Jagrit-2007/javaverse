'use client';

import React from 'react';
import type { VizStep } from '@javaverse/schemas';
import styles from '../Visualizer.module.css';

interface JvmMemoryVisualizer2DProps {
  initial?: Record<string, unknown> | undefined;
  stepData?: VizStep | null | undefined;
}

export function JvmMemoryVisualizer2D({ initial, stepData }: JvmMemoryVisualizer2DProps) {
  const state = stepData?.state || {};

  interface StackVar {
    name: string;
    type: string;
    value: string;
    pointsTo?: string;
  }

  interface HeapObj {
    id: string;
    type: string;
    fields: Record<string, unknown>;
    markedForGc?: boolean;
  }

  const stackVars: StackVar[] = (state.stack as StackVar[]) ||
    (initial?.stack as StackVar[]) || [
      { name: 'args', type: 'String[]', value: '@0x100', pointsTo: 'obj-1' },
      { name: 'counter', type: 'int', value: '42' },
      { name: 'user', type: 'User', value: '@0x200', pointsTo: 'obj-2' },
    ];

  const heapObjects: HeapObj[] = (state.heap as HeapObj[]) ||
    (initial?.heap as HeapObj[]) || [
      { id: 'obj-1', type: 'String[0]', fields: { length: 0 } },
      { id: 'obj-2', type: 'User', fields: { id: 1, name: 'Learner' } },
      { id: 'obj-3', type: 'TempNode', fields: { val: 99 }, markedForGc: true },
    ];

  return (
    <div className={styles.jvmMemoryGrid} role="region" aria-label="2D JVM Memory Architecture">
      {/* Thread Stack */}
      <div className={styles.memoryRegion}>
        <div className={styles.regionTitle}>Thread Stack (main)</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {stackVars.map((v, i) => (
            <div
              key={i}
              style={{
                padding: '6px 10px',
                background: 'var(--surface-default)',
                border: '1px solid var(--border-default)',
                borderRadius: 'var(--radius-sm)',
                fontSize: 'var(--text-xs)',
                display: 'flex',
                justifyContent: 'space-between',
              }}
            >
              <span>
                <strong style={{ color: 'var(--brand-amber-400)' }}>{v.type}</strong> {v.name}
              </span>
              <span style={{ fontFamily: 'monospace', color: v.pointsTo ? '#3b82f6' : 'inherit' }}>
                {v.value} {v.pointsTo ? '→' : ''}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Heap Memory */}
      <div className={styles.memoryRegion}>
        <div className={styles.regionTitle}>Managed Heap Space</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {heapObjects.map((obj) => (
            <div
              key={obj.id}
              style={{
                padding: '6px 10px',
                background: obj.markedForGc ? 'rgba(239, 68, 68, 0.15)' : 'var(--surface-default)',
                border: obj.markedForGc ? '1px dashed #ef4444' : '1px solid var(--border-default)',
                borderRadius: 'var(--radius-sm)',
                fontSize: 'var(--text-xs)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                <strong>{obj.type}</strong>
                <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{obj.id}</span>
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
                {Object.entries(obj.fields)
                  .map(([k, val]) => `${k}: ${val}`)
                  .join(', ')}
              </div>
              {obj.markedForGc && (
                <span
                  style={{
                    fontSize: 9,
                    color: '#ef4444',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                  }}
                >
                  Unreachable (Eligible for GC)
                </span>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
