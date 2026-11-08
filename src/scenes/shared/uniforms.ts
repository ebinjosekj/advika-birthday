import * as THREE from 'three';

/** Uniforms shared by every animated shader in the world; updated once per frame. */
export const globalUniforms = {
  uTime: { value: 0 },
  uWind: { value: 1 },
  uMood: { value: 0 },
};

/**
 * Patches a standard material so vertices sway in the wind. Movement grows with
 * height above the mesh origin (so trunks/stems stay rooted) and the phase comes
 * from world position, so neighbouring plants move as a gust passes, not in sync.
 */
export function applyWind<T extends THREE.Material>(mat: T, opts: { strength?: number; height?: number; flutter?: number } = {}): T {
  const strength = opts.strength ?? 0.15;
  const height = opts.height ?? 1;
  const flutter = opts.flutter ?? 0;
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = globalUniforms.uTime;
    shader.uniforms.uWind = globalUniforms.uWind;
    shader.vertexShader = shader.vertexShader
      .replace(
        '#include <common>',
        `#include <common>
         uniform float uTime; uniform float uWind;`,
      )
      .replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
         vec4 wOrigin = modelMatrix * vec4(0.0,0.0,0.0,1.0);
         #ifdef USE_INSTANCING
           wOrigin = modelMatrix * instanceMatrix * vec4(0.0,0.0,0.0,1.0);
         #endif
         float hgt = max(position.y, 0.0) / ${height.toFixed(3)};
         float bend = hgt * hgt;
         float gust = sin(uTime * 0.35 + wOrigin.x * 0.035) * 0.5 + 0.5;
         float ph = uTime * 1.6 + wOrigin.x * 0.21 + wOrigin.z * 0.17;
         float sway = (sin(ph) * 0.7 + sin(ph * 2.3 + 1.7) * 0.3) * (0.55 + gust * 0.9);
         transformed.x += sway * ${strength.toFixed(3)} * bend * uWind;
         transformed.z += cos(ph * 0.8) * ${(strength * 0.6).toFixed(3)} * bend * uWind;
         ${flutter > 0 ? `transformed += normal * sin(uTime * 7.0 + position.x * 9.0 + position.z * 7.0 + wOrigin.x) * ${flutter.toFixed(3)} * hgt;` : ''}`,
      );
  };
  mat.customProgramCacheKey = () => `wind-${strength}-${height}-${flutter}`;
  return mat;
}
