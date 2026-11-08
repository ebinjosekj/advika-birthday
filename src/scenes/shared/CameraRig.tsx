import { useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { INTRO_PATH, STATIONS } from '../../config/worldLayout';
import { useMagic, world } from '../../app/store';
import { globalUniforms } from './uniforms';

/** Shared with the depth-of-field effect so focus follows what the camera looks at. */
export const focusTarget = new THREE.Vector3(0, 66, 128);

const v = (a: readonly number[]) => new THREE.Vector3(a[0], a[1], a[2]);

export function useCameraCurves() {
  return useMemo(
    () => ({
      introPos: new THREE.CatmullRomCurve3(INTRO_PATH.pos.map(v), false, 'centripetal'),
      introLook: new THREE.CatmullRomCurve3(INTRO_PATH.look.map(v), false, 'centripetal'),
      mainPos: new THREE.CatmullRomCurve3(STATIONS.map((s) => v(s.pos)), false, 'catmullrom', 0.35),
      mainLook: new THREE.CatmullRomCurve3(STATIONS.map((s) => v(s.look)), false, 'catmullrom', 0.35),
      fairy: new THREE.CatmullRomCurve3(STATIONS.map((s) => v(s.fairy)), false, 'catmullrom', 0.4),
    }),
    [],
  );
}

function blendStations<T>(t: number, pick: (s: (typeof STATIONS)[number]) => T, mix: (a: T, b: T, e: number) => T): T {
  const i = Math.floor(t);
  const f = t - i;
  const a = pick(STATIONS[Math.max(0, Math.min(STATIONS.length - 1, i))]);
  const b = pick(STATIONS[Math.max(0, Math.min(STATIONS.length - 1, i + 1))]);
  return mix(a, b, f * f * (3 - 2 * f));
}

export const moodAt = (t: number) => blendStations(t, (s) => s.mood, (a, b, e) => a + (b - a) * e);
export const frameAt = (t: number) => blendStations(t, (s) => s.frame, (a, b, e) => [a[0] + (b[0] - a[0]) * e, a[1] + (b[1] - a[1]) * e] as [number, number]);
const tmpDir = new THREE.Vector3();
const tmpRight = new THREE.Vector3();
const tmpUp = new THREE.Vector3();

/**
 * The only thing that moves the camera. Intro: follows the intro spline by
 * world.intro.cam. Main: follows the station spline by world.t (scroll). The
 * result is critically damped so fast or reversed scrolling never jerks, and
 * pointer parallax adds a little life. Portrait screens get a wider lens and a
 * lowered aim so the subject sits above the bottom-sheet panels.
 */
export function CameraRig() {
  const curves = useCameraCurves();
  const { camera, size } = useThree();
  const look = useRef(new THREE.Vector3(0, 66, 128));
  const pos = useRef(new THREE.Vector3(...INTRO_PATH.pos[0]));
  const mouse = useRef(new THREE.Vector2());
  const target = useMemo(() => new THREE.Vector3(), []);
  const targetLook = useMemo(() => new THREE.Vector3(), []);

  useFrame((st, dtRaw) => {
    // generous clamp: on slow devices the camera keeps up with the story instead of lagging behind it
    const dt = Math.min(dtRaw, 0.25);
    const { phase, reducedMotion } = useMagic.getState();
    const portrait = size.height > size.width * 1.15;
    const cam = camera as THREE.PerspectiveCamera;
    const fov = portrait ? 62 : 48;
    if (Math.abs(cam.fov - fov) > 0.01) {
      cam.fov = fov;
      cam.updateProjectionMatrix();
    }
    let mood: number;
    let damp: number;
    if (phase !== 'main') {
      const c = Math.min(1, Math.max(0, world.intro.cam));
      curves.introPos.getPoint(c, target);
      curves.introLook.getPoint(c, targetLook);
      mood = 0.9 + 0.05 * c; // the story takes place on a moonlit night
      damp = reducedMotion ? 1000 : 3;
    } else {
      const n = STATIONS.length - 1;
      const t = reducedMotion ? Math.round(world.t) : world.t;
      const u = Math.min(1, Math.max(0, t / n));
      curves.mainPos.getPoint(u, target);
      curves.mainLook.getPoint(u, targetLook);
      if (portrait) {
        // step back a little so the subject fits a narrow screen
        target.add(tmpDir.copy(target).sub(targetLook).normalize().multiplyScalar(3));
      }
      // Re-aim so the subject lands where the text panel isn't: beside it on
      // desktop, above the bottom sheet on phones.
      const [fx, fy] = portrait ? [0, 0.42] : frameAt(t);
      tmpDir.copy(targetLook).sub(target);
      const dist = tmpDir.length();
      tmpDir.normalize();
      tmpRight.crossVectors(tmpDir, THREE.Object3D.DEFAULT_UP).normalize();
      tmpUp.crossVectors(tmpRight, tmpDir).normalize();
      const halfH = dist * Math.tan(THREE.MathUtils.degToRad(fov / 2));
      const halfW = halfH * (size.width / size.height);
      targetLook.addScaledVector(tmpRight, -fx * halfW * 0.9).addScaledVector(tmpUp, -fy * halfH * 0.9);
      mood = moodAt(t);
      damp = reducedMotion ? 1000 : portrait ? 2.2 : 2.6;
    }
    // subtle hand-held drift + pointer parallax (off for reduced motion)
    if (!reducedMotion) {
      mouse.current.lerp(st.pointer, 1 - Math.exp(-dt * 2));
      const tt = st.clock.elapsedTime;
      target.x += Math.sin(tt * 0.21) * 0.25 + mouse.current.x * 0.8;
      target.y += Math.sin(tt * 0.17) * 0.18 + mouse.current.y * 0.4;
    }
    const k = 1 - Math.exp(-dt * damp);
    pos.current.lerp(target, k);
    look.current.lerp(targetLook, k);
    camera.position.copy(pos.current);
    camera.lookAt(look.current);
    focusTarget.copy(look.current);
    world.mood += (mood - world.mood) * (1 - Math.exp(-dt * 2));
    globalUniforms.uMood.value = world.mood;
    globalUniforms.uTime.value = st.clock.elapsedTime;
    world.time = st.clock.elapsedTime;
    world.camera.x = camera.position.x;
    world.camera.y = camera.position.y;
    world.camera.z = camera.position.z;
    world.frames++;
  });
  return null;
}
