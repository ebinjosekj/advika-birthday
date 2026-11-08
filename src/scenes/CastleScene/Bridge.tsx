import { useMemo } from 'react';
import * as THREE from 'three';
import { Sparkles } from '@react-three/drei';
import { globalUniforms } from '../shared/uniforms';
import { LANDMARKS } from '../../config/worldLayout';

/** Rainbow ribbon bridge with shimmering bands, plus lantern posts that light the path. */
export function RainbowBridge() {
  const { geo, curve } = useMemo(() => {
    const a = new THREE.Vector3(...LANDMARKS.bridgeStart);
    const b = new THREE.Vector3(...LANDMARKS.bridgeEnd);
    const mid = a.clone().lerp(b, 0.5).add(new THREE.Vector3(0, 12, 0));
    const curve = new THREE.QuadraticBezierCurve3(a, mid, b);
    const seg = 160, width = 3.4;
    const pos: number[] = [], uv: number[] = [], idx: number[] = [];
    for (let i = 0; i <= seg; i++) {
      const t = i / seg;
      const p = curve.getPoint(t);
      const tan = curve.getTangent(t);
      const side = new THREE.Vector3().crossVectors(tan, new THREE.Vector3(0, 1, 0)).normalize();
      for (let j = 0; j <= 6; j++) {
        const s = j / 6 - 0.5;
        const lift = -Math.pow(Math.abs(s) * 2, 4) * -0.25; // raised kerbs
        const q = p.clone().addScaledVector(side, s * width).add(new THREE.Vector3(0, lift, 0));
        pos.push(q.x, q.y, q.z);
        uv.push(t, j / 6);
      }
      if (i < seg)
        for (let j = 0; j < 6; j++) {
          const r = i * 7 + j;
          idx.push(r, r + 7, r + 1, r + 1, r + 7, r + 8);
        }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    g.setIndex(idx);
    g.computeVertexNormals();
    return { geo: g, curve };
  }, []);
  const mat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        side: THREE.DoubleSide,
        transparent: true,
        uniforms: { uTime: globalUniforms.uTime, uMood: globalUniforms.uMood },
        vertexShader: `varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`,
        fragmentShader: `uniform float uTime; uniform float uMood; varying vec2 vUv;
          vec3 band(float x){
            vec3 c[6]; c[0]=vec3(0.95,0.72,0.78); c[1]=vec3(0.98,0.8,0.66); c[2]=vec3(0.95,0.9,0.66);
            c[3]=vec3(0.75,0.9,0.8); c[4]=vec3(0.66,0.78,0.92); c[5]=vec3(0.79,0.71,0.92);
            float f = x*5.999; int i = int(floor(f)); float t = fract(f);
            vec3 a = c[0], b = c[0];
            for(int k=0;k<6;k++){ if(k==i) a=c[k]; if(k==min(i+1,5)) b=c[k]; }
            return mix(a, b, smoothstep(0.7,1.0,t));
          }
          void main(){
            vec3 col = band(vUv.y);
            float shimmer = pow(0.5+0.5*sin(vUv.x*120.0 - uTime*2.5 + vUv.y*6.0), 12.0);
            col += vec3(1.0,0.97,0.9) * shimmer * 0.35;
            col *= 1.0 + uMood*0.35;
            float edge = smoothstep(0.0,0.04,vUv.y)*smoothstep(1.0,0.96,vUv.y);
            float ends = smoothstep(0.0,0.03,vUv.x)*smoothstep(1.0,0.97,vUv.x);
            col = mix(col, vec3(1.0), 0.2);
            gl_FragColor = vec4(col, 0.72*edge*ends);
            #include <colorspace_fragment>
          }`,
      }),
    [],
  );
  const posts = useMemo(() => {
    const out: { p: THREE.Vector3; side: number }[] = [];
    for (let i = 1; i < 10; i++) {
      const t = i / 10;
      const p = curve.getPoint(t);
      const tan = curve.getTangent(t);
      const side = new THREE.Vector3().crossVectors(tan, new THREE.Vector3(0, 1, 0)).normalize();
      [-1, 1].forEach((s) => out.push({ p: p.clone().addScaledVector(side, s * 1.95), side: s }));
    }
    return out;
  }, [curve]);
  const mid = curve.getPoint(0.5);
  return (
    <group>
      <mesh geometry={geo} material={mat} />
      {posts.map((pp, i) => (
        <group key={i} position={pp.p}>
          <mesh position={[0, 0.7, 0]}>
            <cylinderGeometry args={[0.04, 0.06, 1.4, 6]} />
            <meshStandardMaterial color="#e2c07a" metalness={1} roughness={0.3} />
          </mesh>
          <mesh position={[0, 1.5, 0]}>
            <sphereGeometry args={[0.17, 14, 10]} />
            <meshStandardMaterial color="#fff2d8" emissive={i % 3 ? '#ffd9a0' : '#f6c6e6'} emissiveIntensity={2.4} toneMapped={false} />
          </mesh>
        </group>
      ))}
      <Sparkles count={70} scale={[60, 14, 6]} position={[mid.x, mid.y - 3, mid.z]} size={5} speed={0.3} color="#fff4d6" />
    </group>
  );
}
