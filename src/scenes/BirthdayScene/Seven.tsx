import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { Sparkles } from '@react-three/drei';
import { celebrationAge } from './Cake';

/** An original serif “7”: flared top bar with a drop terminal and a tapered, curved stem. */
function sevenShape() {
  const s = new THREE.Shape();
  s.moveTo(-1.15, 1.6);
  s.lineTo(1.25, 1.6);
  s.lineTo(1.3, 1.25);
  // stem sweeps down-left with a gentle S curve
  s.bezierCurveTo(0.55, 0.45, 0.05, -0.55, -0.05, -1.6);
  s.lineTo(-0.62, -1.6);
  s.bezierCurveTo(-0.45, -0.6, 0.15, 0.4, 0.78, 1.18);
  s.lineTo(-0.72, 1.18);
  // drop terminal under the left of the bar
  s.bezierCurveTo(-0.9, 1.18, -1.1, 1.0, -1.18, 0.82);
  s.lineTo(-1.32, 0.86);
  s.bezierCurveTo(-1.28, 1.15, -1.22, 1.4, -1.15, 1.6);
  return s;
}

export function SevenMonument({ position }: { position: [number, number, number] }) {
  const group = useRef<THREE.Group>(null);
  const geo = useMemo(() => {
    const g = new THREE.ExtrudeGeometry(sevenShape(), { depth: 0.38, bevelEnabled: true, bevelThickness: 0.09, bevelSize: 0.06, bevelSegments: 6, curveSegments: 32 });
    g.center();
    return g;
  }, []);
  const mat = useMemo(() => new THREE.MeshPhysicalMaterial({ color: '#e9c983', metalness: 1, roughness: 0.18, clearcoat: 0.6, clearcoatRoughness: 0.15, emissive: '#5a3d16', emissiveIntensity: 0.15 }), []);
  useFrame((st) => {
    const t = st.clock.elapsedTime;
    const age = celebrationAge(performance.now() / 1000);
    const spin = age >= 0 && age < 2.4 ? Math.sin((age / 2.4) * Math.PI) * Math.PI * 2 * (age / 2.4) : 0;
    if (group.current) {
      group.current.position.y = position[1] + Math.sin(t * 0.8) * 0.25;
      group.current.rotation.y = Math.sin(t * 0.4) * 0.35 + spin;
    }
    mat.emissiveIntensity = 0.15 + (age >= 0 ? Math.max(0, 1 - age / 4) * 0.8 : 0);
  });
  return (
    <group ref={group} position={position}>
      <mesh geometry={geo} material={mat} scale={1.6} castShadow />
      <Sparkles count={40} scale={[5, 6, 3]} size={4} speed={0.4} color="#ffe9b8" opacity={0.8} />
    </group>
  );
}
