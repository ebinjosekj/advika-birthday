import { eventConfig, fullAddressOneLine } from '../../src/config/eventConfig';
import { mapsUrl, smsUrl, telUrl, whatsappUrl } from '../../src/utils/links';
import { pickQuality, downgrade, QUALITY_PROFILES } from '../../src/utils/quality';

describe('event configuration matches the reference invitation', () => {
  it('has the verified details', () => {
    expect(eventConfig.dateLabel).toBe('Saturday, November 28, 2026');
    expect(eventConfig.timeLabel).toBe('6:00 PM');
    expect(eventConfig.dressCode).toBe('Pastel Shades');
    expect(eventConfig.rsvpDeadlineLabel).toBe('November 20, 2026');
    expect(eventConfig.contacts.map((c) => c.display)).toEqual(['548-333-2347', '548-333-2348']);
    expect(fullAddressOneLine).toBe('Evoke Apartments, 239 Eden Oak Trail, 1st Floor, Community Lounge, Kitchener, Ontario');
  });
});

describe('links', () => {
  it('builds a Google Maps search URL for the venue', () => {
    expect(mapsUrl()).toBe('https://www.google.com/maps/search/?api=1&query=239%20Eden%20Oak%20Trail%20Kitchener%20Ontario');
  });
  it('builds tel, WhatsApp and SMS links', () => {
    expect(telUrl('+15483332347')).toBe('tel:+15483332347');
    expect(whatsappUrl('+15483332348')).toMatch(/^https:\/\/wa\.me\/15483332348\?text=/);
    expect(smsUrl('+15483332347')).toMatch(/^sms:\+15483332347\?body=/);
  });
});

describe('quality profiles', () => {
  it('picks low for software renderers and phones', () => {
    expect(pickQuality({ isMobile: false, cores: 16, renderer: 'Google SwiftShader', width: 1920 })).toBe('low');
    expect(pickQuality({ isMobile: true, cores: 8, width: 390 })).toBe('low');
  });
  it('picks medium for modest laptops, high for capable desktops', () => {
    expect(pickQuality({ isMobile: false, cores: 4, width: 1440 })).toBe('medium');
    expect(pickQuality({ isMobile: false, cores: 12, memory: 16, renderer: 'NVIDIA GeForce RTX 4070', width: 1920 })).toBe('high');
  });
  it('honours overrides and steps down', () => {
    expect(pickQuality({ isMobile: true, cores: 2, width: 300 }, 'high')).toBe('high');
    expect(downgrade('high')).toBe('medium');
    expect(downgrade('medium')).toBe('low');
    expect(QUALITY_PROFILES.low.particles).toBeLessThan(QUALITY_PROFILES.high.particles);
  });
});
