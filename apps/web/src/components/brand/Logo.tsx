import React from 'react';
import styles from './Logo.module.css';

interface LogoProps {
  size?: 16 | 24 | 32 | 40;
  showWordmark?: boolean;
  className?: string;
}

export function Logo({ size = 32, showWordmark = true, className }: LogoProps) {
  // Simplified paths for <= 24px for pixel-crisp rendering
  const isSmall = size <= 24;

  const svgContent = (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={styles.mark}
      aria-hidden={showWordmark ? 'true' : undefined}
      role={showWordmark ? undefined : 'img'}
      aria-label={showWordmark ? undefined : 'JavaVerse'}
    >
      {/* Top Left Facet */}
      <path
        d={isSmall ? 'M16 3 L5 9.5 L16 16 Z' : 'M16 3 L5 9.5 L16 16 Z'}
        fill="currentColor"
        opacity="0.8"
      />
      {/* Top Right Facet */}
      <path d="M16 3 L27 9.5 L16 16 Z" fill="currentColor" opacity="0.95" />
      {/* Bottom Left Facet */}
      <path d="M5 9.5 L5 22.5 L16 29 L16 16 Z" fill="currentColor" opacity="0.65" />
      {/* Bottom Right Amber Core (Compilation Spark) */}
      <path d="M16 16 L27 9.5 L27 22.5 L16 29 Z" fill="var(--brand-amber, #f59e0b)" />
      {/* Central Geometric Line Overlay for depth */}
      {!isSmall && (
        <path
          d="M16 3 V29 M5 9.5 L27 22.5 M27 9.5 L5 22.5"
          stroke="var(--bg-canvas, #ffffff)"
          strokeWidth="1"
          strokeOpacity="0.25"
          strokeLinejoin="round"
        />
      )}
    </svg>
  );

  if (!showWordmark) {
    return <span className={`${styles.logoStandalone} ${className ?? ''}`}>{svgContent}</span>;
  }

  return (
    <span className={`${styles.logoContainer} ${className ?? ''}`}>
      {svgContent}
      <span className={styles.wordmarkGroup}>
        <span className={styles.brandName}>JavaVerse</span>
        <span className={styles.tagline}>Learn Java. Build Your Thinking.</span>
      </span>
    </span>
  );
}
