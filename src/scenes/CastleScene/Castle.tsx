import { useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { roofTexture, stoneTexture } from '../shared/textures';
import { globalUniforms } from '../shared/uniforms';
import { world } from '../../app/store';

const GOLD = '#d9b56c';

function useStone(repeat: [number, number]) {
  return useMemo(() => {
    const t = stoneTexture().clone();
    t.needsUpdate = true;
    t.repeat.set(repeat[0], repeat[1]);
    return new THREE.MeshStandardMaterial({ map: t, bumpMap: t, bumpScale: 0.6, roughness: 0.82, color: '#fff7ee' });
  }, [repeat]);
}

function arch(w: number, h: number) {
  const s = new THREE.Shape();
  s.moveTo(-w / 2, 0);
  s.lineTo(-w / 2, h - w / 2);
  s.absarc(0, h - w / 2, w / 2, Math.PI, 0, true);
  s.lineTo(w / 2, 0);
  s.lineTo(-w / 2, 0);
  return new THREE.ShapeGeometry(s, 12);
}

/** Fabric banner: vertex wave travelling from the pole outwards. */
function Banner({ position, color, rotationY = 0 }: { position: [number, number, number]; color: string; rotationY?: number }) {
  const mat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        side: THREE.DoubleSide,
        uniforms: { uTime: globalUniforms.uTime, uColor: { value: new THREE.Color(color) }, uGold: { value: new THREE.Color(GOLD) } },
        vertexShader: `uniform float uTime; varying vec2 vUv; varying float vShade;
          void main(){ vUv=uv; vec3 p=position; float k = uv.x;
            float w = sin(uv.x*5.0 - uTime*3.0 + uv.y*1.5)*0.35*k + sin(uv.x*11.0 - uTime*5.0)*0.08*k;
            p.z += w; vShade = 0.85 + 0.15*cos(uv.x*5.0 - uTime*3.0);
            gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.0);}`,
        fragmentShader: `uniform vec3 uColor; uniform vec3 uGold; varying vec2 vUv; varying float vShade;
          void main(){ vec3 c = uColor;
            float trim = step(vUv.y,0.08)+step(0.92,vUv.y);
            float star = smoothstep(0.12,0.0,length((vUv-vec2(0.45,0.5))*vec2(1.6,1.0)));
            c = mix(c, uGold, max(trim, star));
            gl_FragColor = vec4(c*vShade,1.0);
            #include <colorspace_fragment>
          }`,
      }),
    [color],
  );
  return (
    <mesh position={position} rotation={[0, rotationY, 0]} material={mat}>
      <planeGeometry args={[3.2, 1.3, 20, 4]} />
    </mesh>
  );
}

