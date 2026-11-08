import { eventConfig } from '../config/eventConfig';

const L = eventConfig.limits;

/** Removes control characters and collapses whitespace. Output is always rendered as text, never HTML. */
export function cleanText(input: string, { multiline = false } = {}): string {
  // eslint-disable-next-line no-control-regex
  let s = input.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F\u200B-\u200F\u202A-\u202E]/g, '');
  s = multiline ? s.replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n') : s.replace(/\s+/g, ' ');
  return s.trim();
}

export interface RsvpInput {
  name: string;
  attending: 'yes' | 'no' | '';
  attendees: number | string;
  message: string;
}

export type RsvpErrors = Partial<Record<'name' | 'attending' | 'attendees' | 'message', string>>;

export function validateRsvp(input: RsvpInput): RsvpErrors {
  const errors: RsvpErrors = {};
  const name = cleanText(input.name);
  if (!name) errors.name = 'Please enter your name.';
  else if (name.length < 2) errors.name = 'Your name needs at least 2 characters.';
  else if (name.length > L.nameMax) errors.name = `Please keep your name under ${L.nameMax} characters.`;
  else if (/[<>]/.test(name)) errors.name = 'Please remove the < and > characters.';

  if (input.attending !== 'yes' && input.attending !== 'no') errors.attending = 'Please choose whether you can attend.';

  if (input.attending === 'yes') {
    const n = Number(input.attendees);
    if (!Number.isInteger(n) || n < 1) errors.attendees = 'Please enter how many guests are coming (at least 1).';
    else if (n > L.maxAttendees) errors.attendees = `For more than ${L.maxAttendees} guests, please call or text us.`;
  }

  const msg = cleanText(input.message, { multiline: true });
  if (msg.length > L.rsvpMessageMax) errors.message = `Please keep your message under ${L.rsvpMessageMax} characters.`;
  return errors;
}

export interface WishInput {
  name: string;
  message: string;
}
export type WishErrors = Partial<Record<'name' | 'message', string>>;

export function validateWish(input: WishInput): WishErrors {
  const errors: WishErrors = {};
  const msg = cleanText(input.message);
  if (msg.length < L.wishMin) errors.message = `Write a wish of at least ${L.wishMin} characters.`;
  else if (msg.length > L.wishMax) errors.message = `Wishes can be up to ${L.wishMax} characters.`;
  const name = cleanText(input.name);
  if (name.length > L.wishNameMax) errors.name = `Please keep your name under ${L.wishNameMax} characters.`;
  return errors;
}

export const hasErrors = (e: object) => Object.keys(e).length > 0;
