/** Original line illustrations for the four detail "objects" (no emoji). */
const stroke = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.6, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };

export const CalendarArt = () => (
  <svg viewBox="0 0 52 52" aria-hidden="true" style={{ color: '#6f4e9a' }}>
    <rect x="8" y="11" width="36" height="33" rx="6" {...stroke} />
    <path d="M8 20h36" {...stroke} />
    <path d="M17 7v8M35 7v8" {...stroke} />
    <text x="26" y="38" textAnchor="middle" fontFamily="Cormorant Garamond, serif" fontSize="15" fontWeight="600" fill="#b97a8a">28</text>
    <path d="M40 6l1.2 2.6L44 9.8l-2.8 1.2L40 14l-1.2-3L36 9.8l2.8-1.2z" fill="#e6cc94" />
  </svg>
);
export const ClockArt = () => (
  <svg viewBox="0 0 52 52" aria-hidden="true" style={{ color: '#6f4e9a' }}>
    <circle cx="26" cy="28" r="17" {...stroke} />
    <circle cx="26" cy="28" r="13" {...stroke} strokeOpacity={0.35} />
    <path d="M26 28V17M26 28v9" {...stroke} stroke="#b97a8a" strokeWidth={2} />
    <path d="M22 7h8M26 7v4" {...stroke} />
    <circle cx="26" cy="28" r="1.6" fill="#e6cc94" />
  </svg>
);
export const FabricArt = () => (
  <svg viewBox="0 0 52 52" aria-hidden="true">
    <path d="M6 16c8-6 14 6 22 0s14 6 18 2v10c-4 4-10-8-18-2S14 22 6 28z" fill="#c9b6e8" />
    <path d="M6 26c8-6 14 6 22 0s14 6 18 2v10c-4 4-10-8-18-2S14 32 6 38z" fill="#bfe3cf" opacity="0.9" />
    <path d="M6 36c8-6 14 6 22 0s14 6 18 2v6c-4 4-10-8-18-2S14 42 6 46z" fill="#f2b8c6" opacity="0.9" />
  </svg>
);
export const MapArt = () => (
  <svg viewBox="0 0 52 52" aria-hidden="true" style={{ color: '#6f4e9a' }}>
    <path d="M6 12l12-4 16 4 12-4v32l-12 4-16-4-12 4z" {...stroke} />
    <path d="M18 8v32M34 12v32" {...stroke} strokeOpacity={0.4} />
    <path d="M11 33c5-2 6-9 13-8s7-6 11-9" {...stroke} strokeDasharray="2 3" stroke="#b97a8a" />
    <path d="M38 12a4 4 0 0 1 4 4c0 3-4 7-4 7s-4-4-4-7a4 4 0 0 1 4-4z" fill="#e6cc94" />
  </svg>
);
export const ButterflyMark = ({ size = 22 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
    <defs>
      <linearGradient id="bm" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="#d8a1ae" />
        <stop offset="1" stopColor="#8f74c0" />
      </linearGradient>
    </defs>
    <path d="M32 34c-6-16-24-22-26-10-1 8 10 12 22 11-10 3-16 12-10 16 6 3 12-6 14-15 2 9 8 18 14 15 6-4 0-13-10-16 12 1 23-3 22-11-2-12-20-6-26 10z" fill="url(#bm)" />
    <circle cx="32" cy="34" r="2.4" fill="#e6cc94" />
  </svg>
);
