import React from 'react';
import { Card } from '../ui/Card';
import styles from './VisualConceptPreview.module.css';

export function VisualConceptPreview() {
  return (
    <Card as="section" aria-labelledby="concept-preview-heading" className={styles.container}>
      <div className={styles.header}>
        <span className={styles.tagline}>Visual Concept Preview</span>
        <h2 id="concept-preview-heading" className={styles.title}>
          Class Hierarchy &amp; Inheritance
        </h2>
        <p className={styles.description}>
          See how child classes inherit state and behavior from parents while providing specialized
          implementations.
        </p>
      </div>

      <div
        className={styles.diagramWrapper}
        role="img"
        aria-label="Class Hierarchy: Animal superclass with Dog and Cat subclasses"
        aria-describedby="hierarchy-equivalent-desc"
      >
        <div id="hierarchy-equivalent-desc" className="sr-only">
          Detailed inheritance structure: Superclass Animal defines public methods eat() and
          sleep(). Subclass Dog extends Animal, inheriting eat() and sleep(), and adding specialized
          method bark(). Subclass Cat extends Animal, inheriting eat() and sleep(), and adding
          specialized method meow().
        </div>
        {/* Parent Superclass */}
        <div className={styles.classBoxParent}>
          <div className={styles.classHeader}>Animal</div>
          <div className={styles.classMethods}>
            <code>+ eat()</code>
            <code>+ sleep()</code>
          </div>
        </div>

        {/* Tree Connectors */}
        <div className={styles.treeConnector} aria-hidden="true">
          <div className={styles.stemLine} />
          <div className={styles.branchLine} />
        </div>

        {/* Child Subclasses */}
        <div className={styles.subclassesRow}>
          <div className={styles.classBoxChild}>
            <div className={styles.classHeader}>Dog</div>
            <div className={styles.classMethods}>
              <code>+ bark()</code>
            </div>
          </div>

          <div className={styles.classBoxChild}>
            <div className={styles.classHeader}>Cat</div>
            <div className={styles.classMethods}>
              <code>+ meow()</code>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}
