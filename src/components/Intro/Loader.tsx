import { ButterflyMark } from '../ui/Icons';

export function Loader({ fonts, world }: { fonts: boolean; world: boolean }) {
  const pct = 20 + (fonts ? 30 : 0) + (world ? 50 : 0);
  return (
    <div className="loader" role="status" aria-live="polite">
      <div style={{ textAlign: 'center', padding: 24 }}>
        <ButterflyMark size={44} />
        <p className="display" style={{ fontSize: '1.9rem', margin: '10px 0 0' }}>
          Gathering fairy dust…
        </p>
        <div className="bar" aria-hidden="true">
          <i style={{ width: `${pct}%` }} />
        </div>
        <p className="fine" data-testid="loading-progress">
          {pct}% — {!fonts ? 'unfolding the storybook' : !world ? 'building the kingdom' : 'opening the sky'}
        </p>
      </div>
    </div>
  );
}
