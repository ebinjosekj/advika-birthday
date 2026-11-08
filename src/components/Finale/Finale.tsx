import { eventConfig } from '../../config/eventConfig';
import { Chapter } from '../ui/Chapter';
import { go } from '../Navigation/Nav';

export function Finale() {
  return (
    <Chapter id="finale" align="center" labelledBy="finale-title" tall>
      <div className="panel" style={{ background: 'rgba(251,245,234,.5)', maxWidth: 640 }}>
        <p className="h-sub" style={{ margin: '0 0 10px' }}>
          Every fairy tale needs a little magic…
        </p>
        <p className="lede" style={{ margin: '0 auto 14px' }}>
          Thank you for being part of Advika’s special day!
        </p>
        <h2 id="finale-title" className="display h-section" style={{ margin: '0 0 22px', letterSpacing: '0.02em' }} tabIndex={-1}>
          {eventConfig.messages.closing.toUpperCase().replace('’', '’')}
        </h2>
        <div className="btn-row">
          <a href="#rsvp" className="btn btn-primary" onClick={(e) => go('rsvp', e)}>
            RSVP by {eventConfig.rsvpDeadlineLabel}
          </a>
          <button type="button" className="btn btn-ghost" onClick={() => go('top')}>
            Back to the castle
          </button>
        </div>
        <footer className="fine" style={{ marginTop: 26 }}>
          Made with fairy dust for Advika’s 7th birthday.
        </footer>
      </div>
    </Chapter>
  );
}
