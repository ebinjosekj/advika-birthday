import { useEffect, useRef, useState } from 'react';
import { Volume2, VolumeX } from 'lucide-react';
import { useMagic } from '../../app/store';
import { audio } from '../../services/audioEngine';

export function SoundToggle({ compact = false }: { compact?: boolean }) {
  const on = useMagic((s) => s.soundOn);
  const volume = useMagic((s) => s.volume);
  const toggle = async () => {
    if (on) {
      audio.disable();
      useMagic.getState().setSound(false);
    } else {
      const ok = await audio.enable(volume);
      useMagic.getState().setSound(ok);
      if (ok) audio.play('sparkle');
    }
  };
  return (
    <button type="button" className={compact ? 'icon-btn' : 'icon-btn'} aria-pressed={on} aria-label={on ? 'Turn sound off' : 'Turn sound on'} onClick={toggle} data-testid="sound-toggle" style={compact ? { background: 'rgba(255,255,255,.75)' } : undefined}>
      {on ? <Volume2 size={20} aria-hidden="true" /> : <VolumeX size={20} aria-hidden="true" />}
    </button>
  );
}

export function SoundControl() {
  const on = useMagic((s) => s.soundOn);
  const volume = useMagic((s) => s.volume);
  const [open, setOpen] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (e: PointerEvent | KeyboardEvent) => {
      if (e instanceof KeyboardEvent ? e.key === 'Escape' : !wrap.current?.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener('pointerdown', close);
    window.addEventListener('keydown', close);
    return () => {
      window.removeEventListener('pointerdown', close);
      window.removeEventListener('keydown', close);
    };
  }, [open]);
  return (
    <div ref={wrap} style={{ position: 'relative', display: 'flex', gap: 6 }}>
      <SoundToggle />
      <button type="button" className="icon-btn" aria-expanded={open} aria-controls="volume-panel" aria-label="Volume" onClick={() => setOpen((o) => !o)} data-testid="volume-button">
        <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
          <path d="M4 7h10M4 17h6M18 7h2M14 17h6" />
          <circle cx="16" cy="7" r="2" />
          <circle cx="12" cy="17" r="2" />
        </svg>
      </button>
      {open && (
        <div id="volume-panel" className="volume">
          <label htmlFor="vol" className="fine" style={{ display: 'block', marginBottom: 8 }}>
            Volume {Math.round(volume * 100)}%{!on && ' (sound is off)'}
          </label>
          <input
            id="vol"
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={volume}
            data-testid="volume-slider"
            onChange={(e) => {
              const v = Number(e.target.value);
              useMagic.getState().setVolume(v);
              audio.setVolume(v);
            }}
          />
        </div>
      )}
    </div>
  );
}
