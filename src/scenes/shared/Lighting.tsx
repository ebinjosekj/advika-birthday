import { useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Environment, Lightformer } from '@react-three/drei';
import * as THREE from 'three';
import { world } from '../../app/store';
import type { QualityProfile } from '../../utils/quality';

const dayFog = new THREE.Color('#f3dfe0');
const nightFog = new THREE.Color('#3e3466');
const daySun = new THREE.Color('#ffd7a8');
const nightSun = new THREE.Color('#aab8ff');

/** Sun ↔ moon key light, hemisphere fill, and fog — all keyed to world.mood. */
export function Lighting({ q }: { q: QualityProfile }) {
  const sun = useRef<THREE.DirectionalLight>(null);
  const hemi = useRef<THREE.HemisphereLight>(null);
  const { scene, camera } = useThree();
  useFrame(() => {
    const m = world.mood;
    if (scene.fog instanceof THREE.FogExp2) {
      scene.fog.color.copy(dayFog).lerp(nightFog, m);
      scene.fog.density = 0.0019 + m * 0.0009;
    }
    if (sun.current) {
      sun.current.color.copy(daySun).lerp(nightSun, m);
      sun.current.intensity = 3.2 - m * 2.3;
      // shadow frustum follows the camera's focus area
      sun.current.position.set(camera.position.x - 60, camera.position.y + 70, camera.position.z - 40);
      sun.current.target.position.set(camera.position.x, 0, camera.position.z - 30);
      sun.current.target.updateMatrixWorld();
    }
    if (hemi.current) hemi.current.intensity = 1.25 - m * 0.55;
  });
  return (
    <>
      <fogExp2 attach="fog" args={['#f3dfe0', 0.0019]} />
      <hemisphereLight ref={hemi} args={['#e9dcff', '#c8e6d0', 1.2]} />
      <ambientLight intensity={0.15} color="#ffe9f2" />
      <directionalLight
        ref={sun}
        castShadow={q.shadows}
        intensity={3}
        shadow-mapSize={[q.shadowMapSize, q.shadowMapSize]}
        shadow-camera-left={-50}
        shadow-camera-right={50}
        shadow-camera-top={50}
        shadow-camera-bottom={-50}
        shadow-camera-near={1}
        shadow-camera-far={260}
        shadow-bias={-0.0004}
        shadow-normalBias={0.04}
      />
      {/* local, file-free environment map for gold & glossy reflections */}
      <Environment resolution={128} frames={1} background={false}>
        <Lightformer intensity={2.2} color="#ffe2c0" position={[0, 6, -8]} scale={[12, 4, 1]} />
        <Lightformer intensity={1.4} color="#d9c8ff" position={[-8, 2, 4]} scale={[6, 6, 1]} rotation-y={Math.PI / 3} />
        <Lightformer intensity={1.2} color="#bfe3cf" position={[8, -2, 2]} scale={[6, 3, 1]} rotation-y={-Math.PI / 3} />
        <Lightformer form="ring" intensity={3} color="#fff4e0" position={[0, 8, 6]} scale={2} />
      </Environment>
    </>
  );
}
