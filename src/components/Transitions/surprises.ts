import { useMagic } from '../../app/store';
import { emitBurst } from '../../animations/particleEffects/bursts';
import { audio } from '../../services/audioEngine';
import { LANDMARKS } from '../../config/worldLayout';
import { eventConfig } from '../../config/eventConfig';

const BUTTERFLY_NOTES = [
  'Happy 7th birthday, Advika!',
  'Seven years of sparkle and counting.',
  'Follow me — the party is this way.',
  'Every flutter is a birthday wish.',
  'Pastel wings are the dress code for butterflies too.',
  'Almost there… keep tapping!',
];

/** Optional hidden discoveries. Each one is safe to trigger repeatedly. */
export const surprises = {
  mushroomAt: -10,
  cake() {
    useMagic.getState().celebrate();
    emitBurst([LANDMARKS.cake[0], 5.2, LANDMARKS.cake[2]], '#ffe2a6', 260, 5);
    emitBurst([LANDMARKS.cake[0], 4.2, LANDMARKS.cake[2]], '#f6c6e6', 160, 3.5);
    audio.play('reveal');
    useMagic.getState().showToast({ title: 'Make a wish!', body: 'Seven candles for seven magical years.', tone: 'magic' });
  },
  mushroom() {
    surprises.mushroomAt = performance.now() / 1000;
    emitBurst([LANDMARKS.mushrooms[0], 1.6, LANDMARKS.mushrooms[2]], '#9fe3ff', 320, 7);
    audio.play('pop');
    useMagic.getState().showToast({ title: 'Poof! Mushroom magic.', body: 'The forest is celebrating too.', tone: 'magic' });
  },
  star() {
    emitBurst(LANDMARKS.hiddenStar, '#fff1c4', 260, 9);
    audio.play('chime');
    useMagic.getState().showToast({ title: 'A secret star!', body: 'This one is saving a wish just for Advika.', tone: 'magic' });
  },
  butterfly() {
    const s = useMagic.getState();
    const wasFound = s.secretFound;
    const n = s.clickButterfly();
    audio.play('sparkle');
    if (n === 7 && !wasFound) {
      audio.play('secret');
      emitBurst([LANDMARKS.castle[0], 20, LANDMARKS.castle[2] + 20], '#f6c6e6', 400, 12);
      useMagic.getState().showToast({ title: eventConfig.messages.secretMagic, body: 'The whole kingdom is sparkling for you.', tone: 'magic' });
      return;
    }
    const note = n > 7 ? BUTTERFLY_NOTES[0] : BUTTERFLY_NOTES[Math.min(n - 1, BUTTERFLY_NOTES.length - 1)];
    useMagic.getState().showToast({ title: note, body: n < 7 ? `${7 - n} more tap${7 - n === 1 ? '' : 's'} for a secret.` : undefined, tone: 'magic' });
  },
};
