import { useMemo } from 'react';
import * as THREE from 'three';
import { makeNoise3 } from '../../utils/random';
import { globalUniforms } from './uniforms';

/** Two rings of distant ridgelines with aerial perspective (they fade into haze). */
export function DistantMountains() {
  const geos = useMemo(() => {
    const noise = makeNoise3(99);
    const ring = (radius: number, height: number, seed: number) => {
      const seg = 220;
      const pos: number[] = [];
      const hv: number[] = [];
      const idx: number[] = [];
      for (let i = 0; i <= seg; i++) {
        const a = (i / seg) * Math.PI * 2;
        const n = noise(Math.cos(a) * 3 + seed, Math.sin(a) * 3, seed, 4);
        const peak = Math.pow(Math.max(0, n * 0.5 + 0.55), 1.8);
        const hh = height * (0.25 + peak * 1.2);
        const x = Math.cos(a) * radius, z = Math.sin(a) * radius;
        pos.push(x, -60, z, x, hh, z);
        hv.push(0, 1, 0, 1);
        if (i < seg) {
          const b = i * 2;
          idx.push(b, b + 1, b + 2, b + 1, b + 3, b + 2);
        }
      }
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      g.setAttribute('aH', new THREE.Float32BufferAttribute(hv, 1));
      g.setIndex(idx);
      return g;
    };
    return [ring(700, 120, 1), ring(560, 80, 7)];
  }, []);
  const mats = useMemo(
    () =>
      [0.55, 0.35].map(
        (haze) =>
          new THREE.ShaderMaterial({
            side: THREE.DoubleSide,
            depthWrite: false,
            transparent: true,
            uniforms: { uMood: globalUniforms.uMood, uHaze: { value: haze } },
            vertexShader: `attribute float aH; varying float vH; void main(){ vH=aH; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`,
            fragmentShader: `uniform float uMood; uniform float uHaze; varying float vH;
              void main(){
                vec3 day = mix(vec3(0.78,0.78,0.82), vec3(0.55,0.6,0.72), vH);
                vec3 night = mix(vec3(0.45,0.33,0.5), vec3(0.16,0.14,0.32), vH);
                vec3 c = mix(day, night, uMood);
                c = mix(c, mix(vec3(0.93,0.87,0.82), vec3(0.3,0.3,0.42), uMood), uHaze*(1.0-vH*0.5));
                gl_FragColor = vec4(c, 0.92);
                #include <colorspace_fragment>
              }`,
          }),
      ),
    [],
  );
  return (
    <group>
      {geos.map((g, i) => (
        <mesh key={i} geometry={g} material={mats[i]} frustumCulled={false} renderOrder={-9} />
      ))}
    </group>
  );
}
