'use client';

import React, { useState } from 'react';
import type { VisualizationSpec } from '@javaverse/schemas';
import styles from './Visualizer.module.css';
import { Button } from '@/components/ui/Button';
import { RotateCcw, SkipBack, Play, Pause, SkipForward, Box, Layers } from 'lucide-react';

import { ArrayVisualizer } from './renderers/ArrayVisualizer';
import { StackQueueVisualizer } from './renderers/StackQueueVisualizer';
import { LinkedListVisualizer } from './renderers/LinkedListVisualizer';
import { TreeHeapVisualizer } from './renderers/TreeHeapVisualizer';
import { GraphVisualizer } from './renderers/GraphVisualizer';
import { HashTableVisualizer } from './renderers/HashTableVisualizer';
import { RecursionVisualizer } from './renderers/RecursionVisualizer';
import { JvmMemoryVisualizer2D } from './renderers/JvmMemoryVisualizer2D';
import { JvmMemoryScene3D, isWebGLAvailable } from './renderers/JvmMemoryScene3D';
import { AccessibleTableFallback } from './AccessibleTableFallback';

export interface ConceptVisualizerProps {
  spec: VisualizationSpec;
  currentStep: number;
  onStepChange: (step: number) => void;
  isPlaying: boolean;
  onTogglePlay: () => void;
  playbackSpeed: number;
  onSpeedChange: (speed: number) => void;
}

export function ConceptVisualizer({
  spec,
  currentStep,
  onStepChange,
  isPlaying,
  onTogglePlay,
  playbackSpeed,
  onSpeedChange,
}: ConceptVisualizerProps) {
  const [is3DMode, setIs3DMode] = useState(false);
  const totalSteps = spec.steps?.length || 0;
  const currentStepData = spec.steps?.[currentStep] || null;

  const canUse3D = spec.kind === 'jvm_memory' && isWebGLAvailable();

  const renderContent = () => {
    if (spec.kind === 'jvm_memory' && is3DMode && canUse3D) {
      return (
        <JvmMemoryScene3D currentStepData={currentStepData} onFallback={() => setIs3DMode(false)} />
      );
    }

    switch (spec.kind) {
      case 'array':
      case 'two_pointer':
      case 'string_manipulation':
        return (
          <ArrayVisualizer kind={spec.kind} initial={spec.initial} stepData={currentStepData} />
        );

      case 'stack':
      case 'queue':
        return (
          <StackQueueVisualizer
            kind={spec.kind}
            initial={spec.initial}
            stepData={currentStepData}
          />
        );

      case 'linked_list':
        return <LinkedListVisualizer initial={spec.initial} stepData={currentStepData} />;

      case 'binary_tree':
      case 'heap':
        return (
          <TreeHeapVisualizer kind={spec.kind} initial={spec.initial} stepData={currentStepData} />
        );

      case 'graph':
        return <GraphVisualizer initial={spec.initial} stepData={currentStepData} />;

      case 'hash_table':
        return <HashTableVisualizer initial={spec.initial} stepData={currentStepData} />;

      case 'recursion':
        return <RecursionVisualizer initial={spec.initial} stepData={currentStepData} />;

      case 'jvm_memory':
      default:
        return <JvmMemoryVisualizer2D initial={spec.initial} stepData={currentStepData} />;
    }
  };

  return (
    <div className={styles.container}>
      {/* Controls Bar */}
      <div className={styles.controlsBar}>
        <div className={styles.buttonGroup}>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => onStepChange(0)}
            title="Reset to beginning"
            aria-label="Reset visualization to beginning"
          >
            <RotateCcw size={14} aria-hidden="true" />
          </Button>

          <Button
            variant="secondary"
            size="sm"
            onClick={() => onStepChange(Math.max(0, currentStep - 1))}
            disabled={currentStep === 0}
            title="Step back"
            aria-label="Step back"
          >
            <SkipBack size={14} aria-hidden="true" />
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={onTogglePlay}
            aria-label={isPlaying ? 'Pause animation' : 'Play animation'}
          >
            {isPlaying ? (
              <>
                <Pause size={14} aria-hidden="true" />
                <span>Pause</span>
              </>
            ) : (
              <>
                <Play size={14} aria-hidden="true" />
                <span>Play</span>
              </>
            )}
          </Button>

          <Button
            variant="secondary"
            size="sm"
            onClick={() => onStepChange(Math.min(totalSteps - 1, currentStep + 1))}
            disabled={currentStep >= totalSteps - 1}
            title="Step forward"
            aria-label="Step forward"
          >
            <SkipForward size={14} aria-hidden="true" />
          </Button>
        </div>

        <span className={styles.stepIndicator}>
          Step {currentStep + 1} of {totalSteps}
        </span>

        <div className={styles.buttonGroup}>
          {canUse3D && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setIs3DMode(!is3DMode)}
              aria-label={is3DMode ? 'Switch to 2D view' : 'Switch to 3D scene view'}
            >
              {is3DMode ? (
                <>
                  <Layers size={14} aria-hidden="true" />
                  <span>2D View</span>
                </>
              ) : (
                <>
                  <Box size={14} aria-hidden="true" />
                  <span>3D Scene</span>
                </>
              )}
            </Button>
          )}

          <select
            value={playbackSpeed}
            onChange={(e) => onSpeedChange(Number(e.target.value))}
            aria-label="Playback speed"
            style={{
              padding: '4px 8px',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border-default)',
              background: 'var(--surface-default)',
              color: 'var(--text-primary)',
              fontSize: 'var(--text-xs)',
              fontWeight: 600,
            }}
          >
            <option value={0.5}>0.5x</option>
            <option value={1}>1.0x</option>
            <option value={2}>2.0x</option>
          </select>
        </div>
      </div>

      {/* Primary Stage */}
      <div className={styles.stageArea}>{renderContent()}</div>

      {/* Screen Reader Narration Box */}
      <div className={styles.narrationBox} role="status" aria-live="polite" aria-atomic="true">
        <strong>Step {currentStep + 1}:</strong> {currentStepData?.text || 'Ready.'}
      </div>

      {/* Accessible Table Fallback */}
      {spec.steps && spec.steps.length > 0 && (
        <AccessibleTableFallback steps={spec.steps} currentStep={currentStep} />
      )}
    </div>
  );
}
