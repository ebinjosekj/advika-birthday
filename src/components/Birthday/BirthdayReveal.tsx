import { Flame } from 'lucide-react';
import { Chapter } from '../ui/Chapter';
import { surprises } from '../Transitions/surprises';

export function BirthdayReveal() {
  return (
    <Chapter id="birthday" align="right" labelledBy="birthday-title" tall>
      <div className="panel">
        <p className="h-sub" style={{ margin: '0 0 6px' }}>
          Something Magical Is Happening!
        </p>
        <h2 id="birthday-title" className="display h-section" style={{ margin: '0 0 14px' }} tabIndex={-1}>
          Advika is turning 7!
        </h2>
        <p className="lede" style={{ margin: '0 0 22px' }}>
          Seven candles are waiting on the castle terrace. Tap the cake to light them and send the balloons up.
        </p>
        <button type="button" className="btn btn-primary" onClick={surprises.cake} data-testid="light-candles">
          <Flame size={18} aria-hidden="true" /> Light the candles
        </button>
      </div>
    </Chapter>
  );
}
