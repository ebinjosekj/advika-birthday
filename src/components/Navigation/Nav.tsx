import { useEffect, useState } from 'react';
import { Menu, X } from 'lucide-react';
import { useMagic } from '../../app/store';
import { TransitionManager } from '../../animations/sectionTransitions/TransitionManager';
import type { SectionId } from '../../config/worldLayout';
import { ButterflyMark } from '../ui/Icons';
import { SoundControl } from '../Audio/SoundControl';

export const NAV_ITEMS: { id: SectionId; label: string }[] = [
  { id: 'home', label: 'Home' },
  { id: 'birthday', label: 'Birthday' },
  { id: 'countdown', label: 'Countdown' },
  { id: 'details', label: 'Party Details' },
  { id: 'location', label: 'Location' },
  { id: 'rsvp', label: 'RSVP' },
];

export function go(id: SectionId | 'top', e?: { preventDefault: () => void }) {
  e?.preventDefault();
  TransitionManager.scrollTo(id, { focus: true });
  if (id !== 'top') history.replaceState(null, '', `#${id}`);
}

export function Nav() {
  const active = useMagic((s) => s.activeSection);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (!open) return;
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', esc);
    return () => window.removeEventListener('keydown', esc);
  }, [open]);
  const link = (it: (typeof NAV_ITEMS)[number], onDone?: () => void) => (
    <a
      className="link"
      href={`#${it.id}`}
      aria-current={active === it.id ? 'true' : undefined}
      onClick={(e) => {
        go(it.id, e);
        onDone?.();
      }}
    >
      {it.label}
    </a>
  );
  return (
    <>
      <nav className="nav ui" aria-label="Invitation sections">
        <a className="brand" href="#home" onClick={(e) => go('home', e)}>
          <ButterflyMark /> Advika turns 7
        </a>
        <ul className="desktop">
          {NAV_ITEMS.map((it) => (
            <li key={it.id}>{link(it)}</li>
          ))}
        </ul>
        <div className="nav-tools">
          <SoundControl />
          <button type="button" className="icon-btn menu-toggle" aria-expanded={open} aria-controls="mobile-menu" aria-label={open ? 'Close menu' : 'Open menu'} onClick={() => setOpen((o) => !o)} data-testid="menu-toggle">
            {open ? <X size={20} aria-hidden="true" /> : <Menu size={20} aria-hidden="true" />}
          </button>
        </div>
      </nav>
      {open && (
        <div id="mobile-menu" className="sheet ui" role="dialog" aria-label="Sections">
          <ul>
            {NAV_ITEMS.map((it) => (
              <li key={it.id}>{link(it, () => setOpen(false))}</li>
            ))}
          </ul>
        </div>
      )}
    </>
  );
}
