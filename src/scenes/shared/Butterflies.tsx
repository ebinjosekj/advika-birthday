import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { wingTexture } from './textures';
import { mulberry32 } from '../../utils/random';

type V3 = [number, number, number];

export interface SwarmProps {
  count: number;
  center: V3;
  radius: number;
  height?: number;
  /** points butterflies visit and rest on */
  perches?: V3[];
  colors?: string[];
  scale?: number;
  seed?: number;
  /** if set, butterflies are hidden until this returns >0 and burst out from `origin` */
  activation?: () => number;
  origin?: V3;
}

const tmpObj = new THREE.Object3D();
const wingObj = new THREE.Object3D();
const up = new THREE.Vector3(0, 1, 0);

function wingGeometry(side: 1 | -1, lower: boolean) {
  const g = new THREE.PlaneGeometry(1, 1, 4, 1);
  g.translate(0.5, 0, 0);
  if (lower) g.scale(0.72, 0.8, 1).translate(0, -0.28, 0);
  g.rotateX(-Math.PI / 2);
  if (side === -1) g.scale(-1, 1, 1);
  return g;
}

/**
 * Butterflies with steering-based flight: they meander, bank into turns, glide
 * between flap bursts, and land on perches (flowers) where they slowly fan
 * their wings. Four instanced draws for the whole swarm.
 */
