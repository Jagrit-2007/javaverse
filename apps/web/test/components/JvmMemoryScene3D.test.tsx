import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { render, screen, act } from '@testing-library/react';

vi.mock('three', async (importOriginal) => {
  const actual = await importOriginal<typeof import('three')>();
  class MockWebGLRenderer {
    domElement = document.createElement('canvas');
    setSize = vi.fn();
    setPixelRatio = vi.fn();
    render = vi.fn();
    dispose = vi.fn();
  }

  return {
    ...actual,
    WebGLRenderer: MockWebGLRenderer,
  };
});

import { JvmMemoryScene3D } from '@/components/visualizations/renderers/JvmMemoryScene3D';

describe('JvmMemoryScene3D Reduced Motion & Interaction', () => {
  let matchMediaListeners: Array<(e: { matches: boolean }) => void> = [];
  let matchesReducedMotion = false;
  let rafCallbacks: Array<FrameRequestCallback> = [];
  let nextRafId = 1;
  let cancelledRafIds: number[] = [];

  beforeEach(() => {
    matchMediaListeners = [];
    matchesReducedMotion = false;
    rafCallbacks = [];
    cancelledRafIds = [];
    nextRafId = 1;

    // Mock requestAnimationFrame / cancelAnimationFrame
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => {
      const id = nextRafId++;
      rafCallbacks.push(cb);
      return id;
    });

    vi.spyOn(window, 'cancelAnimationFrame').mockImplementation((id) => {
      cancelledRafIds.push(id);
    });

    // Mock matchMedia
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: matchesReducedMotion,
      media: query,
      onchange: null,
      addListener: vi.fn((fn) => matchMediaListeners.push(fn)),
      removeListener: vi.fn((fn) => {
        matchMediaListeners = matchMediaListeners.filter((l) => l !== fn);
      }),
      addEventListener: vi.fn((evt, fn) => {
        if (evt === 'change') matchMediaListeners.push(fn);
      }),
      removeEventListener: vi.fn((evt, fn) => {
        if (evt === 'change') {
          matchMediaListeners = matchMediaListeners.filter((l) => l !== fn);
        }
      }),
      dispatchEvent: vi.fn(),
    }));

    // Mock WebGL context so isWebGLAvailable() returns true
    (window as any).WebGLRenderingContext = function () {};
    HTMLCanvasElement.prototype.getContext = vi.fn().mockImplementation((type: string) => {
      if (type === 'webgl' || type === 'experimental-webgl') {
        return {
          getExtension: vi.fn(),
          getParameter: vi.fn(),
          createShader: vi.fn(),
          shaderSource: vi.fn(),
          compileShader: vi.fn(),
        };
      }
      return null;
    }) as any;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('stops automatic rotation when prefers-reduced-motion: reduce is enabled', () => {
    matchesReducedMotion = true;

    render(
      <JvmMemoryScene3D
        currentStepData={{
          line: 1,
          text: 'Allocating in Eden space',
        }}
      />,
    );

    expect(screen.getByLabelText('3D JVM Memory Architecture')).toBeDefined();
    expect(screen.getByText('Allocating in Eden space')).toBeDefined();

    // When reduced motion is preferred, requestAnimationFrame should NOT be called for auto-rotation
    expect(window.requestAnimationFrame).not.toHaveBeenCalled();
  });

  it('runs automatic rotation loop when prefers-reduced-motion is false', () => {
    matchesReducedMotion = false;

    render(<JvmMemoryScene3D />);

    expect(screen.getByLabelText('3D JVM Memory Architecture')).toBeDefined();
    // Auto-rotation must schedule animation frame
    expect(window.requestAnimationFrame).toHaveBeenCalled();
  });

  it('dynamically halts rotation when preference changes to reduced-motion while open', () => {
    matchesReducedMotion = false;

    render(<JvmMemoryScene3D />);
    expect(window.requestAnimationFrame).toHaveBeenCalled();

    // Simulate user toggling prefers-reduced-motion ON
    act(() => {
      matchMediaListeners.forEach((listener) => listener({ matches: true }));
    });

    // Must cancel existing animation frame
    expect(window.cancelAnimationFrame).toHaveBeenCalled();
  });

  it('dynamically resumes rotation when preference changes away from reduced-motion', () => {
    matchesReducedMotion = true;

    render(<JvmMemoryScene3D />);
    expect(window.requestAnimationFrame).not.toHaveBeenCalled();

    // Simulate user toggling prefers-reduced-motion OFF
    act(() => {
      matchMediaListeners.forEach((listener) => listener({ matches: false }));
    });

    // Should now start animation frame
    expect(window.requestAnimationFrame).toHaveBeenCalled();
  });

  it('preserves manual interaction via pointer drag even when reduced-motion is enabled', () => {
    matchesReducedMotion = true;

    const { container } = render(<JvmMemoryScene3D />);
    const canvas = container.querySelector('canvas');
    expect(canvas).toBeDefined();

    if (canvas) {
      canvas.dispatchEvent(new MouseEvent('pointerdown', { clientX: 100 }));
      window.dispatchEvent(new MouseEvent('pointermove', { clientX: 150 }));
      window.dispatchEvent(new MouseEvent('pointerup', { clientX: 150 }));
    }
  });

  it('cleans up media-query and animation-frame listeners upon unmount', () => {
    matchesReducedMotion = false;

    const { unmount } = render(<JvmMemoryScene3D />);
    expect(matchMediaListeners.length).toBeGreaterThan(0);

    unmount();

    // Listener must be removed on unmount
    expect(matchMediaListeners.length).toBe(0);
    expect(window.cancelAnimationFrame).toHaveBeenCalled();
  });
});
