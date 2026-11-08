import { lazy, Suspense, useEffect, useState } from 'react';
import { useMagic } from './store';
import { TransitionManager } from '../animations/sectionTransitions/TransitionManager';
import { IntroDirector } from '../animations/cameraTimelines/IntroDirector';
import { IntroOverlay } from '../components/Intro/IntroOverlay';
import { NightBackdrop } from '../components/Intro/NightBackdrop';
import { Nav } from '../components/Navigation/Nav';
import { QuickDetails, BackToTop } from '../components/Navigation/QuickDetails';
import { MagicToast } from '../components/ui/MagicToast';
import { Hero } from '../components/Hero/Hero';
import { BirthdayReveal } from '../components/Birthday/BirthdayReveal';
import { Countdown } from '../components/Countdown/Countdown';
import { PartyDetails } from '../components/PartyDetails/PartyDetails';
import { Location } from '../components/Location/Location';
import { DressCode } from '../components/DressCode/DressCode';
import { RSVP } from '../components/RSVP/RSVP';
import { Finale } from '../components/Finale/Finale';
import { StaticWorld } from '../components/Kingdom/StaticWorld';
import { WorldBoundary } from '../components/Kingdom/WorldBoundary';

const World = lazy(() => import('../scenes/World'));

export default function App() {
  const webgl = useMagic((s) => s.webgl);
  const phase = useMagic((s) => s.phase);
  const [fontsReady, setFontsReady] = useState(false);
  const [worldReady, setWorldReady] = useState(!webgl);
  const [worldFailed, setWorldFailed] = useState(false);
  const main = phase === 'main';

  useEffect(() => {
    let alive = true;
    const done = () => alive && setFontsReady(true);
    (document.fonts?.ready ?? Promise.resolve()).then(done);
    const t = setTimeout(done, 4000); // never block on fonts
    return () => {
      alive = false;
      clearTimeout(t);
    };
  }, []);

  const ready = fontsReady && (worldReady || worldFailed);

  // Start the opening film once everything has compiled.
  useEffect(() => {
    if (!ready) return;
    TransitionManager.lock(true);
    const params = new URLSearchParams(location.search);
    IntroDirector.start();
    if (params.get('skipIntro') === '1') IntroDirector.skip();
    return () => IntroDirector.kill();
  }, [ready]);

  // Hand control to the scroll-driven world once the intro ends.
  useEffect(() => {
    if (!main) return;
    TransitionManager.lock(false);
    window.scrollTo(0, 0);
    let cleanup: (() => void) | undefined;
    const raf = requestAnimationFrame(() => {
      cleanup = TransitionManager.init();
    });
    return () => {
      cancelAnimationFrame(raf);
      cleanup?.();
    };
  }, [main]);

  const showWorld = webgl && !worldFailed;

  return (
    <>
      <a className="skip-link" href="#rsvp" onClick={() => IntroDirector.skip()}>
        Skip to RSVP
      </a>
      {/* the story's night sky, shown instantly and dissolved into the live world */}
      <NightBackdrop hidden={ready} />
      {ready && !main && <IntroOverlay />}
      {main && <Nav />}
      <MagicToast />
      <main id="story" className="story" inert={!main ? true : undefined} aria-hidden={!main ? true : undefined}>
        <Hero />
        <BirthdayReveal />
        <Countdown />
        <PartyDetails />
        <Location />
        <DressCode />
        <RSVP />
        <Finale />
      </main>
      {main && <QuickDetails />}
      {main && <BackToTop />}
      <div className="world-layer">
        {showWorld ? (
          <WorldBoundary onError={() => setWorldFailed(true)}>
            <Suspense fallback={null}>
              <World onReady={() => setWorldReady(true)} />
            </Suspense>
          </WorldBoundary>
        ) : (
          <StaticWorld />
        )}
      </div>
    </>
  );
}