function Tower({ position, radius, height, roofColor, roofHeight }: { position: [number, number, number]; radius: number; height: number; roofColor: string; roofHeight: number }) {
  const stone = useStone([Math.round(radius * 2.2), Math.round(height / 4)]);
  const roof = useMemo(() => {
    const t = roofTexture(roofColor).clone();
    t.needsUpdate = true;
    t.repeat.set(3, 3);
    return new THREE.MeshStandardMaterial({ map: t, roughness: 0.55, metalness: 0.05 });
  }, [roofColor]);
  return (
    <group position={position}>
      <mesh material={stone} position={[0, height / 2, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[radius, radius * 1.08, height, 28, 1]} />
      </mesh>
      {/* corbelled ring under the roof */}
      <mesh material={stone} position={[0, height + 0.3, 0]} castShadow>
        <cylinderGeometry args={[radius * 1.18, radius, 0.8, 28]} />
      </mesh>
      <mesh position={[0, height + 0.75, 0]}>
        <torusGeometry args={[radius * 1.18, 0.09, 6, 40]} />
        <meshStandardMaterial color={GOLD} metalness={1} roughness={0.25} />
      </mesh>
      <mesh material={roof} position={[0, height + 0.7 + roofHeight / 2, 0]} castShadow>
        <coneGeometry args={[radius * 1.3, roofHeight, 28, 6]} />
      </mesh>
      <mesh position={[0, height + 0.8 + roofHeight, 0]}>
        <sphereGeometry args={[0.32, 16, 12]} />
        <meshStandardMaterial color={GOLD} metalness={1} roughness={0.2} />
      </mesh>
      <mesh position={[0, height + 1.6 + roofHeight, 0]}>
        <cylinderGeometry args={[0.04, 0.04, 1.6, 6]} />
        <meshStandardMaterial color={GOLD} metalness={1} roughness={0.3} />
      </mesh>
    </group>
  );
}

/** Instanced arched windows with a warm, gently flickering glow. */
function Windows({ list }: { list: { p: [number, number, number]; ry: number; s: number }[] }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const geo = useMemo(() => arch(1, 2), []);
  const mat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#2d1e3a', emissive: '#ffc98a', emissiveIntensity: 1.4, toneMapped: false, side: THREE.DoubleSide }), []);
  useLayoutEffect(() => {
    const o = new THREE.Object3D();
    list.forEach((w, i) => {
      o.position.set(...w.p);
      o.rotation.set(0, w.ry, 0);
      o.scale.setScalar(w.s);
      o.updateMatrix();
      ref.current!.setMatrixAt(i, o.matrix);
    });
    ref.current!.instanceMatrix.needsUpdate = true;
  }, [list]);
  useFrame(() => {
    const t = globalUniforms.uTime.value;
    mat.emissiveIntensity = (1.2 + world.mood * 1.8) * (0.94 + Math.sin(t * 7.3) * 0.03 + Math.sin(t * 13.1) * 0.03);
  });
  return <instancedMesh ref={ref} args={[geo, mat, list.length]} />;
}

function Merlons({ width, depth, y, z = 0 }: { width: number; depth: number; y: number; z?: number }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const stone = useStone([1, 1]);
  const pts = useMemo(() => {
    const out: [number, number, number][] = [];
    const step = 1.4;
    for (let x = -width / 2 + 0.4; x <= width / 2; x += step) out.push([x, y, z + depth / 2], [x, y, z - depth / 2]);
    for (let zz = -depth / 2 + step; zz < depth / 2; zz += step) out.push([-width / 2, y, z + zz], [width / 2, y, z + zz]);
    return out;
  }, [width, depth, y, z]);
  useLayoutEffect(() => {
    const o = new THREE.Object3D();
    pts.forEach((p, i) => {
      o.position.set(...p);
      o.updateMatrix();
      ref.current!.setMatrixAt(i, o.matrix);
    });
    ref.current!.instanceMatrix.needsUpdate = true;
  }, [pts]);
  return (
    <instancedMesh ref={ref} args={[undefined, stone, pts.length]} castShadow>
      <boxGeometry args={[0.8, 1, 0.8]} />
    </instancedMesh>
  );
}

/** Gate with two hinged leaves; opening reveals a warm light from within. */
function Gate() {
  const left = useRef<THREE.Group>(null);
  const right = useRef<THREE.Group>(null);
  const glow = useRef<THREE.MeshBasicMaterial>(null);
  const light = useRef<THREE.PointLight>(null);
  const archGeo = useMemo(() => arch(4.8, 6.6), []);
  const wood = useMemo(() => new THREE.MeshStandardMaterial({ color: '#9c7486', roughness: 0.7 }), []);
  useFrame(() => {
    const d = world.intro.doors;
    if (left.current) left.current.rotation.y = -d * 1.75;
    if (right.current) right.current.rotation.y = d * 1.75;
    if (glow.current) glow.current.opacity = 0.35 + d * 0.65;
    if (light.current) light.current.intensity = 4 + d * 60;
  });
  return (
    <group position={[0, 0, 16.02]}>
      <mesh geometry={archGeo} position={[0, 0, -0.4]}>
        <meshBasicMaterial ref={glow} color="#ffe2b0" transparent toneMapped={false} />
      </mesh>
      <pointLight ref={light} position={[0, 3, 2.5]} color="#ffd59a" distance={30} decay={1.6} />
      {[-1, 1].map((side) => (
        <group key={side} ref={side < 0 ? left : right} position={[side * 2.4, 0, 0]}>
          <mesh material={wood} position={[-side * 1.2, 2.6, 0]} castShadow>
            <boxGeometry args={[2.4, 5.2, 0.3]} />
          </mesh>
          {[1, 2.6, 4.2].map((y) => (
            <mesh key={y} position={[-side * 1.2, y, 0.17]}>
              <boxGeometry args={[2.2, 0.12, 0.04]} />
              <meshStandardMaterial color={GOLD} metalness={1} roughness={0.3} />
            </mesh>
          ))}
          <mesh position={[-side * 0.35, 2.6, 0.22]}>
            <torusGeometry args={[0.18, 0.04, 8, 16]} />
            <meshStandardMaterial color={GOLD} metalness={1} roughness={0.25} />
          </mesh>
        </group>
      ))}
      {/* arch frame */}
      <mesh position={[0, 4.2, 0.1]} rotation={[0, 0, 0]}>
        <torusGeometry args={[2.6, 0.25, 8, 32, Math.PI]} />
        <meshStandardMaterial color="#efe4d6" roughness={0.6} />
      </mesh>
      <mesh position={[0, 4.2, 0.36]}>
        <torusGeometry args={[2.62, 0.05, 6, 32, Math.PI]} />
        <meshStandardMaterial color={GOLD} metalness={1} roughness={0.25} />
      </mesh>
    </group>
  );
}

export function Castle({ position }: { position: [number, number, number] }) {
  const keepStone = useStone([6, 4]);
  const gateStone = useStone([3, 3]);
  const plinth = useStone([10, 1]);
  const windows = useMemo(() => {
    const w: { p: [number, number, number]; ry: number; s: number }[] = [];
    for (let x = -8; x <= 8; x += 3.2) if (Math.abs(x) > 4) w.push({ p: [x, 6, 7.02], ry: 0, s: 1 }, { p: [x, 10.5, 7.02], ry: 0, s: 1 });
    [[-12, 8], [12, 8], [-12, -8], [12, -8]].forEach(([tx, tz]) => {
      [7, 12, 17].forEach((y, k) => {
        const a = Math.atan2(tz, tx) + (k - 1) * 0.5 + Math.PI * 0.0;
        const ang = tz > 0 ? 0.3 * (k - 1) : Math.PI + 0.3 * (k - 1);
        void a;
        w.push({ p: [tx + Math.sin(ang) * 3.25, y, tz + Math.cos(ang) * 3.25], ry: ang, s: 0.9 });
      });
    });
    [19, 24].forEach((y) => [-0.5, 0, 0.5].forEach((o) => w.push({ p: [Math.sin(o) * 4.55, y, -1 + Math.cos(o) * 4.55], ry: o, s: 1 })));
    [-5.6, 5.6].forEach((x) => [8, 12.5].forEach((y) => w.push({ p: [x, y, 13.6 + 1.62], ry: 0, s: 0.7 })));
    w.push({ p: [0, 8.2, 16.03], ry: 0, s: 1.3 });
    return w;
  }, []);

  return (
    <group position={position}>
      {/* plinth */}
      <mesh material={plinth} position={[0, 0.2, 0]} receiveShadow castShadow>
        <boxGeometry args={[34, 1.4, 24]} />
      </mesh>
      {/* keep */}
      <mesh material={keepStone} position={[0, 7.5, 0]} castShadow receiveShadow>
        <boxGeometry args={[22, 15, 14]} />
      </mesh>
      <Merlons width={22} depth={14} y={15.5} />
      {/* walls joining towers */}
      {/* gatehouse */}
      <mesh material={gateStone} position={[0, 5.5, 11.5]} castShadow receiveShadow>
        <boxGeometry args={[9, 11, 9]} />
      </mesh>
      <Merlons width={9} depth={9} y={11.5} z={11.5} />
      <Gate />
      {/* towers */}
      <Tower position={[-12, 0, 8]} radius={3.2} height={20} roofColor="#c9b6e8" roofHeight={9} />
      <Tower position={[12, 0, 8]} radius={3.2} height={20} roofColor="#c9b6e8" roofHeight={9} />
      <Tower position={[-12, 0, -8]} radius={3.4} height={24} roofColor="#e6a9b8" roofHeight={10} />
      <Tower position={[12, 0, -8]} radius={3.4} height={24} roofColor="#e6a9b8" roofHeight={10} />
      <Tower position={[0, 15, -1]} radius={4.5} height={14} roofColor="#b6a0dd" roofHeight={14} />
      <Tower position={[-5.6, 0, 13.6]} radius={1.6} height={15} roofColor="#e6a9b8" roofHeight={6} />
      <Tower position={[5.6, 0, 13.6]} radius={1.6} height={15} roofColor="#e6a9b8" roofHeight={6} />
      <Tower position={[-7, 15, -4]} radius={1.3} height={8} roofColor="#a9c6e3" roofHeight={5} />
      <Tower position={[7, 15, -4]} radius={1.3} height={8} roofColor="#a9c6e3" roofHeight={5} />
      <Windows list={windows} />
      {/* banners */}
      <Banner position={[1.6, 46.4, -1]} color="#e6a9b8" />
      <Banner position={[-10.4, 32.2, 8]} color="#c9b6e8" />
      <Banner position={[13.6, 32.2, 8]} color="#a9c6e3" />
      {/* path to the terrace */}
      {Array.from({ length: 9 }, (_, i) => (
        <mesh key={i} position={[(i % 2 ? 0.3 : -0.3), 0.55, 18 + i * 1.6]} rotation={[0, (i % 3) * 0.2, 0]} receiveShadow>
          <cylinderGeometry args={[1.5, 1.6, 0.25, 7]} />
          <meshStandardMaterial color="#efe2d2" roughness={0.9} />
        </mesh>
      ))}
    </group>
  );
}
