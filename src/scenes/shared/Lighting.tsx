import { useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Environment } from '@react-three/drei';
import { useAssetUrl } from './assets';
import * as THREE from 'three';
import { world } from '../../app/store';
import type { QualityProfile } from '../../utils/quality';

const dayFog = new THREE.Color('#cfd6df');
const nightFog = new THREE.Color('#283048');
const daySun = new THREE.Color('#ffd2a1');
const nightSun = new THREE.Color('#9fb2e6');

/** Sun ↔ moon key light, hemisphere fill, and fog — all keyed to world.mood. */
export function Lighting({ q }: { q: QualityProfile }) {
  const sun = useRef<THREE.DirectionalLight>(null);
  const hemi = useRef<THREE.HemisphereLight>(null);
  const { scene, camera } = useThree();
  const hdri = useAssetUrl('hdriSunset');
  useFrame(() => {
    const m = world.mood;
    if (scene.fog instanceof THREE.FogExp2) {
      scene.fog.color.copy(dayFog).lerp(nightFog, m);
      scene.fog.density = 0.0011 + m * 0.0008;
    }
    if (sun.current) {
      sun.current.color.copy(daySun).lerp(nightSun, m);
      sun.current.intensity = 3.2 - m * 2.3;
      // shadow frustum follows the camera's focus area
      sun.current.position.set(camera.position.x - 60, camera.position.y + 70, camera.position.z - 40);
      sun.current.target.position.set(camera.position.x, 0, camera.position.z - 30);
      sun.current.target.updateMatrixWorld();
    }
    if (hemi.current) hemi.current.intensity = 0.55 - m * 0.3;
    // photographic sky lighting fades toward moonlight
    scene.environmentIntensity = 0.95 - m * 0.65;
  });
  return (
    <>
      <fogExp2 attach="fog" args={['#cfd6df', 0.0011]} />
      <hemisphereLight ref={hemi} args={['#dfe6f5', '#8a9a6e', 0.55]} />
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
      {/* CC0 Poly Haven sunset HDRI: real-world reflections and bounce light */}
      <Environment files={hdri} background={false} />
    </>
  );
}
