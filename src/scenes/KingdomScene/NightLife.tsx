import { useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { glowTexture } from '../shared/textures';
import { useAssetTexture } from '../shared/assets';
import { emitBurst } from '../../animations/particleEffects/bursts';
import { useMagic, world } from '../../app/store';
import { mulberry32 } from '../../utils/random';
import { orbitSparkles } from '../OpeningScene/Book';

const MOON_DIR = new THREE.Vector3(0.35, 0.42, -1).normalize();
const scratch = new THREE.Vector3();

/** A large rising moon with a painted surface and a soft halo. */
export function Moon() {
  const tex = useMemo(() => {
    const c = document.createElement('canvas');
    c.width = c.height = 256;
    const x = c.getContext('2d')!;
    x.fillStyle = '#f4f1ea';
    x.fillRect(0, 0, 256, 256);
    const r = mulberry32(4);
    for (let i = 0; i < 40; i++) {
      const px = r() * 256, py = r() * 256, rr = 6 + r() * 30;
      const grad = x.createRadialGradient(px, py, 0, px, py, rr);
      grad.addColorStop(0, `rgba(150,150,170,${0.18 + r() * 0.2})`);
      grad.addColorStop(1, 'rgba(150,150,170,0)');
      x.fillStyle = grad;
      x.fillRect(px - rr, py - rr, rr * 2, rr * 2);
    }
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }, []);
  const pos = useMemo(() => MOON_DIR.clone().multiplyScalar(780).toArray() as [number, number, number], []);
  return (
    <group position={pos}>
      <mesh>
        <sphereGeometry args={[34, 48, 32]} />
        <meshBasicMaterial map={tex} color="#fffaf0" toneMapped={false} fog={false} />
      </mesh>
      <sprite scale={[260, 260, 1]}>
        <spriteMaterial map={glowTexture()} color="#9fb4ff" transparent opacity={0.32} depthWrite={false} blending={THREE.AdditiveBlending} fog={false} />
      </sprite>
    </group>
  );
}

/** Shooting stars: bright heads with fading tails that streak across the sky every few seconds. */
export function ShootingStars({ count = 3 }) {
  const refs = useRef<(THREE.Mesh | null)[]>([]);
  const mat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        fog: false,
        uniforms: { uA: { value: 0 } },
        vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
        fragmentShader: `uniform float uA; varying vec2 vUv; void main(){ float tail = pow(vUv.x, 3.0); float w = 1.0 - abs(vUv.y-0.5)*2.0; float a = tail * w * w * uA; gl_FragColor = vec4(vec3(1.0,0.96,0.88)*a*2.0, a); }`,
      }),
    [],
  );
  const state = useMemo(() => {
    const r = mulberry32(77);
    return Array.from({ length: count }, (_, i) => ({ start: 2 + i * 3.3, dur: 1.1, from: new THREE.Vector3(), dir: new THREE.Vector3(), mat: mat.clone(), r }));
  }, [count, mat]);
  useFrame((st) => {
    const t = st.clock.elapsedTime;
    state.forEach((s, i) => {
      const m = refs.current[i];
      if (!m) return;
      if (t > s.start + s.dur) {
        s.start = t + 3 + s.r() * 6;
        s.from.set((s.r() - 0.5) * 900, 260 + s.r() * 220, -300 - s.r() * 400);
        s.dir.set(-0.8 - s.r() * 0.4, -0.35 - s.r() * 0.2, 0.1).normalize();
      }
      const k = (t - s.start) / s.dur;
      const on = k >= 0 && k <= 1 && world.mood > 0.8;
      m.visible = true;
      s.mat.uniforms.uA.value = on ? Math.sin(k * Math.PI) : 0;
      m.position.copy(s.from).addScaledVector(s.dir, Math.max(0, k) * 380);
      m.lookAt(scratch.copy(m.position).add(s.dir));
      m.rotateY(Math.PI / 2);
    });
  });
  return (
    <group>
      {state.map((s, i) => (
        <mesh key={i} ref={(el) => void (refs.current[i] = el)} material={s.mat} frustumCulled={false}>
          <planeGeometry args={[70, 1.6]} />
        </mesh>
      ))}
    </group>
  );
}

/** Soft fireworks over the castle while the story is playing. */
export function Fireworks({ origin = [0, 0, -130] as [number, number, number] }) {
  const next = useRef(4);
  const r = useMemo(() => mulberry32(21), []);
  const colors = ['#ffd98a', '#f6b8e6', '#bcd4ff', '#c8f2dc', '#ffe9c4'];
  useFrame((st) => {
    const t = st.clock.elapsedTime;
    const s = useMagic.getState();
    if (t < next.current || s.phase !== 'main' || s.reducedMotion) return;
    next.current = t + 2.6 + r() * 3.2;
    emitBurst([origin[0] + (r() - 0.5) * 70, origin[1] + 52 + r() * 26, origin[2] + (r() - 0.5) * 40], colors[Math.floor(r() * colors.length)], 140, 9);
  });
  return null;
}

