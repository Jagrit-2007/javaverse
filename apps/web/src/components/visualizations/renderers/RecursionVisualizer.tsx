'use client';

import React from 'react';
import type { VizStep } from '@javaverse/schemas';

interface RecursionVisualizerProps {
  initial?: Record<string, unknown> | undefined;
  stepData?: VizStep | null | undefined;
}

export function RecursionVisualizer({ initial, stepData }: RecursionVisualizerProps) {
  const state = stepData?.state || {};

  interface Frame {
    fn: string;
    args: Record<string, unknown>;
    returnValue?: unknown;
  }

  const frames: Frame[] = (state.frames as Frame[]) ||
    (initial?.frames as Frame[]) || [
      { fn: 'factorial', args: { n: 1 }, returnValue: 1 },
      { fn: 'factorial', args: { n: 2 } },
      { fn: 'factorial', args: { n: 3 } },
      { fn: 'factorial', args: { n: 4 } },
    ];

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 'var(--space-2)',
        width: '100%',
        maxWidth: 360,
      }}
      role="region"
      aria-label="Recursion Call Stack Frames"
    >
      <span style={{ fontSize: 'var(--text-xs)', fontWeight: 700, color: 'var(--text-secondary)' }}>
        Call Stack Activation Frames (Unwinding from top)
      </span>
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 6,
          width: '100%',
        }}
      >
        {frames.map((frame, idx) => {
          const isTop = idx === 0;
          return (
            <div
              key={idx}
              style={{
                padding: '8px 12px',
                background: isTop ? 'rgba(245, 158, 11, 0.15)' : 'var(--surface-elevated)',
                border: isTop
                  ? '2px solid var(--brand-amber-500)'
                  : '1px solid var(--border-default)',
                borderRadius: 'var(--radius-sm)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                fontSize: 'var(--text-xs)',
              }}
            >
              <div>
                <strong style={{ color: 'var(--brand-amber-400)' }}>{frame.fn}</strong>
                <span>
                  (
                  {Object.entries(frame.args)
                    .map(([k, v]) => `${k}=${v}`)
                    .join(', ')}
                  )
                </span>
              </div>
              {frame.returnValue !== undefined && (
                <span
                  style={{
                    padding: '1px 6px',
                    background: 'rgba(16, 185, 129, 0.2)',
                    color: '#10b981',
                    borderRadius: 3,
                    fontWeight: 700,
                  }}
                >
                  return {String(frame.returnValue)}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
