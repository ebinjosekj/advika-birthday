import { useEffect, useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { world } from '../../app/store';
import { glowTexture } from '../shared/textures';
import { mulberry32 } from '../../utils/random';

const W = 3.2, H = 4.3, T = 0.75;

/** Leather cover painted in canvas: gold fillet border, floral corners, engraved title, glowing sigils. */
function useCoverTextures(ready: boolean) {
  return useMemo(() => {
    const size = 1024;
    const mk = () => {
      const c = document.createElement('canvas');
      c.width = size * (W / H);
      c.height = size;
      return c;
    };
    const color = mk();
    const glow = mk();
    const cw = color.width, ch = color.height;
    const ctx = color.getContext('2d')!;
    const g2 = glow.getContext('2d')!;
    // leather base
    const grad = ctx.createLinearGradient(0, 0, cw, ch);
    grad.addColorStop(0, '#6c4f8f');
    grad.addColorStop(0.5, '#5b3f7c');
    grad.addColorStop(1, '#4a3366');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, cw, ch);
    const rng = mulberry32(12);
    for (let i = 0; i < 9000; i++) {
      ctx.fillStyle = `rgba(${rng() > 0.5 ? '255,240,255' : '20,0,30'},${rng() * 0.05})`;
      ctx.fillRect(rng() * cw, rng() * ch, 1 + rng() * 3, 1 + rng() * 2);
    }
    g2.fillStyle = '#000';
    g2.fillRect(0, 0, cw, ch);
    const gold = '#e8c886';
    const both = (fn: (c: CanvasRenderingContext2D, isGlow: boolean) => void) => {
      fn(ctx, false);
      fn(g2, true);
    };
    both((c, isGlow) => {
      c.strokeStyle = isGlow ? '#7a5a20' : gold;
      c.lineWidth = 6;
      c.strokeRect(34, 34, cw - 68, ch - 68);
      c.lineWidth = 2;
      c.strokeRect(52, 52, cw - 104, ch - 104);
      // floral corners
      const corner = (x: number, y: number, sx: number, sy: number) => {
        c.save();
        c.translate(x, y);
        c.scale(sx, sy);
        c.lineWidth = 3;
        for (let k = 0; k < 3; k++) {
          c.beginPath();
          c.moveTo(0, 0);
          c.bezierCurveTo(40 + k * 18, 6, 70 + k * 20, 40, 50 + k * 30, 80 + k * 14);
          c.stroke();
        }
        for (let k = 0; k < 5; k++) {
          c.beginPath();
          c.ellipse(28 + k * 22, 18 + k * 16, 9, 5, 0.6, 0, Math.PI * 2);
          c.stroke();
        }
        c.restore();
      };
      corner(60, 60, 1, 1);
      corner(cw - 60, 60, -1, 1);
      corner(60, ch - 60, 1, -1);
      corner(cw - 60, ch - 60, -1, -1);
      // central medallion with seven-pointed star
      const cx = cw / 2, cy = ch * 0.62;
      c.lineWidth = 3;
      c.beginPath();
      c.arc(cx, cy, 120, 0, Math.PI * 2);
      c.stroke();
      c.beginPath();
      c.arc(cx, cy, 104, 0, Math.PI * 2);
      c.stroke();
      c.beginPath();
      for (let k = 0; k <= 14; k++) {
        const a = -Math.PI / 2 + (k / 14) * Math.PI * 2;
        const r = k % 2 ? 38 : 92;
        c.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
      }
      c.closePath();
      if (isGlow) {
        c.fillStyle = '#ffd98a';
        c.fill();
      } else {
        c.fillStyle = gold;
        c.globalAlpha = 0.85;
        c.fill();
        c.globalAlpha = 1;
      }
      // sigils around medallion
      c.font = '28px serif';
      c.fillStyle = isGlow ? '#ffe0a0' : gold;
      c.textAlign = 'center';
      '✦❋✧❀✦❋✧❀✦❋✧❀'.split('').forEach((ch2, k) => {
        const a = (k / 12) * Math.PI * 2;
        c.fillText(ch2, cx + Math.cos(a) * 150, cy + Math.sin(a) * 150 + 10);
      });
      // title
      c.fillStyle = isGlow ? '#5a4012' : gold;
      c.font = `italic 600 ${Math.round(cw * 0.105)}px "Cormorant Garamond", Georgia, serif`;
      c.fillText('Once Upon', cw / 2, ch * 0.2);
      c.font = `italic 600 ${Math.round(cw * 0.085)}px "Cormorant Garamond", Georgia, serif`;
      c.fillText('a Magical Time…', cw / 2, ch * 0.29);
      c.font = `500 ${Math.round(cw * 0.05)}px "Cormorant Garamond", Georgia, serif`;
      c.fillText('Advika', cw / 2, ch * 0.88);
    });
    const map = new THREE.CanvasTexture(color);
    map.colorSpace = THREE.SRGBColorSpace;
    map.anisotropy = 8;
    const emissive = new THREE.CanvasTexture(glow);
    emissive.colorSpace = THREE.SRGBColorSpace;
    return { map, emissive };
    // re-render once web fonts are ready
  }, [ready]); // eslint-disable-line react-hooks/exhaustive-deps
}

