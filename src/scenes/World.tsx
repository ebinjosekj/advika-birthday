import { Suspense, useEffect, useMemo, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { PerformanceMonitor, Sparkles } from '@react-three/drei';
import { Bloom, BrightnessContrast, EffectComposer, HueSaturation, SMAA, ToneMapping, Vignette } from '@react-three/postprocessing';
import { ToneMappingMode } from 'postprocessing';
import * as THREE from 'three';
import { useMagic, world } from '../app/store';
import { QUALITY_PROFILES, type QualityProfile } from '../utils/quality';
import { INTRO_PATH, ISLANDS, LANDMARKS, STATIONS } from '../config/worldLayout';
import { SkyDome } from './shared/Sky';
import { Cloudscape } from './shared/Clouds';
import { DistantMountains } from './shared/Mountains';
import { GodRays } from './shared/GodRays';
import { DistantIslands, Island } from './shared/Island';
import { FOLIAGE, Flowers, Grass, Trees, type Scatter } from './shared/Vegetation';
import { Waterfall, WaterSurface } from './shared/Water';
import { Fireflies } from './shared/Fireflies';
import { ButterflySwarm } from './shared/Butterflies';
import { SkyLanterns } from './shared/Lanterns';
import { ParticleField } from './shared/Particles';
import { Fairy, type FairyDriver } from './shared/Fairy';
import { CameraRig, useCameraCurves } from './shared/CameraRig';
import { Lighting } from './shared/Lighting';
import { Hotspot } from './shared/Hotspot';
import { wingTexture } from './shared/textures';
import { MagicBook } from './OpeningScene/Book';
import { Castle } from './CastleScene/Castle';
import { RainbowBridge } from './CastleScene/Bridge';
import { Cake } from './BirthdayScene/Cake';
import { SevenMonument } from './BirthdayScene/Seven';
import { CelestialClock, HiddenStar } from './KingdomScene/Celestial';
import { DetailArtifacts } from './EnchantedForestScene/Artifacts';
import { GlowMushrooms } from './EnchantedForestScene/Mushrooms';
import { FabricRibbons } from './WishingGardenScene/Garden';
import { CastleMagic, FloatingDebris, Fireworks, Moon, ShootingStars } from './KingdomScene/NightLife';
import { surprises } from '../components/Transitions/surprises';
import { audio } from '../services/audioEngine';

const asScatter = (k: keyof typeof ISLANDS, extra: Partial<Scatter> = {}): Scatter => ({
  center: ISLANDS[k].pos,
  radius: ISLANDS[k].radius,
  seed: ISLANDS[k].seed,
  flat: ISLANDS[k].flat,
  ...extra,
});

/*
 * Props below are module constants on purpose: components memoise geometry on
 * their props, so a fresh array literal per render would rebuild (and leak) GPU
 * buffers. Kingdom itself only re-renders when the phase changes; anything that
 * reacts to the active section lives in its own small component.
 */
const FOREST_FIREFLY_POS: [number, number, number] = [ISLANDS.forest.pos[0], ISLANDS.forest.pos[1] + 0.5, ISLANDS.forest.pos[2]];
const FOREST_FIREFLY_SPREAD: [number, number, number] = [40, 7, 40];
const MEADOW_FIREFLY_POS: [number, number, number] = [ISLANDS.meadow.pos[0], ISLANDS.meadow.pos[1] + 0.5, ISLANDS.meadow.pos[2]];
const MEADOW_FIREFLY_SPREAD: [number, number, number] = [34, 8, 34];
const WATERFALL_POOL: [number, number, number] = [ISLANDS.waterfall.pos[0] + 6, ISLANDS.waterfall.pos[1] + 0.68, ISLANDS.waterfall.pos[2] + 2];
const WATERFALL_FALL: [number, number, number] = [ISLANDS.waterfall.pos[0] + 15.5, ISLANDS.waterfall.pos[1] + 0.2, ISLANDS.waterfall.pos[2] + 3];
const MEADOW_POND: [number, number, number] = [ISLANDS.meadow.pos[0] + 6, ISLANDS.meadow.pos[1] + 0.98, ISLANDS.meadow.pos[2] - 8];
const CASTLE_POS: [number, number, number] = [LANDMARKS.castle[0], 1, LANDMARKS.castle[2]];
const CAKE_POS: [number, number, number] = [LANDMARKS.cake[0], 1.5, LANDMARKS.cake[2]];
const FALL_W: [number, number, number] = [-36.5, 0.4, -128];
const FALL_E: [number, number, number] = [37.5, 0.2, -110];
const SWARM_MEADOW: [number, number, number] = [36, 1.2, -44];
const SWARM_CASTLE: [number, number, number] = [0, 2.5, -92];
const SWARM_CAKE: [number, number, number] = [0, 3.5, -97];
const SWARM_CAKE_ORIGIN: [number, number, number] = [0, 4.5, -97];
const SWARM_BOOK: [number, number, number] = [0, 66, 126];
const SWARM_BOOK_ORIGIN: [number, number, number] = [0, 66, 129];
const LANTERN_POS: [number, number, number] = [0, 2, -112];
const LANTERN_SPREAD: [number, number] = [80, 60];
const GLITTER_SCALE: [number, number, number] = [70, 30, 60];
const GLITTER_POS: [number, number, number] = [0, 14, -110];
const SECRET_SCALE: [number, number, number] = [30, 20, 30];
const SECRET_POS: [number, number, number] = [0, 20, -110];
const NO_PERCHES: [number, number, number][] = [];
const FOREST_LANTERNS: [number, number, number] = [ISLANDS.forest.pos[0], 1, ISLANDS.forest.pos[2]];
const MEADOW_LANTERNS: [number, number, number] = [ISLANDS.meadow.pos[0], 0, ISLANDS.meadow.pos[2]];
const ISLE_SPREAD: [number, number] = [44, 44];
const cakeActive = () => (useMagic.getState().celebrateAt >= 0 ? 1 : 0);
const bookActive = () => (world.intro.light > 0.5 && world.intro.cam < 0.5 ? 1 : 0);
const mushroomAt = () => surprises.mushroomAt;

function SurpriseHotspots() {
  const main = useMagic((s) => s.phase === 'main');
  const section = useMagic((s) => s.activeSection);
  return (
    <>
      <GuideButterfly active={main} />
      {main && section === 'birthday' && <Hotspot position={[LANDMARKS.cake[0], 4.6, LANDMARKS.cake[2]]} label="Light the birthday cake candles" onActivate={surprises.cake} size={96} />}
      {main && section === 'details' && <Hotspot position={[LANDMARKS.mushrooms[0], 2.2, LANDMARKS.mushrooms[2]]} label="Tap the glowing mushroom" onActivate={surprises.mushroom} size={64} />}
      {main && section === 'countdown' && <Hotspot position={LANDMARKS.hiddenStar} label="A hidden star" onActivate={surprises.star} size={56} />}
    </>
  );
}


function LiveHiddenStar() {
  const found = useMagic((s) => s.toast?.title === 'A secret star!');
  return <HiddenStar position={LANDMARKS.hiddenStar} found={found} />;
}

function SecretSparkles() {
  const secretFound = useMagic((s) => s.secretFound);
  return (
    <group scale={secretFound ? 1 : 0.0001}>
      <Sparkles count={60} scale={SECRET_SCALE} position={SECRET_POS} size={10} speed={1} color="#ffd6f0" />
    </group>
  );
}

function Kingdom({ q }: { q: QualityProfile }) {

  const areas = useMemo(
    () => ({
      castle: asScatter('castle', { avoid: [{ x: 0, z: -12, r: 21 }, { x: 0, z: 21, r: 7.5 }, { x: 0, z: 8, r: 3.5 }, { x: 7, z: 36, r: 8 }, { x: 4, z: 29, r: 7 }], maxR: 0.9 }),
      forest: asScatter('forest', { avoid: [{ x: 6, z: 8, r: 3 }, { x: 24, z: 0, r: 3 }] }),
      meadow: asScatter('meadow', { avoid: [{ x: 6, z: -8, r: 5 }, { x: -19, z: 0, r: 3 }] }),
      waterfall: asScatter('waterfall', { avoid: [{ x: 6, z: 2, r: 3.5 }] }),
    }),
    [],
  );

  return (
    <>
      <SkyDome />
      <Moon />
      <ShootingStars count={q.level === 'low' ? 2 : 4} />
      <DistantMountains />
      <Cloudscape total={q.clouds} />
      {q.level !== 'low' && <DistantIslands />}
      {q.level !== 'low' && <GodRays />}

      {/* ENV 1 — waterfall island */}
      <Island {...ISLANDS.waterfall} position={ISLANDS.waterfall.pos} receiveShadow />
      <Grass areas={[areas.waterfall]} count={Math.round(q.grass * 0.15)} />
      <Flowers areas={[areas.waterfall]} count={Math.round(q.flowers * 0.2)} />
      <Trees areas={[areas.waterfall]} count={Math.round(q.trees * 0.15)} />
      <WaterSurface position={WATERFALL_POOL} radius={3.2} />
      <Waterfall position={WATERFALL_FALL} rotationY={Math.PI / 2} width={3.4} height={30} mistCount={Math.round(q.particles / 30)} />

      {/* ENV 2 — enchanted forest island */}
      <Island {...ISLANDS.forest} position={ISLANDS.forest.pos} receiveShadow />
      <Grass areas={[areas.forest]} count={Math.round(q.grass * 0.2)} />
      <Trees areas={[areas.forest]} count={Math.round(q.trees * 0.4)} palette={FOLIAGE.forest} />
      <Flowers areas={[areas.forest]} count={Math.round(q.flowers * 0.2)} glow={0.6} />
      <Fireflies center={FOREST_FIREFLY_POS} spread={FOREST_FIREFLY_SPREAD} count={q.fireflies} seed={2} />
      <GlowMushrooms position={LANDMARKS.mushrooms} pulseAt={mushroomAt} />
      <DetailArtifacts position={LANDMARKS.detailArtifacts} />
      <FloatingDebris center={ISLANDS.forest.pos} radius={ISLANDS.forest.radius} count={q.level === 'low' ? 6 : 10} seed={8} />
      <SkyLanterns center={FOREST_LANTERNS} spread={ISLE_SPREAD} count={q.level === 'low' ? 6 : 12} rise={30} seed={14} />

      {/* ENV 3 — rainbow bridge */}
      <RainbowBridge />

      {/* meadow: dress code + wishing garden */}
      <Island {...ISLANDS.meadow} position={ISLANDS.meadow.pos} receiveShadow />
      <Grass areas={[areas.meadow]} count={Math.round(q.grass * 0.2)} />
      <Flowers areas={[areas.meadow]} count={Math.round(q.flowers * 0.35)} glow={0.9} scale={1.2} />
      <Trees areas={[areas.meadow]} count={Math.round(q.trees * 0.15)} palette={FOLIAGE.blossom} />
      <FabricRibbons position={LANDMARKS.fabrics} />
      <FloatingDebris center={ISLANDS.meadow.pos} radius={ISLANDS.meadow.radius} count={q.level === 'low' ? 6 : 10} seed={12} />
      <SkyLanterns center={MEADOW_LANTERNS} spread={ISLE_SPREAD} count={q.level === 'low' ? 6 : 12} rise={30} seed={15} />
      <WaterSurface position={MEADOW_POND} radius={4.2} />
      <Fireflies center={MEADOW_FIREFLY_POS} spread={MEADOW_FIREFLY_SPREAD} count={Math.round(q.fireflies * 0.8)} seed={5} color="#ffd6f0" />
      <ButterflySwarm count={Math.round(q.butterflies * 0.4)} center={SWARM_MEADOW} radius={10} height={4} seed={4} perches={NO_PERCHES} />

      {/* ENV 4 — castle island */}
      <Island {...ISLANDS.castle} position={ISLANDS.castle.pos} receiveShadow />
      <Grass areas={[areas.castle]} count={Math.round(q.grass * 0.25)} />
      <Flowers areas={[areas.castle]} count={Math.round(q.flowers * 0.25)} />
      <Trees areas={[areas.castle]} count={Math.round(q.trees * 0.3)} palette={FOLIAGE.blossom} />
      <Castle position={CASTLE_POS} />
      <CastleMagic position={CASTLE_POS} />
      <Fireworks />
      <FloatingDebris center={ISLANDS.castle.pos} radius={ISLANDS.castle.radius} count={q.level === 'low' ? 8 : 14} seed={3} />
      <Waterfall position={FALL_W} rotationY={-Math.PI / 2} width={5} height={40} mistCount={Math.round(q.particles / 25)} />
      <Waterfall position={FALL_E} rotationY={Math.PI / 2} width={4} height={36} mistCount={Math.round(q.particles / 30)} />
      <Cake position={CAKE_POS} />
      <SevenMonument position={LANDMARKS.seven} />
      <ButterflySwarm count={Math.round(q.butterflies * 0.35)} center={SWARM_CASTLE} radius={9} height={4} seed={7} />
      <ButterflySwarm count={12} center={SWARM_CAKE} radius={3} height={2.5} seed={21} activation={cakeActive} origin={SWARM_CAKE_ORIGIN} />
      <SkyLanterns center={LANTERN_POS} spread={LANTERN_SPREAD} count={q.level === 'low' ? 16 : 34} rise={40} />
      <Sparkles count={Math.round(q.particles / 12)} scale={GLITTER_SCALE} position={GLITTER_POS} size={5} speed={0.25} color="#ffeccc" />

      {/* sky: book, celestial clock, hidden star */}
      <MagicBook position={LANDMARKS.book} />
      <ButterflySwarm count={14} center={SWARM_BOOK} radius={8} height={6} seed={13} activation={bookActive} origin={SWARM_BOOK_ORIGIN} />
      <CelestialClock position={LANDMARKS.celestialClock} />
      <LiveHiddenStar />

      <ParticleField max={q.particles} />
      <StoryFairy />
      <SurpriseHotspots />
      <SecretSparkles />
    </>
  );
}

/** Fairy flight: emerges from the book, leads the intro journey, then guides each section. */
function StoryFairy() {
  const curves = useCameraCurves();
  const driver = useMemo<FairyDriver>(() => {
    const book = new THREE.Vector3(...LANDMARKS.book);
    const ahead = new THREE.Vector3();
    const look = new THREE.Vector3();
    const station = new THREE.Vector3();
    const wob = new THREE.Vector3();
    const FORWARD = new THREE.Vector3(0, 0, 1);
    let lastPhase = '';
    const d: FairyDriver = {
      scale: 1.1,
      target: (t, out) => {
        const s = useMagic.getState();
        if ((s.phase === 'main') !== (lastPhase === 'main')) {
          lastPhase = s.phase;
          return false; // hide for a frame so she re-appears at her new spot
        }
        lastPhase = s.phase;
        if (s.phase !== 'main') {
          const f = world.intro.fairy;
          if (f <= 0) return false;
          const c = Math.min(1, world.intro.cam + 0.05);
          curves.introPos.getPoint(c, ahead);
          curves.introLook.getPoint(c, look);
          // fly a little ahead of and below the lens so she leads the camera
          ahead.lerp(look, 0.32).add(wob.set(Math.sin(t * 0.9) * 1.2, -0.6 + Math.sin(t * 1.3) * 0.5, 0));
          const e = Math.min(1, f / 0.08);
          out.copy(book).add(FORWARD).lerp(ahead, e * e * (3 - 2 * e));
          d.scale = 1.1;
          return true;
        }
        const n = STATIONS.length - 1;
        curves.fairy.getPoint(Math.min(1, Math.max(0, world.t / n)), station);
        out.copy(station).add(wob.set(Math.sin(t * 0.7) * 1.4, Math.sin(t * 1.1) * 0.5, Math.cos(t * 0.5) * 0.9));
        d.scale = s.activeSection === 'finale' ? 2.6 : s.activeSection === 'countdown' ? 1.8 : 1.0;
        return true;
      },
    };
    return d;
  }, [curves]);
  const q = useMagic((s) => s.quality);
  return <Fairy driver={driver} trailRate={q === 'low' ? 18 : 45} />;
}

/** The guide butterfly hovers in the upper right of view; tapping it is a hidden game. */
function GuideButterfly({ active }: { active: boolean }) {
  const g = useRef<THREE.Group>(null);
  const wl = useRef<THREE.Mesh>(null);
  const wr = useRef<THREE.Mesh>(null);
  const tex = useMemo(() => wingTexture('#f3d9a0', '#c9b6e8'), []);
  const geoR = useMemo(() => new THREE.PlaneGeometry(1, 1).translate(0.5, 0, 0), []);
  const geoL = useMemo(() => new THREE.PlaneGeometry(1, 1).translate(0.5, 0, 0).scale(-1, 1, 1), []);
  const fwd = useMemo(() => new THREE.Vector3(), []);
  const right = useMemo(() => new THREE.Vector3(), []);
  const upv = useMemo(() => new THREE.Vector3(), []);
  const guideTarget = useMemo(() => new THREE.Vector3(), []);
  const placed = useRef(false);
  useFrame((st, dt) => {
    const t = st.clock.elapsedTime;
    const cam = st.camera;
    if (!g.current) return;
    g.current.scale.setScalar(active ? 0.55 : 0.0001);
    cam.getWorldDirection(fwd);
    right.crossVectors(fwd, cam.up).normalize();
    upv.crossVectors(right, fwd).normalize();
    // park it in the upper-right corner of the frame, clear of the nav bar and the text panels
    const portrait = st.size.height > st.size.width * 1.15;
    const d = 7;
    const halfH = d * Math.tan(THREE.MathUtils.degToRad((cam as THREE.PerspectiveCamera).fov / 2));
    const halfW = halfH * (st.size.width / st.size.height);
    const nx = (portrait ? 0.7 : 0.84) + Math.sin(t * 0.6) * 0.03;
    const ny = (portrait ? 0.56 : 0.6) + Math.sin(t * 1.4) * 0.03;
    const target = guideTarget.copy(cam.position).addScaledVector(fwd, d).addScaledVector(right, nx * halfW).addScaledVector(upv, ny * halfH);
    // camera-locked: follow tightly (time-based), with a little organic lag
    if (!placed.current) {
      g.current.position.copy(target);
      placed.current = true;
    } else g.current.position.lerp(target, 1 - Math.exp(-Math.min(dt, 0.25) * 12));
    g.current.quaternion.copy(cam.quaternion);
    g.current.rotateX(-0.9);
    g.current.rotateZ(Math.sin(t * 0.8) * 0.3);
    const flap = Math.sin(t * 9) * 0.9 + 0.2;
    if (wr.current) wr.current.rotation.y = -flap;
    if (wl.current) wl.current.rotation.y = flap;
  });
  return (
    <group ref={g} scale={0.55}>
      <mesh ref={wr} geometry={geoR}>
        <meshStandardMaterial map={tex} transparent alphaTest={0.3} side={THREE.DoubleSide} emissive="#f0c890" emissiveIntensity={0.25} />
      </mesh>
      <mesh ref={wl} geometry={geoL}>
        <meshStandardMaterial map={tex} transparent alphaTest={0.3} side={THREE.DoubleSide} emissive="#f0c890" emissiveIntensity={0.25} />
      </mesh>
      {active && <Hotspot position={[0, 0, 0]} label="The guide butterfly" onActivate={surprises.butterfly} size={52} />}
    </group>
  );
}

function Effects({ q }: { q: QualityProfile }) {
  const gl = useThree((s) => s.gl);
  useEffect(() => {
    gl.toneMapping = q.post === 'none' ? THREE.ACESFilmicToneMapping : THREE.NoToneMapping;
  }, [gl, q.post]);
  if (q.post === 'none') return null;
  if (q.post === 'lite')
    return (
      <EffectComposer multisampling={0} enableNormalPass={false}>
        <Bloom mipmapBlur intensity={0.5} luminanceThreshold={0.85} luminanceSmoothing={0.2} radius={0.7} />
        <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
        <HueSaturation saturation={-0.06} />
        <BrightnessContrast contrast={0.06} />
        <Vignette eskil={false} offset={0.3} darkness={0.45} />
        <SMAA />
      </EffectComposer>
    );
  return (
    <EffectComposer multisampling={0} enableNormalPass={false}>
      <Bloom mipmapBlur intensity={0.6} luminanceThreshold={0.85} luminanceSmoothing={0.2} radius={0.7} />
      <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
      <HueSaturation saturation={-0.06} />
      <BrightnessContrast contrast={0.07} />
      <Vignette eskil={false} offset={0.3} darkness={0.5} />
      <SMAA />
    </EffectComposer>
  );
}

/** Ambient sound follows the world: louder water near falls, more wind high up. */
function AudioScene() {
  const last = useRef(0);
  useFrame((st) => {
    if (!audio.isEnabled || st.clock.elapsedTime - last.current < 1) return;
    last.current = st.clock.elapsedTime;
    const p = st.camera.position;
    const falls: [number, number, number][] = [[-22, 0, 43], [-36, 0, -128], [37, 0, -110]];
    const dmin = Math.min(...falls.map((f) => Math.hypot(p.x - f[0], p.z - f[2])));
    audio.setScene(Math.max(0.15, 1 - dmin / 60), Math.min(1, Math.max(0, (p.y - 10) / 50)));
  });
  return null;
}

/**
 * Runs once the world has mounted: compiles every material (async where the GPU
 * supports it), uploads every texture, and renders a few frames — all while the
 * still sky is showing — so the opening film never stalls on first use.
 */
function Warmup({ onReady }: { onReady?: () => void }) {
  const { gl, scene, camera } = useThree();
  const ready = useRef(onReady);
  ready.current = onReady;
  useEffect(() => {
    let cancelled = false;
    const frame = () => new Promise<void>((r) => requestAnimationFrame(() => r()));
    let fired = false;
    const fire = () => {
      if (cancelled || fired) return;
      fired = true;
      ready.current?.();
    };
    // never hold the opening back for a slow shader compiler
    const guard = setTimeout(fire, 9000);
    (async () => {
      await frame();
      try {
        scene.traverse((o) => {
          const mats = (o as THREE.Mesh).material;
          (Array.isArray(mats) ? mats : mats ? [mats] : []).forEach((m) => {
            Object.values(m as unknown as Record<string, unknown>).forEach((v) => {
              if (v instanceof THREE.Texture) gl.initTexture(v);
            });
          });
        });
        await gl.compileAsync(scene, camera);
      } catch {
        /* fall back to lazy compile */
      }
      // Pre-draw the whole journey from every viewpoint while the title card plays
      // (mobile GPUs upload meshes and link shaders on first draw), so the book,
      // the fairy's flight and every chapter appear without a hitch.
      try {
        const probe = makeProbe(camera);
        for (let i = 0; i < SHOTS.length; i++) {
          if (cancelled || fired) break;
          aimProbe(probe, i);
          gl.render(scene, probe);
          if (i % 2 === 1) await frame();
        }
      } catch {
        /* purely an optimisation */
      }
      for (let i = 0; i < 2; i++) await frame();
      fire();
    })();
    return () => {
      cancelled = true;
      clearTimeout(guard);
    };
  }, [gl, scene, camera]);
  return null;
}

// Every viewpoint the story visits: the intro flight, then each chapter's station.
const SHOTS: [readonly number[], readonly number[]][] = [
  ...INTRO_PATH.pos.map((p, i) => [p, INTRO_PATH.look[i]] as [readonly number[], readonly number[]]),
  ...STATIONS.map((st) => [st.pos, st.look] as [readonly number[], readonly number[]]),
];

function makeProbe(camera: THREE.Camera) {
  return new THREE.PerspectiveCamera(80, (camera as THREE.PerspectiveCamera).aspect || 1, 0.1, 2000);
}
function aimProbe(probe: THREE.PerspectiveCamera, i: number) {
  const [p, l] = SHOTS[i];
  probe.position.set(p[0], p[1], p[2]);
  probe.lookAt(l[0], l[1], l[2]);
  probe.updateMatrixWorld();
}

/**
 * On a slow device only lower the render resolution, a step at a time. We never
 * swap quality profiles at runtime: that rebuilt the whole world mid-flight and froze it.
 */
function DprGovernor() {
  const gl = useThree((st) => st.gl);
  const setDpr = useThree((st) => st.setDpr);
  return (
    <PerformanceMonitor
      flipflops={3}
      onDecline={() => {
        const cur = gl.getPixelRatio();
        const next = Math.max(Math.min(0.6, cur), cur - 0.25);
        if (next < cur) setDpr(next);
      }}
    />
  );
}

function FpsProbe() {
  const acc = useRef({ t: 0, n: 0 });
  useFrame((_, dt) => {
    acc.current.t += dt;
    acc.current.n++;
    if (acc.current.t > 1) {
      world.fps = acc.current.n / acc.current.t;
      acc.current = { t: 0, n: 0 };
    }
  });
  return null;
}

export default function World({ onReady }: { onReady?: () => void }) {
  const quality = useMagic((s) => s.quality);
  const maxDpr = useMagic((s) => s.maxDpr);
  const q = QUALITY_PROFILES[quality];
  const dpr: [number, number] = [Math.min(q.dpr[0], maxDpr), Math.min(q.dpr[1], maxDpr)];
  return (
    <Canvas
      className="world-canvas"
      // R3F defaults to touch-action:none, which would stop phones scrolling the page over the 3D world
      style={{ touchAction: 'pan-y' }}
      shadows={q.shadows ? 'percentage' : false}
      dpr={dpr}
      gl={{ antialias: q.antialias, powerPreference: 'high-performance', alpha: false, stencil: false, depth: true }}
      camera={{ fov: 48, near: 0.1, far: 2000, position: [0, 74, 210] }}
      onCreated={({ gl, scene }) => {
        if (new URLSearchParams(location.search).has('debugScene')) (window as unknown as { __scene?: THREE.Scene }).__scene = scene;
        gl.toneMappingExposure = 1.1;
        gl.setClearColor('#0d1330');
        gl.domElement.setAttribute('aria-hidden', 'true');
        gl.domElement.style.touchAction = 'pan-y';
        gl.domElement.setAttribute('data-testid', 'world-canvas');
        if (window.__MAGIC__) window.__MAGIC__.renderInfo = () => ({ geometries: gl.info.memory.geometries, textures: gl.info.memory.textures, programs: gl.info.programs?.length ?? 0, calls: gl.info.render.calls });
      }}
    >
      <DprGovernor />
      <Suspense fallback={null}>
        <Lighting q={q} />
        <Kingdom q={q} />
        <Effects q={q} />
        <Warmup onReady={onReady} />
      </Suspense>
      <CameraRig />
      <AudioScene />
      <FpsProbe />
    </Canvas>
  );
}
