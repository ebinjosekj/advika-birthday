import type { ReactNode } from 'react';
import type { SectionId } from '../../config/worldLayout';

interface ChapterProps {
  id: SectionId;
  align?: 'left' | 'right' | 'center';
  tall?: boolean;
  topSheet?: boolean;
  labelledBy: string;
  children: ReactNode;
}

/** One stop on the camera's journey; the panel floats over the 3D scene behind it. */
export function Chapter({ id, align = 'left', tall, topSheet, labelledBy, children }: ChapterProps) {
  return (
    <section id={id} className={`chapter${tall ? ' tall' : ''}${topSheet ? ' top-sheet' : ''}`} data-align={align} aria-labelledby={labelledBy} data-testid={`section-${id}`}>
      {children}
    </section>
  );
}
