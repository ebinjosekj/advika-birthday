import { submitRsvp, toRecord, previousSubmission } from '../../src/services/rsvpService';
import { listWishes, submitWish } from '../../src/services/wishService';
import { backendMode } from '../../src/services/backend';

describe('demo-mode services', () => {
  beforeEach(() => localStorage.clear());

  it('runs in demo mode without Supabase credentials', () => expect(backendMode).toBe('demo'));

  it('stores an RSVP locally, marks it as demo, and dedupes concurrent submits', async () => {
    const rec = toRecord({ name: ' Ana ', attending: 'yes', attendees: '2', message: 'Yay' }, 'fixed-id');
    expect(rec).toMatchObject({ name: 'Ana', attending: true, attendees: 2, demo: true });
    const [a, b] = await Promise.all([submitRsvp(rec), submitRsvp(rec)]);
    expect(a).toEqual(b);
    expect(a.ok).toBe(true);
    const stored = JSON.parse(localStorage.getItem('advika.demo.rsvps.v1')!);
    expect(stored).toHaveLength(1);
    expect(previousSubmission()).toEqual({ name: 'Ana', attending: true });
    const again = await submitRsvp(rec);
    expect(again.duplicate).toBe(true);
  });

  it('records 0 attendees for a “no”', () => {
    expect(toRecord({ name: 'Ben', attending: 'no', attendees: 4, message: '' }).attendees).toBe(0);
  });

  it('saves and lists wishes as plain text', async () => {
    const res = await submitWish({ name: 'Zoe', message: '<img src=x onerror=alert(1)> Happy birthday' });
    expect(res.ok).toBe(true);
    const list = await listWishes();
    expect(list[0].message).toBe('<img src=x onerror=alert(1)> Happy birthday');
  });

  it('ignores corrupt local data', async () => {
    localStorage.setItem('advika.demo.wishes.v1', '{not json');
    expect(await listWishes()).toEqual([]);
  });
});
