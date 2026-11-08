import { Html } from '@react-three/drei';
import type { ReactNode } from 'react';

/**
 * Accessible hit target anchored to a 3D object: a real <button> that tracks the
 * object on screen, so 3D surprises work with touch, mouse and keyboard alike.
 */
export function Hotspot({ position, label, onActivate, size = 56, children }: { position: [number, number, number]; label: string; onActivate: () => void; size?: number; children?: ReactNode }) {
  return (
    <Html position={position} center zIndexRange={[5, 0]} style={{ pointerEvents: 'none' }}>
      <button
        type="button"
        aria-label={label}
        data-hotspot={label}
        className="hotspot"
        style={{ width: size, height: size }}
        onClick={(e) => {
          e.stopPropagation();
          onActivate();
        }}
      >
        {children}
      </button>
    </Html>
  );
}
