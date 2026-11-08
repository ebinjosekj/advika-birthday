import { useEffect, useState } from 'react';

// Fixed star field so the backdrop is identical on every visit (no Math.random in render).
const STARS = Array.from({ length: 90 }, (_, i) => {
  const a = Math.sin(i * 12.9898) * 43758.5453;
  const b = Math.sin(i * 78.233) * 12345.6789;
  const x = (a - Math.floor(a)) * 100;
  const y = (b - Math.floor(b)) * 62;
  const r = i % 9 === 0 ? 1.6 : i % 3 === 0 ? 1.1 : 0.7;
  return { x, y, r, o: 0.45 + ((i * 37) % 50) / 100 };
});

/**
 * The opening night sky, painted instantly while the 3D world prepares behind it,
 * so the very first thing a guest sees is the story's sky — never a blank screen.
 * It dissolves into the live scene the moment the world is ready.
 */
export function NightBackdrop({ hidden }: { hidden: boolean }) {
  const [gone, setGone] = useState(false);
  useEffect(() => {
    if (!hidden) return;
    const t = setTimeout(() => setGone(true), 1400);
    return () => clearTimeout(t);
  }, [hidden]);
  if (gone) return null;
  return (
    <div className={`boot${hidden ? ' boot-out' : ''}`} role="status" data-testid="boot">
      <span className="sr-only">Opening the invitation</span>
      <svg className="boot-sky" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
        <defs>
          <radialGradient id="bootMoonGlow">
            <stop offset="0" stopColor="#dfe6ff" stopOpacity="0.55" />
            <stop offset="1" stopColor="#dfe6ff" stopOpacity="0" />
          </radialGradient>
        </defs>
        {STARS.map((s, i) => (
          <circle key={i} cx={s.x} cy={s.y} r={s.r * 0.18} fill="#f4f1ff" opacity={s.o} />
        ))}
        <circle cx="76" cy="18" r="12" fill="url(#bootMoonGlow)" />
        <circle cx="76" cy="18" r="3.2" fill="#f3f1ea" />
      </svg>
      <div className="boot-clouds" aria-hidden="true">
        <span />
        <span />
        <span />
      </div>
    </div>
  );
}
