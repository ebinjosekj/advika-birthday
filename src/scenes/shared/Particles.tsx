import { useEffect, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { burstQueue } from '../../animations/particleEffects/bursts';

/** One pooled particle system for every sparkle in the world (bursts, trails, wishes). */
class Pool {
  n = 0;
  head = 0;
  pos!: Float32Array;
  vel!: Float32Array;
  col!: Float32Array;
  life!: Float32Array; // remaining
  maxLife!: Float32Array;
  size!: Float32Array;
  alive!: Float32Array; // 0..1 alpha passed to shader
  allocate(n: number) {
    this.n = n;
    this.head = 0;
    this.pos = new Float32Array(n * 3);
    this.vel = new Float32Array(n * 3);
    this.col = new Float32Array(n * 3);
    this.life = new Float32Array(n);
    this.maxLife = new Float32Array(n).fill(1);
    this.size = new Float32Array(n);
    this.alive = new Float32Array(n);
  }
  spawn(x: number, y: number, z: number, vx: number, vy: number, vz: number, c: THREE.Color, life: number, size: number) {
    if (!this.n) return;
    const i = this.head;
    this.head = (this.head + 1) % this.n;
    this.pos.set([x, y, z], i * 3);
    this.vel.set([vx, vy, vz], i * 3);
    this.col.set([c.r, c.g, c.b], i * 3);
    this.life[i] = life;
    this.maxLife[i] = life;
    this.size[i] = size;
  }
}

export const particles = new Pool();
const tmpColor = new THREE.Color();
const sparkColor = new THREE.Color();

export function ParticleField({ max }: { max: number }) {
  const { geo, mat } = useMemo(() => {
    particles.allocate(max);
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(particles.pos, 3).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('color', new THREE.BufferAttribute(particles.col, 3).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('aSize', new THREE.BufferAttribute(particles.size, 1).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('aAlpha', new THREE.BufferAttribute(particles.alive, 1).setUsage(THREE.DynamicDrawUsage));
    const m = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      vertexColors: true,
      vertexShader: `attribute float aSize; attribute float aAlpha; varying vec3 vC; varying float vA;
        void main(){ vC = color; vA = aAlpha; vec4 mv = modelViewMatrix*vec4(position,1.0);
          gl_PointSize = aSize * 300.0 / max(0.5, -mv.z) * (0.4 + aAlpha*0.6); gl_Position = projectionMatrix*mv; }`,
      fragmentShader: `varying vec3 vC; varying float vA;
        void main(){ vec2 c = gl_PointCoord-0.5; float d=length(c);
          float core = smoothstep(0.5,0.0,d); float star = max(0.0, 1.0 - abs(c.x*c.y)*90.0) * smoothstep(0.5,0.1,d);
          float a = (core*core + star*0.6) * vA; if(a<0.01) discard; gl_FragColor = vec4(vC*a*1.5, a); }`,
    });
    return { geo: g, mat: m };
  }, [max]);

  useEffect(() => () => particles.allocate(0), []);

  useFrame((_, dtRaw) => {
    const dt = Math.min(dtRaw, 0.05);
    while (burstQueue.length) {
      const b = burstQueue.shift()!;
      tmpColor.set(b.color);
      for (let k = 0; k < b.count; k++) {
        const u = Math.random() * 2 - 1, th = Math.random() * Math.PI * 2;
        const s = Math.sqrt(1 - u * u);
        const sp = b.speed * (0.3 + Math.random() * 0.7);
        const c = sparkColor.copy(tmpColor).offsetHSL((Math.random() - 0.5) * 0.15, 0, (Math.random() - 0.3) * 0.2);
        particles.spawn(b.pos[0], b.pos[1], b.pos[2], s * Math.cos(th) * sp, u * sp + b.speed * 0.25, s * Math.sin(th) * sp, c, 1.2 + Math.random() * 1.6, 0.05 + Math.random() * 0.08);
      }
    }
    const { n, pos, vel, life, maxLife, alive } = particles;
    const drag = Math.exp(-dt * 1.6);
    for (let i = 0; i < n; i++) {
      if (life[i] <= 0) {
        if (alive[i] !== 0) alive[i] = 0;
        continue;
      }
      life[i] -= dt;
      const j = i * 3;
      vel[j] *= drag;
      vel[j + 1] = vel[j + 1] * drag + 0.25 * dt;
      vel[j + 2] *= drag;
      pos[j] += vel[j] * dt;
      pos[j + 1] += vel[j + 1] * dt;
      pos[j + 2] += vel[j + 2] * dt;
      const t = life[i] / maxLife[i];
      alive[i] = Math.max(0, Math.min(1, t * 2.2)) * (0.75 + 0.25 * Math.sin(life[i] * 30 + i));
    }
    geo.attributes.position.needsUpdate = true;
    geo.attributes.color.needsUpdate = true;
    geo.attributes.aSize.needsUpdate = true;
    geo.attributes.aAlpha.needsUpdate = true;
  });
  return <points geometry={geo} material={mat} frustumCulled={false} />;
}
