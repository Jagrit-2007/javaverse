'use client';

import React from 'react';
import type { VizStep } from '@javaverse/schemas';
import styles from '../Visualizer.module.css';

interface ArrayVisualizerProps {
  kind: 'array' | 'two_pointer' | 'string_manipulation' | string;
  initial?: Record<string, unknown> | undefined;
  stepData?: VizStep | null | undefined;
}

export function ArrayVisualizer({ kind: _kind, initial, stepData }: ArrayVisualizerProps) {
  const state = stepData?.state || {};

  // Extract array data
  let data: Array<string | number> = [];
  if (Array.isArray(state.data)) {
    data = state.data as Array<string | number>;
  } else if (Array.isArray(state.chars)) {
    data = state.chars as Array<string | number>;
  } else if (Array.isArray(initial?.data)) {
    data = initial.data as Array<string | number>;
  } else if (typeof initial?.string === 'string') {
    data = initial.string.split('');
  } else {
    data = [2, 5, 8, 12, 16, 23, 38, 56];
  }

  // Pointer indices
  const low = typeof state.low === 'number' ? state.low : -1;
  const high = typeof state.high === 'number' ? state.high : -1;
  const mid = typeof state.mid === 'number' ? state.mid : -1;
  const left = typeof state.left === 'number' ? state.left : -1;
  const right = typeof state.right === 'number' ? state.right : -1;
  const start = typeof state.start === 'number' ? state.start : -1;
  const end = typeof state.end === 'number' ? state.end : -1;

  const highlight = Array.isArray(state.highlight) ? (state.highlight as number[]) : [];
  const found = Boolean(state.found);

  return (
    <div className={styles.arrayRow} role="region" aria-label="Array Visualization">
      {data.map((val, idx) => {
        const isLow = idx === low;
        const isHigh = idx === high;
        const isMid = idx === mid;
        const isLeft = idx === left;
        const isRight = idx === right;
        const isStart = idx === start;
        const isEnd = idx === end;
        const isHighlighted = highlight.includes(idx);
        const isFound = found && (isMid || idx === (state.targetIndex as number));

        // Assemble pointer badges
        const pointerBadges: string[] = [];
        if (isMid) pointerBadges.push('mid');
        if (isLow) pointerBadges.push('low');
        if (isHigh) pointerBadges.push('high');
        if (isLeft) pointerBadges.push('L');
        if (isRight) pointerBadges.push('R');
        if (isStart) pointerBadges.push('start');
        if (isEnd) pointerBadges.push('end');

        return (
          <div
            key={idx}
            className={`${styles.arrayCell} ${isFound ? styles.cellFound : isHighlighted ? styles.cellHighlight : ''}`}
          >
            {pointerBadges.length > 0 && (
              <span className={styles.pointerTag}>{pointerBadges.join('/')}</span>
            )}
            <span>{val}</span>
            <span className={styles.cellIndex}>[{idx}]</span>
          </div>
        );
      })}
    </div>
  );
}
