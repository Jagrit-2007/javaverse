import React from 'react';
import { Card } from '../ui/Card';
import { ProgressBar } from '../ui/ProgressBar';
import type { ProgressBreakdown } from '../fixtures/dashboardData';
import styles from './ProgressOverview.module.css';

interface ProgressOverviewProps {
  overallProgress?: number;
  breakdowns?: ProgressBreakdown[];
}

export function ProgressOverview({ overallProgress = 35, breakdowns = [] }: ProgressOverviewProps) {
  return (
    <Card as="section" aria-labelledby="progress-heading" className={styles.container}>
      <div className={styles.header}>
        <h2 id="progress-heading" className={styles.title}>
          Your Learning Progress
        </h2>
      </div>

      <div className={styles.content}>
        <div className={styles.donutWrapper}>
          <ProgressBar
            value={overallProgress}
            label="Overall Java Learning Progress"
            variant="radial"
            size={110}
            strokeWidth={10}
            color="#0ea5e9"
          />
          <span className={styles.donutLabel}>Overall Progress</span>
        </div>

        <div className={styles.breakdownsList}>
          {breakdowns.map((item) => (
            <div key={item.category} className={styles.breakdownRow}>
              <div className={styles.rowLabels}>
                <span
                  className={styles.dot}
                  style={{ backgroundColor: item.color }}
                  aria-hidden="true"
                />
                <span className={styles.categoryName}>{item.category}</span>
                <span className={styles.percentage}>{item.percentage}%</span>
              </div>
              <ProgressBar
                value={item.percentage}
                label={`${item.category} completion`}
                variant="horizontal"
                color={item.color}
              />
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}
