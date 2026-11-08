import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { ScrollToPlugin } from 'gsap/ScrollToPlugin';
import { SECTION_IDS, type SectionId } from '../../config/worldLayout';
import { useMagic, world } from '../../app/store';

gsap.registerPlugin(ScrollTrigger, ScrollToPlugin);
// Follow wall-clock time on slow frames, but never leap more than half a second
// in one frame (e.g. a shader-compile hitch), so no story beat is skipped.
gsap.ticker.lagSmoothing(1500, 500);

/**
 * The one place that owns scroll-driven animation. Each section gets a single
 * ScrollTrigger that writes the continuous station parameter `world.t`; the
 * camera rig reads it every frame. Nothing else moves the camera, so GSAP and
 * React never compete. Everything here can be interrupted, reversed and torn down.
 */
class TransitionManagerImpl {
  private triggers: ScrollTrigger[] = [];
  private scrollTween: gsap.core.Tween | null = null;
  private locked = false;

  init(): () => void {
    this.destroy();
    const els = SECTION_IDS.map((id) => document.getElementById(id));
    const n = SECTION_IDS.length;
    els.forEach((el, i) => {
      if (!el) return;
      const id = SECTION_IDS[i];
      // Camera: station i is framed exactly when section i is centred in the viewport.
      const next = els[i + 1];
      if (next) {
        this.triggers.push(
          ScrollTrigger.create({
            trigger: el,
            start: i === 0 ? 'top top' : 'center center',
            endTrigger: next,
            end: i === n - 2 ? 'center center' : 'center center',
            onUpdate: (self) => {
              world.t = Math.min(n - 1, i + self.progress);
            },
            onLeave: () => {
              if (i === n - 2) world.t = n - 1;
            },
            onLeaveBack: () => {
              if (i === 0) world.t = 0;
            },
          }),
        );
      }
      // Navigation state: which chapter occupies the middle of the screen.
      this.triggers.push(
        ScrollTrigger.create({
          trigger: el,
          start: 'top center',
          end: 'bottom center',
          onToggle: (self) => {
            if (self.isActive) useMagic.getState().setActiveSection(id);
          },
        }),
      );
    });
    // the final chapter may be shorter than half a screen past its centre
    this.triggers.push(
      ScrollTrigger.create({
        start: 0,
        end: 'max',
        onUpdate: (self) => {
          if (self.progress > 0.998) {
            world.t = n - 1;
            useMagic.getState().setActiveSection(SECTION_IDS[n - 1]);
          }
        },
      }),
    );
    ScrollTrigger.refresh();
    const onResize = () => ScrollTrigger.refresh();
    window.addEventListener('orientationchange', onResize);
    return () => {
      window.removeEventListener('orientationchange', onResize);
      this.destroy();
    };
  }

  /** Smooth, interruptible navigation. A wheel/touch by the visitor cancels it. */
  scrollTo(id: SectionId | 'top', opts: { focus?: boolean } = {}) {
    const reduced = useMagic.getState().reducedMotion;
    const target = id === 'top' ? 0 : document.getElementById(id);
    if (target === null) return;
    this.scrollTween?.kill();
    const done = () => {
      if (opts.focus && target instanceof HTMLElement) {
        const heading = target.querySelector<HTMLElement>('h1, h2');
        (heading ?? target).focus({ preventScroll: true });
      }
    };
    if (reduced) {
      window.scrollTo({ top: target === 0 ? 0 : landingY(target as HTMLElement), behavior: 'auto' });
      done();
      return;
    }
    const y = target === 0 ? 0 : landingY(target as HTMLElement);
    const distance = Math.abs(y - window.scrollY);
    this.scrollTween = gsap.to(window, {
      scrollTo: { y, autoKill: true },
      duration: Math.min(2.4, 0.7 + distance / 2600),
      ease: 'power2.inOut',
      overwrite: true,
      onComplete: done,
      onInterrupt: done,
    });
  }

  lock(on: boolean) {
    this.locked = on;
    document.documentElement.classList.toggle('scroll-locked', on);
  }

  get isLocked() {
    return this.locked;
  }

  refresh() {
    ScrollTrigger.refresh();
  }

  destroy() {
    this.scrollTween?.kill();
    this.scrollTween = null;
    this.triggers.forEach((t) => t.kill());
    this.triggers = [];
  }
}

/**
 * Where to stop for a chapter: centred (that is where its camera shot is framed),
 * then nudged so its panel sits fully on screen, clear of the nav bar and the date chip.
 */
function landingY(section: HTMLElement) {
  const ih = window.innerHeight;
  const top = section.getBoundingClientRect().top + window.scrollY;
  let y = top + (section.offsetHeight - ih) / 2;
  const panel = section.querySelector<HTMLElement>('.panel');
  if (panel) {
    const r = panel.getBoundingClientRect();
    const pTop = r.top + window.scrollY;
    const pBottom = r.bottom + window.scrollY;
    if (pBottom - y > ih - 80) y = pBottom - ih + 80;
    if (pTop - y < 84) y = pTop - 84;
  }
  const max = document.documentElement.scrollHeight - ih;
  return Math.max(0, Math.min(max, Math.round(y)));
}

export const TransitionManager = new TransitionManagerImpl();
