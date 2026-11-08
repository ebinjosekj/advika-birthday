import gsap from 'gsap';
import '../sectionTransitions/TransitionManager';
import { useMagic, world } from '../../app/store';
import { audio } from '../../services/audioEngine';
import { emitBurst } from '../particleEffects/bursts';
import { LANDMARKS } from '../../config/worldLayout';

/**
 * Owns the opening film. Phases: sky → book (waits for the visitor) → opening →
 * journey → reveal → main. Any phase can be skipped; skipping kills every tween
 * and writes the final values so the world is consistent.
 */
class IntroDirectorImpl {
  private tl: gsap.core.Timeline | null = null;
  private autoEnter: gsap.core.Tween | null = null;
  private speed = 1;

  configure(speed: number) {
    this.speed = speed > 0 ? speed : 1;
  }

  start() {
    this.kill();
    const s = useMagic.getState();
    const intro = world.intro;
    Object.assign(intro, { cam: 0, book: 0, pages: 0, light: 0, fairy: 0, doors: 0, blend: 0 });
    s.setPhase('sky');
    if (s.reducedMotion) {
      intro.cam = 0.17;
      s.setPhase('book');
      return;
    }
    this.tl = gsap.timeline({ defaults: { ease: 'sine.inOut' } });
    this.tl.timeScale(this.speed);
    this.tl.to(intro, { cam: 0.17, duration: 3, ease: 'power3.out' });
    this.tl.call(() => useMagic.getState().setPhase('book'), [], 1.4);
  }

  openBook() {
    const s = useMagic.getState();
    if (s.phase !== 'book' && s.phase !== 'sky') return; // repeated clicks are ignored
    this.kill();
    const intro = world.intro;
    s.setPhase('opening');
    audio.play('bookOpen');
    if (s.reducedMotion) {
      Object.assign(intro, { cam: 1, book: 1, pages: 1, light: 1, fairy: 1, doors: 1 });
      s.setPhase('reveal');
      this.scheduleEnter(6);
      return;
    }
    const tl = gsap.timeline({ defaults: { ease: 'sine.inOut' } });
    this.tl = tl;
    tl.timeScale(this.speed);
    tl.to(intro, { cam: 0.24, duration: 0.6, ease: 'power1.inOut' }, 0);
    tl.to(intro, { book: 1, duration: 1.7, ease: 'power3.inOut' }, 0);
    tl.to(intro, { pages: 1, duration: 1.9, ease: 'power2.inOut' }, 0.5);
    tl.to(intro, { light: 1, duration: 1.2, ease: 'power2.in' }, 0.85);
    tl.call(() => emitBurst(LANDMARKS.book, '#ffe6a8', 240, 6), [], 1.35);
    tl.call(() => useMagic.getState().setPhase('journey'), [], 1.7);
    tl.call(() => audio.play('fairy'), [], 1.8);
    tl.to(intro, { fairy: 1, duration: 8.2, ease: 'none' }, 1.6);
    tl.to(intro, { cam: 0.9, duration: 6.6, ease: 'power1.inOut' }, 1.9);
    tl.to(intro, { doors: 1, duration: 2, ease: 'power2.inOut' }, 8.2);
    tl.call(() => audio.play('doors'), [], 8.2);
    tl.to(intro, { cam: 1, duration: 2, ease: 'power2.out' }, 8.5);
    tl.call(() => {
      useMagic.getState().setPhase('reveal');
      audio.play('reveal');
      emitBurst(LANDMARKS.castleDoor, '#fff2c4', 300, 9);
      this.scheduleEnter(7);
    }, [], 9.6);
  }

  private scheduleEnter(seconds: number) {
    this.autoEnter?.kill();
    this.autoEnter = gsap.delayedCall(seconds / this.speed, () => this.enterMain());
  }

  /** Reveal → main world. Camera blends from the door shot to the hero station. */
  enterMain() {
    const s = useMagic.getState();
    if (s.phase === 'main') return;
    this.kill();
    Object.assign(world.intro, { cam: 1, book: 1, pages: 1, light: 1, fairy: 1, doors: 1 });
    s.setPhase('main');
  }

  skip() {
    this.enterMain();
  }

  kill() {
    this.tl?.kill();
    this.tl = null;
    this.autoEnter?.kill();
    this.autoEnter = null;
  }
}

export const IntroDirector = new IntroDirectorImpl();
