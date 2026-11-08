import { useMemo } from 'react';
import * as THREE from 'three';
import { globalUniforms } from './uniforms';

/** Golden-hour ↔ moonlight sky dome with sun, moon, twinkling stars and aurora-like veils. */
export function SkyDome() {
  const mat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        side: THREE.BackSide,
        depthWrite: false,
        fog: false,
        uniforms: { uTime: globalUniforms.uTime, uMood: globalUniforms.uMood },
        vertexShader: /* glsl */ `
          varying vec3 vDir;
          void main(){
            vDir = normalize(position);
            vec4 p = modelViewMatrix * vec4(position,1.0);
            gl_Position = projectionMatrix * p;
            gl_Position.z = gl_Position.w; // always at far plane
          }`,
        fragmentShader: /* glsl */ `
          uniform float uTime; uniform float uMood;
          varying vec3 vDir;
          float hash(vec3 p){ p = fract(p*0.3183099+.1); p*=17.0; return fract(p.x*p.y*p.z*(p.x+p.y+p.z)); }
          void main(){
            vec3 d = normalize(vDir);
            float h = d.y;
            // day palette: champagne horizon → peach → powder blue → lavender zenith
            vec3 dayZen = vec3(0.20,0.38,0.70);
            vec3 dayMid = vec3(0.50,0.64,0.84);
            vec3 dayHor = vec3(0.96,0.80,0.64);
            vec3 nightZen = vec3(0.03,0.05,0.13);
            vec3 nightMid = vec3(0.10,0.13,0.27);
            vec3 nightHor = vec3(0.38,0.33,0.45);
            // sunset palette peaks around mood 0.7: indigo overhead, lavender, apricot horizon
            float eve = clamp(1.0 - abs(uMood - 0.7) * 3.2, 0.0, 1.0);
            vec3 zen = mix(mix(dayZen, nightZen, uMood), vec3(0.10,0.14,0.34), eve);
            vec3 mid = mix(mix(dayMid, nightMid, uMood), vec3(0.40,0.34,0.55), eve);
            vec3 hor = mix(mix(dayHor, nightHor, uMood), vec3(1.0,0.6,0.44), eve);
            vec3 col = mix(hor, mid, smoothstep(-0.05, 0.22, h));
            col = mix(col, zen, smoothstep(0.2, 0.85, h));
            col = mix(col, hor*0.92, smoothstep(0.0,-0.35,h)); // below horizon: hazy sea of light
            // sun low in the west-ish (behind the castle side)
            vec3 sunDir = normalize(vec3(-0.35, 0.16, -1.0));
            float sd = max(dot(d, sunDir), 0.0);
            vec3 sunCol = vec3(1.0,0.82,0.58);
            float evening = eve;
            sunCol = mix(sunCol, vec3(1.0,0.55,0.28), evening);
            col += sunCol * (pow(sd, 900.0)*6.0 + pow(sd, 32.0)*0.45 + pow(sd, 5.0)*0.3) * max(1.0-uMood*0.75, evening * 0.9);
            // sunset afterglow hugging the horizon, strongest toward the sun
            float glow = smoothstep(0.45, -0.02, h) * smoothstep(-0.3, 0.02, h);
            col += mix(vec3(0.95,0.42,0.38), vec3(1.0,0.62,0.3), sd) * glow * evening * (0.35 + sd * 0.5);
            // moon
            vec3 moonDir = normalize(vec3(0.35, 0.42, -1.0));
            float md = max(dot(d, moonDir), 0.0);
            col += vec3(0.95,0.93,1.0) * (smoothstep(0.9993,0.9996,md)*1.4 + pow(md, 60.0)*0.25) * uMood;
            // stars
            vec3 sp = floor(d*380.0);
            float s = hash(sp);
            float tw = 0.6 + 0.4*sin(uTime*2.0 + s*60.0);
            float star = step(0.9965, s) * tw * smoothstep(0.02, 0.3, h);
            col += vec3(1.0,0.95,0.9) * star * smoothstep(0.55, 0.95, uMood) * 1.6;
            // soft aurora veils at night
            float veil = sin(d.x*6.0 + uTime*0.05)*sin(d.z*4.0 - uTime*0.04);
            col += vec3(0.5,0.9,0.8) * smoothstep(0.5,1.0,veil) * smoothstep(0.25,0.6,h) * uMood * 0.08;
            gl_FragColor = vec4(col, 1.0);
            #include <tonemapping_fragment>
            #include <colorspace_fragment>
          }`,
      }),
    [],
  );
  return (
    <mesh material={mat} frustumCulled={false} renderOrder={-10}>
      <sphereGeometry args={[900, 48, 24]} />
    </mesh>
  );
}
