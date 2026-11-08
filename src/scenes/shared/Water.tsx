import { useMemo } from 'react';
import * as THREE from 'three';
import { Sparkles } from '@react-three/drei';
import { globalUniforms } from './uniforms';

const NOISE = /* glsl */ `
  float h21(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7)))*43758.5453); }
  float vnoise(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f);
    return mix(mix(h21(i),h21(i+vec2(1,0)),f.x), mix(h21(i+vec2(0,1)),h21(i+vec2(1,1)),f.x), f.y); }
  float fbm(vec2 p){ float s=0.0, a=0.5; for(int i=0;i<4;i++){ s+=a*vnoise(p); p*=2.03; a*=0.5;} return s; }
`;

/**
 * A curtain of falling water: streaks stretch and accelerate downward, the lip
 * stays glassy, the base dissolves into mist. Paired with a mist particle cloud.
 */
export function Waterfall({ position, rotationY = 0, width = 4, height = 26, mistCount = 60 }: { position: [number, number, number]; rotationY?: number; width?: number; height?: number; mistCount?: number }) {
  const mat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        side: THREE.DoubleSide,
        uniforms: { uTime: globalUniforms.uTime, uMood: globalUniforms.uMood },
        vertexShader: `varying vec2 vUv; uniform float uTime; void main(){ vUv=uv; vec3 p=position; float t=1.0-uv.y; p.z += t*t*2.2 + sin(uv.x*12.0+uTime*3.0)*0.05*t; gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.0);}`,
        fragmentShader: `${NOISE} uniform float uTime; uniform float uMood; varying vec2 vUv;
          void main(){
            float fall = 1.0 - vUv.y;
            vec2 q = vec2(vUv.x*9.0, vUv.y*2.2 + uTime*(1.4 + fall*1.6));
            float streak = fbm(vec2(q.x, q.y*0.35));
            float fine = vnoise(vec2(vUv.x*40.0, vUv.y*6.0 + uTime*5.0));
            float edge = smoothstep(0.0,0.18,vUv.x)*smoothstep(1.0,0.82,vUv.x);
            float a = edge * (0.45 + streak*0.55) * (0.55 + fine*0.45);
            a *= smoothstep(0.0, 0.25, vUv.y + fbm(vec2(vUv.x*5.0, uTime))*0.15); // break up at base
            vec3 deep = mix(vec3(0.62,0.78,0.92), vec3(0.3,0.38,0.62), uMood);
            vec3 foam = mix(vec3(1.0,0.98,0.96), vec3(0.8,0.82,0.98), uMood);
            vec3 c = mix(deep, foam, smoothstep(0.45, 0.85, streak + fine*0.3));
            c += vec3(1.0,0.85,0.7)*0.15*(1.0-uMood)*vUv.y;
            gl_FragColor = vec4(c, a*0.9);
            #include <colorspace_fragment>
          }`,
      }),
    [],
  );
  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      <mesh material={mat} position={[0, -height / 2, 0]}>
        <planeGeometry args={[width, height, 16, 24]} />
      </mesh>
      <Sparkles count={mistCount} scale={[width * 2.2, 6, 5]} position={[0, -height + 1, 2]} size={22} speed={0.6} opacity={0.35} color="#f6f2ff" noise={1.4} />
    </group>
  );
}

/** Calm water: fresnel sky reflection, animated ripples and a sun glint. */
export function WaterSurface({ position, radius = 4, scaleZ = 1 }: { position: [number, number, number]; radius?: number; scaleZ?: number }) {
  const mat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        transparent: true,
        uniforms: { uTime: globalUniforms.uTime, uMood: globalUniforms.uMood },
        vertexShader: `varying vec3 vW; varying vec2 vUv; void main(){ vUv=uv; vec4 w=modelMatrix*vec4(position,1.0); vW=w.xyz; gl_Position=projectionMatrix*viewMatrix*w; }`,
        fragmentShader: `${NOISE} uniform float uTime; uniform float uMood; varying vec3 vW; varying vec2 vUv;
          void main(){
            vec2 p = vW.xz*0.6;
            float r = fbm(p + vec2(uTime*0.15, uTime*0.1)) - fbm(p*1.7 - vec2(uTime*0.12, 0.0));
            vec3 n = normalize(vec3(r*0.6, 1.0, r*0.4));
            vec3 v = normalize(cameraPosition - vW);
            float fres = pow(1.0 - max(dot(n, v), 0.0), 3.0);
            vec3 skyDay = vec3(0.86,0.82,0.95), skyNight = vec3(0.24,0.2,0.42);
            vec3 deep = mix(vec3(0.46,0.7,0.78), vec3(0.12,0.16,0.3), uMood);
            vec3 c = mix(deep, mix(skyDay, skyNight, uMood), 0.35 + fres*0.6);
            vec3 sunDir = normalize(vec3(-0.35, 0.3, -1.0));
            float spec = pow(max(dot(reflect(-v, n), sunDir), 0.0), 80.0);
            c += vec3(1.0,0.9,0.7) * spec * 1.4 * (1.0-uMood*0.7);
            float d = length(vUv-0.5)*2.0;
            float a = smoothstep(1.0, 0.85, d);
            gl_FragColor = vec4(c, a*0.92);
            #include <colorspace_fragment>
          }`,
      }),
    [],
  );
  return (
    <mesh material={mat} position={position} rotation={[-Math.PI / 2, 0, 0]} scale={[1, scaleZ, 1]}>
      <circleGeometry args={[radius, 48]} />
    </mesh>
  );
}
