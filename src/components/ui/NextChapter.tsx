import { ChevronDown } from 'lucide-react';
import { SECTION_IDS, type SectionId } from '../../config/worldLayout';
import { TransitionManager } from '../../animations/sectionTransitions/TransitionManager';

const TITLES: Record<SectionId, string> = {
  home: 'Home',
  birthday: 'The birthday wish',
  countdown: 'The countdown',
  details: 'Party details',
  location: 'Where to find us',
  'dress-code': 'Dress code',
  rsvp: 'RSVP',
  finale: 'A last little magic',
};

/**
 * Panel footer that tells guests the story continues below, and what comes next.
 * Tapping it glides to the next chapter; when the page sits still, its chevron
 * starts to bob gently to invite a swipe.
 */
export function NextChapter({ from }: { from: SectionId }) {
  const i = SECTION_IDS.indexOf(from);
  const next = SECTION_IDS[i + 1];
  if (!next) return null;
  return (
    <button type="button" className="next-chapter" onClick={() => TransitionManager.scrollTo(next, { focus: true })} data-testid={`next-${from}`}>
      <span className="next-copy">
        <span className="next-kicker">Scroll for more</span>
        <span className="next-title">{TITLES[next]}</span>
      </span>
      <span className="next-chevron" aria-hidden="true">
        <ChevronDown size={18} />
      </span>
    </button>
  );
}
