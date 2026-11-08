import { Sparkles } from 'lucide-react';
import { eventConfig } from '../../config/eventConfig';
import { Chapter } from '../ui/Chapter';
import { go } from '../Navigation/Nav';

export function Hero() {
  return (
    <Chapter id="home" labelledBy="hero-title" topSheet>
      <div className="panel">
        <p className="h-sub" style={{ margin: '0 0 6px' }}>
          {eventConfig.messages.heroSubtitle}
        </p>
        <h1 id="hero-title" className="display h-hero" style={{ margin: '0 0 18px' }} tabIndex={-1}>
          {eventConfig.messages.heroTitle}
        </h1>
        <p className="lede" style={{ margin: '0 0 20px' }}>
          {eventConfig.messages.invitation}
        </p>
        <p style={{ margin: '0 0 24px', fontSize: '1.08rem' }} data-testid="hero-when">
          <strong style={{ fontWeight: 600 }}>{eventConfig.dateLabel}</strong>
          <br />
          {eventConfig.timeLabel}
        </p>
        <div className="btn-row">
          <a className="btn btn-primary" href="#birthday" onClick={(e) => go('birthday', e)}>
            <Sparkles size={18} aria-hidden="true" /> DISCOVER THE MAGIC
          </a>
          <a className="btn btn-ghost" href="#rsvp" onClick={(e) => go('rsvp', e)}>
            RSVP NOW
          </a>
        </div>
      </div>
    </Chapter>
  );
}