export function ButterflySwarm({ count, center, radius, height = 4, perches = [], colors = ['#f2b8c6', '#c9b6e8', '#a9c6e3', '#f4c7a9', '#bfe3cf'], scale = 0.45, seed = 3, activation, origin }: SwarmProps) {
  const refs = [useRef<THREE.InstancedMesh>(null), useRef<THREE.InstancedMesh>(null), useRef<THREE.InstancedMesh>(null), useRef<THREE.InstancedMesh>(null)];
  const body = useRef<THREE.InstancedMesh>(null);
  const { geos, mat, bodyGeo, bodyMat } = useMemo(() => {
    const tex = wingTexture('#ffffff', '#efe6ff');
    return {
      geos: [wingGeometry(1, false), wingGeometry(-1, false), wingGeometry(1, true), wingGeometry(-1, true)],
      mat: new THREE.MeshStandardMaterial({ map: tex, transparent: true, alphaTest: 0.35, side: THREE.DoubleSide, roughness: 0.55, emissive: '#3a2a4e', emissiveIntensity: 0.08 }),
      bodyGeo: new THREE.CapsuleGeometry(0.05, 0.5, 3, 6).rotateX(Math.PI / 2),
      bodyMat: new THREE.MeshStandardMaterial({ color: '#4b3a5c', roughness: 0.6 }),
    };
  }, []);
  const state = useMemo(() => {
    const rng = mulberry32(seed);
    return Array.from({ length: count }, () => ({
      p: new THREE.Vector3(center[0] + (rng() - 0.5) * radius, center[1] + rng() * height, center[2] + (rng() - 0.5) * radius),
      v: new THREE.Vector3((rng() - 0.5) * 2, 0, (rng() - 0.5) * 2),
      target: new THREE.Vector3(),
      rest: 0,
      phase: rng() * 10,
      freq: 9 + rng() * 6,
      speed: 1.2 + rng() * 1.6,
      color: new THREE.Color(colors[Math.floor(rng() * colors.length)]),
      rng: mulberry32(Math.floor(rng() * 1e9)),
      started: false,
      pitch: 0,
    }));
  }, [count, center, radius, height, colors, seed]);

  const colored = useRef(false);
  const pickTarget = (b: (typeof state)[number]) => {
    const r = b.rng();
    if (perches.length && r < 0.35) {
      const pp = perches[Math.floor(b.rng() * perches.length)];
      b.target.set(pp[0], pp[1] + 0.12, pp[2]);
      return;
    }
    b.target.set(center[0] + (b.rng() - 0.5) * radius * 2, center[1] + b.rng() * height, center[2] + (b.rng() - 0.5) * radius * 2);
  };

  useFrame((s, dtRaw) => {
    const dt = Math.min(dtRaw, 0.05);
    const time = s.clock.elapsedTime;
    const act = activation ? activation() : 1;
    const meshes = refs.map((r) => r.current);
    if (meshes.some((m) => !m) || !body.current) return;
    if (!colored.current) {
      state.forEach((b, i) => meshes.forEach((m) => m!.setColorAt(i, b.color)));
      meshes.forEach((m) => m!.instanceColor && (m!.instanceColor.needsUpdate = true));
      colored.current = true;
    }
    state.forEach((b, i) => {
      let visible = act > 0;
      if (activation && origin) {
        if (act <= 0) b.started = false;
        else if (!b.started) {
          b.started = true;
          b.p.set(origin[0], origin[1], origin[2]);
          b.v.set((b.rng() - 0.5) * 6, 3 + b.rng() * 3, (b.rng() - 0.5) * 6);
          b.rest = 0;
          pickTarget(b);
        }
      }
      let flap: number;
      if (b.rest > 0) {
        b.rest -= dt;
        b.v.multiplyScalar(0.8);
        flap = 0.3 + Math.sin(time * 2 + b.phase) * 0.35; // slow fanning while perched
        if (b.rest <= 0) pickTarget(b);
      } else {
        const to = b.target.clone().sub(b.p);
        const d = to.length();
        if (b.target.lengthSq() === 0 || d < 0.25) {
          const atPerch = perches.some((pp) => Math.abs(pp[0] - b.target.x) + Math.abs(pp[2] - b.target.z) < 0.01);
          if (atPerch && d < 0.25) b.rest = 2 + b.rng() * 4;
          else pickTarget(b);
        }
        to.normalize().multiplyScalar(b.speed);
        // meander: lateral wobble + vertical bob from flap bursts
        to.x += Math.sin(time * 1.7 + b.phase) * 0.9;
        to.y += Math.sin(time * 3.1 + b.phase * 2) * 0.8;
        b.v.lerp(to, 1 - Math.exp(-dt * 2.2));
        b.p.addScaledVector(b.v, dt);
        const burst = Math.sin(time * 0.9 + b.phase) > -0.3; // glide phases
        flap = burst ? Math.sin(time * b.freq + b.phase) * 0.95 + 0.25 : 0.15 + Math.sin(time * 2 + b.phase) * 0.1;
      }
      tmpObj.position.copy(b.p);
      const hv = new THREE.Vector3(b.v.x, 0, b.v.z);
      if (hv.lengthSq() > 1e-4) tmpObj.rotation.set(0, Math.atan2(hv.x, hv.z), 0);
      b.pitch += ((-b.v.y * 0.15) - b.pitch) * 0.1;
      tmpObj.rotateX(b.pitch);
      tmpObj.rotateZ(Math.sin(time * 1.7 + b.phase) * 0.25);
      const sc = visible ? scale : 0.0001;
      tmpObj.scale.setScalar(sc);
      tmpObj.updateMatrix();
      body.current!.setMatrixAt(i, tmpObj.matrix);
      [flap, -flap, flap * 0.85 - 0.1, -(flap * 0.85 - 0.1)].forEach((ang, k) => {
        wingObj.matrix.makeRotationAxis(new THREE.Vector3(0, 0, 1), ang);
        const m = tmpObj.matrix.clone().multiply(wingObj.matrix);
        meshes[k]!.setMatrixAt(i, m);
      });
      visible = visible && true;
    });
    meshes.forEach((m) => (m!.instanceMatrix.needsUpdate = true));
    body.current.instanceMatrix.needsUpdate = true;
  });
  void up;
  return (
    <group>
      {geos.map((g, k) => (
        <instancedMesh key={k} ref={refs[k]} args={[g, mat, count]} frustumCulled={false} />
      ))}
      <instancedMesh ref={body} args={[bodyGeo, bodyMat, count]} frustumCulled={false} />
    </group>
  );
}
