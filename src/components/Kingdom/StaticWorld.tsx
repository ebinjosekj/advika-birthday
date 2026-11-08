/** Graceful no-WebGL backdrop: painted sky, drifting clouds and a castle silhouette. */
export function StaticWorld() {
  return (
    <div className="static-world" data-testid="static-world" aria-hidden="true">
      {[12, 30, 55, 72].map((top, i) => (
        <div key={top} className="cloud" style={{ top: `${top}%`, animationDelay: `${-i * 14}s`, animationDuration: `${50 + i * 12}s`, opacity: 0.7 - i * 0.1 }} />
      ))}
      <svg viewBox="0 0 1200 600" preserveAspectRatio="xMidYMax slice" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}>
        <defs>
          <linearGradient id="cs" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#efe2f4" />
            <stop offset="1" stopColor="#d9c4e6" />
          </linearGradient>
        </defs>
        <ellipse cx="600" cy="560" rx="420" ry="40" fill="#c8e2cf" />
        <g fill="url(#cs)">
          <rect x="470" y="330" width="260" height="230" />
          <rect x="420" y="280" width="54" height="280" />
          <rect x="726" y="280" width="54" height="280" />
          <rect x="560" y="200" width="80" height="140" />
        </g>
        <g fill="#c9b6e8">
          <polygon points="412,282 447,200 482,282" />
          <polygon points="718,282 753,200 788,282" />
          <polygon points="552,204 600,96 648,204" />
        </g>
        <path d="M570 560v-70a30 30 0 0 1 60 0v70z" fill="#ffe2b0" />
        {[490, 690, 585].map((x, i) => (
          <rect key={i} x={x} y={i === 2 ? 240 : 380} width="20" height="34" rx="10" fill="#ffd59a" />
        ))}
      </svg>
    </div>
  );
}
