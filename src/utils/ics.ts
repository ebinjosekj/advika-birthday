import { eventConfig, fullAddressOneLine } from '../config/eventConfig';

const pad = (n: number) => String(n).padStart(2, '0');

export function toICSDateUTC(d: Date): string {
  return (
    d.getUTCFullYear() +
    pad(d.getUTCMonth() + 1) +
    pad(d.getUTCDate()) +
    'T' +
    pad(d.getUTCHours()) +
    pad(d.getUTCMinutes()) +
    pad(d.getUTCSeconds()) +
    'Z'
  );
}

/** RFC 5545 §3.3.11 text escaping. */
export function escapeICSText(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/;/g, '\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
}

/** RFC 5545 §3.1 line folding at 75 octets. */
export function foldLine(line: string): string {
  const enc = new TextEncoder();
  if (enc.encode(line).length <= 75) return line;
  const out: string[] = [];
  let cur = '';
  let curLen = 0;
  for (const ch of line) {
    const len = enc.encode(ch).length;
    const limit = out.length === 0 ? 75 : 74; // continuation lines start with a space
    if (curLen + len > limit) {
      out.push(cur);
      cur = '';
      curLen = 0;
    }
    cur += ch;
    curLen += len;
  }
  out.push(cur);
  return out.map((l, i) => (i === 0 ? l : ' ' + l)).join('\r\n');
}

export function buildICS(now: Date = new Date(), durationMinutes: number = eventConfig.calendarDurationMinutes): string {
  const start = new Date(eventConfig.startISO);
  const end = new Date(start.getTime() + durationMinutes * 60_000);
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Advikas Magical Universe//Invitation//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:advika-7th-birthday-20261128@advikas-magical-universe.local`,
    `DTSTAMP:${toICSDateUTC(now)}`,
    `DTSTART:${toICSDateUTC(start)}`,
    `DTEND:${toICSDateUTC(end)}`,
    `SUMMARY:${escapeICSText(eventConfig.eventName)}`,
    `LOCATION:${escapeICSText(fullAddressOneLine)}`,
    `DESCRIPTION:${escapeICSText(
      `${eventConfig.messages.invitation}\nDress code: ${eventConfig.dressCode}.\nPlease RSVP by ${eventConfig.rsvpDeadlineLabel}: ${eventConfig.contacts.map((c) => c.display).join(' or ')}.`,
    )}`,
    'BEGIN:VALARM',
    'TRIGGER:-PT2H',
    'ACTION:DISPLAY',
    `DESCRIPTION:${escapeICSText(eventConfig.eventName)}`,
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  ];
  return lines.map(foldLine).join('\r\n') + '\r\n';
}

export function downloadICS(filename = 'Advika-7th-Fairy-Birthday.ics'): void {
  const blob = new Blob([buildICS()], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}
