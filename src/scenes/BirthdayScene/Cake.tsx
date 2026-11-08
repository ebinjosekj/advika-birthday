import { useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { candleTexture } from '../shared/textures';
import { makeFlowerGeometry, PASTELS } from '../shared/Vegetation';
import { globalUniforms } from '../shared/uniforms';
import { useMagic } from '../../app/store';
import { mulberry32 } from '../../utils/random';

const GOLD = '#dcb86e';
const TIERS = [
  { r: 1.55, h: 0.95, color: '#f3c3cf' },
  { r: 1.15, h: 0.85, color: '#d9c8f0' },
  { r: 0.82, h: 0.75, color: '#fbf3e6' },
];

/** Seconds since the visitor last clicked the cake (or −1 if never). */
export function celebrationAge(now: number) {
  const at = useMagic.getState().celebrateAt;
  return at < 0 ? -1 : now - at;
}

function Frosting({ r, h, y, color, seed }: { r: number; h: number; y: number; color: string; seed: number }) {
  const drips = useRef<THREE.InstancedMesh>(null);
  const pearls = useRef<THREE.InstancedMesh>(null);
  const mat = useMemo(() => new THREE.MeshPhysicalMaterial({ color, roughness: 0.42, sheen: 1, sheenColor: new THREE.Color('#ffffff'), sheenRoughness: 0.5, clearcoat: 0.35, clearcoatRoughness: 0.4 }), [color]);
  const icing = useMemo(() => new THREE.MeshPhysicalMaterial({ color: '#fffaf3', roughness: 0.3, clearcoat: 0.6, sheen: 0.6 }), []);
  const gold = useMemo(() => new THREE.MeshStandardMaterial({ color: GOLD, metalness: 1, roughness: 0.22 }), []);
  const nDrips = Math.round(r * 18);
  const nPearls = Math.round(r * 30);
  useLayoutEffect(() => {
    const rng = mulberry32(seed);
    const o = new THREE.Object3D();
    for (let i = 0; i < nDrips; i++) {
      const a = (i / nDrips) * Math.PI * 2 + rng() * 0.1;
      const len = 0.18 + rng() * 0.32;
      o.position.set(Math.cos(a) * (r + 0.015), y + h - len * 0.5, Math.sin(a) * (r + 0.015));
      o.scale.set(0.075, len, 0.075);
      o.updateMatrix();
      drips.current!.setMatrixAt(i, o.matrix);
    }
    drips.current!.instanceMatrix.needsUpdate = true;
    for (let i = 0; i < nPearls; i++) {
      const a = (i / nPearls) * Math.PI * 2;
      o.position.set(Math.cos(a) * (r + 0.05), y + 0.06, Math.sin(a) * (r + 0.05));
      o.scale.setScalar(1);
      o.updateMatrix();
      pearls.current!.setMatrixAt(i, o.matrix);
    }
    pearls.current!.instanceMatrix.needsUpdate = true;
  }, [r, h, y, nDrips, nPearls, seed]);
  return (
    <group>
      <mesh material={mat} position={[0, y + h / 2, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[r, r, h, 64, 1]} />
      </mesh>
      {/* soft rounded top edge */}
      <mesh material={icing} position={[0, y + h, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[r - 0.03, 0.07, 10, 64]} />
      </mesh>
      <mesh material={icing} position={[0, y + h + 0.001, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[r - 0.03, 64]} />
      </mesh>
      <instancedMesh ref={drips} args={[undefined, icing, nDrips]}>
        <capsuleGeometry args={[1, 0.6, 4, 8]} />
      </instancedMesh>
      <instancedMesh ref={pearls} args={[undefined, gold, nPearls]}>
        <sphereGeometry args={[0.045, 10, 8]} />
      </instancedMesh>
    </group>
  );
}

/** Sugar flowers that bloom open (scale + petal tilt) when the cake is clicked. */
function SugarFlowers() {
  const ref = useRef<THREE.InstancedMesh>(null);
  const geo = useMemo(() => makeFlowerGeometry(), []);
  const mat = useMemo(() => new THREE.MeshPhysicalMaterial({ vertexColors: true, roughness: 0.45, sheen: 1 }), []);
  const spots = useMemo(() => {
    const out: { p: THREE.Vector3; n: THREE.Vector3; s: number; c: string; d: number }[] = [];
    const rng = mulberry32(77);
    let y = 0.5;
    TIERS.forEach((t, ti) => {
      const n = 7 + ti * -1;
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2 + ti;
        out.push({ p: new THREE.Vector3(Math.cos(a) * (t.r + 0.02), y + t.h * (0.35 + rng() * 0.3), Math.sin(a) * (t.r + 0.02)), n: new THREE.Vector3(Math.cos(a), 0, Math.sin(a)), s: 0.9 + rng() * 0.5, c: PASTELS[(i + ti * 2) % PASTELS.length], d: rng() * 0.6 });
      }
      y += t.h;
    });
    return out;
  }, []);
  useLayoutEffect(() => {
    const c = new THREE.Color();
    spots.forEach((s, i) => ref.current!.setColorAt(i, c.set(s.c)));
    if (ref.current!.instanceColor) ref.current!.instanceColor.needsUpdate = true;
  }, [spots]);
  const o = useMemo(() => new THREE.Object3D(), []);
  useFrame(() => {
    const age = celebrationAge(performance.now() / 1000);
    spots.forEach((s, i) => {
      const bloom = age < 0 ? 0 : Math.min(1, Math.max(0, (age - s.d) / 1.2));
      const e = 1 - Math.pow(1 - bloom, 3);
      o.position.copy(s.p);
      o.lookAt(s.p.clone().add(s.n));
      o.rotateX(Math.PI / 2);
      o.translateY(-0.42 * s.s * 0.5);
      const sc = s.s * (0.5 + e * 0.75);
      o.scale.set(sc, sc * (0.6 + e * 0.4), sc);
      o.updateMatrix();
      ref.current!.setMatrixAt(i, o.matrix);
    });
    ref.current!.instanceMatrix.needsUpdate = true;
  });
  return <instancedMesh ref={ref} args={[geo, mat, spots.length]} />;
}

/** Candle flame: teardrop with flicker, gradient core → tip, plus halo. */
function useFlameMaterial(index: number) {
  return useMemo(
    () =>
      new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        uniforms: { uTime: globalUniforms.uTime, uBoost: { value: 0 }, uSeed: { value: index * 1.37 } },
        vertexShader: `uniform float uTime; uniform float uSeed; uniform float uBoost; varying vec2 vUv;
          void main(){ vUv = uv; vec3 p = position; float h = uv.y;
            float f = sin(uTime*13.0+uSeed*7.0)*0.5 + sin(uTime*23.0+uSeed)*0.3;
            p.x += f * 0.02 * h*h; p.z += cos(uTime*11.0+uSeed)*0.015*h*h;
            p.y *= 1.0 + sin(uTime*17.0+uSeed*3.0)*0.08 + uBoost*0.5;
            gl_Position = projectionMatrix*modelViewMatrix*vec4(p,1.0);}`,
        fragmentShader: `uniform float uBoost; varying vec2 vUv;
          void main(){ float h = vUv.y;
            vec3 core = vec3(1.0,0.98,0.85); vec3 mid = vec3(1.0,0.72,0.3); vec3 tip = vec3(1.0,0.4,0.25);
            vec3 c = mix(core, mid, smoothstep(0.1,0.6,h)); c = mix(c, tip, smoothstep(0.6,1.0,h));
            float blue = smoothstep(0.18,0.0,h)*0.6; c = mix(c, vec3(0.5,0.6,1.0), blue);
            float a = (1.0 - smoothstep(0.55,1.0,h)) * (0.85 + uBoost*0.4);
            gl_FragColor = vec4(c*a*(1.6+uBoost*1.6), a); }`,
      }),
    [index],
  );
}

function Candle({ angle, radius, y, index }: { angle: number; radius: number; y: number; index: number }) {
  const flame = useFlameMaterial(index);
  const halo = useRef<THREE.Mesh>(null);
  const fire = useRef<THREE.Group>(null);
  const tex = useMemo(() => {
    const t = candleTexture().clone();
    t.needsUpdate = true;
    t.repeat.set(1, 1);
    return t;
  }, []);
  useFrame((st) => {
    const age = celebrationAge(performance.now() / 1000);
    // unlit until the guest lights them; then each candle catches in turn, flares, and settles
    const delay = index * 0.14;
    const lit = age < 0 ? 0 : Math.min(1, Math.max(0, (age - delay) / 0.45));
    const e = 1 - Math.pow(1 - lit, 3);
    const boost = age < 0 ? 0 : Math.max(0, 1 - (age - delay) / 6) * e;
    flame.uniforms.uBoost.value = boost;
    if (fire.current) {
      // kept "visible" at near-zero scale so its shader is compiled up front (no hitch on ignition)
      fire.current.scale.setScalar(Math.max(0.001, e));
    }
    if (halo.current) halo.current.scale.setScalar(Math.max(0.001, e * (0.25 + boost * 0.35 + Math.sin(st.clock.elapsedTime * 9 + index) * 0.02)));
  });
  const x = Math.cos(angle) * radius, z = Math.sin(angle) * radius;
  return (
    <group position={[x, y, z]}>
      <mesh position={[0, 0.3, 0]} castShadow>
        <cylinderGeometry args={[0.055, 0.06, 0.6, 16]} />
        <meshStandardMaterial map={tex} roughness={0.5} />
      </mesh>
      <mesh position={[0, 0.63, 0]}>
        <cylinderGeometry args={[0.006, 0.006, 0.06, 4]} />
        <meshBasicMaterial color="#3a2a2a" />
      </mesh>
      <group ref={fire} position={[0, 0.66, 0]} scale={0.001}>
        <mesh position={[0, 0.06, 0]} material={flame}>
          <sphereGeometry args={[0.05, 12, 10]} />
        </mesh>
        <mesh position={[0, 0.13, 0]} material={flame} scale={[1, 2.6, 1]}>
          <coneGeometry args={[0.04, 0.1, 12, 1, true]} />
        </mesh>
      </group>
      <mesh ref={halo} position={[0, 0.76, 0]}>
        <sphereGeometry args={[1, 12, 10]} />
        <meshBasicMaterial color="#ffb766" transparent opacity={0.06} depthWrite={false} blending={THREE.AdditiveBlending} />
      </mesh>
    </group>
  );
}

/** Balloons that rise on a gentle spiral after the cake is clicked. */
function Balloons({ count = 14 }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const strings = useRef<THREE.LineSegments>(null);
  const geo = useMemo(() => {
    const g = new THREE.SphereGeometry(0.42, 24, 18);
    const p = g.getAttribute('position') as THREE.BufferAttribute;
    for (let i = 0; i < p.count; i++) {
      const y = p.getY(i);
      p.setY(i, y * 1.18 - (y < 0 ? y * y * 0.4 : 0));
      const k = y < 0 ? 1 + y * 0.35 : 1;
      p.setX(i, p.getX(i) * k);
      p.setZ(i, p.getZ(i) * k);
    }
    g.computeVertexNormals();
    return g;
  }, []);
  const mat = useMemo(() => new THREE.MeshPhysicalMaterial({ roughness: 0.18, clearcoat: 1, clearcoatRoughness: 0.08, sheen: 0.4, transmission: 0.0 }), []);
  const data = useMemo(() => {
    const r = mulberry32(5);
    return Array.from({ length: count }, (_, i) => ({ a: (i / count) * Math.PI * 2, rad: 2.2 + r() * 2.5, sp: 1.4 + r() * 1.2, d: r() * 1.6, c: PASTELS[i % PASTELS.length], sw: r() * 6 }));
  }, [count]);
  const lineGeo = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(count * 6), 3));
    return g;
  }, [count]);
  useLayoutEffect(() => {
    const c = new THREE.Color();
    data.forEach((d, i) => ref.current!.setColorAt(i, c.set(d.c)));
    if (ref.current!.instanceColor) ref.current!.instanceColor.needsUpdate = true;
  }, [data]);
  const o = useMemo(() => new THREE.Object3D(), []);
  useFrame((st) => {
    const age = celebrationAge(performance.now() / 1000);
    const pos = lineGeo.getAttribute('position') as THREE.BufferAttribute;
    data.forEach((d, i) => {
      const t = age < 0 ? -1 : age - d.d;
      if (t < 0 || t > 16) {
        o.scale.setScalar(0.0001);
        o.position.set(0, -50, 0);
      } else {
        const y = 0.6 + t * d.sp + Math.min(t, 1) * 0.5;
        const a = d.a + t * 0.25;
        o.position.set(Math.cos(a) * d.rad + Math.sin(t * 1.3 + d.sw) * 0.3, y, Math.sin(a) * d.rad);
        o.rotation.set(Math.sin(t * 1.1 + d.sw) * 0.15, 0, Math.cos(t * 0.9 + d.sw) * 0.15);
        o.scale.setScalar(Math.min(1, t * 2.5));
      }
      o.updateMatrix();
      ref.current!.setMatrixAt(i, o.matrix);
      pos.setXYZ(i * 2, o.position.x, o.position.y - 0.6 * o.scale.x, o.position.z);
      pos.setXYZ(i * 2 + 1, o.position.x + Math.sin(st.clock.elapsedTime * 2 + i) * 0.15, o.position.y - 2.2 * o.scale.x, o.position.z);
    });
    ref.current!.instanceMatrix.needsUpdate = true;
    pos.needsUpdate = true;
  });
  return (
    <group>
      <instancedMesh ref={ref} args={[geo, mat, count]} frustumCulled={false} />
      <lineSegments ref={strings} geometry={lineGeo} frustumCulled={false}>
        <lineBasicMaterial color="#fff6ea" transparent opacity={0.7} />
      </lineSegments>
    </group>
  );
}

