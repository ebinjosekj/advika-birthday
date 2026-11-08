import { buildICS, escapeICSText, foldLine, toICSDateUTC } from '../../src/utils/ics';

describe('ICS calendar file', () => {
  const ics = buildICS(new Date('2026-11-07T18:00:00Z'));
  const lines = ics.split('\r\n');

  it('is a well-formed VCALENDAR with CRLF line endings', () => {
    expect(ics.startsWith('BEGIN:VCALENDAR\r\nVERSION:2.0\r\n')).toBe(true);
    expect(ics.trimEnd().endsWith('END:VCALENDAR')).toBe(true);
    expect(ics).not.toMatch(/[^\r]\n/);
  });

  it('uses the configured start (6 PM Eastern = 23:00Z) and configurable duration', () => {
    expect(lines).toContain('DTSTART:20261128T230000Z');
    expect(lines).toContain('DTEND:20261129T020000Z');
    expect(buildICS(new Date(), 90)).toContain('DTEND:20261129T003000Z');
  });

  it('includes summary and escaped location', () => {
    expect(ics).toContain('SUMMARY:Advika’s 7th Fairy Birthday');
    const unfolded = ics.replace(/\r\n /g, '');
    expect(unfolded).toContain('LOCATION:Evoke Apartments\\, 239 Eden Oak Trail\\, 1st Floor\\, Community Lounge\\, Kitchener\\, Ontario');
  });

  it('folds long lines to ≤75 octets', () => {
    const enc = new TextEncoder();
    for (const l of lines) expect(enc.encode(l).length).toBeLessThanOrEqual(75);
  });

  it('balances BEGIN/END blocks', () => {
    const begins = lines.filter((l) => l.startsWith('BEGIN:')).map((l) => l.slice(6));
    const ends = lines.filter((l) => l.startsWith('END:')).map((l) => l.slice(4));
    expect(begins.sort()).toEqual(ends.sort());
  });

  it('escapes and folds helpers', () => {
    expect(escapeICSText('a,b;c\\d\ne')).toBe('a\\,b\;c\\\\d\\ne');
    expect(foldLine('x'.repeat(80))).toBe('x'.repeat(75) + '\r\n ' + 'x'.repeat(5));
    expect(toICSDateUTC(new Date('2026-01-02T03:04:05Z'))).toBe('20260102T030405Z');
  });
});
