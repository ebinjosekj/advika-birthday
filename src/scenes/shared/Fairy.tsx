import { useMagic } from '../../app/store';
import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { globalUniforms } from './uniforms';
import { particles } from './Particles';
import { makeFlowerGeometry, PASTELS } from './Vegetation';
import { glowTexture } from './textures';

/**
 * Procedurally modelled fairy (original design — no external model available in
 * this sandbox). Face, hair, bodice, petal skirt, limbs and four iridescent wings
 * are separate parts animated by a small procedural rig: wing flapping, body
 * pitch/bank from velocity, spring-simulated hair, idle limb motion.
 */

const SKIN = '#f6d0bf';
const HAIR = '#d99a74';

function faceTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const x = c.getContext('2d')!;
  x.clearRect(0, 0, 256, 256);
  // blush
  [[78, 150], [178, 150]].forEach(([cx, cy]) => {
    const g = x.createRadialGradient(cx, cy, 0, cx, cy, 30);
    g.addColorStop(0, 'rgba(240,140,150,0.45)');
    g.addColorStop(1, 'rgba(240,140,150,0)');
    x.fillStyle = g;
    x.fillRect(cx - 30, cy - 30, 60, 60);
  });
  // eyes
  [[92, 118], [164, 118]].forEach(([cx, cy], i) => {
    x.fillStyle = '#ffffff';
    x.beginPath();
    x.ellipse(cx, cy, 19, 22, 0, 0, Math.PI * 2);
    x.fill();
    const ig = x.createRadialGradient(cx, cy + 2, 2, cx, cy + 2, 16);
    ig.addColorStop(0, '#2a1840');
    ig.addColorStop(0.55, '#6b4fa0');
    ig.addColorStop(1, '#3a2560');
    x.fillStyle = ig;
    x.beginPath();
    x.ellipse(cx, cy + 3, 14, 17, 0, 0, Math.PI * 2);
    x.fill();
    x.fillStyle = '#ffffff';
    x.beginPath();
    x.arc(cx + 5, cy - 4, 5, 0, Math.PI * 2);
    x.fill();
    x.beginPath();
    x.arc(cx - 5, cy + 9, 2.4, 0, Math.PI * 2);
    x.fill();
    // lashes + lid line
    x.strokeStyle = '#3b2340';
    x.lineWidth = 4;
    x.beginPath();
    x.ellipse(cx, cy + 2, 21, 24, 0, Math.PI * 1.08, Math.PI * 1.92);
    x.stroke();
    x.lineWidth = 3;
    const dir = i === 0 ? -1 : 1;
    x.beginPath();
    x.moveTo(cx + dir * 19, cy - 10);
    x.lineTo(cx + dir * 28, cy - 17);
    x.stroke();
    // brows
    x.strokeStyle = 'rgba(150,90,70,0.8)';
    x.lineWidth = 3.5;
    x.beginPath();
    x.moveTo(cx - 16, cy - 36);
    x.quadraticCurveTo(cx, cy - 44, cx + 16, cy - 37);
    x.stroke();
  });
  // nose + smile
  x.strokeStyle = 'rgba(200,120,110,0.6)';
  x.lineWidth = 2.5;
  x.beginPath();
  x.moveTo(126, 150);
  x.quadraticCurveTo(128, 156, 131, 151);
  x.stroke();
  x.strokeStyle = '#c45b74';
  x.lineWidth = 4;
  x.lineCap = 'round';
  x.beginPath();
  x.moveTo(112, 172);
  x.quadraticCurveTo(128, 186, 144, 172);
  x.stroke();
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function wingShape(upper: boolean) {
  const s = new THREE.Shape();
  if (upper) {
    s.moveTo(0, 0);
    s.bezierCurveTo(0.12, 0.2, 0.42, 0.52, 0.62, 0.5);
    s.bezierCurveTo(0.74, 0.48, 0.72, 0.3, 0.6, 0.2);
    s.bezierCurveTo(0.42, 0.06, 0.2, -0.02, 0, 0);
  } else {
    s.moveTo(0, 0);
    s.bezierCurveTo(0.1, -0.06, 0.34, -0.2, 0.42, -0.34);
    s.bezierCurveTo(0.46, -0.44, 0.34, -0.46, 0.26, -0.38);
    s.bezierCurveTo(0.14, -0.26, 0.04, -0.1, 0, 0);
  }
  const g = new THREE.ShapeGeometry(s, 24);
  // UVs normalised to the bounding box for the vein shader
  g.computeBoundingBox();
  const bb = g.boundingBox!;
  const p = g.getAttribute('position') as THREE.BufferAttribute;
  const uv = new Float32Array(p.count * 2);
  for (let i = 0; i < p.count; i++) {
    uv[i * 2] = (p.getX(i) - bb.min.x) / (bb.max.x - bb.min.x);
    uv[i * 2 + 1] = (p.getY(i) - bb.min.y) / (bb.max.y - bb.min.y);
    // slight camber so wings catch light
    p.setZ(i, Math.sin(uv[i * 2] * Math.PI) * 0.03);
  }
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  g.computeVertexNormals();
  return g;
}

