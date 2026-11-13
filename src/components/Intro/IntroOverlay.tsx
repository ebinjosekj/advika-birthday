import { AnimatePresence, motion } from 'motion/react';
import { BookOpen, SkipForward } from 'lucide-react';
import { useMagic } from '../../app/store';
import { IntroDirector } from '../../animations/cameraTimelines/IntroDirector';
import { eventConfig } from '../../config/eventConfig';
import { SoundToggle } from '../Audio/SoundControl';
import { Portrait } from '../ui/Portrait';

const ease = [0.2, 0.8, 0.2, 1] as const;

export function IntroOverlay() {
  const phase = useMagic((s) => s.phase);
  const showBook = phase === 'sky' || phase === 'book';
  return (
    <div className="intro" data-phase={phase} data-testid="intro">
      {showBook && <div className="intro-shade" />}
      <div className="ui" style={{ position: 'absolute', top: 'max(14px, env(safe-area-inset-top))', right: 14, display: 'flex', gap: 8 }}>
        <SoundToggle compact />
        <button type="button" className="btn btn-ghost" onClick={() => IntroDirector.skip()} data-testid="skip-intro" style={{ background: 'rgba(255,255,255,.75)' }}>
          <SkipForward size={18} aria-hidden="true" /> Skip intro
        </button>
      </div>

      <AnimatePresence>
        {phase === 'book' && (
          <motion.div
            key="book"
            className="ui"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10, transition: { duration: 0.5 } }}
            transition={{ duration: 1.2, ease }}
            style={{ position: 'absolute', left: 0, right: 0, bottom: 'max(8vh, 40px)', textAlign: 'center', padding: '0 20px' }}
          >
            <h1 className="display intro-title" aria-label={eventConfig.messages.bookTitle} style={{ fontSize: 'clamp(2.4rem, 6vw, 4.6rem)', fontStyle: 'italic', margin: '0 0 22px' }}>
              {eventConfig.messages.bookTitle.split('').map((ch, i) => (
                <motion.span
                  key={i}
                  aria-hidden="true"
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15 + i * 0.035, duration: 0.7, ease }}
                  style={{ display: 'inline-block', whiteSpace: 'pre' }}
                >
                  {ch}
                </motion.span>
              ))}
            </h1>
            <button type="button" className="btn btn-primary shimmer" onClick={() => IntroDirector.openBook()} data-testid="open-book" autoFocus style={{ fontSize: '1.05rem', padding: '1em 1.8em', letterSpacing: '0.08em' }}>
              <BookOpen size={20} aria-hidden="true" /> OPEN THE MAGIC BOOK
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* golden flash as the camera dives into the book's light */}
      {phase === 'journey' && <div className="intro-flash" aria-hidden="true" />}
      <AnimatePresence>
        {phase === 'reveal' && (
          <motion.div
            key="reveal"
            className="ui"
            data-testid="reveal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.8 } }}
            style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', textAlign: 'center', padding: 20, background: 'radial-gradient(ellipse at 50% 55%, rgba(255,226,170,.35), rgba(50,25,70,.45) 75%)' }}
          >
            <div>
              <motion.div initial={{ opacity: 0, scale: 0.92 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 1.2, ease }} style={{ display: 'flex', justifyContent: 'center', marginBottom: 18 }}>
                <Portrait size={140} />
              </motion.div>
              {['YOU ARE INVITED!', 'ADVIKA IS TURNING 7!', 'LET’S CELEBRATE HER MAGICAL BIRTHDAY!'].map((line, i) => (
                <motion.p
                  key={line}
                  className="reveal-line"
                  initial={{ opacity: 0, y: 18 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.25 + i * 0.7, duration: 1.1, ease }}
                  style={{ margin: '0 0 10px', fontSize: i === 1 ? 'clamp(2.4rem, 7vw, 5.6rem)' : 'clamp(1.2rem, 3vw, 2.2rem)', lineHeight: 1.05 }}
                >
                  {line}
                </motion.p>
              ))}
              <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 2.4, duration: 1 }} style={{ fontSize: '1.05rem', margin: '16px 0 22px', textShadow: '0 1px 12px rgba(60,30,80,.6)' }}>
                {eventConfig.dateLabel} at {eventConfig.timeLabel}
              </motion.p>
              <motion.button initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 2.6 }} type="button" className="btn btn-primary" onClick={() => IntroDirector.enterMain()} data-testid="enter-main">
                Enter the celebration
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
