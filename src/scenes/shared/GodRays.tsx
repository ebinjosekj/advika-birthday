import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { globalUniforms } from './uniforms';

/** Soft volumetric light shafts: additive cones with noise-banded falloff. */
export function GodRays({ position = [-40, 60, -200] as [number, number, number], count = 7 }) {
  const group = useRef<THREE.Group>(null);
  const mat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
        uniforms: { uTime: globalUniforms.uTime, uMood: globalUniforms.uMood },
        vertexShader: `varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`,
        fragmentShader: `uniform float uTime; uniform float uMood; varying vec2 vUv;
          void main(){
            float along = vUv.y;
            float band = 0.55 + 0.45*sin(vUv.x*40.0 + uTime*0.3) * sin(vUv.x*17.0 - uTime*0.2);
            float a = pow(along, 1.6) * (1.0 - along*0.15) * band * 0.06 * (1.0 - uMood*0.6);
            vec3 c = mix(vec3(1.0,0.85,0.62), vec3(0.7,0.75,1.0), uMood);
            gl_FragColor = vec4(c*a, a);
          }`,
      }),
    [],
  );
  const rays = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => ({
        rot: [0.9 + (i % 3) * 0.08, -0.15 + i * 0.07, 0] as [number, number, number],
        len: 180 + (i % 4) * 30,
        w: 10 + (i % 3) * 6,
      })),
    [count],
  );
  useFrame((s) => {
    if (group.current) group.current.rotation.y = Math.sin(s.clock.elapsedTime * 0.03) * 0.04;
  });
  return (
    <group ref={group} position={position}>
      {rays.map((r, i) => (
        <mesh key={i} rotation={r.rot} material={mat} position={[0, 0, 0]}>
          <coneGeometry args={[r.w, r.len, 24, 1, true]} />
        </mesh>
      ))}
    </group>
  );
}
