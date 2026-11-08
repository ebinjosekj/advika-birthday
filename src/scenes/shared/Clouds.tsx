import { useMemo } from 'react';
import * as THREE from 'three';
import { cloudTexture } from './textures';
import { globalUniforms } from './uniforms';
import { mulberry32 } from '../../utils/random';

interface CloudLayerProps {
  count: number;
  seed: number;
  center: [number, number, number];
  spread: [number, number, number];
  size: [number, number];
  speed: number;
  opacity?: number;
}

/**
 * GPU-billboarded cloud puffs. Each layer drifts at its own speed and wraps,
 * puffs fade as the camera passes through them, and they are lit warm on top /
 * lavender underneath so they read as volumes rather than flat sprites.
 */
export function CloudLayer({ count, seed, center, spread, size, speed, opacity = 0.9 }: CloudLayerProps) {
  const { geometry, material } = useMemo(() => {
    const rand = mulberry32(seed);
    const base = new THREE.PlaneGeometry(1, 1);
    const g = new THREE.InstancedBufferGeometry();
    g.index = base.index;
    g.setAttribute('position', base.getAttribute('position'));
    g.setAttribute('uv', base.getAttribute('uv'));
    const offsets = new Float32Array(count * 3);
    const scales = new Float32Array(count);
    const rots = new Float32Array(count);
    const shade = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      // clumped placement → cumulus banks rather than uniform noise
      const clump = Math.floor(rand() * Math.max(3, count / 8));
      const cr = mulberry32(seed * 31 + clump);
      const cx = (cr() - 0.5) * spread[0];
      const cz = (cr() - 0.5) * spread[2];
      offsets[i * 3] = center[0] + cx + (rand() - 0.5) * spread[0] * 0.12;
      offsets[i * 3 + 1] = center[1] + (rand() - 0.5) * spread[1];
      offsets[i * 3 + 2] = center[2] + cz + (rand() - 0.5) * spread[2] * 0.08;
      scales[i] = size[0] + rand() * (size[1] - size[0]);
      rots[i] = rand() * Math.PI * 2;
      shade[i] = rand();
    }
    g.setAttribute('aOffset', new THREE.InstancedBufferAttribute(offsets, 3));
    g.setAttribute('aScale', new THREE.InstancedBufferAttribute(scales, 1));
    g.setAttribute('aRot', new THREE.InstancedBufferAttribute(rots, 1));
    g.setAttribute('aShade', new THREE.InstancedBufferAttribute(shade, 1));
    g.instanceCount = count;
    const m = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      uniforms: {
        uTex: { value: cloudTexture() },
        uTime: globalUniforms.uTime,
        uMood: globalUniforms.uMood,
        uSpeed: { value: speed },
        uSpanX: { value: spread[0] },
        uCenterX: { value: center[0] },
        uOpacity: { value: opacity },
      },
      vertexShader: /* glsl */ `
        attribute vec3 aOffset; attribute float aScale; attribute float aRot; attribute float aShade;
        uniform float uTime; uniform float uSpeed; uniform float uSpanX; uniform float uCenterX;
        varying vec2 vUv; varying float vShade; varying float vFade; varying float vH;
        void main(){
          vUv = uv; vShade = aShade;
          vec3 o = aOffset;
          o.x = uCenterX + mod(o.x - uCenterX + uTime * uSpeed + uSpanX*0.5, uSpanX) - uSpanX*0.5;
          vec4 mv = modelViewMatrix * vec4(o, 1.0);
          float r = aRot + uTime * 0.01 * (aShade - 0.5);
          vec2 p = position.xy * aScale;
          p = vec2(p.x*cos(r) - p.y*sin(r), p.x*sin(r) + p.y*cos(r));
          p.y *= 0.62;
          mv.xy += p;
          float dist = -mv.z;
          vFade = smoothstep(aScale*0.15, aScale*0.9, dist) * (1.0 - smoothstep(520.0, 760.0, dist));
          // edge fade at the wrap seam so puffs never pop
          float edge = abs(o.x - uCenterX) / (uSpanX*0.5);
          vFade *= 1.0 - smoothstep(0.82, 1.0, edge);
          vH = position.y + 0.5;
          gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: /* glsl */ `
        uniform sampler2D uTex; uniform float uMood; uniform float uOpacity;
        varying vec2 vUv; varying float vShade; varying float vFade; varying float vH;
        void main(){
          float a = texture2D(uTex, vUv).a;
          vec3 top = mix(vec3(1.0,0.95,0.88), vec3(0.62,0.6,0.82), uMood);
          vec3 bottom = mix(vec3(0.84,0.76,0.9), vec3(0.2,0.18,0.36), uMood);
          vec3 col = mix(bottom, top, smoothstep(0.15, 0.85, vH) * (0.75 + vShade*0.25));
          col += vec3(1.0,0.75,0.6) * pow(1.0 - vH, 3.0) * 0.12 * (1.0-uMood);
          float alpha = a * vFade * uOpacity * (0.75 + vShade*0.4);
          if (alpha < 0.004) discard;
          gl_FragColor = vec4(col, alpha);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }`,
    });
    return { geometry: g, material: m };
  }, [count, seed, center, spread, size, speed, opacity]);
  return <mesh geometry={geometry} material={material} frustumCulled={false} />;
}

const LAYERS = [
  // intro cloudscape around the book — the camera flies through these
  { seed: 1, center: [0, 64, 175], spread: [220, 26, 120], size: [18, 42], speed: 1.2, share: 0.3 },
  { seed: 2, center: [0, 40, 60], spread: [320, 30, 140], size: [26, 60], speed: 0.6, share: 0.2 },
  // sea of clouds under the floating kingdom
  { seed: 3, center: [0, -26, -60], spread: [520, 10, 380], size: [60, 120], speed: 0.35, share: 0.3 },
  // high distant banks around the castle
  { seed: 4, center: [0, 34, -260], spread: [600, 40, 160], size: [50, 110], speed: 0.8, share: 0.2 },
] as const;

export function Cloudscape({ total }: { total: number }) {
  return (
    <group>
      {LAYERS.map((l) => (
        <CloudLayer
          key={l.seed}
          count={Math.max(8, Math.round(total * l.share))}
          seed={l.seed}
          center={l.center as unknown as [number, number, number]}
          spread={l.spread as unknown as [number, number, number]}
          size={l.size as unknown as [number, number]}
          speed={l.speed}
        />
      ))}
    </group>
  );
}
