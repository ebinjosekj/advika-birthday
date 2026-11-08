import { AnimatePresence, motion } from 'motion/react';
import { eventConfig } from '../../config/eventConfig';
import { useCountdown } from '../../hooks/useCountdown';
import { formatInZone, pad2, visitorTimeZone } from '../../utils/countdown';
import { Chapter } from '../ui/Chapter';
import { useMagic } from '../../app/store';
import { NextChapter } from '../ui/NextChapter';

const TARGET = new Date(eventConfig.startISO).getTime();

function Digits({ value }: { value: string }) {
  const reduced = useMagic((s) => s.reducedMotion);
  return (
    <span className="num" aria-hidden="true">
      {value.split('').map((d, i) => (
        <span key={i} className="digit" style={{ position: 'relative' }}>
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.span
              key={d}
              initial={reduced ? false : { y: '-100%', opacity: 0, filter: 'blur(4px)' }}
              animate={{ y: '0%', opacity: 1, filter: 'blur(0px)' }}
              exit={reduced ? undefined : { y: '100%', opacity: 0, filter: 'blur(4px)' }}
              transition={{ duration: 0.45, ease: [0.2, 0.8, 0.2, 1] }}
              style={{ display: 'inline-block' }}
            >
              {d}
            </motion.span>
          </AnimatePresence>
        </span>
      ))}
    </span>
  );
}

export function Countdown() {
  const c = useCountdown(TARGET);
  const tz = visitorTimeZone();
  const local = formatInZone(TARGET, tz);
  const sameZone = tz === eventConfig.eventTimeZone;
  const cells = [
    { v: c.days, label: 'Days' },
    { v: c.hours, label: 'Hours' },
    { v: c.minutes, label: 'Minutes' },
    { v: c.seconds, label: 'Seconds' },
  ];
  return (
    <Chapter id="countdown" align="center" labelledBy="countdown-title" tall>
      <div className="panel night wide">
        <p className="h-sub" style={{ margin: '0 0 4px' }}>
          Countdown to the magic
        </p>
        <h2 id="countdown-title" className="display h-section" style={{ margin: 0 }} tabIndex={-1}>
          {c.done ? eventConfig.messages.countdownDone : 'Until the castle doors open'}
        </h2>
        {!c.done && (
          <div className="count" role="timer" aria-label={`${c.days} days, ${c.hours} hours, ${c.minutes} minutes and ${c.seconds} seconds to go`} data-testid="countdown">
            {cells.map((cell) => (
              <div className="cell" key={cell.label} data-unit={cell.label.toLowerCase()} data-value={cell.v}>
                <Digits value={cell.label === 'Days' ? String(cell.v).padStart(2, '0') : pad2(cell.v)} />
                <span className="unit">{cell.label}</span>
              </div>
            ))}
          </div>
        )}
        <p className="fine" style={{ margin: '6px auto 0', maxWidth: '40em' }}>
          {eventConfig.dateLabel} at {eventConfig.timeLabel} in {eventConfig.venue.city} ({eventConfig.eventTimeZoneLabel})
          {!sameZone && (
            <>
              <br />
              <span data-testid="local-time">That’s {local} where you are.</span>
            </>
          )}
        </p>
        <NextChapter from="countdown" />
      </div>
    </Chapter>
  );
}
