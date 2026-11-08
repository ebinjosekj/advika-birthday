import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { mulberry32 } from '../../utils/random';

/** Paper sky-lanterns drifting upward on warm air; they loop softly. */
export function SkyLanterns({ center, spread, count, rise = 30, seed = 9 }: { center: [number, number, number]; spread: [number, number]; count: number; rise?: number; seed?: number }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const geo = useMemo(() => {
    const pts = [0, 0.15, 0.38, 0.5, 0.48, 0.4].map((r, i) => new THREE.Vector2(r * 0.9 + 0.02, i * 0.22));
    return new THREE.LatheGeometry(pts, 12);
  }, []);
  const mat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#ffd9a8', emissive: '#ffb36b', emissiveIntensity: 2.2, roughness: 0.6, side: THREE.DoubleSide, toneMapped: false }), []);
  const data = useMemo(() => {
    const r = mulberry32(seed);
    return Array.from({ length: count }, () => ({ x: (r() - 0.5) * spread[0], z: (r() - 0.5) * spread[1], o: r() * rise, s: 0.5 + r() * 0.6, ph: r() * 6, hue: r() }));
  }, [count, spread, rise, seed]);
  const colorsSet = useRef(false);
  const o = useMemo(() => new THREE.Object3D(), []);
  useFrame((s) => {
    const mesh = ref.current;
    if (!mesh) return;
    const t = s.clock.elapsedTime;
    if (!colorsSet.current) {
      const c = new THREE.Color();
      data.forEach((d, i) => mesh.setColorAt(i, c.setHSL(0.03 + d.hue * 0.9 * 0.12, 0.8, 0.8)));
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
      colorsSet.current = true;
    }
    data.forEach((d, i) => {
      const y = (d.o + t * 0.6 * d.s) % rise;
      const fade = Math.min(1, y / 3) * Math.min(1, (rise - y) / 4);
      o.position.set(center[0] + d.x + Math.sin(t * 0.3 + d.ph) * 1.2, center[1] + y, center[2] + d.z + Math.cos(t * 0.25 + d.ph) * 1.2);
      o.rotation.set(Math.sin(t + d.ph) * 0.08, t * 0.2 + d.ph, Math.cos(t * 0.8 + d.ph) * 0.08);
      o.scale.setScalar(d.s * Math.max(0.001, fade));
      o.updateMatrix();
      mesh.setMatrixAt(i, o.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
  });
  return <instancedMesh ref={ref} args={[geo, mat, count]} frustumCulled={false} />;
}
