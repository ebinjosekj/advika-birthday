import { useLayoutEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { applyWind } from './uniforms';
import { islandSurface, type FlatZone } from './Island';
import { mulberry32 } from '../../utils/random';

type V3 = [number, number, number];

export interface Scatter {
  center: V3;
  radius: number;
  seed: number;
  /** keep-out circles in local island space */
  avoid?: { x: number; z: number; r: number }[];
  /** limit to an inner radius fraction */
  maxR?: number;
  flat?: readonly FlatZone[];
}

/** Points on an island top, using the same height function as the island mesh. */
export function scatterOnIsland(s: Scatter, count: number, rng = mulberry32(s.seed * 13 + count)) {
  const surf = islandSurface(s.seed, s.radius, s.flat);
  const pts: { x: number; y: number; z: number; r: number }[] = [];
  let guard = 0;
  while (pts.length < count && guard++ < count * 20) {
    const a = rng() * Math.PI * 2;
    const rr = Math.sqrt(rng()) * s.radius * (s.maxR ?? 0.86);
    const x = Math.cos(a) * rr, z = Math.sin(a) * rr;
    if (s.avoid?.some((k) => Math.hypot(x - k.x, z - k.z) < k.r)) continue;
    pts.push({ x: s.center[0] + x, y: s.center[1] + surf(x, z), z: s.center[2] + z, r: rng() });
  }
  return pts;
}

/** Instanced grass blades that bend from the root, coloured by meadow position. */
export function Grass({ areas, count }: { areas: Scatter[]; count: number }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const geo = useMemo(() => {
    const g = new THREE.PlaneGeometry(0.12, 0.9, 1, 4);
    g.translate(0, 0.45, 0);
    const p = g.getAttribute('position') as THREE.BufferAttribute;
    for (let i = 0; i < p.count; i++) {
      const y = p.getY(i) / 0.9;
      p.setX(i, p.getX(i) * (1 - y * 0.92)); // taper to a point
      p.setZ(i, y * y * 0.18); // natural curl
    }
    g.computeVertexNormals();
    return g;
  }, []);
  const mat = useMemo(
    () => applyWind(new THREE.MeshStandardMaterial({ side: THREE.DoubleSide, roughness: 0.85 }), { strength: 0.32, height: 0.9 }),
    [],
  );
  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const e = new THREE.Euler();
    const col = new THREE.Color();
    const palette = ['#a7cf9f', '#bfe3cf', '#cfe6a8', '#94c09a', '#d9e8b4'].map((c) => new THREE.Color(c));
    let n = 0;
    const per = Math.ceil(count / areas.length);
    areas.forEach((a) => {
      const pts = scatterOnIsland(a, per);
      const rng = mulberry32(a.seed * 3);
      pts.forEach((pt) => {
        if (n >= count) return;
        e.set((rng() - 0.5) * 0.3, rng() * Math.PI * 2, (rng() - 0.5) * 0.3);
        q.setFromEuler(e);
        const s = 0.6 + rng() * 0.9;
        m.compose(new THREE.Vector3(pt.x, pt.y - 0.05, pt.z), q, new THREE.Vector3(s, s * (0.8 + rng() * 0.8), s));
        mesh.setMatrixAt(n, m);
        col.copy(palette[Math.floor(rng() * palette.length)]).offsetHSL(0, 0, (rng() - 0.5) * 0.06);
        mesh.setColorAt(n, col);
        n++;
      });
    });
    mesh.count = n;
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }, [areas, count]);
  return <instancedMesh ref={ref} args={[geo, mat, count]} frustumCulled={false} receiveShadow />;
}

/** Five-petal flower (petals + golden centre) merged into one geometry. */
export function makeFlowerGeometry() {
  const parts: THREE.BufferGeometry[] = [];
  for (let i = 0; i < 5; i++) {
    const p = new THREE.SphereGeometry(0.11, 8, 6);
    p.scale(1, 0.25, 0.55);
    p.translate(0.11, 0, 0);
    p.rotateY((i / 5) * Math.PI * 2);
    p.rotateZ(0.0);
    parts.push(p);
  }
  const petals = mergeGeometries(parts)!;
  petals.translate(0, 0.42, 0);
  const stem = new THREE.CylinderGeometry(0.012, 0.016, 0.42, 4);
  stem.translate(0, 0.21, 0);
  const centre = new THREE.SphereGeometry(0.045, 8, 6);
  centre.translate(0, 0.44, 0);
  // vertex colours: petals white (tinted by instance colour), centre gold, stem green
  const tint = (g: THREE.BufferGeometry, c: string) => {
    const col = new THREE.Color(c);
    const n = g.getAttribute('position').count;
    const arr = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) arr.set([col.r, col.g, col.b], i * 3);
    g.setAttribute('color', new THREE.BufferAttribute(arr, 3));
    g.deleteAttribute('uv');
    return g;
  };
  return mergeGeometries([tint(petals, '#ffffff'), tint(stem.toNonIndexed().index ? stem : stem, '#7fae7f'), tint(centre, '#f2cf7a')].map((g) => (g.index ? g.toNonIndexed() : g)))!;
}

export const PASTELS = ['#c9b6e8', '#f2b8c6', '#a9c6e3', '#bfe3cf', '#fbf5ea', '#f4c7a9', '#e6cc94'];

