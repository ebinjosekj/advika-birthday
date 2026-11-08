import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './styles/global.css';
import App from './app/App';
import { useMagic } from './app/store';
import { detectWebGL } from './utils/webgl';
import { pickQuality } from './utils/quality';
import { IntroDirector } from './animations/cameraTimelines/IntroDirector';

const params = new URLSearchParams(location.search);
const gl = detectWebGL();
const reduced = params.get('reducedMotion') === '1' || window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const nav = navigator as Navigator & { deviceMemory?: number };
useMagic.getState().init({
  webgl: gl.supported,
  reducedMotion: reduced,
  maxDpr: Math.min(4, Math.max(0.25, Number(params.get('renderScale') ?? 4) || 4)),
  quality: pickQuality(
    {
      isMobile: /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent),
      cores: navigator.hardwareConcurrency ?? 4,
      memory: nav.deviceMemory,
      renderer: gl.renderer,
      width: window.innerWidth,
    },
    params.get('quality'),
  ),
});
IntroDirector.configure(Number(params.get('introSpeed') ?? 1));
// start fetching the 3D world right away, in parallel with React's first render
if (gl.supported && params.get('nowebgl') !== '1') void import('./scenes/World');

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
