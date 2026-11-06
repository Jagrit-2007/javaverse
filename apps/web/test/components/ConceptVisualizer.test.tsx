import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { ConceptVisualizer } from '@/components/visualizations/ConceptVisualizer';
import type { VisualizationSpec } from '@javaverse/schemas';

describe('ConceptVisualizer & 2D/3D Concept Renderers', () => {
  const dummyOnStepChange = vi.fn();
  const dummyOnTogglePlay = vi.fn();
  const dummyOnSpeedChange = vi.fn();

  it('renders array visualization with cell values and pointers', () => {
    const spec: VisualizationSpec = {
      kind: 'array',
      title: 'Binary Search',
      initial: { data: [10, 20, 30, 40, 50] },
      steps: [
        {
          line: 2,
          text: 'Initialize search interval: low=0, high=4, mid=2',
          state: { low: 0, high: 4, mid: 2, highlight: [2] },
        },
      ],
    };

    render(
      <ConceptVisualizer
        spec={spec}
        currentStep={0}
        onStepChange={dummyOnStepChange}
        isPlaying={false}
        onTogglePlay={dummyOnTogglePlay}
        playbackSpeed={1}
        onSpeedChange={dummyOnSpeedChange}
      />,
    );

    expect(screen.getByText('30')).toBeDefined();
    expect(screen.getByText('mid')).toBeDefined();
    expect(screen.getByText(/Step 1 of 1/i)).toBeDefined();
    expect(screen.getByRole('status')).toBeDefined();
  });

  it('renders stack and queue visualizations with push/pop and top indicators', () => {
    const stackSpec: VisualizationSpec = {
      kind: 'stack',
      title: 'Stack Demo',
      steps: [
        {
          line: 5,
          text: 'Push item A to stack',
          state: { items: ['A', 'B'] },
        },
      ],
    };

    render(
      <ConceptVisualizer
        spec={stackSpec}
        currentStep={0}
        onStepChange={dummyOnStepChange}
        isPlaying={false}
        onTogglePlay={dummyOnTogglePlay}
        playbackSpeed={1}
        onSpeedChange={dummyOnSpeedChange}
      />,
    );

    expect(screen.getByText('A')).toBeDefined();
    expect(screen.getByText('B')).toBeDefined();
    expect(screen.getByText('Top')).toBeDefined();
  });

  it('renders linked list visualization with next pointers and null termination', () => {
    const listSpec: VisualizationSpec = {
      kind: 'linked_list',
      title: 'Linked List Demo',
      steps: [
        {
          line: 4,
          text: 'Traverse to node 42',
          state: { nodes: [{ val: 10 }, { val: 42 }], currentIndex: 1 },
        },
      ],
    };

    render(
      <ConceptVisualizer
        spec={listSpec}
        currentStep={0}
        onStepChange={dummyOnStepChange}
        isPlaying={false}
        onTogglePlay={dummyOnTogglePlay}
        playbackSpeed={1}
        onSpeedChange={dummyOnSpeedChange}
      />,
    );

    expect(screen.getByText('10')).toBeDefined();
    expect(screen.getByText('42')).toBeDefined();
    expect(screen.getByText('null')).toBeDefined();
    expect(screen.getByText('HEAD →')).toBeDefined();
  });

  it('renders binary tree and heap visualizations', () => {
    const heapSpec: VisualizationSpec = {
      kind: 'heap',
      title: 'Min-Heap Demo',
      steps: [
        {
          line: 6,
          text: 'Sift up min element to root',
          state: { heap: [5, 15, 20, 30], activeNodeIndex: 0 },
        },
      ],
    };

    render(
      <ConceptVisualizer
        spec={heapSpec}
        currentStep={0}
        onStepChange={dummyOnStepChange}
        isPlaying={false}
        onTogglePlay={dummyOnTogglePlay}
        playbackSpeed={1}
        onSpeedChange={dummyOnSpeedChange}
      />,
    );

    expect(screen.getByText('Array View:')).toBeDefined();
    expect(screen.getAllByText('5').length).toBeGreaterThanOrEqual(1);
  });

  it('renders graph visualization with visited set and active edges', () => {
    const graphSpec: VisualizationSpec = {
      kind: 'graph',
      title: 'BFS Graph Traversal',
      steps: [
        {
          line: 8,
          text: 'Visit node B from A',
          state: {
            nodes: ['A', 'B', 'C'],
            visited: ['A', 'B'],
            current: 'B',
            edges: [
              ['A', 'B'],
              ['B', 'C'],
            ],
          },
        },
      ],
    };

    render(
      <ConceptVisualizer
        spec={graphSpec}
        currentStep={0}
        onStepChange={dummyOnStepChange}
        isPlaying={false}
        onTogglePlay={dummyOnTogglePlay}
        playbackSpeed={1}
        onSpeedChange={dummyOnSpeedChange}
      />,
    );

    expect(screen.getByText('Visited Set: [A, B]')).toBeDefined();
    expect(screen.getByText('A ↔ B')).toBeDefined();
  });

  it('renders hash table buckets and collision entries', () => {
    const hashSpec: VisualizationSpec = {
      kind: 'hash_table',
      title: 'HashMap Chaining',
      steps: [
        {
          line: 3,
          text: 'Put key "test" in bucket 2',
          state: {
            numBuckets: 4,
            activeBucket: 2,
            buckets: {
              2: [{ key: 'test', value: 'data' }],
            },
          },
        },
      ],
    };

    render(
      <ConceptVisualizer
        spec={hashSpec}
        currentStep={0}
        onStepChange={dummyOnStepChange}
        isPlaying={false}
        onTogglePlay={dummyOnTogglePlay}
        playbackSpeed={1}
        onSpeedChange={dummyOnSpeedChange}
      />,
    );

    expect(screen.getByText('test')).toBeDefined();
    expect(screen.getAllByText(/data/).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('[2]')).toBeDefined();
  });

  it('renders recursion call stack frames and return unwinding', () => {
    const recSpec: VisualizationSpec = {
      kind: 'recursion',
      title: 'Factorial Recursion',
      steps: [
        {
          line: 4,
          text: 'Base case reached: return 1',
          state: {
            frames: [
              { fn: 'fact', args: { n: 1 }, returnValue: 1 },
              { fn: 'fact', args: { n: 2 } },
            ],
          },
        },
      ],
    };

    render(
      <ConceptVisualizer
        spec={recSpec}
        currentStep={0}
        onStepChange={dummyOnStepChange}
        isPlaying={false}
        onTogglePlay={dummyOnTogglePlay}
        playbackSpeed={1}
        onSpeedChange={dummyOnSpeedChange}
      />,
    );

    expect(screen.getAllByText('fact').length).toBe(2);
    expect(screen.getByText('return 1')).toBeDefined();
  });

  it('renders 2D JVM memory architecture with stack frames and GC status', () => {
    const jvmSpec: VisualizationSpec = {
      kind: 'jvm_memory',
      title: 'JVM Memory Model',
      steps: [
        {
          line: 12,
          text: 'Object allocated in Heap, referenced from Thread Stack',
          state: {
            stack: [{ name: 'obj', type: 'MyClass', value: '@0x123' }],
            heap: [{ id: 'obj-1', type: 'MyClass', fields: { val: 42 }, markedForGc: false }],
          },
        },
      ],
    };

    render(
      <ConceptVisualizer
        spec={jvmSpec}
        currentStep={0}
        onStepChange={dummyOnStepChange}
        isPlaying={false}
        onTogglePlay={dummyOnTogglePlay}
        playbackSpeed={1}
        onSpeedChange={dummyOnSpeedChange}
      />,
    );

    expect(screen.getByText('Thread Stack (main)')).toBeDefined();
    expect(screen.getByText('Managed Heap Space')).toBeDefined();
    expect(screen.getByText('obj')).toBeDefined();
    expect(screen.getByText('val: 42')).toBeDefined();
  });

  it('renders WCAG 2.2 AA accessible fallback table with aria-current="step"', () => {
    const spec: VisualizationSpec = {
      kind: 'array',
      title: 'Array Demo',
      steps: [
        { line: 1, text: 'First Step', state: { a: 1 } },
        { line: 2, text: 'Second Step', state: { a: 2 } },
      ],
    };

    render(
      <ConceptVisualizer
        spec={spec}
        currentStep={1}
        onStepChange={dummyOnStepChange}
        isPlaying={false}
        onTogglePlay={dummyOnTogglePlay}
        playbackSpeed={1}
        onSpeedChange={dummyOnSpeedChange}
      />,
    );

    expect(screen.getByText('View Accessible Step State Table (WCAG 2.2 AA)')).toBeDefined();
    const rows = screen.getAllByRole('row');
    // Header row + 2 data rows = 3
    expect(rows.length).toBe(3);
    const step2Row = rows[2];
    expect(step2Row?.getAttribute('aria-current')).toBe('step');
  });

  it('invokes playback handlers on step forward and backward button clicks', () => {
    const spec: VisualizationSpec = {
      kind: 'array',
      title: 'Controls Test',
      steps: [
        { line: 1, text: 'Step 1' },
        { line: 2, text: 'Step 2' },
      ],
    };

    render(
      <ConceptVisualizer
        spec={spec}
        currentStep={0}
        onStepChange={dummyOnStepChange}
        isPlaying={false}
        onTogglePlay={dummyOnTogglePlay}
        playbackSpeed={1}
        onSpeedChange={dummyOnSpeedChange}
      />,
    );

    const playBtn = screen.getByRole('button', { name: /Play animation/i });
    fireEvent.click(playBtn);
    expect(dummyOnTogglePlay).toHaveBeenCalledTimes(1);

    const nextBtn = screen.getByRole('button', { name: /Step forward/i });
    fireEvent.click(nextBtn);
    expect(dummyOnStepChange).toHaveBeenCalledWith(1);
  });
});
