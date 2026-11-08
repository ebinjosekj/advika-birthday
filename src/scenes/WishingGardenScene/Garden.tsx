import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { globalUniforms } from '../shared/uniforms';

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
