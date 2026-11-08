import { cleanText, validateRsvp } from '../../src/utils/validation';

describe('RSVP validation', () => {
  const ok = { name: 'Maya Thomas', attending: 'yes' as const, attendees: 3, message: '' };
  it('accepts a valid reply', () => expect(validateRsvp(ok)).toEqual({}));
  it('requires a name of 2+ chars and rejects angle brackets', () => {
    expect(validateRsvp({ ...ok, name: '  ' }).name).toMatch(/enter your name/);
    expect(validateRsvp({ ...ok, name: 'A' }).name).toMatch(/at least 2/);
    expect(validateRsvp({ ...ok, name: '<b>hi</b>' }).name).toMatch(/< and >/);
  });
  it('requires an attendance choice', () => expect(validateRsvp({ ...ok, attending: '' }).attending).toBeTruthy());
  it('checks attendee counts only when attending', () => {
    expect(validateRsvp({ ...ok, attendees: 0 }).attendees).toBeTruthy();
    expect(validateRsvp({ ...ok, attendees: 2.5 }).attendees).toBeTruthy();
    expect(validateRsvp({ ...ok, attendees: 11 }).attendees).toMatch(/call or text/);
    expect(validateRsvp({ ...ok, attending: 'no', attendees: 0 })).toEqual({});
  });
  it('limits the message length', () => expect(validateRsvp({ ...ok, message: 'x'.repeat(301) }).message).toBeTruthy());
});

describe('text cleaning', () => {
  it('strips control and bidi characters and collapses whitespace', () => {
    expect(cleanText('  a\u0000b\u202Ec   \n d ')).toBe('abc d');
    expect(cleanText('line1\n\n\n\nline2', { multiline: true })).toBe('line1\n\nline2');
  });
});