/** Glowing crystals crowning the towers, plus a ring of sparkles spiralling the keep. */
export function CastleMagic({ position }: { position: [number, number, number] }) {
  const crystals = useRef<THREE.Group>(null);
  const spots: [number, number, number][] = [
    [0, 45.5, -1],
    [-12, 31.6, 8],
    [12, 31.6, 8],
    [-12, 36.6, -8],
    [12, 36.6, -8],
  ];
  const mat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#d9e6ff', emissive: '#9fc1ff', emissiveIntensity: 2.2, roughness: 0.15, metalness: 0.1, toneMapped: false }), []);
  const orbit = useMemo(() => orbitSparkles(80), []);
  useFrame((st) => {
    const t = st.clock.elapsedTime;
    crystals.current?.children.forEach((c, i) => {
      c.rotation.y = t * 0.6 + i;
      c.position.y = spots[i][1] + Math.sin(t * 1.2 + i) * 0.35;
    });
    mat.emissiveIntensity = 1.8 + Math.sin(t * 2.0) * 0.5;
    orbit.material.uniforms.uT.value = t * 0.6;
  });
  return (
    <group position={position}>
      <group ref={crystals}>
        {spots.map((p, i) => (
          <mesh key={i} position={p} material={mat} scale={i === 0 ? 1.4 : 0.9}>
            <octahedronGeometry args={[0.9, 0]} />
          </mesh>
        ))}
      </group>
      <group position={[0, 30, -1]} scale={3.2}>
        <points geometry={orbit.geometry} material={orbit.material} frustumCulled={false} />
      </group>
    </group>
  );
}

/** Rocks and crystal shards hovering around an island, bobbing on slow independent rhythms. */
export function FloatingDebris({ center, radius, count = 10, seed = 1 }: { center: [number, number, number]; radius: number; count?: number; seed?: number }) {
  const rocks = useRef<THREE.InstancedMesh>(null);
  const shards = useRef<THREE.InstancedMesh>(null);
  const rockNormal = useAssetTexture('nRock', { repeat: 1 });
  const rockMat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#7f746c', roughness: 0.95, normalMap: rockNormal, flatShading: true }), [rockNormal]);
  const shardMat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#efe1ff', emissive: '#c79bff', emissiveIntensity: 1.6, roughness: 0.2, toneMapped: false }), []);
  const data = useMemo(() => {
    const r = mulberry32(seed);
    return Array.from({ length: count }, () => {
      const a = r() * Math.PI * 2;
      const d = radius * (1.05 + r() * 0.35);
      return { x: Math.cos(a) * d, y: -2 - r() * 10, z: Math.sin(a) * d, s: 0.6 + r() * 1.6, ph: r() * 6, sp: 0.3 + r() * 0.4, rx: r(), ry: r() };
    });
  }, [count, radius, seed]);
  const o = useMemo(() => new THREE.Object3D(), []);
  useLayoutEffect(() => {
    if (shards.current) shards.current.count = Math.ceil(count / 2);
  }, [count]);
  useFrame((st) => {
    const t = st.clock.elapsedTime;
    data.forEach((d, i) => {
      o.position.set(center[0] + d.x, center[1] + d.y + Math.sin(t * d.sp + d.ph) * 0.8, center[2] + d.z);
      o.rotation.set(t * 0.1 * d.rx, t * 0.15 * d.ry + d.ph, 0);
      o.scale.setScalar(d.s);
      o.updateMatrix();
      rocks.current?.setMatrixAt(i, o.matrix);
      if (i % 2 === 0 && shards.current) {
        o.position.y += d.s * 0.9;
        o.scale.set(d.s * 0.25, d.s * 0.8, d.s * 0.25);
        o.updateMatrix();
        shards.current.setMatrixAt(i / 2, o.matrix);
      }
    });
    if (rocks.current) rocks.current.instanceMatrix.needsUpdate = true;
    if (shards.current) shards.current.instanceMatrix.needsUpdate = true;
    shardMat.emissiveIntensity = 1.3 + Math.sin(t * 1.6 + seed) * 0.4;
  });
  return (
    <group>
      <instancedMesh ref={rocks} args={[undefined, rockMat, count]} frustumCulled={false}>
        <dodecahedronGeometry args={[1, 0]} />
      </instancedMesh>
      <instancedMesh ref={shards} args={[undefined, shardMat, Math.ceil(count / 2)]} frustumCulled={false}>
        <octahedronGeometry args={[1, 0]} />
      </instancedMesh>
    </group>
  );
}
