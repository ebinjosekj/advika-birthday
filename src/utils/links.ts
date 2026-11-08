import { eventConfig, fullAddressOneLine } from '../config/eventConfig';

export const mapsUrl = () =>
  `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(eventConfig.venue.mapsQuery)}`;

export const telUrl = (e164: string) => `tel:${e164}`;

const rsvpText = `Hi! This is about Advika's 7th Fairy Birthday on ${eventConfig.dateLabel}. `;

export const whatsappUrl = (e164: string) =>
  `https://wa.me/${e164.replace(/\D/g, '')}?text=${encodeURIComponent(rsvpText)}`;

export const smsUrl = (e164: string) => `sms:${e164}?body=${encodeURIComponent(rsvpText)}`;

export async function copyText(text: string = fullAddressOneLine): Promise<boolean> {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    /* fall through to legacy path */
  }
  try {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand('copy');
    ta.remove();
    return ok;
  } catch {
    return false;
  }
}