function pageEdgeTexture() {
  const c = document.createElement('canvas');
  c.width = 16;
  c.height = 256;
  const x = c.getContext('2d')!;
  for (let i = 0; i < 256; i += 2) {
    x.fillStyle = i % 4 ? '#f3e7cf' : '#e4d2ad';
    x.fillRect(0, i, 16, 2);
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export function MagicBook({ position }: { position: [number, number, number] }) {
  const [fontsReady, setFontsReady] = useState(false);
  useEffect(() => {
    let alive = true;
    document.fonts?.ready.then(() => alive && setFontsReady(true));
    return () => {
      alive = false;
    };
  }, []);
  const tex = useCoverTextures(fontsReady);
  const root = useRef<THREE.Group>(null);
  const cover = useRef<THREE.Group>(null);
  const pages = useRef<THREE.Group[]>([]);
  const glow = useRef<THREE.Sprite>(null);
  const light = useRef<THREE.PointLight>(null);
  const coverMat = useMemo(
    () => new THREE.MeshPhysicalMaterial({ map: tex.map, emissiveMap: tex.emissive, emissive: new THREE.Color('#ffffff'), emissiveIntensity: 0.6, roughness: 0.62, sheen: 0.6, sheenColor: new THREE.Color('#d8c0ff'), clearcoat: 0.25 }),
    [tex],
  );
  const leather = useMemo(() => new THREE.MeshPhysicalMaterial({ color: '#4f3870', roughness: 0.7, sheen: 0.5 }), []);
  const gold = useMemo(() => new THREE.MeshStandardMaterial({ color: '#e2c07a', metalness: 1, roughness: 0.25 }), []);
  const edge = useMemo(() => new THREE.MeshStandardMaterial({ map: pageEdgeTexture(), roughness: 0.9, emissive: '#3a2a10', emissiveIntensity: 0.0 }), []);
  const paper = useMemo(() => new THREE.MeshStandardMaterial({ color: '#f8efdc', roughness: 0.92, side: THREE.DoubleSide, emissive: '#ffd99a', emissiveIntensity: 0 }), []);
  const pageGeo = useMemo(() => {
    const g = new THREE.PlaneGeometry(W - 0.12, H - 0.16, 12, 1);
    g.translate((W - 0.12) / 2, 0, 0);
    return g;
  }, []);

  useFrame((st) => {
    const { book, pages: pg, light: lt } = world.intro;
    const t = st.clock.elapsedTime;
    if (root.current) {
      // gentle hover; the book turns to face the camera as it opens
      root.current.position.y = position[1] + Math.sin(t * 0.9) * 0.18 * (1 - book * 0.7);
      root.current.rotation.set(-0.12 + Math.sin(t * 0.6) * 0.03, Math.sin(t * 0.4) * 0.12 * (1 - book), Math.sin(t * 0.7) * 0.03);
      root.current.visible = world.intro.cam < 0.55;
    }
    if (cover.current) cover.current.rotation.y = -book * Math.PI * 0.96;
    pages.current.forEach((p, i) => {
      if (!p) return;
      const local = Math.min(1, Math.max(0, pg * 1.6 - i * 0.12));
      const e = local * local * (3 - 2 * local);
      p.rotation.y = -e * Math.PI * (0.9 - i * 0.04);
      // paper bends while turning
      const pos = (p.children[0] as THREE.Mesh).geometry.getAttribute('position') as THREE.BufferAttribute;
      void pos;
    });
    paper.emissiveIntensity = lt * 1.6;
    edge.emissiveIntensity = lt * 0.8;
    coverMat.emissiveIntensity = 0.45 + Math.sin(t * 2) * 0.15 + lt;
    if (glow.current) {
      const s = 0.01 + lt * 9 + Math.sin(t * 5) * lt * 0.4;
      glow.current.scale.set(s, s, 1);
      (glow.current.material as THREE.SpriteMaterial).opacity = Math.min(1, lt * 1.2);
    }
    if (light.current) light.current.intensity = lt * 40;
  });

  return (
    <group ref={root} position={position} scale={1.5}>
      <group position={[-W / 2, 0, 0]}>
        {/* back cover + spine + page block */}
        <mesh material={leather} position={[W / 2, 0, -T / 2]}>
          <boxGeometry args={[W + 0.1, H + 0.1, 0.08]} />
        </mesh>
        <mesh material={leather} position={[-0.02, 0, 0]}>
          <cylinderGeometry args={[T / 2, T / 2, H + 0.1, 16, 1, false, Math.PI, Math.PI]} />
        </mesh>
        {[-1, 1].map((s) => (
          <mesh key={s} material={gold} position={[-0.02, s * H * 0.36, 0]} rotation={[0, 0, Math.PI / 2]}>
            <torusGeometry args={[T / 2 + 0.01, 0.025, 6, 20, Math.PI]} />
          </mesh>
        ))}
        <mesh material={edge} position={[W / 2, 0, 0]}>
          <boxGeometry args={[W - 0.08, H - 0.12, T - 0.14]} />
        </mesh>
        {/* turning pages */}
        {Array.from({ length: 5 }, (_, i) => (
          <group key={i} ref={(el) => void (el && (pages.current[i] = el))} position={[0.02, 0, T / 2 - 0.08 - i * 0.002]}>
            <mesh geometry={pageGeo} material={paper} />
          </group>
        ))}
        {/* front cover on its hinge */}
        <group ref={cover} position={[0, 0, T / 2]}>
          <mesh material={coverMat} position={[W / 2 + 0.05, 0, 0]}>
            <boxGeometry args={[W + 0.1, H + 0.1, 0.08]} />
          </mesh>
          {[[0.15, 0.15], [W - 0.05, 0.15], [0.15, H - 0.05], [W - 0.05, H - 0.05]].map(([x, y], i) => (
            <mesh key={i} material={gold} position={[x, y - H / 2 - 0.05, 0.06]}>
              <boxGeometry args={[0.3, 0.3, 0.05]} />
            </mesh>
          ))}
        </group>
      </group>
      <sprite ref={glow} position={[0, 0, T / 2 + 0.3]}>
        <spriteMaterial map={glowTexture()} color="#ffe2a6" transparent depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} />
      </sprite>
      <pointLight ref={light} position={[0, 0, 2]} color="#ffd89a" distance={30} decay={1.5} />
    </group>
  );
}
