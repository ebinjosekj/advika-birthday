import { eventConfig } from '../../config/eventConfig';
import { Chapter } from '../ui/Chapter';

const SWATCHES = [
  { name: 'Lavender', c: '#cbb8ea' },
  { name: 'Soft mint', c: '#c4e6d3' },
  { name: 'Powder blue', c: '#b4cfe8' },
  { name: 'Dusty rose', c: '#e3b1bd' },
  { name: 'Ivory', c: '#fbf5ea' },
  { name: 'Peach', c: '#f6ceb3' },
];

export function DressCode() {
  return (
    <Chapter id="dress-code" labelledBy="dress-title" tall>
      <div className="panel">
        <p className="h-sub" style={{ margin: '0 0 4px' }}>
          Dress code: {eventConfig.dressCode}
        </p>
        <h2 id="dress-title" className="display h-section" style={{ margin: 0 }} tabIndex={-1}>
          Come Dressed in Pastel Magic!
        </h2>
        <div className="swatches" role="list" aria-label="Pastel colour ideas">
          {SWATCHES.map((s, i) => (
            <div key={s.name} className="swatch" role="listitem" style={{ background: `linear-gradient(160deg, ${s.c}, color-mix(in oklab, ${s.c} 80%, #7a5a9a))`, animationDelay: `${i * 0.4}s` }}>
              <span>{s.name}</span>
            </div>
          ))}
        </div>
        <p className="lede" style={{ margin: 0 }}>
          Come dressed in your favourite pastel shades!
        </p>
      </div>
    </Chapter>
  );
}
