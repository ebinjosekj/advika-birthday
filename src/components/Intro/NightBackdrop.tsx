import { useEffect, useState } from 'react';
import { eventConfig } from '../../config/eventConfig';

// Fixed star field so the backdrop is identical on every visit (no Math.random in render).
const STARS = Array.from({ length: 90 }, (_, i) => {
  const a = Math.sin(i * 12.9898) * 43758.5453;
  const b = Math.sin(i * 78.233) * 12345.6789;
  const x = (a - Math.floor(a)) * 100;
  const y = (b - Math.floor(b)) * 70;
  const r = i % 9 === 0 ? 1.6 : i % 3 === 0 ? 1.1 : 0.7;
  return { x, y, r, o: 0.45 + ((i * 37) % 50) / 100, tw: i % 4 === 0 };
});

const TITLE = 'Advika turns seven';

/**
 * The opening title card: a moonlit sky and a short, hand-lettered title that
 * plays the moment the page opens. It is pure HTML/CSS (opacity + transform only),
 * so it stays perfectly smooth on a phone while the 3D world prepares behind it,
 * and then dissolves straight onto the magic book.
 */
export function NightBackdrop({ hidden }: { hidden: boolean }) {
  const [gone, setGone] = useState(false);
  useEffect(() => {
    if (!hidden) return;
    const t = setTimeout(() => setGone(true), 1600);
    return () => clearTimeout(t);
  }, [hidden]);
  if (gone) return null;
  return (
    <div className={`boot${hidden ? ' boot-out' : ''}`} role="status" data-testid="boot">
      <svg className="boot-sky" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
        <defs>
          <radialGradient id="bootMoonGlow">
            <stop offset="0" stopColor="#dfe6ff" stopOpacity="0.55" />
            <stop offset="1" stopColor="#dfe6ff" stopOpacity="0" />
          </radialGradient>
        </defs>
        {STARS.map((s, i) => (
          <circle key={i} className={s.tw ? 'boot-twinkle' : undefined} style={s.tw ? { animationDelay: `${(i % 7) * 0.45}s` } : undefined} cx={s.x} cy={s.y} r={s.r * 0.18} fill="#f4f1ff" opacity={s.o} />
        ))}
        <circle cx="66" cy="16" r="12" fill="url(#bootMoonGlow)" />
        <circle cx="66" cy="16" r="3.2" fill="#f3f1ea" />
      </svg>
      <div className="boot-clouds" aria-hidden="true">
        <span />
        <span />
        <span />
      </div>
      <div className="boot-card">
        <p className="boot-kicker">A fairy tale invitation</p>
        <h1 className="boot-title display" aria-label={TITLE}>
          {TITLE.split('').map((ch, i) => (
            <span key={i} aria-hidden="true" style={{ animationDelay: `${0.5 + i * 0.05}s` }}>
              {ch}
            </span>
          ))}
        </h1>
        <span className="boot-rule" aria-hidden="true" />
        <p className="boot-date">{eventConfig.dateLabel}</p>
      </div>
    </div>
  );
}
