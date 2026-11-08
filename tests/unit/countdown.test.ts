import { computeCountdown, formatInZone, pad2 } from '../../src/utils/countdown';
import { eventConfig } from '../../src/config/eventConfig';

const TARGET = new Date(eventConfig.startISO).getTime();

describe('countdown', () => {
  it('targets 6:00 PM Eastern on Nov 28, 2026 (23:00 UTC)', () => {
    expect(new Date(TARGET).toISOString()).toBe('2026-11-28T23:00:00.000Z');
  });

  it('splits the remaining time into days/hours/minutes/seconds', () => {
    const now = TARGET - (3 * 86400 + 4 * 3600 + 5 * 60 + 6) * 1000;
    expect(computeCountdown(now, TARGET)).toMatchObject({ days: 3, hours: 4, minutes: 5, seconds: 6, done: false });
  });

  it('floors partial seconds', () => {
    expect(computeCountdown(TARGET - 1500, TARGET)).toMatchObject({ days: 0, hours: 0, minutes: 0, seconds: 1 });
  });

  it('reports done at and after the start, never negative', () => {
    expect(computeCountdown(TARGET, TARGET)).toMatchObject({ days: 0, hours: 0, minutes: 0, seconds: 0, done: true });
    expect(computeCountdown(TARGET + 99999, TARGET).totalMs).toBe(0);
  });

  it('is timezone-independent because it uses absolute instants', () => {
    const now = Date.UTC(2026, 10, 7, 18, 21, 0); // 1:21 PM Toronto on Nov 7
    const c = computeCountdown(now, TARGET);
    expect(c.days).toBe(21);
    expect(c.hours).toBe(4);
    expect(c.minutes).toBe(39);
  });

  it('formats the start in other zones correctly', () => {
    expect(formatInZone(TARGET, 'America/Toronto')).toMatch(/Saturday, November 28.*6:00\sPM/);
    expect(formatInZone(TARGET, 'Asia/Kolkata')).toMatch(/Sunday, November 29.*4:30\sAM/);
    expect(formatInZone(TARGET, 'America/Los_Angeles')).toMatch(/Saturday, November 28.*3:00\sPM/);
  });

  it('pads to two digits', () => {
    expect(pad2(4)).toBe('04');
    expect(pad2(12)).toBe('12');
  });
});
