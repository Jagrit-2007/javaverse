import React from 'react';
import styles from './ProgressBar.module.css';

interface ProgressBarProps {
  value: number; // 0 to 100
  label: string;
  variant?: 'horizontal' | 'radial';
  color?: string;
  size?: number; // For radial
  strokeWidth?: number; // For radial
  className?: string;
}

export function ProgressBar({
  value,
  label,
  variant = 'horizontal',
  color = 'var(--action-primary-bg)',
  size = 120,
  strokeWidth = 10,
  className = '',
}: ProgressBarProps) {
  const clamped = Math.max(0, Math.min(100, Math.round(value)));

  if (variant === 'radial') {
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (clamped / 100) * circumference;

    return (
      <div
        role="progressbar"
        aria-valuenow={clamped}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label}
        className={`${styles.radialWrapper} ${className}`}
        style={{ width: size, height: size }}
      >
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          {/* Background Track */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="var(--border-subtle)"
            strokeWidth={strokeWidth}
            fill="none"
          />
          {/* Progress Arc */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={color}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            fill="none"
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
            className={styles.arc}
          />
        </svg>
        <div className={styles.radialContent}>
          <span className={styles.radialValue}>{clamped}%</span>
        </div>
      </div>
    );
  }

  return (
    <div
      role="progressbar"
      aria-valuenow={clamped}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
      className={`${styles.horizontalWrapper} ${className}`}
    >
      <div
        className={styles.horizontalFill}
        style={{ width: `${clamped}%`, backgroundColor: color }}
      />
    </div>
  );
}
