import React from 'react';
import styles from './Input.module.css';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  id: string;
  description?: string;
  error?: string;
  hideLabel?: boolean;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      id,
      description,
      error,
      hideLabel = false,
      className = '',
      type = 'text',
      disabled = false,
      ...props
    },
    ref,
  ) => {
    const descriptionId = description ? `${id}-desc` : undefined;
    const errorId = error ? `${id}-err` : undefined;
    const ariaDescribedBy = [descriptionId, errorId].filter(Boolean).join(' ') || undefined;

    return (
      <div className={`${styles.wrapper} ${className}`}>
        <label htmlFor={id} className={hideLabel ? 'sr-only' : styles.label}>
          {label}
        </label>
        <input
          ref={ref}
          id={id}
          type={type}
          disabled={disabled}
          aria-invalid={Boolean(error)}
          aria-describedby={ariaDescribedBy}
          className={`${styles.input} ${error ? styles.hasError : ''}`}
          {...props}
        />
        {description && !error && (
          <p id={descriptionId} className={styles.description}>
            {description}
          </p>
        )}
        {error && (
          <p id={errorId} role="alert" className={styles.error}>
            {error}
          </p>
        )}
      </div>
    );
  },
);

Input.displayName = 'Input';
