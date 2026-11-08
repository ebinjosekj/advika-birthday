import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { glowTexture } from '../shared/textures';
import { globalUniforms } from '../shared/uniforms';
import { mulberry32 } from '../../utils/random';

/** Floating fabric ribbons in the six pastel dress-code colours. */
export function FabricRibbons({ position }: { position: [number, number, number] }) {
  const colors = ['#c9b6e8', '#bfe3cf', '#a9c6e3', '#e6a9b8', '#fbf5ea', '#f4c7a9'];
  const mats = useMemo(
    () =>
      colors.map(
        (c, i) =>
          new THREE.ShaderMaterial({
            side: THREE.DoubleSide,
            uniforms: { uTime: globalUniforms.uTime, uColor: { value: new THREE.Color(c) }, uSeed: { value: i * 1.7 } },
            vertexShader: `uniform float uTime; uniform float uSeed; varying vec2 vUv; varying float vS;
              void main(){ vUv=uv; vec3 p=position; float ph = uv.x*7.0 - uTime*1.2 + uSeed;
                p.z += sin(ph)*0.6 * uv.x + sin(uv.y*3.0 + uTime + uSeed)*0.1;
                p.y += sin(ph*0.5)*0.4*uv.x;
                vS = 0.78 + 0.22*cos(ph);
                gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.0);}`,
            fragmentShader: `uniform vec3 uColor; varying vec2 vUv; varying float vS;
              void main(){ float sheen = pow(vS, 6.0)*0.25; vec3 c = uColor*vS + sheen;
                gl_FragColor=vec4(c,1.0);
                #include <colorspace_fragment>
              }`,
          }),
      ),
    [], // eslint-disable-line react-hooks/exhaustive-deps
  );
  const g = useRef<THREE.Group>(null);
  useFrame((st) => {
    if (g.current) g.current.rotation.y = st.clock.elapsedTime * 0.05;
  });
  return (
    <group ref={g} position={position}>
      {mats.map((m, i) => {
        const a = (i / mats.length) * Math.PI * 2;
        return (
          <mesh key={i} material={m} position={[Math.cos(a) * 4, 1.2 + (i % 3) * 1.1, Math.sin(a) * 4]} rotation={[0, -a + Math.PI / 2, 0.2]}>
            <planeGeometry args={[4.5, 0.9, 40, 4]} />
          </mesh>
        );
      })}
    </group>
  );
}

/** Each wish becomes a glowing orb that rises and settles in a slow constellation. */
export function WishOrbs({ position, count }: { position: [number, number, number]; count: number }) {
  const ref = useRef<THREE.Group>(null);
  const n = Math.min(40, count + 6);
  const data = useMemo(() => {
    const r = mulberry32(8);
    return Array.from({ length: 40 }, () => ({ a: r() * Math.PI * 2, rad: 1.5 + r() * 6, h: 3 + r() * 7, sp: 0.2 + r() * 0.4, c: ['#ffe6a8', '#f6c6e6', '#cfe0ff', '#c8f2dc'][Math.floor(r() * 4)] }));
  }, []);
  useFrame((st) => {
    const t = st.clock.elapsedTime;
    ref.current?.children.forEach((c, i) => {
      const d = data[i];
      c.position.set(Math.cos(d.a + t * d.sp * 0.2) * d.rad, d.h + Math.sin(t * d.sp + i) * 0.5, Math.sin(d.a + t * d.sp * 0.2) * d.rad);
      const s = 1.1 + Math.sin(t * 2 + i) * 0.2;
      c.scale.set(s, s, 1);
    });
  });
  return (
    <group ref={ref} position={position}>
      {data.slice(0, n).map((d, i) => (
        <sprite key={i}>
          <spriteMaterial map={glowTexture()} color={d.c} transparent depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} />
        </sprite>
      ))}
    </group>
  );
}
