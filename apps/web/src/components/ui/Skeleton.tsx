import React from 'react';
import styles from './Skeleton.module.css';

interface SkeletonProps {
  width?: string | number | undefined;
  height?: string | number | undefined;
  borderRadius?: string | undefined;
  className?: string | undefined;
}

export function Skeleton({
  width = '100%',
  height = '20px',
  borderRadius = 'var(--radius-md)',
  className = '',
}: SkeletonProps) {
  return (
    <div
      aria-hidden="true"
      className={`${styles.skeleton} ${className || ''}`}
      style={{
        width: typeof width === 'number' ? `${width}px` : width,
        height: typeof height === 'number' ? `${height}px` : height,
        borderRadius,
      }}
    />
  );
}
