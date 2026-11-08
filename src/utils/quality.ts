export type QualityLevel = 'high' | 'medium' | 'low';

export interface QualityProfile {
  level: QualityLevel;
  dpr: [number, number];
  shadows: boolean;
  shadowMapSize: number;
  post: 'full' | 'lite' | 'none';
  grass: number;
  flowers: number;
  trees: number;
  clouds: number;
  particles: number;
  butterflies: number;
  fireflies: number;
  antialias: boolean;
}

export const QUALITY_PROFILES: Record<QualityLevel, QualityProfile> = {
  high: { level: 'high', dpr: [1, 2], shadows: true, shadowMapSize: 2048, post: 'full', grass: 9000, flowers: 900, trees: 46, clouds: 150, particles: 2400, butterflies: 26, fireflies: 260, antialias: false },
  medium: { level: 'medium', dpr: [1, 1.5], shadows: true, shadowMapSize: 1024, post: 'lite', grass: 4500, flowers: 500, trees: 32, clouds: 100, particles: 1400, butterflies: 18, fireflies: 160, antialias: false },
  low: { level: 'low', dpr: [0.75, 1], shadows: false, shadowMapSize: 512, post: 'none', grass: 1400, flowers: 220, trees: 20, clouds: 60, particles: 700, butterflies: 10, fireflies: 80, antialias: true },
};

export interface DeviceHints {
  isMobile: boolean;
  cores: number;
  memory?: number;
  renderer?: string;
  width: number;
}

/** Heuristic initial guess; PerformanceMonitor refines it at runtime. */
export function pickQuality(h: DeviceHints, override?: string | null): QualityLevel {
  if (override === 'high' || override === 'medium' || override === 'low') return override;
  const r = (h.renderer ?? '').toLowerCase();
  if (/swiftshader|llvmpipe|software|basic render/.test(r)) return 'low';
  if (h.isMobile || h.width < 700) return 'low';
  if ((h.memory !== undefined && h.memory <= 4) || h.cores <= 4) return 'medium';
  if (/intel/.test(r) && !/arc/.test(r)) return 'medium';
  return 'high';
}

export const downgrade = (q: QualityLevel): QualityLevel => (q === 'high' ? 'medium' : 'low');
