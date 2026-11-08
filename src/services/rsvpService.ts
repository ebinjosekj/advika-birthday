import { backendMode, demoShouldFail, getSupabase, newClientId, wait } from './backend';
import { cleanText, type RsvpInput } from '../utils/validation';
import type { RsvpRecord, SubmitResult } from '../types';

/** Advika's own table, kept separate from any other event in the same Supabase project. */
export const RSVP_TABLE = 'advika_rsvps';
const DEMO_KEY = 'advika.demo.rsvps.v1';
const DEVICE_KEY = 'advika.rsvp.submitted.v1';

function readDemo(): RsvpRecord[] {
  try {
    return JSON.parse(localStorage.getItem(DEMO_KEY) ?? '[]') as RsvpRecord[];
  } catch {
    return [];
  }
}

export function previousSubmission(): { name: string; attending: boolean } | null {
  try {
    return JSON.parse(localStorage.getItem(DEVICE_KEY) ?? 'null');
  } catch {
    return null;
  }
}

export function toRecord(input: RsvpInput, clientId = newClientId()): RsvpRecord {
  const attending = input.attending === 'yes';
  return {
    clientId,
    name: cleanText(input.name),
    attending,
    attendees: attending ? Number(input.attendees) : 0,
    message: cleanText(input.message, { multiline: true }),
    createdAt: new Date().toISOString(),
    demo: backendMode === 'demo',
  };
}

let inFlight: Promise<SubmitResult> | null = null;

/** Submits once; concurrent calls share the same promise so double-taps can't duplicate. */
export function submitRsvp(record: RsvpRecord): Promise<SubmitResult> {
  if (inFlight) return inFlight;
  inFlight = (async (): Promise<SubmitResult> => {
    try {
      if (backendMode === 'supabase') {
        const sb = await getSupabase();
        const { error } = await sb.from(RSVP_TABLE).insert({
          client_id: record.clientId,
          name: record.name,
          attending: record.attending,
          attendees: record.attendees,
          message: record.message || null,
        });
        if (error) {
          if (error.code === '23505') return { ok: true, demo: false, duplicate: true };
          return { ok: false, demo: false, error: 'We couldn’t save your RSVP. Please try again, or call or text us.' };
        }
      } else {
        await wait(900);
        if (demoShouldFail()) return { ok: false, demo: true, error: 'Demo failure: the RSVP was not saved. Remove ?demoFail=1 and try again.' };
        const all = readDemo();
        if (all.some((r) => r.clientId === record.clientId)) return { ok: true, demo: true, duplicate: true };
        all.push(record);
        localStorage.setItem(DEMO_KEY, JSON.stringify(all));
      }
      localStorage.setItem(DEVICE_KEY, JSON.stringify({ name: record.name, attending: record.attending }));
      return { ok: true, demo: backendMode === 'demo' };
    } catch {
      return { ok: false, demo: backendMode === 'demo', error: 'The connection dropped before your RSVP was saved. Please try again.' };
    } finally {
      inFlight = null;
    }
  })();
  return inFlight;
}

export const demoRsvps = readDemo;
