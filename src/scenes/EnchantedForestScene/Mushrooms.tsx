import { useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { mulberry32 } from '../../utils/random';
import { useMagic } from '../../app/store';

/** Glowing mushrooms; pulse brighter after being tapped. */
export function GlowMushrooms({ position, count = 9, pulseAt }: { position: [number, number, number]; count?: number; pulseAt: () => number }) {
  const caps = useRef<THREE.MeshStandardMaterial[]>([]);
  const [lightOn] = useState(() => useMagic.getState().quality !== 'low');
  const items = useMemo(() => {
    const r = mulberry32(31);
    return Array.from({ length: count }, (_, i) => ({ x: (r() - 0.5) * 3.2, z: (r() - 0.5) * 3.2, s: i === 0 ? 1.6 : 0.5 + r() * 0.8, c: ['#9fe3ff', '#f6b8e6', '#c7b6ff', '#b8f0d8'][i % 4], tilt: (r() - 0.5) * 0.4 }));
  }, [count]);
  useFrame((st) => {
    const age = performance.now() / 1000 - pulseAt();
    const boost = age >= 0 && age < 3 ? (1 - age / 3) * 4 : 0;
    caps.current.forEach((m, i) => m && (m.emissiveIntensity = 1.1 + Math.sin(st.clock.elapsedTime * 1.5 + i) * 0.35 + boost));
  });
  return (
    <group position={position}>
      {items.map((m, i) => (
        <group key={i} position={[m.x, 0, m.z]} scale={m.s} rotation={[m.tilt, 0, m.tilt * 0.7]}>
          <mesh position={[0, 0.35, 0]}>
            <cylinderGeometry args={[0.08, 0.12, 0.7, 10]} />
            <meshStandardMaterial color="#f7efe6" roughness={0.7} />
          </mesh>
          <mesh position={[0, 0.7, 0]}>
            <sphereGeometry args={[0.38, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2]} />
            <meshStandardMaterial ref={(el) => void (el && (caps.current[i] = el))} color={m.c} emissive={m.c} emissiveIntensity={1.2} roughness={0.4} toneMapped={false} />
          </mesh>
          {[0, 1, 2, 3, 4].map((k) => (
            <mesh key={k} position={[Math.cos(k * 1.3) * 0.22, 0.86 + (k % 2) * 0.02, Math.sin(k * 1.3) * 0.22]}>
              <sphereGeometry args={[0.035, 8, 6]} />
              <meshBasicMaterial color="#ffffff" />
            </mesh>
          ))}
        </group>
      ))}
      {/* fixed for the session (never toggled), so it cannot trigger a shader recompile */}
      {lightOn && <pointLight position={[0, 1.2, 0]} color="#bfe8ff" intensity={6} distance={8} decay={1.6} />}
    </group>
  );
}