export function Cake({ position }: { position: [number, number, number] }) {
  const light = useRef<THREE.PointLight>(null);
  let y = 0.5;
  const tierYs = TIERS.map((t) => {
    const yy = y;
    y += t.h;
    return yy;
  });
  const topY = y;
  useFrame((st) => {
    const age = celebrationAge(performance.now() / 1000);
    const lit = age < 0 ? 0 : Math.min(1, age / 1.2);
    const boost = age < 0 ? 0 : Math.max(0, 1 - age / 9);
    if (light.current) light.current.intensity = lit * (4 + boost * 10) * (0.92 + Math.sin(st.clock.elapsedTime * 12) * 0.05);
  });
  return (
    <group position={position}>
      {/* terrace dais */}
      <mesh position={[0, -0.25, 0]} receiveShadow>
        <cylinderGeometry args={[5.5, 5.9, 0.5, 48]} />
        <meshStandardMaterial color="#efe3d6" roughness={0.85} />
      </mesh>
      <mesh position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[4.9, 5.1, 64]} />
        <meshStandardMaterial color={GOLD} metalness={1} roughness={0.3} />
      </mesh>
      {/* cake stand */}
      <mesh position={[0, 0.2, 0]} castShadow>
        <cylinderGeometry args={[0.35, 0.7, 0.4, 32]} />
        <meshStandardMaterial color={GOLD} metalness={1} roughness={0.25} />
      </mesh>
      <mesh position={[0, 0.45, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[2.0, 1.9, 0.1, 64]} />
        <meshStandardMaterial color={GOLD} metalness={1} roughness={0.2} />
      </mesh>
      {TIERS.map((t, i) => (
        <Frosting key={i} r={t.r} h={t.h} y={tierYs[i]} color={t.color} seed={i + 1} />
      ))}
      <SugarFlowers />
      {Array.from({ length: 7 }, (_, i) => (
        <Candle key={i} index={i} angle={(i / 7) * Math.PI * 2 + 0.3} radius={0.52} y={topY} />
      ))}
      <pointLight ref={light} position={[0, topY + 1, 0]} color="#ffbf7a" distance={9} decay={1.8} />
      <Balloons />
    </group>
  );
}
