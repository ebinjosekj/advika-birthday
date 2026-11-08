import { useMemo } from 'react';
import * as THREE from 'three';
import { makeNoise3 } from '../../utils/random';
import { useAssetTexture } from './assets';

/** Height of an island's top surface at local (x,z); shared by placement code. */
export interface FlatZone {
  x: number;
  z: number;
  r: number;
  h: number;
}

export function islandSurface(seed: number, radius: number, flat: readonly FlatZone[] = []) {
  const noise = makeNoise3(seed);
  return (x: number, z: number) => {
    const r = Math.hypot(x, z) / radius;
    const dome = (1 - r * r) * 1.1;
    let h = dome + noise(x * 0.06, 0, z * 0.06, 3) * 1.4 - Math.max(0, r - 0.85) * 6;
    for (const f of flat) {
      const d = Math.hypot(x - f.x, z - f.z) / f.r;
      const w = d < 1 ? 1 : d < 1.6 ? 1 - (d - 1) / 0.6 : 0;
      const ww = w * w * (3 - 2 * w);
      h = h * (1 - ww) + f.h * ww;
    }
    return h;
  };
}

/**
 * Floating island: a displaced icosphere whose upper half is flattened into a
 * gently rolling meadow and whose lower half is stretched into a stalactite of
 * layered, eroded rock. Vertex colours carry grass → soil → strata.
 */
export function makeIslandGeometry(radius: number, depth: number, seed: number, flat: readonly FlatZone[] = []) {
  const g = new THREE.IcosahedronGeometry(1, 30);
  const noise = makeNoise3(seed);
  const surf = islandSurface(seed, radius, flat);
  const pos = g.getAttribute('position') as THREE.BufferAttribute;
  const colors = new Float32Array(pos.count * 3);
  const grassA = new THREE.Color('#6d8a47');
  const grassB = new THREE.Color('#9aae63');
  const soil = new THREE.Color('#6e5a46');
  const rockA = new THREE.Color('#a39586');
  const rockB = new THREE.Color('#7f736a');
  const rockC = new THREE.Color('#5d5752');
  const c = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
    const ang = Math.atan2(z, x);
    const rim = 1 + noise(Math.cos(ang) * 2, Math.sin(ang) * 2, seed, 3) * 0.16;
    if (y >= 0) {
      const rr = Math.min(1, Math.hypot(x, z) * rim);
      const px = (x / Math.max(1e-4, Math.hypot(x, z))) * rr * radius;
      const pz = (z / Math.max(1e-4, Math.hypot(x, z))) * rr * radius;
      const h = surf(px, pz) - y * (1 - rr) * 0.0;
      pos.setXYZ(i, px, h - Math.pow(Math.max(0, rr - 0.92) / 0.08, 2) * 1.2, pz);
      const n = noise(px * 0.08, 7, pz * 0.08, 2) * 0.5 + 0.5;
      c.copy(grassA).lerp(grassB, n);
      if (rr > 0.94) c.lerp(soil, (rr - 0.94) / 0.06);
    } else {
      const t = -y; // 0 at rim → 1 at bottom tip
      const taper = Math.pow(1 - t, 0.85) * 0.95 + 0.05;
      const strata = noise(x * 2, t * 9, z * 2, 3);
      const rr = taper * rim * (1 + strata * 0.18);
      const ry = -Math.pow(t, 0.9) * depth * (1 + noise(x * 3, 0, z * 3, 2) * 0.25);
      pos.setXYZ(i, x * radius * rr, ry - 0.6, z * radius * rr);
      const band = Math.sin(ry * 1.4 + strata * 3) * 0.5 + 0.5;
      c.copy(soil).lerp(rockA, Math.min(1, t * 4)).lerp(rockB, band * 0.6).lerp(rockC, Math.pow(t, 1.5) * 0.7);
    }
    colors.set([c.r, c.g, c.b], i * 3);
  }
  g.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  g.computeVertexNormals();
  return g;
}

interface IslandProps {
  position: [number, number, number];
  radius: number;
  depth: number;
  seed: number;
  flat?: readonly FlatZone[];
  receiveShadow?: boolean;
}

export function Island({ position, radius, depth, seed, flat, receiveShadow }: IslandProps) {
  const geo = useMemo(() => makeIslandGeometry(radius, depth, seed, flat), [radius, depth, seed, flat]);
  const rock = useAssetTexture('nRock', { repeat: Math.max(4, Math.round(radius / 3)) });
  return (
    <mesh geometry={geo} position={position} receiveShadow={receiveShadow} castShadow={false}>
      <meshStandardMaterial vertexColors roughness={0.95} metalness={0} normalMap={rock} normalScale={[0.9, 0.9]} envMapIntensity={0.6} />
    </mesh>
  );
}

/** Small decorative far-away islands to give the sky scale. */
export function DistantIslands() {
  const items = useMemo(
    () => [
      { p: [-150, 30, -160], r: 9, d: 14, s: 101 },
      { p: [140, 18, -210], r: 12, d: 18, s: 102 },
      { p: [90, 45, 60], r: 6, d: 9, s: 103 },
      { p: [-120, 12, 90], r: 8, d: 12, s: 104 },
      { p: [60, 60, -320], r: 14, d: 22, s: 105 },
      { p: [-70, 52, -300], r: 7, d: 11, s: 106 },
    ],
    [],
  );
  return (
    <group>
      {items.map((it) => (
        <Island key={it.s} position={it.p as [number, number, number]} radius={it.r} depth={it.d} seed={it.s} />
      ))}
    </group>
  );
}
