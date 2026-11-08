import { useEffect, useRef, type ReactNode } from 'react';
import type { SectionId } from '../../config/worldLayout';

interface ChapterProps {
  id: SectionId;
  align?: 'left' | 'right' | 'center';
  tall?: boolean;
  topSheet?: boolean;
  labelledBy: string;
  children: ReactNode;
}

/**
 * One stop on the camera's journey; the panel floats over the 3D scene behind it.
 * Each time a chapter scrolls into view its content plays a staggered entrance
 * (pure CSS transitions on transform/opacity, so it stays on the compositor).
 */
export function Chapter({ id, align = 'left', tall, topSheet, labelledBy, children }: ChapterProps) {
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === 'undefined') {
      el?.classList.add('in-view');
      return;
    }
    const io = new IntersectionObserver(([entry]) => el.classList.toggle('in-view', entry.isIntersecting), { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <section ref={ref} id={id} className={`chapter${tall ? ' tall' : ''}${topSheet ? ' top-sheet' : ''}`} data-align={align} aria-labelledby={labelledBy} data-testid={`section-${id}`}>
      {children}
    </section>
  );
}
