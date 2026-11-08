import { use } from 'react';
import * as THREE from 'three';

/**
 * Real-world CC0 assets (Poly Haven HDRIs, photographic cloud, scanned normal
 * maps) shipped as base64 modules by @pmndrs/assets. Each is code-split and
 * loaded once; components read them with React 19 `use()` inside Suspense.
 */
const urls = {
  hdriSunset: import('@pmndrs/assets/hdri/sunset.exr').then((m) => m.default as string),
  cloud: import('@pmndrs/assets/textures/cloud.webp').then((m) => m.default as string),
  nStone: import('@pmndrs/assets/normals/0024.webp').then((m) => m.default as string),
  nRock: import('@pmndrs/assets/normals/0005.webp').then((m) => m.default as string),
  nGround: import('@pmndrs/assets/normals/0002.webp').then((m) => m.default as string),
  nBark: import('@pmndrs/assets/normals/0003.webp').then((m) => m.default as string),
  nTiles: import('@pmndrs/assets/normals/0025.webp').then((m) => m.default as string),
};
export type AssetKey = keyof typeof urls;

const texCache = new Map<string, Promise<THREE.Texture>>();
const loader = new THREE.TextureLoader();

function loadTexture(key: AssetKey, color: boolean): Promise<THREE.Texture> {
  const id = key + (color ? ':srgb' : ':linear');
  let p = texCache.get(id);
  if (!p) {
    p = urls[key].then(
      (u) =>
        new Promise<THREE.Texture>((resolve, reject) =>
          loader.load(
            u,
            (t) => {
              t.colorSpace = color ? THREE.SRGBColorSpace : THREE.NoColorSpace;
              t.wrapS = t.wrapT = THREE.RepeatWrapping;
              t.anisotropy = 8;
              resolve(t);
            },
            undefined,
            reject,
          ),
        ),
    );
    texCache.set(id, p);
  }
  return p;
}

export const useAssetUrl = (key: AssetKey) => use(urls[key]);

const variants = new Map<string, THREE.Texture>();

/** One shared texture per (asset, repeat) so materials can tile differently without re-uploading. */
export function useAssetTexture(key: AssetKey, { color = false, repeat = 1 }: { color?: boolean; repeat?: number } = {}) {
  const base = use(loadTexture(key, color));
  const id = `${key}:${color}:${repeat}`;
  let t = variants.get(id);
  if (!t) {
    t = base.clone();
    t.repeat.set(repeat, repeat);
    t.needsUpdate = true;
    variants.set(id, t);
  }
  return t;
}
