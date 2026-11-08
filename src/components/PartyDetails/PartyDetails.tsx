import { eventConfig, fullAddressLines } from '../../config/eventConfig';
import { useMagic } from '../../app/store';
import { downloadICS } from '../../utils/ics';
import { Chapter } from '../ui/Chapter';
import { CalendarArt, ClockArt, FabricArt, MapArt } from '../ui/Icons';
import { go } from '../Navigation/Nav';
import type { ReactNode } from 'react';
import { NextChapter } from '../ui/NextChapter';

interface DetailProps {
  k: string;
  label: string;
  value: ReactNode;
  hint: string;
  art: ReactNode;
  onClick: () => void;
}

function Detail({ k, label, value, hint, art, onClick }: DetailProps) {
  const set = useMagic((s) => s.setHoveredDetail);
  return (
    <button type="button" className="detail" onMouseEnter={() => set(k)} onMouseLeave={() => set(null)} onFocus={() => set(k)} onBlur={() => set(null)} onClick={onClick} data-testid={`detail-${k}`}>
      {art}
      <span>
        <span className="k">{label}</span>
        <span className="v" style={{ display: 'block' }}>
          {value}
        </span>
        <span className="hint">{hint}</span>
      </span>
    </button>
  );
}

export function PartyDetails() {
  return (
    <Chapter id="details" labelledBy="details-title" tall>
      <div className="panel wide" style={{ maxWidth: 760 }}>
        <p className="h-sub" style={{ margin: '0 0 4px' }}>
          The enchanted gathering
        </p>
        <h2 id="details-title" className="display h-section" style={{ margin: 0 }} tabIndex={-1}>
          Party details
        </h2>
        <div className="details">
          <Detail k="date" label="Date" value={eventConfig.dateLabel} hint="Add it to your calendar" art={<CalendarArt />} onClick={() => downloadICS()} />
          <Detail k="time" label="Time" value={eventConfig.timeLabel} hint="See the countdown" art={<ClockArt />} onClick={() => go('countdown')} />
          <Detail k="dress" label="Dress code" value={eventConfig.dressCode} hint="See the pastel palette" art={<FabricArt />} onClick={() => go('dress-code')} />
          <Detail
            k="location"
            label="Location"
            value={
              <>
                {fullAddressLines[0]}
                <span className="fine" style={{ display: 'block', fontFamily: 'var(--font-sans)', fontSize: '.92rem', fontWeight: 400, marginTop: 4, color: 'var(--ink)' }}>
                  {fullAddressLines.slice(1).join(', ')}
                </span>
              </>
            }
            hint="Get directions"
            art={<MapArt />}
            onClick={() => go('location')}
          />
        </div>
        <NextChapter from="details" />
      </div>
    </Chapter>
  );
}