export function Flowers({ areas, count, glow = 0, scale = 1 }: { areas: Scatter[]; count: number; glow?: number; scale?: number }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const geo = useMemo(() => makeFlowerGeometry(), []);
  const mat = useMemo(
    () =>
      applyWind(
        new THREE.MeshStandardMaterial({
          vertexColors: true,
          roughness: 0.6,
          emissive: new THREE.Color(glow > 0 ? '#ffd6f0' : '#000000'),
          emissiveIntensity: glow,
        }),
        { strength: 0.08, height: 0.45 },
      ),
    [glow],
  );
  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const col = new THREE.Color();
    let n = 0;
    const per = Math.ceil(count / areas.length);
    areas.forEach((a) => {
      const rng = mulberry32(a.seed * 7 + 1);
      scatterOnIsland(a, per).forEach((pt) => {
        if (n >= count) return;
        q.setFromEuler(new THREE.Euler((rng() - 0.5) * 0.4, rng() * 6.28, (rng() - 0.5) * 0.4));
        const s = (0.7 + rng() * 0.8) * scale;
        m.compose(new THREE.Vector3(pt.x, pt.y - 0.02, pt.z), q, new THREE.Vector3(s, s, s));
        mesh.setMatrixAt(n, m);
        mesh.setColorAt(n, col.set(PASTELS[Math.floor(rng() * PASTELS.length)]));
        n++;
      });
    });
    mesh.count = n;
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }, [areas, count, scale]);
  return <instancedMesh ref={ref} args={[geo, mat, count]} frustumCulled={false} />;
}

/** Stylised fantasy trees: curved tapered trunk + clustered blossom canopies that sway. */
export function Trees({ areas, count, palette = ['#f2b8c6', '#c9b6e8', '#bfe3cf', '#f6d2b8'] }: { areas: Scatter[]; count: number; palette?: string[] }) {
  const trunks = useRef<THREE.InstancedMesh>(null);
  const canopy = useRef<THREE.InstancedMesh>(null);
  const BLOBS = 6;
  const trunkGeo = useMemo(() => {
    const g = new THREE.CylinderGeometry(0.16, 0.42, 4, 8, 6);
    g.translate(0, 2, 0);
    const p = g.getAttribute('position') as THREE.BufferAttribute;
    for (let i = 0; i < p.count; i++) {
      const y = p.getY(i) / 4;
      p.setX(i, p.getX(i) + Math.sin(y * 2.2) * 0.35 * y);
    }
    g.computeVertexNormals();
    return g;
  }, []);
  const blobGeo = useMemo(() => {
    const g = new THREE.IcosahedronGeometry(1, 2);
    const p = g.getAttribute('position') as THREE.BufferAttribute;
    const rng = mulberry32(5);
    for (let i = 0; i < p.count; i++) {
      const k = 1 + (rng() - 0.5) * 0.14;
      p.setXYZ(i, p.getX(i) * k, p.getY(i) * k, p.getZ(i) * k);
    }
    g.computeVertexNormals();
    return g;
  }, []);
  const trunkMat = useMemo(() => applyWind(new THREE.MeshStandardMaterial({ color: '#8f7280', roughness: 0.9 }), { strength: 0.05, height: 4 }), []);
  const canopyMat = useMemo(
    () => applyWind(new THREE.MeshStandardMaterial({ roughness: 0.75, flatShading: false }), { strength: 0.22, height: 6, flutter: 0.03 }),
    [],
  );
  useLayoutEffect(() => {
    const t = trunks.current, c = canopy.current;
    if (!t || !c) return;
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const col = new THREE.Color();
    let n = 0;
    const per = Math.ceil(count / areas.length);
    areas.forEach((a) => {
      const rng = mulberry32(a.seed * 17);
      scatterOnIsland(a, per, mulberry32(a.seed * 19)).forEach((pt) => {
        if (n >= count) return;
        const s = 0.8 + rng() * 0.8;
        const yaw = rng() * Math.PI * 2;
        q.setFromEuler(new THREE.Euler(0, yaw, 0));
        m.compose(new THREE.Vector3(pt.x, pt.y - 0.2, pt.z), q, new THREE.Vector3(s, s, s));
        t.setMatrixAt(n, m);
        const base = new THREE.Color(palette[Math.floor(rng() * palette.length)]);
        for (let b = 0; b < BLOBS; b++) {
          const ang = (b / BLOBS) * Math.PI * 2 + rng();
          const rad = b === 0 ? 0 : 0.9 + rng() * 0.6;
          const bs = (b === 0 ? 1.7 : 1.0 + rng() * 0.6) * s;
          const off = new THREE.Vector3(Math.cos(ang + yaw) * rad * s + 0.35 * s, (4 + (b === 0 ? 0.6 : rng() * 0.9)) * s, Math.sin(ang + yaw) * rad * s);
          m.compose(new THREE.Vector3(pt.x + off.x, pt.y - 0.2 + off.y, pt.z + off.z), q, new THREE.Vector3(bs, bs * 0.85, bs));
          c.setMatrixAt(n * BLOBS + b, m);
          c.setColorAt(n * BLOBS + b, col.copy(base).offsetHSL((rng() - 0.5) * 0.03, 0, (rng() - 0.5) * 0.1));
        }
        n++;
      });
    });
    t.count = n;
    c.count = n * BLOBS;
    t.instanceMatrix.needsUpdate = true;
    c.instanceMatrix.needsUpdate = true;
    if (c.instanceColor) c.instanceColor.needsUpdate = true;
  }, [areas, count, palette]);
  return (
    <group>
      <instancedMesh ref={trunks} args={[trunkGeo, trunkMat, count]} castShadow frustumCulled={false} />
      <instancedMesh ref={canopy} args={[blobGeo, canopyMat, count * BLOBS]} castShadow frustumCulled={false} />
    </group>
  );
}
