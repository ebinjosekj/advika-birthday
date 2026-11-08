import { useEffect, useState } from 'react';
import { ArrowUp, CalendarHeart } from 'lucide-react';
import { useMagic } from '../../app/store';
import { eventConfig, fullAddressLines } from '../../config/eventConfig';
import { go } from './Nav';

/** Always-available invitation essentials: date, time, place and RSVP, one tap away. */
export function QuickDetails() {
  const [open, setOpen] = useState(false);
  return (
    <div className="chip ui">
      {open && (
        <div id="quick-details" className="panel" role="dialog" aria-label="Invitation essentials" style={{ position: 'absolute', bottom: 60, left: 0, width: 'min(330px, calc(100vw - 24px))', padding: 20 }}>
          <p className="display" style={{ fontSize: '1.35rem', margin: '0 0 6px' }}>
            {eventConfig.dateLabel}
          </p>
          <p style={{ margin: '0 0 10px' }}>{eventConfig.timeLabel}</p>
          <p className="fine" style={{ margin: '0 0 14px' }}>
            {fullAddressLines.join(', ')}
          </p>
          <div className="btn-row">
            <a href="#rsvp" className="btn btn-primary" onClick={(e) => (setOpen(false), go('rsvp', e))}>
              RSVP by {eventConfig.rsvpDeadlineLabel.replace(', 2026', '')}
            </a>
            <a href="#location" className="btn btn-ghost" onClick={(e) => (setOpen(false), go('location', e))}>
              Directions
            </a>
          </div>
        </div>
      )}
      <button type="button" className="btn btn-ghost" style={{ background: 'rgba(251,245,234,.82)', backdropFilter: 'blur(10px)' }} aria-expanded={open} aria-controls="quick-details" onClick={() => setOpen((o) => !o)} data-testid="quick-details">
        <CalendarHeart size={18} aria-hidden="true" /> {eventConfig.shortDateLabel}, {eventConfig.timeLabel}
      </button>
    </div>
  );
}

export function BackToTop() {
  const section = useMagic((s) => s.activeSection);
  const [show, setShow] = useState(false);
  useEffect(() => setShow(section !== 'home'), [section]);
  if (!show) return null;
  return (
    <button type="button" className="icon-btn ui" aria-label="Back to top" onClick={() => go('top')} data-testid="back-to-top" style={{ position: 'fixed', zIndex: 30, right: 'max(12px, env(safe-area-inset-right))', bottom: 'max(12px, env(safe-area-inset-bottom))', background: 'rgba(251,245,234,.85)', backdropFilter: 'blur(10px)' }}>
      <ArrowUp size={20} aria-hidden="true" />
    </button>
  );
}
