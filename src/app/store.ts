import { create } from 'zustand';
import type { QualityLevel } from '../utils/quality';
import type { SectionId } from '../config/worldLayout';

export type Phase = 'loading' | 'sky' | 'book' | 'opening' | 'journey' | 'reveal' | 'main';

export interface MagicToast {
  id: number;
  title: string;
  body?: string;
  tone?: 'magic' | 'info' | 'error';
}

interface MagicState {
  phase: Phase;
  activeSection: SectionId;
  quality: QualityLevel;
  webgl: boolean;
  reducedMotion: boolean;
  soundOn: boolean;
  volume: number;
  hoveredDetail: string | null;
  celebrateAt: number;
  butterflyClicks: number;
  secretFound: boolean;
  toast: MagicToast | null;
  /** optional DPR ceiling (URL ?renderScale=) for very slow machines */
  maxDpr: number;
  setPhase: (p: Phase) => void;
  setActiveSection: (s: SectionId) => void;
  setQuality: (q: QualityLevel) => void;
  setSound: (on: boolean) => void;
  setVolume: (v: number) => void;
  setHoveredDetail: (d: string | null) => void;
  celebrate: () => void;
  clickButterfly: () => number;
  showToast: (t: Omit<MagicToast, 'id'>) => void;
  clearToast: () => void;
  init: (p: Partial<Pick<MagicState, 'quality' | 'webgl' | 'reducedMotion' | 'maxDpr'>>) => void;
}

let toastId = 0;

export const useMagic = create<MagicState>((set, get) => ({
  phase: 'loading',
  activeSection: 'home',
  quality: 'medium',
  webgl: true,
  reducedMotion: false,
  soundOn: false,
  volume: 0.6,
  hoveredDetail: null,
  celebrateAt: -1,
  butterflyClicks: 0,
  secretFound: false,
  toast: null,
  maxDpr: 4,
  setPhase: (phase) => set({ phase }),
  setActiveSection: (activeSection) => set({ activeSection }),
  setQuality: (quality) => set({ quality }),
  setSound: (soundOn) => set({ soundOn }),
  setVolume: (volume) => set({ volume: Math.min(1, Math.max(0, volume)) }),
  setHoveredDetail: (hoveredDetail) => set({ hoveredDetail }),
  celebrate: () => set({ celebrateAt: performance.now() / 1000 }),
  clickButterfly: () => {
    const n = get().butterflyClicks + 1;
    set({ butterflyClicks: n, secretFound: get().secretFound || n >= 7 });
    return n;
  },
  showToast: (t) => set({ toast: { ...t, id: ++toastId } }),
  clearToast: () => set({ toast: null }),
  init: (p) => set(p),
}));

/**
 * Per-frame values written by GSAP / scroll and read inside useFrame.
 * Kept outside React so animation never triggers re-renders.
 */
export const world = {
  /** Scroll-driven station parameter, 0 … STATIONS.length − 1. */
  t: 0,
  /** Intro parameters, all 0 … 1, tweened by the IntroDirector timeline. */
  intro: { cam: 0, book: 0, pages: 0, light: 0, fairy: 0, doors: 0, blend: 0 },
  /** Elapsed clock seconds, mirrored for DOM consumers. */
  time: 0,
  fps: 60,
  mood: 0,
  camera: { x: 0, y: 0, z: 0 },
  frames: 0,
  /** Cake close-up after "Light the candles": target (0/1), smoothed weight, and start time (s). */
  cakeFocus: 0,
  cakeFocusW: 0,
  cakeFocusStart: 0,
};

declare global {
  interface Window {
    __MAGIC__?: { world: typeof world; state: () => MagicState; renderInfo?: () => { geometries: number; textures: number; programs: number; calls: number } };
  }
}

if (typeof window !== 'undefined') {
  window.__MAGIC__ = { world, state: () => useMagic.getState() };
}
