'use client';

import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import type { VizStep } from '@javaverse/schemas';
import styles from '../Visualizer.module.css';

interface JvmMemoryScene3DProps {
  currentStepData?: VizStep | null | undefined;
  onFallback?: () => void;
}

export function isWebGLAvailable(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const canvas = document.createElement('canvas');
    return !!(
      window.WebGLRenderingContext &&
      (canvas.getContext('webgl') || canvas.getContext('experimental-webgl'))
    );
  } catch {
    return false;
  }
}

export function JvmMemoryScene3D({ currentStepData, onFallback }: JvmMemoryScene3DProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const [webGlSupported, setWebGlSupported] = useState(true);

  useEffect(() => {
    if (!isWebGLAvailable()) {
      setWebGlSupported(false);
      onFallback?.();
      return;
    }

    const currentMount = mountRef.current;
    if (!currentMount) return;

    const width = currentMount.clientWidth || 400;
    const height = currentMount.clientHeight || 300;

    // 1. Scene, Camera, Renderer
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0f172a); // Slate-900

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.set(0, 8, 16);
    camera.lookAt(0, 0, 0);

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      renderer.setSize(width, height);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      currentMount.appendChild(renderer.domElement);
    } catch {
      setWebGlSupported(false);
      onFallback?.();
      return;
    }

    // 2. Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight.position.set(5, 10, 7);
    scene.add(dirLight);

    // 3. JVM Memory Regions 3D Meshes
    const rootGroup = new THREE.Group();
    scene.add(rootGroup);

    // Stack Frames (Left)
    const stackGeo = new THREE.BoxGeometry(2, 0.6, 2);
    const stackMat = new THREE.MeshStandardMaterial({
      color: 0x3b82f6,
      roughness: 0.3,
      metalness: 0.1,
    });
    for (let i = 0; i < 3; i++) {
      const frame = new THREE.Mesh(stackGeo, stackMat);
      frame.position.set(-5, i * 0.8 - 1, 0);
      rootGroup.add(frame);
    }

    // Eden Space (Emerald)
    const edenGeo = new THREE.BoxGeometry(3, 1.5, 2.5);
    const edenMat = new THREE.MeshStandardMaterial({
      color: 0x10b981,
      roughness: 0.2,
      metalness: 0.2,
    });
    const edenMesh = new THREE.Mesh(edenGeo, edenMat);
    edenMesh.position.set(-1, 0, 1.5);
    rootGroup.add(edenMesh);

    // Survivor Spaces S0 & S1 (Cyan)
    const survivorGeo = new THREE.BoxGeometry(1.2, 1.5, 1.1);
    const survivorMat = new THREE.MeshStandardMaterial({
      color: 0x06b6d4,
      roughness: 0.2,
      metalness: 0.2,
    });
    const s0Mesh = new THREE.Mesh(survivorGeo, survivorMat);
    s0Mesh.position.set(1.5, 0, 0.8);
    rootGroup.add(s0Mesh);

    const s1Mesh = new THREE.Mesh(survivorGeo, survivorMat);
    s1Mesh.position.set(1.5, 0, 2.2);
    rootGroup.add(s1Mesh);

    // Tenured / Old Gen (Amber)
    const oldGeo = new THREE.BoxGeometry(3.5, 2.0, 3.5);
    const oldMat = new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      roughness: 0.2,
      metalness: 0.2,
    });
    const oldMesh = new THREE.Mesh(oldGeo, oldMat);
    oldMesh.position.set(4.5, 0.25, 0);
    rootGroup.add(oldMesh);

    // Metaspace (Purple)
    const metaGeo = new THREE.BoxGeometry(2.5, 1.0, 2.0);
    const metaMat = new THREE.MeshStandardMaterial({
      color: 0x8b5cf6,
      roughness: 0.3,
      metalness: 0.2,
    });
    const metaMesh = new THREE.Mesh(metaGeo, metaMat);
    metaMesh.position.set(-1, 0, -2.5);
    rootGroup.add(metaMesh);

    // 4. Motion Preference & Animation Loop
    const mediaQuery =
      typeof window !== 'undefined' && window.matchMedia
        ? window.matchMedia('(prefers-reduced-motion: reduce)')
        : null;

    let isReducedMotion = mediaQuery ? mediaQuery.matches : false;
    let animId: number | null = null;

    const renderScene = () => {
      renderer.render(scene, camera);
    };

    const animate = () => {
      if (!isReducedMotion) {
        rootGroup.rotation.y += 0.005;
        renderScene();
        animId = requestAnimationFrame(animate);
      }
    };

    if (isReducedMotion) {
      renderScene();
    } else {
      animId = requestAnimationFrame(animate);
    }

    const handleMotionChange = (e: MediaQueryListEvent | MediaQueryList) => {
      isReducedMotion = e.matches;
      if (isReducedMotion) {
        if (animId !== null) {
          cancelAnimationFrame(animId);
          animId = null;
        }
        renderScene();
      } else {
        if (animId === null) {
          animId = requestAnimationFrame(animate);
        }
      }
    };

    interface LegacyMediaQueryList {
      addListener: (listener: (e: MediaQueryListEvent) => void) => void;
      removeListener: (listener: (e: MediaQueryListEvent) => void) => void;
    }

    if (mediaQuery) {
      if (typeof mediaQuery.addEventListener === 'function') {
        mediaQuery.addEventListener('change', handleMotionChange);
      } else if (
        'addListener' in mediaQuery &&
        typeof (mediaQuery as unknown as LegacyMediaQueryList).addListener === 'function'
      ) {
        (mediaQuery as unknown as LegacyMediaQueryList).addListener(
          handleMotionChange as (e: MediaQueryListEvent) => void,
        );
      }
    }

    // Manual Interaction (Pointer Drag) - Preserved regardless of motion preference
    let isDragging = false;
    let previousPointerX = 0;

    const handlePointerDown = (e: PointerEvent) => {
      isDragging = true;
      previousPointerX = e.clientX;
    };

    const handlePointerMove = (e: PointerEvent) => {
      if (!isDragging) return;
      const deltaX = e.clientX - previousPointerX;
      previousPointerX = e.clientX;
      rootGroup.rotation.y += deltaX * 0.01;
      renderScene();
    };

    const handlePointerUp = () => {
      isDragging = false;
    };

    const domElement = renderer.domElement;
    domElement.style.touchAction = 'none';
    domElement.addEventListener('pointerdown', handlePointerDown);
    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);

    // 5. Resize Handler
    const handleResize = () => {
      if (!currentMount) return;
      const newWidth = currentMount.clientWidth;
      const newHeight = currentMount.clientHeight;
      camera.aspect = newWidth / newHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(newWidth, newHeight);
      renderScene();
    };
    window.addEventListener('resize', handleResize);

    // 6. Cleanup on unmount
    return () => {
      window.removeEventListener('resize', handleResize);
      if (animId !== null) {
        cancelAnimationFrame(animId);
        animId = null;
      }
      if (mediaQuery) {
        if (typeof mediaQuery.removeEventListener === 'function') {
          mediaQuery.removeEventListener('change', handleMotionChange);
        } else if (
          'removeListener' in mediaQuery &&
          typeof (mediaQuery as unknown as LegacyMediaQueryList).removeListener === 'function'
        ) {
          (mediaQuery as unknown as LegacyMediaQueryList).removeListener(
            handleMotionChange as (e: MediaQueryListEvent) => void,
          );
        }
      }
      domElement.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);

      stackGeo.dispose();
      stackMat.dispose();
      edenGeo.dispose();
      edenMat.dispose();
      survivorGeo.dispose();
      survivorMat.dispose();
      oldGeo.dispose();
      oldMat.dispose();
      metaGeo.dispose();
      metaMat.dispose();
      renderer.dispose();
      if (renderer.domElement && currentMount.contains(renderer.domElement)) {
        currentMount.removeChild(renderer.domElement);
      }
    };
  }, [onFallback]);

  if (!webGlSupported) {
    return (
      <div
        style={{
          padding: 'var(--space-4)',
          textAlign: 'center',
          color: 'var(--text-muted)',
          fontSize: 'var(--text-xs)',
        }}
      >
        WebGL acceleration is not available in this environment. Showing 2D visualization.
      </div>
    );
  }

  return (
    <div className={styles.threeContainer} ref={mountRef} aria-label="3D JVM Memory Architecture">
      <div
        style={{
          position: 'absolute',
          top: 10,
          left: 10,
          background: 'rgba(15, 23, 42, 0.85)',
          padding: '6px 12px',
          borderRadius: '4px',
          fontSize: '11px',
          color: '#f8fafc',
          display: 'flex',
          gap: '12px',
          zIndex: 10,
          border: '1px solid rgba(255,255,255,0.1)',
        }}
      >
        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{ width: 8, height: 8, background: '#3b82f6', borderRadius: '50%' }}></span>
          Thread Stacks
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{ width: 8, height: 8, background: '#10b981', borderRadius: '50%' }}></span>
          Eden Space
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{ width: 8, height: 8, background: '#06b6d4', borderRadius: '50%' }}></span>
          Survivor (S0/S1)
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{ width: 8, height: 8, background: '#f59e0b', borderRadius: '50%' }}></span>
          Tenured (Old Gen)
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{ width: 8, height: 8, background: '#8b5cf6', borderRadius: '50%' }}></span>
          Metaspace
        </span>
      </div>
      {currentStepData?.text && (
        <div
          style={{
            position: 'absolute',
            bottom: 10,
            left: 10,
            right: 10,
            background: 'rgba(15, 23, 42, 0.85)',
            padding: '8px 12px',
            borderRadius: '4px',
            fontSize: '12px',
            color: '#e2e8f0',
            zIndex: 10,
            border: '1px solid rgba(255,255,255,0.1)',
          }}
        >
          {currentStepData.text}
        </div>
      )}
    </div>
  );
}
