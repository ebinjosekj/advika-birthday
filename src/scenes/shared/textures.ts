import * as THREE from 'three';
import { mulberry32 } from '../../utils/random';

const cache = new Map<string, THREE.Texture>();

function canvasTex(key: string, w: number, h: number, draw: (c: CanvasRenderingContext2D, w: number, h: number) => void, srgb = true) {
  const hit = cache.get(key);
  if (hit) return hit;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;
  draw(ctx, w, h);
  const tex = new THREE.CanvasTexture(canvas);
  if (srgb) tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  cache.set(key, tex);
  return tex;
}

/** Soft cumulus puff: many overlapping radial blobs, brighter on top. */
export function cloudTexture() {
  return canvasTex('cloud', 256, 256, (c, w, h) => {
    const rand = mulberry32(42);
    c.clearRect(0, 0, w, h);
    for (let i = 0; i < 46; i++) {
      const a = rand() * Math.PI * 2;
      const r = Math.pow(rand(), 0.7) * w * 0.26;
      const x = w / 2 + Math.cos(a) * r;
      const y = h / 2 + Math.sin(a) * r * 0.62;
      const s = w * (0.1 + rand() * 0.16);
      const g = c.createRadialGradient(x, y, 0, x, y, s);
      g.addColorStop(0, 'rgba(255,255,255,0.32)');
      g.addColorStop(0.6, 'rgba(255,255,255,0.12)');
      g.addColorStop(1, 'rgba(255,255,255,0)');
      c.fillStyle = g;
      c.fillRect(0, 0, w, h);
    }
  }, false);
}

export function glowTexture() {
  return canvasTex('glow', 128, 128, (c, w, h) => {
    const g = c.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(0.18, 'rgba(255,255,255,0.65)');
    g.addColorStop(0.5, 'rgba(255,255,255,0.14)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    c.fillStyle = g;
    c.fillRect(0, 0, w, h);
  }, false);
}

/** Ashlar stone in champagne/ivory with mortar lines; also used as a bump map. */
export function stoneTexture() {
  const t = canvasTex('stone', 512, 512, (c, w, h) => {
    const rand = mulberry32(7);
    c.fillStyle = '#d9c9b4';
    c.fillRect(0, 0, w, h);
    const rows = 12;
    const rh = h / rows;
    for (let r = 0; r < rows; r++) {
      let x = (r % 2) * -24;
      while (x < w) {
        const bw = 48 + rand() * 50;
        const l = 84 + rand() * 9;
        const hue = 32 + rand() * 14;
        c.fillStyle = `hsl(${hue} ${18 + rand() * 14}% ${l}%)`;
        c.fillRect(x + 2, r * rh + 2, bw - 4, rh - 4);
        // weathering speckle
        for (let k = 0; k < 14; k++) {
          c.fillStyle = `rgba(120,95,80,${rand() * 0.06})`;
          c.fillRect(x + rand() * bw, r * rh + rand() * rh, 2 + rand() * 6, 1 + rand() * 3);
        }
        x += bw;
      }
    }
  });
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

export function roofTexture(color = '#b9a3d9') {
  const t = canvasTex('roof' + color, 256, 256, (c, w, h) => {
    const base = new THREE.Color(color);
    c.fillStyle = color;
    c.fillRect(0, 0, w, h);
    const rand = mulberry32(3);
    const rows = 16;
    for (let r = 0; r < rows; r++) {
      for (let i = 0; i < 12; i++) {
        const x = i * (w / 12) + (r % 2) * (w / 24);
        const y = r * (h / rows);
        const col = base.clone().offsetHSL(0, 0, (rand() - 0.5) * 0.08);
        c.fillStyle = `#${col.getHexString()}`;
        c.beginPath();
        c.ellipse(x + w / 24, y + h / rows * 0.6, w / 26, h / rows * 0.75, 0, 0, Math.PI);
        c.fill();
        c.strokeStyle = 'rgba(60,30,70,0.18)';
        c.stroke();
      }
    }
  });
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

/** Butterfly wing (single wing, mirrored by geometry) with pastel gradient and markings. */
export function wingTexture(hueA: string, hueB: string) {
  return canvasTex('wing' + hueA + hueB, 128, 128, (c, w, h) => {
    c.clearRect(0, 0, w, h);
    const g = c.createLinearGradient(0, h, w, 0);
    g.addColorStop(0, hueB);
    g.addColorStop(1, hueA);
    c.fillStyle = g;
    c.beginPath();
    c.moveTo(4, h * 0.52);
    c.bezierCurveTo(w * 0.3, -h * 0.05, w * 1.02, h * 0.02, w * 0.96, h * 0.38);
    c.bezierCurveTo(w * 0.92, h * 0.52, w * 0.6, h * 0.56, w * 0.52, h * 0.55);
    c.bezierCurveTo(w * 0.8, h * 0.72, w * 0.72, h * 1.0, w * 0.44, h * 0.96);
    c.bezierCurveTo(w * 0.2, h * 0.92, w * 0.08, h * 0.7, 4, h * 0.52);
    c.fill();
    c.strokeStyle = 'rgba(70,40,80,0.55)';
    c.lineWidth = 3;
    c.stroke();
    c.globalCompositeOperation = 'source-atop';
    c.strokeStyle = 'rgba(80,50,90,0.25)';
    c.lineWidth = 1.2;
    for (let i = 0; i < 6; i++) {
      c.beginPath();
      c.moveTo(4, h * 0.52);
      c.quadraticCurveTo(w * 0.4, h * (0.2 + i * 0.12), w * (0.7 + (i % 2) * 0.2), h * (0.1 + i * 0.15));
      c.stroke();
    }
    c.fillStyle = 'rgba(255,255,255,0.75)';
    [[0.78, 0.26, 7], [0.62, 0.18, 4], [0.5, 0.8, 5]].forEach(([x, y, r]) => {
      c.beginPath();
      c.arc(w * x, h * y, r, 0, Math.PI * 2);
      c.fill();
    });
  });
}

export function candleTexture() {
  const t = canvasTex('candle', 64, 128, (c, w, h) => {
    c.fillStyle = '#fbf5ea';
    c.fillRect(0, 0, w, h);
    c.fillStyle = '#e8a9b9';
    for (let i = -4; i < 12; i++) {
      c.beginPath();
      c.moveTo(0, i * 18);
      c.lineTo(w, i * 18 + 28);
      c.lineTo(w, i * 18 + 36);
      c.lineTo(0, i * 18 + 8);
      c.fill();
    }
  });
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}