function wingMaterial() {
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    uniforms: { uTime: globalUniforms.uTime },
    vertexShader: `varying vec2 vUv; varying vec3 vN; varying vec3 vV;
      void main(){ vUv=uv; vec4 w = modelMatrix*vec4(position,1.0); vN = normalize(mat3(modelMatrix)*normal); vV = normalize(cameraPosition - w.xyz);
        gl_Position = projectionMatrix*viewMatrix*w; }`,
    fragmentShader: `uniform float uTime; varying vec2 vUv; varying vec3 vN; varying vec3 vV;
      vec3 hue(float h){ return clamp(abs(mod(h*6.0+vec3(0,4,2),6.0)-3.0)-1.0,0.0,1.0); }
      void main(){
        float ndv = abs(dot(normalize(vN), normalize(vV)));
        float fres = pow(1.0-ndv, 2.0);
        // branching veins radiating from the root
        float ang = atan(vUv.y-0.05, vUv.x+0.02);
        float veins = smoothstep(0.92, 1.0, abs(sin(ang*14.0)));
        float cells = smoothstep(0.9,1.0, abs(sin(length(vUv)*26.0 - ang*3.0)));
        vec3 irid = hue(0.72 + fres*0.35 + vUv.x*0.15 + sin(uTime*0.6)*0.04)*0.6 + 0.4;
        vec3 c = mix(vec3(0.95,0.9,1.0), irid, 0.55);
        c += vec3(1.0,0.92,0.7) * (veins*0.6 + cells*0.25);
        float a = 0.22 + fres*0.45 + veins*0.35 + cells*0.12;
        gl_FragColor = vec4(c*1.15, a);
      }`,
  });
}

export interface FairyDriver {
  /** desired world position this frame */
  target: (time: number, out: THREE.Vector3) => boolean;
  scale?: number;
  trail?: number;
}

const tmpV = new THREE.Vector3();
const trailColor = new THREE.Color();
const sPrev = new THREE.Vector3();
const sVel = new THREE.Vector3();
const sToCam = new THREE.Vector3();
const sLocalVel = new THREE.Vector3();
const sInvQ = new THREE.Quaternion();
const sRest = new THREE.Vector3();
const sForce = new THREE.Vector3();
const sDelta = new THREE.Vector3();
const sWand = new THREE.Vector3();
const HAIR_ANCHOR = new THREE.Vector3(0, 0.86, -0.12);

