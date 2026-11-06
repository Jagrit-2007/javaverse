'use client';

import React from 'react';
import type { VizStep } from '@javaverse/schemas';
import styles from './Visualizer.module.css';

interface AccessibleTableFallbackProps {
  steps: VizStep[];
  currentStep: number;
}

export function AccessibleTableFallback({ steps, currentStep }: AccessibleTableFallbackProps) {
  return (
    <details
      style={{
        fontSize: 'var(--text-xs)',
        color: 'var(--text-secondary)',
        marginTop: 'var(--space-2)',
      }}
    >
      <summary style={{ cursor: 'pointer', fontWeight: 600, padding: '4px 0' }}>
        View Accessible Step State Table (WCAG 2.2 AA)
      </summary>
      <table className={styles.dataTable} aria-label="Step-by-Step Execution Trace State">
        <thead>
          <tr>
            <th scope="col" style={{ width: '60px' }}>
              Step
            </th>
            <th scope="col" style={{ width: '60px' }}>
              Line
            </th>
            <th scope="col">Narration</th>
            <th scope="col">State & Variables</th>
          </tr>
        </thead>
        <tbody>
          {steps.map((step, idx) => {
            const isActive = idx === currentStep;
            return (
              <tr
                key={idx}
                className={isActive ? styles.activeRow : undefined}
                aria-current={isActive ? 'step' : undefined}
              >
                <td>{idx + 1}</td>
                <td>{step.line ? `L${step.line}` : '—'}</td>
                <td>{step.text || '—'}</td>
                <td>
                  {step.state ? (
                    <code style={{ fontSize: 11 }}>{JSON.stringify(step.state)}</code>
                  ) : (
                    '—'
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </details>
  );
}
