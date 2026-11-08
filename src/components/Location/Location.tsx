import { useState } from 'react';
import { CalendarPlus, Check, Copy, MapPin } from 'lucide-react';
import { eventConfig, fullAddressLines, fullAddressOneLine } from '../../config/eventConfig';
import { copyText, mapsUrl } from '../../utils/links';
import { downloadICS } from '../../utils/ics';
import { useMagic } from '../../app/store';
import { Chapter } from '../ui/Chapter';
import { NextChapter } from '../ui/NextChapter';

export function Location() {
  const [copied, setCopied] = useState<'idle' | 'ok' | 'fail'>('idle');
  return (
    <Chapter id="location" align="right" labelledBy="location-title" tall>
      <div className="panel">
        <p className="h-sub" style={{ margin: '0 0 4px' }}>
          Follow the rainbow bridge
        </p>
        <h2 id="location-title" className="display h-section" style={{ margin: '0 0 14px' }} tabIndex={-1}>
          The magical location
        </h2>
        <address style={{ fontStyle: 'normal', fontSize: '1.1rem', lineHeight: 1.6, margin: '0 0 22px' }} data-testid="address">
          <strong style={{ fontFamily: 'var(--font-display)', fontSize: '1.45rem', fontWeight: 600 }}>{fullAddressLines[0]}</strong>
          <br />
          {fullAddressLines[1]}
          <br />
          {fullAddressLines[2]}
          <br />
          {fullAddressLines[3]}
        </address>
        <div className="btn-row">
          <a className="btn btn-primary" href={mapsUrl()} target="_blank" rel="noopener noreferrer" data-testid="maps-link">
            <MapPin size={18} aria-hidden="true" /> OPEN IN GOOGLE MAPS
          </a>
          <button
            type="button"
            className="btn btn-ghost"
            data-testid="copy-address"
            onClick={async () => {
              const ok = await copyText(fullAddressOneLine);
              setCopied(ok ? 'ok' : 'fail');
              useMagic.getState().showToast(ok ? { title: 'Address copied', body: fullAddressOneLine, tone: 'info' } : { title: 'Couldn’t copy automatically', body: 'Press and hold the address to copy it.', tone: 'error' });
              setTimeout(() => setCopied('idle'), 2500);
            }}
          >
            {copied === 'ok' ? <Check size={18} aria-hidden="true" /> : <Copy size={18} aria-hidden="true" />} {copied === 'ok' ? 'COPIED' : 'COPY ADDRESS'}
          </button>
          <button type="button" className="btn btn-ghost" onClick={() => downloadICS()} data-testid="add-calendar">
            <CalendarPlus size={18} aria-hidden="true" /> ADD TO CALENDAR
          </button>
        </div>
        <p className="fine" style={{ margin: '16px 0 0' }}>
          The calendar entry starts {eventConfig.dateLabel} at {eventConfig.timeLabel}.
        </p>
        <NextChapter from="location" />
      </div>
    </Chapter>
  );
}
