import React from 'react';
import styles from './Card.module.css';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  as?: React.ElementType;
  elevation?: 'low' | 'medium' | 'high';
  padding?: 'none' | 'sm' | 'md' | 'lg';
  border?: boolean;
}

export function Card({
  as: Component = 'div',
  elevation = 'low',
  padding = 'md',
  border = true,
  className = '',
  children,
  ...props
}: CardProps) {
  const classList = [
    styles.card,
    styles[`elevation-${elevation}`],
    styles[`padding-${padding}`],
    border ? styles.bordered : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <Component className={classList} {...props}>
      {children}
    </Component>
  );
}