export function Fairy({ driver, trailRate = 40 }: { driver: FairyDriver; trailRate?: number }) {
  const root = useRef<THREE.Group>(null);
  const body = useRef<THREE.Group>(null);
  const wings = useRef<THREE.Group[]>([]);
  const armL = useRef<THREE.Group>(null);
  const armR = useRef<THREE.Group>(null);
  const legL = useRef<THREE.Group>(null);
  const legR = useRef<THREE.Group>(null);
  const head = useRef<THREE.Group>(null);
  const hair = useRef<THREE.Mesh[]>([]);
  const vel = useRef(new THREE.Vector3());
  const hairState = useRef(Array.from({ length: 7 }, () => ({ p: new THREE.Vector3(), v: new THREE.Vector3() })));
  const trailAcc = useRef(0);
  const initialised = useRef(false);

  const mats = useMemo(
    () => ({
      skin: new THREE.MeshPhysicalMaterial({ color: SKIN, roughness: 0.55, sheen: 0.8, sheenColor: new THREE.Color('#ffd9d0'), sheenRoughness: 0.6 }),
      face: new THREE.MeshStandardMaterial({ map: faceTexture(), transparent: true, roughness: 0.6, polygonOffset: true, polygonOffsetFactor: -2 }),
      hair: new THREE.MeshPhysicalMaterial({ color: HAIR, roughness: 0.38, sheen: 1, sheenColor: new THREE.Color('#ffe3c4'), clearcoat: 0.3 }),
      dress: new THREE.MeshPhysicalMaterial({ color: '#cbb4ec', roughness: 0.45, sheen: 1, sheenColor: new THREE.Color('#ffffff'), sheenRoughness: 0.35 }),
      petal: new THREE.MeshPhysicalMaterial({ color: '#f2b8c6', roughness: 0.4, sheen: 1, sheenColor: new THREE.Color('#fff4f8'), side: THREE.DoubleSide }),
      petal2: new THREE.MeshPhysicalMaterial({ color: '#d6c4f2', roughness: 0.4, sheen: 1, side: THREE.DoubleSide }),
      tulle: new THREE.MeshPhysicalMaterial({ color: '#fbe9f2', roughness: 0.3, transparent: true, opacity: 0.55, side: THREE.DoubleSide, sheen: 1 }),
      gold: new THREE.MeshStandardMaterial({ color: '#e2c07a', metalness: 1, roughness: 0.25 }),
      star: new THREE.MeshStandardMaterial({ color: '#fff1c4', emissive: '#ffd27a', emissiveIntensity: 3, toneMapped: false }),
      slipper: new THREE.MeshPhysicalMaterial({ color: '#a9c6e3', roughness: 0.35, sheen: 1 }),
      wing: wingMaterial(),
      crown: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.5 }),
    }),
    [],
  );
  const geos = useMemo(() => {
    const bodice = new THREE.LatheGeometry(
      [[0.0, 0.44], [0.062, 0.45], [0.07, 0.5], [0.088, 0.57], [0.092, 0.62], [0.078, 0.67], [0.05, 0.7], [0.0, 0.705]].map(([r, y]) => new THREE.Vector2(r, y)),
      28,
    );
    const tulle = new THREE.LatheGeometry([[0.06, 0.46], [0.12, 0.4], [0.2, 0.3], [0.24, 0.24]].map(([r, y]) => new THREE.Vector2(r, y)), 28);
    const petal = new THREE.SphereGeometry(1, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.6);
    petal.scale(0.11, 0.24, 0.05);
    petal.rotateX(Math.PI);
    const star = new THREE.ExtrudeGeometry(
      (() => {
        const s = new THREE.Shape();
        for (let i = 0; i <= 10; i++) {
          const a = Math.PI / 2 + (i / 10) * Math.PI * 2;
          const r = i % 2 ? 0.018 : 0.045;
          if (i === 0) s.moveTo(Math.cos(a) * r, Math.sin(a) * r);
          else s.lineTo(Math.cos(a) * r, Math.sin(a) * r);
        }
        return s;
      })(),
      { depth: 0.012, bevelEnabled: true, bevelSize: 0.005, bevelThickness: 0.004, bevelSegments: 2 },
    );
    const flower = makeFlowerGeometry();
    const crownColors = flower.getAttribute('color').clone();
    return { bodice, tulle, petal, star, flower, crownColors, wingU: wingShape(true), wingL: wingShape(false) };
  }, []);

  const crown = useMemo(
    () =>
      PASTELS.slice(0, 6).map((c, i) => {
        const g = geos.flower.clone();
        const col = g.getAttribute('color') as THREE.BufferAttribute;
        const tint = new THREE.Color(c);
        for (let k = 0; k < col.count; k++) {
          if (col.getX(k) > 0.95 && col.getY(k) > 0.95) col.setXYZ(k, tint.r, tint.g, tint.b);
        }
        const a = (i / 6) * Math.PI * 1.2 - Math.PI * 0.1;
        return { g, a };
      }),
    [geos],
  );

  useFrame((st, dtRaw) => {
    const dt = Math.min(dtRaw, 0.05);
    const t = st.clock.elapsedTime;
    const r = root.current;
    if (!r) return;
    const visible = driver.target(t, tmpV);
    if (!visible) {
      // parked at near-zero scale rather than .visible=false so shaders stay precompiled
      r.scale.setScalar(0.0001);
      initialised.current = false;
      return;
    }
    if (!initialised.current) {
      r.position.copy(tmpV);
      vel.current.set(0, 0, 0);
      hairState.current.forEach((h) => h.p.set(0, 0.8, -0.1));
      initialised.current = true;
    }
    // critically-damped follow
    const prev = sPrev.copy(r.position);
    const k = 1 - Math.exp(-dt * 3.2);
    r.position.lerp(tmpV, k);
    const v = sVel.copy(r.position).sub(prev).divideScalar(Math.max(dt, 1e-4));
    vel.current.lerp(v, 1 - Math.exp(-dt * 6));
    const speed = vel.current.length();
    const flying = Math.min(1, speed / 6);
    // face direction of travel when moving, the camera when hovering
    const toCam = sToCam.copy(st.camera.position).sub(r.position);
    const dir = flying > 0.2 ? vel.current : toCam;
    const yaw = Math.atan2(dir.x, dir.z);
    let dy = yaw - r.rotation.y;
    dy = Math.atan2(Math.sin(dy), Math.cos(dy));
    r.rotation.y += dy * (1 - Math.exp(-dt * 4));
    const scale = driver.scale ?? 1;
    r.scale.setScalar(scale);
    if (body.current) {
      body.current.rotation.x = flying * 0.95 + Math.sin(t * 1.3) * 0.05; // lean into flight
      body.current.rotation.z = -dy * 0.6 * flying + Math.sin(t * 0.9) * 0.04; // bank into turns
      body.current.position.y = Math.sin(t * 2.2) * 0.03 * (1 - flying);
    }
    // wings: fast flap in flight, slower shimmering beat while hovering
    const freq = 10 + flying * 14;
    const amp = 0.45 + flying * 0.35;
    wings.current.forEach((w, i) => {
      if (!w) return;
      const side = i % 2 === 0 ? 1 : -1;
      const lower = i >= 2;
      const ph = t * freq + (lower ? 0.6 : 0);
      w.rotation.y = side * (-0.35 - Math.sin(ph) * amp);
      w.rotation.z = side * (lower ? -0.15 : 0.12) + Math.cos(ph) * 0.12 * side;
    });
    // limbs
    if (armL.current && armR.current) {
      armL.current.rotation.set(0.2 + flying * 0.9 + Math.sin(t * 1.4) * 0.12, 0, 0.35 + Math.sin(t * 1.1) * 0.1);
      armR.current.rotation.set(-0.4 - Math.sin(t * 1.8) * 0.25 * (1 - flying) + flying * 0.6, 0, -0.5 - Math.sin(t * 1.2) * 0.1);
    }
    if (legL.current && legR.current) {
      legL.current.rotation.x = 0.15 + flying * 0.55 + Math.sin(t * 2.0) * 0.12;
      legR.current.rotation.x = 0.35 + flying * 0.4 + Math.sin(t * 2.0 + 1.6) * 0.15;
    }
    if (head.current) {
      head.current.rotation.x = -flying * 0.6 + Math.sin(t * 0.8) * 0.05;
      head.current.rotation.y = Math.sin(t * 0.5) * 0.25 * (1 - flying);
    }
    // spring-chain ponytail in local space; velocity pushes it back
    const localVel = sLocalVel.copy(vel.current).applyQuaternion(sInvQ.copy(r.quaternion).invert()).divideScalar(scale);
    const anchor = HAIR_ANCHOR;
    hairState.current.forEach((h, i) => {
      const parent = i === 0 ? anchor : hairState.current[i - 1].p;
      const rest = sRest.copy(parent).add(sDelta.set(Math.sin(t * 2 + i) * 0.006, -0.035 - i * 0.002, -0.03)).addScaledVector(localVel, -0.012 * (i + 1));
      const f = sForce.copy(rest).sub(h.p).multiplyScalar(90);
      h.v.addScaledVector(f, dt).multiplyScalar(Math.exp(-dt * 9));
      h.p.addScaledVector(h.v, dt);
      const d = sDelta.copy(h.p).sub(parent);
      const L = 0.05;
      if (d.length() > L) h.p.copy(parent).addScaledVector(d.normalize(), L);
      const m = hair.current[i];
      if (m) m.position.copy(h.p);
    });
    // sparkle trail
    trailAcc.current += dt * trailRate * (0.3 + flying);
    while (trailAcc.current > 1) {
      trailAcc.current -= 1;
      const wand = sWand.set(-0.2, 0.55, 0.12).multiplyScalar(scale).applyQuaternion(r.quaternion).add(r.position);
      trailColor.set(Math.random() > 0.5 ? '#ffe3a3' : '#f6c6e6');
      particles.spawn(wand.x, wand.y, wand.z, (Math.random() - 0.5) * 0.4, -0.2 - Math.random() * 0.3, (Math.random() - 0.5) * 0.4, trailColor, 1.4 + Math.random(), 0.035 + Math.random() * 0.04);
    }
  });

  const limb = (len: number, rad: number, mat: THREE.Material) => (
    <mesh material={mat} position={[0, -len / 2, 0]} castShadow>
      <capsuleGeometry args={[rad, len, 4, 10]} />
    </mesh>
  );

  const lowQuality = useMagic.getState().quality === 'low';
  return (
    <group ref={root}>
      {/* soft aura so she reads as a creature of light at a distance */}
      <sprite position={[0, 0.6, 0]} scale={[1.6, 1.6, 1]}>
        <spriteMaterial map={glowTexture()} color="#ffe7c2" transparent opacity={0.55} depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} />
      </sprite>
      {/* her own little light — skipped on phones, where every extra light is paid for by every pixel */}
      {!lowQuality && <pointLight position={[0, 0.6, 0.2]} color="#ffdcae" intensity={2.5} distance={4} decay={2} />}
      <group ref={body}>
        {/* torso */}
        <mesh geometry={geos.bodice} material={mats.dress} castShadow />
        <mesh position={[0, 0.455, 0]} rotation={[Math.PI / 2, 0, 0]} material={mats.gold}>
          <torusGeometry args={[0.066, 0.008, 6, 28]} />
        </mesh>
        {/* skirt: tulle underlayer + two rings of petals */}
        <mesh geometry={geos.tulle} material={mats.tulle} />
        {Array.from({ length: 9 }, (_, i) => (
          <mesh key={i} geometry={geos.petal} material={i % 2 ? mats.petal : mats.petal2} position={[Math.sin((i / 9) * Math.PI * 2) * 0.08, 0.46, Math.cos((i / 9) * Math.PI * 2) * 0.08]} rotation={[0.45, (i / 9) * Math.PI * 2, 0]} castShadow />
        ))}
        {Array.from({ length: 7 }, (_, i) => (
          <mesh key={'b' + i} geometry={geos.petal} material={mats.petal2} scale={0.8} position={[Math.sin((i / 7) * Math.PI * 2 + 0.4) * 0.1, 0.4, Math.cos((i / 7) * Math.PI * 2 + 0.4) * 0.1]} rotation={[0.7, (i / 7) * Math.PI * 2 + 0.4, 0]} />
        ))}
        {/* neck & head */}
        <mesh material={mats.skin} position={[0, 0.725, 0]}>
          <cylinderGeometry args={[0.024, 0.03, 0.06, 10]} />
        </mesh>
        <group ref={head} position={[0, 0.82, 0]}>
          <mesh material={mats.skin} scale={[1, 1.06, 0.98]} castShadow>
            <sphereGeometry args={[0.105, 32, 24]} />
          </mesh>
          <mesh material={mats.face} scale={[1, 1.06, 0.98]}>
            <sphereGeometry args={[0.1056, 32, 20, Math.PI / 2 - Math.PI * 0.36, Math.PI * 0.72, Math.PI * 0.26, Math.PI * 0.5]} />
          </mesh>
          {/* pointed ears */}
          {[-1, 1].map((s) => (
            <mesh key={s} material={mats.skin} position={[s * 0.1, 0.0, -0.01]} rotation={[0, 0, -s * 1.1]}>
              <coneGeometry args={[0.022, 0.07, 8]} />
            </mesh>
          ))}
          {/* hair cap, side locks and bangs */}
          <mesh material={mats.hair} position={[0, 0.012, -0.012]} scale={[1.08, 1.08, 1.1]}>
            <sphereGeometry args={[0.105, 32, 20, 0, Math.PI * 2, 0, Math.PI * 0.56]} />
          </mesh>
          <mesh material={mats.hair} position={[0, 0.0, -0.03]} scale={[1.07, 1.1, 1.0]}>
            <sphereGeometry args={[0.105, 24, 16, Math.PI * 1.15, Math.PI * 0.7, 0.2, Math.PI * 0.75]} />
          </mesh>
          {[-0.05, -0.015, 0.025, 0.058].map((x, i) => (
            <mesh key={i} material={mats.hair} position={[x, 0.07, 0.078]} rotation={[0.6, 0, x * 4]} scale={[0.032, 0.02, 0.05]}>
              <sphereGeometry args={[1, 10, 8]} />
            </mesh>
          ))}
          {[-1, 1].map((s) => (
            <mesh key={'lock' + s} material={mats.hair} position={[s * 0.098, -0.05, 0.02]} scale={[0.02, 0.07, 0.03]}>
              <sphereGeometry args={[1, 10, 8]} />
            </mesh>
          ))}
          {/* flower crown */}
          {crown.map((c, i) => (
            <mesh key={i} geometry={c.g} material={mats.crown} scale={0.11} position={[Math.sin(c.a - Math.PI * 0.5) * 0.1, 0.075 - 0.02 * Math.abs(Math.cos(c.a)), Math.cos(c.a - Math.PI * 0.5) * 0.1 - 0.0]} rotation={[0, c.a, 0.5]} />
          ))}
        </group>
        {/* ponytail chain is in body space */}
        {Array.from({ length: 7 }, (_, i) => (
          <mesh key={'h' + i} ref={(el) => void (el && (hair.current[i] = el))} material={mats.hair} scale={0.034 - i * 0.0035}>
            <sphereGeometry args={[1, 12, 10]} />
          </mesh>
        ))}
        {/* arms */}
        <group ref={armL} position={[0.085, 0.665, 0]}>
          {limb(0.2, 0.018, mats.skin)}
        </group>
        <group ref={armR} position={[-0.085, 0.665, 0]}>
          {limb(0.2, 0.018, mats.skin)}
          <group position={[0, -0.25, 0.02]} rotation={[-1.2, 0, 0]}>
            <mesh material={mats.gold} position={[0, 0.1, 0]}>
              <cylinderGeometry args={[0.006, 0.008, 0.2, 6]} />
            </mesh>
            <mesh geometry={geos.star} material={mats.star} position={[0, 0.22, -0.006]} />
          </group>
        </group>
        {/* legs */}
        <group ref={legL} position={[0.035, 0.42, 0]}>
          {limb(0.3, 0.021, mats.skin)}
          <mesh material={mats.slipper} position={[0, -0.36, 0.02]} scale={[1, 0.8, 1.6]}>
            <sphereGeometry args={[0.028, 12, 8]} />
          </mesh>
        </group>
        <group ref={legR} position={[-0.035, 0.42, 0]}>
          {limb(0.3, 0.021, mats.skin)}
          <mesh material={mats.slipper} position={[0, -0.36, 0.02]} scale={[1, 0.8, 1.6]}>
            <sphereGeometry args={[0.028, 12, 8]} />
          </mesh>
        </group>
        {/* wings at the shoulder blades */}
        {[
          { g: geos.wingU, side: 1 },
          { g: geos.wingU, side: -1 },
          { g: geos.wingL, side: 1 },
          { g: geos.wingL, side: -1 },
        ].map((w, i) => (
          <group key={i} ref={(el) => void (el && (wings.current[i] = el))} position={[w.side * 0.02, 0.63, -0.07]}>
            <mesh geometry={w.g} material={mats.wing} scale={[w.side * 1, 1, 1]} rotation={[0, 0, 0]} />
          </group>
        ))}
      </group>
    </group>
  );
}
