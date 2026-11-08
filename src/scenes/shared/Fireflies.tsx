import { useMemo } from 'react';
import * as THREE from 'three';
import { globalUniforms } from './uniforms';
import { mulberry32 } from '../../utils/random';

/** Fireflies wander on Lissajous paths and blink; brighter as dusk falls. */
export function Fireflies({ center, spread, count, color = '#fff1a8', seed = 1, size = 1 }: { center: [number, number, number]; spread: [number, number, number]; count: number; color?: string; seed?: number; size?: number }) {
  const { geo, mat } = useMemo(() => {
    const rng = mulberry32(seed);
    const pos = new Float32Array(count * 3);
    const rnd = new Float32Array(count * 4);
    for (let i = 0; i < count; i++) {
      pos.set([(rng() - 0.5) * spread[0], rng() * spread[1], (rng() - 0.5) * spread[2]], i * 3);
      rnd.set([rng(), rng(), rng(), rng()], i * 4);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('aRnd', new THREE.BufferAttribute(rnd, 4));
    const m = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: { uTime: globalUniforms.uTime, uMood: globalUniforms.uMood, uColor: { value: new THREE.Color(color) }, uSize: { value: size } },
      vertexShader: `attribute vec4 aRnd; uniform float uTime; uniform float uSize; varying float vBlink;
        void main(){
          vec3 p = position;
          float t = uTime*(0.25+aRnd.x*0.35);
          p += vec3(sin(t*1.3+aRnd.y*20.0)*1.6, sin(t*0.9+aRnd.z*12.0)*0.8, cos(t*1.1+aRnd.w*9.0)*1.6);
          vec4 mv = modelViewMatrix*vec4(p,1.0);
          vBlink = pow(0.5+0.5*sin(uTime*(1.5+aRnd.y*2.5)+aRnd.x*40.0), 3.0);
          gl_PointSize = uSize * (60.0 + aRnd.z*60.0) / -mv.z;
          gl_Position = projectionMatrix*mv;
        }`,
      fragmentShader: `uniform vec3 uColor; uniform float uMood; varying float vBlink;
        void main(){ float d = length(gl_PointCoord-0.5); float a = smoothstep(0.5,0.0,d); a = a*a;
          float k = vBlink*(0.35+uMood*0.9);
          gl_FragColor = vec4(uColor*a*k*1.6, a*k); }`,
    });
    return { geo: g, mat: m };
  }, [count, spread, color, seed, size]);
  return <points geometry={geo} material={mat} position={center} frustumCulled={false} />;
}
