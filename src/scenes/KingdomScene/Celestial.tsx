import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { Sparkles } from '@react-three/drei';
import { glowTexture } from '../shared/textures';
import { eventConfig } from '../../config/eventConfig';

/**
 * Celestial clock in the night sky: concentric gold rings, 12 star-gems, and two
 * hands that literally point at the time remaining (days ring + hours hand).
 */
export function CelestialClock({ position }: { position: [number, number, number] }) {
  const g = useRef<THREE.Group>(null);
  const ringA = useRef<THREE.Mesh>(null);
  const ringB = useRef<THREE.Mesh>(null);
  const hourHand = useRef<THREE.Group>(null);
  const minHand = useRef<THREE.Group>(null);
  const secHand = useRef<THREE.Group>(null);
  const gold = useMemo(() => new THREE.MeshStandardMaterial({ color: '#f0d18e', metalness: 1, roughness: 0.25, emissive: '#7a5520', emissiveIntensity: 0.6 }), []);
  const gem = useMemo(() => new THREE.MeshStandardMaterial({ color: '#ffffff', emissive: '#cfe0ff', emissiveIntensity: 3, toneMapped: false }), []);
  const target = useMemo(() => new Date(eventConfig.startISO).getTime(), []);
  useFrame((st) => {
    const t = st.clock.elapsedTime;
    if (ringA.current) ringA.current.rotation.z = t * 0.05;
    if (ringB.current) ringB.current.rotation.z = -t * 0.03;
    const remain = Math.max(0, target - Date.now()) / 1000;
    const h = (remain / 3600) % 12;
    const m = (remain / 60) % 60;
    const s = remain % 60;
    if (hourHand.current) hourHand.current.rotation.z = -(h / 12) * Math.PI * 2;
    if (minHand.current) minHand.current.rotation.z = -(m / 60) * Math.PI * 2;
    if (secHand.current) secHand.current.rotation.z = -(s / 60) * Math.PI * 2;
    if (g.current) g.current.position.y = position[1] + Math.sin(t * 0.3) * 0.6;
  });
  return (
    <group ref={g} position={position} rotation={[0.15, -0.05, 0]}>
      <mesh>
        <sphereGeometry args={[11, 48, 32]} />
        <meshStandardMaterial color="#f5f0ff" emissive="#e8e2ff" emissiveIntensity={0.9} roughness={1} />
      </mesh>
      <sprite scale={[60, 60, 1]}>
        <spriteMaterial map={glowTexture()} color="#cdd6ff" transparent opacity={0.55} depthWrite={false} blending={THREE.AdditiveBlending} />
      </sprite>
      <group position={[0, 0, 12]}>
        <mesh ref={ringA} material={gold}>
          <torusGeometry args={[17, 0.25, 8, 128]} />
        </mesh>
        <mesh ref={ringB} material={gold}>
          <torusGeometry args={[14.5, 0.12, 8, 128]} />
        </mesh>
        {Array.from({ length: 12 }, (_, i) => {
          const a = (i / 12) * Math.PI * 2;
          return (
            <mesh key={i} material={gem} position={[Math.sin(a) * 15.8, Math.cos(a) * 15.8, 0]} rotation={[0, 0, -a]} scale={i % 3 === 0 ? 1.6 : 1}>
              <octahedronGeometry args={[0.45, 0]} />
            </mesh>
          );
        })}
        <group ref={hourHand}>
          <mesh material={gold} position={[0, 4.5, 0]}>
            <boxGeometry args={[0.5, 9, 0.2]} />
          </mesh>
        </group>
        <group ref={minHand} position={[0, 0, 0.2]}>
          <mesh material={gold} position={[0, 6.25, 0]}>
            <boxGeometry args={[0.3, 12.5, 0.2]} />
          </mesh>
        </group>
        <group ref={secHand} position={[0, 0, 0.4]}>
          <mesh position={[0, 6.75, 0]}>
            <boxGeometry args={[0.1, 13.5, 0.1]} />
            <meshStandardMaterial color="#ffd6e6" emissive="#ffb0d0" emissiveIntensity={2} toneMapped={false} />
          </mesh>
        </group>
        <mesh material={gold} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.7, 0.7, 0.8, 24]} />
        </mesh>
      </group>
      <Sparkles count={120} scale={[60, 40, 10]} size={6} speed={0.2} color="#e8ecff" />
    </group>
  );
}

export function HiddenStar({ position, found }: { position: [number, number, number]; found: boolean }) {
  const ref = useRef<THREE.Sprite>(null);
  useFrame((st) => {
    const t = st.clock.elapsedTime;
    if (ref.current) {
      const s = (found ? 7 : 3.4) + Math.sin(t * 3) * 0.8;
      ref.current.scale.set(s, s, 1);
      ref.current.material.rotation = t * 0.2;
    }
  });
  return (
    <sprite ref={ref} position={position}>
      <spriteMaterial map={glowTexture()} color={found ? '#ffe6a6' : '#fff8e8'} transparent depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} />
    </sprite>
  );
}
