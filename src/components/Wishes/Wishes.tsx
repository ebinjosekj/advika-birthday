import { useEffect, useId, useState } from 'react';
import { Loader2, Star } from 'lucide-react';
import { eventConfig } from '../../config/eventConfig';
import { hasErrors, validateWish, type WishErrors } from '../../utils/validation';
import { listWishes, submitWish } from '../../services/wishService';
import { backendMode } from '../../services/backend';
import type { WishRecord } from '../../types';
import { useMagic } from '../../app/store';
import { emitBurst } from '../../animations/particleEffects/bursts';
import { audio } from '../../services/audioEngine';
import { LANDMARKS } from '../../config/worldLayout';
import { Chapter } from '../ui/Chapter';

export function WishGarden() {
  const ids = { name: useId(), msg: useId() };
  const [wishes, setWishes] = useState<WishRecord[]>([]);
  const [name, setName] = useState('');
  const [message, setMessage] = useState('');
  const [errors, setErrors] = useState<WishErrors>({});
  const [busy, setBusy] = useState(false);
  const [fail, setFail] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const max = eventConfig.limits.wishMax;

  useEffect(() => {
    listWishes().then((w) => {
      setWishes(w);
      useMagic.getState().setWishCount(w.length);
    });
  }, []);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    const errs = validateWish({ name, message });
    const clean = Object.fromEntries(Object.entries(errs).filter(([, v]) => v)) as WishErrors;
    setErrors(clean);
    setFail(null);
    if (hasErrors(clean)) return;
    setBusy(true);
    const res = await submitWish({ name, message });
    setBusy(false);
    if (!res.ok || !res.wish) {
      setFail(res.error ?? 'Your wish didn’t reach the garden. Please try again.');
      return;
    }
    const next = [res.wish, ...wishes];
    setWishes(next);
    useMagic.getState().setWishCount(next.length);
    setMessage('');
    setSent(true);
    emitBurst([LANDMARKS.wishingGarden[0], 4, LANDMARKS.wishingGarden[2]], '#ffe6a8', 220, 5);
    audio.play('chime');
  };

  return (
    <>
      <form onSubmit={onSubmit} noValidate data-testid="wish-form">
        {backendMode === 'demo' && (
          <p className="badge" style={{ margin: '0 0 12px' }}>
            Demo mode: wishes stay in this browser
          </p>
        )}
        <div className="field">
          <label htmlFor={ids.msg}>Your wish</label>
          <textarea id={ids.msg} className="input" rows={2} value={message} maxLength={max + 40} placeholder="May your seventh year sparkle…" onChange={(e) => {
              setMessage(e.target.value);
              setSent(false);
              if (errors.message) setErrors((er) => ({ ...er, message: undefined }));
            }} aria-invalid={!!errors.message} aria-describedby={`${ids.msg}-c`} disabled={busy} />
          <span id={`${ids.msg}-c`} className={errors.message ? 'error' : 'fine'} role={errors.message ? 'alert' : undefined} data-testid="wish-counter">
            {errors.message ?? `${message.trim().length}/${max}`}
          </span>
        </div>
        <div className="field">
          <label htmlFor={ids.name}>
            From <span className="fine">(optional)</span>
          </label>
          <input id={ids.name} className="input" value={name} onChange={(e) => {
              setName(e.target.value);
              if (errors.name) setErrors((er) => ({ ...er, name: undefined }));
            }} aria-invalid={!!errors.name} disabled={busy} autoComplete="given-name" />
          {errors.name && (
            <span className="error" role="alert">
              {errors.name}
            </span>
          )}
        </div>
        {fail && (
          <p className="error" role="alert" style={{ margin: '0 0 12px' }}>
            {fail}
          </p>
        )}
        <div className="btn-row" style={{ alignItems: 'center' }}>
          <button type="submit" className="btn btn-primary" disabled={busy} aria-busy={busy} data-testid="wish-submit">
            {busy ? <Loader2 size={18} aria-hidden="true" style={{ animation: 'spin 1s linear infinite' }} /> : <Star size={18} aria-hidden="true" />} {busy ? 'Sending…' : 'Send my wish'}
          </button>
          <span role="status" className="fine" data-testid="wish-confirm">
            {sent ? 'Your wish is floating up to the stars.' : ''}
          </span>
        </div>
      </form>
      {wishes.length === 0 && (
        <p className="fine" style={{ margin: '16px 0 0' }}>
          No wishes yet. Yours can be the first star.
        </p>
      )}
      <div className="wish-sky" aria-label="Wishes for Advika" role="list" data-testid="wish-list">
        {wishes.slice(0, 24).map((w, i) => (
          <div key={w.id} className="wish" role="listitem" style={{ animationDelay: `${(i % 6) * -0.9}s` }}>
            {w.message}
            {w.name && <small>— {w.name}</small>}
          </div>
        ))}
      </div>
    </>
  );
}

export function Wishes() {
  return (
    <Chapter id="wishes" labelledBy="wishes-title" tall>
      <div className="panel night" style={{ width: 'min(100%, 600px)' }}>
        <p className="h-sub" style={{ margin: '0 0 4px' }}>
          The wishing garden
        </p>
        <h2 id="wishes-title" className="display h-section" style={{ margin: '0 0 16px' }} tabIndex={-1}>
          Send Advika a Birthday Wish
        </h2>
        <WishGarden />
      </div>
    </Chapter>
  );
}
