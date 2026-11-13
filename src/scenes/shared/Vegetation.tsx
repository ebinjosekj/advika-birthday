import { useLayoutEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { applyWind } from './uniforms';
import { islandSurface, type FlatZone } from './Island';
import { mulberry32 } from '../../utils/random';
import { useAssetTexture } from './assets';

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
    const palette = ['#6f8d4a', '#86a35a', '#9cb46b', '#7a9450', '#a9b878', '#5f7d42'].map((c) => new THREE.Color(c));
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
    enableCulling(mesh, 1.5);
  }, [areas, count]);
  return <instancedMesh ref={ref} args={[geo, mat, count]} receiveShadow />;
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
    enableCulling(mesh, 1.5);
  }, [areas, count, scale]);
  return <instancedMesh ref={ref} args={[geo, mat, count]} />;
}

/** Canvas-painted cluster of leaves (alpha cut-out), tinted per instance. */
function leafClusterTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const x = c.getContext('2d')!;
  const rng = mulberry32(17);
  for (let i = 0; i < 70; i++) {
    const a = rng() * Math.PI * 2;
    const r = Math.sqrt(rng()) * 100;
    const px = 128 + Math.cos(a) * r;
    const py = 128 + Math.sin(a) * r;
    const len = 16 + rng() * 14;
    const rot = rng() * Math.PI * 2;
    const l = 55 + rng() * 40; // value variation → depth and sun flecks
    x.save();
    x.translate(px, py);
    x.rotate(rot);
    x.fillStyle = `hsl(${80 + rng() * 30} ${12 + rng() * 18}% ${l}%)`;
    x.beginPath();
    x.moveTo(0, -len);
    x.quadraticCurveTo(len * 0.55, 0, 0, len);
    x.quadraticCurveTo(-len * 0.55, 0, 0, -len);
    x.fill();
    x.strokeStyle = `rgba(40,50,20,0.35)`;
    x.lineWidth = 1;
    x.beginPath();
    x.moveTo(0, -len * 0.9);
    x.lineTo(0, len * 0.9);
    x.stroke();
    x.restore();
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

function trunkGeometry() {
  const parts: THREE.BufferGeometry[] = [];
  const trunk = new THREE.CylinderGeometry(0.14, 0.38, 4.2, 9, 6);
  trunk.translate(0, 2.1, 0);
  const p = trunk.getAttribute('position') as THREE.BufferAttribute;
  for (let i = 0; i < p.count; i++) {
    const y = p.getY(i) / 4.2;
    p.setX(i, p.getX(i) + Math.sin(y * 2.4) * 0.25 * y);
  }
  parts.push(trunk);
  // three limbs reaching into the crown
  [0, 2.1, 4.2].forEach((yaw, k) => {
    const b = new THREE.CylinderGeometry(0.05, 0.12, 2.2, 6, 1);
    b.translate(0, 1.1, 0);
    b.rotateZ(0.75);
    b.rotateY(yaw + k * 0.3);
    b.translate(0, 2.6 + k * 0.45, 0);
    parts.push(b);
  });
  const g = mergeGeometries(parts.map((x) => x.toNonIndexed()))!;
  g.computeVertexNormals();
  return g;
}

export const FOLIAGE = {
  summer: ['#5f7f3d', '#6f8f47', '#7d9a52', '#4f6d34', '#8aa35e'],
  forest: ['#4c6a3a', '#5a7a44', '#3f5a33', '#6b8650', '#566f3f'],
  blossom: ['#f1c9d2', '#ead7e2', '#f6e3e6', '#7d9a52', '#e9bfcb'],
};

/**
 * Trees with real foliage structure: a curved trunk with limbs (scanned bark
 * normal map) and a crown built from dozens of alpha-cut leaf clusters, so light
 * breaks up through the canopy instead of reading as smooth balls. Leaves flutter
 * in the same wind field as the grass.
 */
export function Trees({ areas, count, palette = FOLIAGE.summer }: { areas: Scatter[]; count: number; palette?: string[] }) {
  const trunks = useRef<THREE.InstancedMesh>(null);
  const leaves = useRef<THREE.InstancedMesh>(null);
  const CARDS = 34;
  const bark = useAssetTexture('nBark', { repeat: 2 });
  const trunkGeo = useMemo(() => trunkGeometry(), []);
  const cardGeo = useMemo(() => new THREE.PlaneGeometry(1.7, 1.7), []);
  const trunkMat = useMemo(
    () => applyWind(new THREE.MeshStandardMaterial({ color: '#5b4a3e', roughness: 0.95, normalMap: bark, normalScale: new THREE.Vector2(1.2, 1.2) }), { strength: 0.04, height: 4 }),
    [bark],
  );
  const leafMat = useMemo(
    () =>
      applyWind(
        new THREE.MeshStandardMaterial({ map: leafClusterTexture(), alphaTest: 0.45, side: THREE.DoubleSide, roughness: 0.78, envMapIntensity: 0.5 }),
        { strength: 0.18, height: 1, flutter: 0.04 },
      ),
    [],
  );
  useLayoutEffect(() => {
    const t = trunks.current, c = leaves.current;
    if (!t || !c) return;
    const m = new THREE.Matrix4();
    const o = new THREE.Object3D();
    const col = new THREE.Color();
    let n = 0;
    const per = Math.ceil(count / areas.length);
    areas.forEach((a) => {
      const rng = mulberry32(a.seed * 17);
      scatterOnIsland(a, per, mulberry32(a.seed * 19)).forEach((pt) => {
        if (n >= count) return;
        const s = 0.85 + rng() * 0.75;
        const yaw = rng() * Math.PI * 2;
        o.position.set(pt.x, pt.y - 0.25, pt.z);
        o.rotation.set(0, yaw, 0);
        o.scale.setScalar(s);
        o.updateMatrix();
        t.setMatrixAt(n, o.matrix);
        const base = new THREE.Color(palette[Math.floor(rng() * palette.length)]);
        // crown: an irregular ellipsoid, denser toward the outside where light hits
        const cy = 4.6 * s, rx = 2.3 * s, ry = 1.7 * s;
        for (let k = 0; k < CARDS; k++) {
          const u = rng() * Math.PI * 2;
          const v = Math.acos(2 * rng() - 1);
          const rr = 0.55 + Math.pow(rng(), 0.5) * 0.45;
          const dx = Math.sin(v) * Math.cos(u) * rx * rr + Math.sin(yaw) * 0.3 * s;
          const dy = Math.cos(v) * ry * rr;
          const dz = Math.sin(v) * Math.sin(u) * rx * rr;
          o.position.set(pt.x + dx, pt.y - 0.25 + cy + dy, pt.z + dz);
          o.lookAt(pt.x + dx * 2, pt.y + cy + dy * 2 + 0.6, pt.z + dz * 2);
          o.rotateZ(rng() * Math.PI * 2);
          o.rotateX((rng() - 0.5) * 0.9);
          o.scale.setScalar(s * (0.75 + rng() * 0.5));
          o.updateMatrix();
          c.setMatrixAt(n * CARDS + k, o.matrix);
          // inner leaves sit in shade; outer ones catch the sun
          const shade = 0.62 + rr * 0.45 + (dy > 0 ? 0.1 : -0.08);
          c.setColorAt(n * CARDS + k, col.copy(base).multiplyScalar(shade).offsetHSL((rng() - 0.5) * 0.02, 0, 0));
        }
        n++;
      });
    });
    t.count = n;
    c.count = n * CARDS;
    t.instanceMatrix.needsUpdate = true;
    c.instanceMatrix.needsUpdate = true;
    if (c.instanceColor) c.instanceColor.needsUpdate = true;
    enableCulling(t, 2);
    enableCulling(c, 3);
    void m;
  }, [areas, count, palette]);
  return (
    <group>
      <instancedMesh ref={trunks} args={[trunkGeo, trunkMat, count]} castShadow receiveShadow />
      <instancedMesh ref={leaves} args={[cardGeo, leafMat, count * CARDS]} receiveShadow />
    </group>
  );
}

/**
 * Each island's grass, flowers and trees are one instanced draw. Give it a bounding
 * sphere around its real instances (plus room for wind sway) so three.js skips the
 * whole batch when that island is off screen — or outside the shadow camera.
 */
function enableCulling(mesh: THREE.InstancedMesh, pad: number) {
  mesh.boundingSphere = null;
  mesh.computeBoundingSphere();
  if (mesh.boundingSphere) (mesh.boundingSphere as THREE.Sphere).radius += pad;
  mesh.frustumCulled = true;
}
