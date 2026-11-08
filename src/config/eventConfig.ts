/**
 * Single source of truth for every invitation detail.
 * Verified against the reference site (aswanidev6119.github.io/Advika_birthday,
 * index.html in the public GitHub repo) on 2026-11-07. No discrepancies found.
 */
export const eventConfig = {
  birthdayChild: 'Advika',
  age: 7,
  eventName: 'Advika’s 7th Fairy Birthday',

  /** Event start as an absolute instant. Kitchener is on Eastern Standard Time (UTC−05:00) on Nov 28. */
  startISO: '2026-11-28T18:00:00-05:00',
  eventTimeZone: 'America/Toronto',
  eventTimeZoneLabel: 'Eastern Time',
  dateLabel: 'Saturday, November 28, 2026',
  shortDateLabel: 'Sat, Nov 28',
  timeLabel: '6:00 PM',

  /**
   * No end time is advertised on the invitation. This only sets the length of the
   * calendar entry (the reference site's own .ics also used 3 hours). Change freely.
   */
  calendarDurationMinutes: 180,

  dressCode: 'Pastel Shades',

  venue: {
    name: 'Evoke Apartments',
    street: '239 Eden Oak Trail',
    unit: '1st Floor, Community Lounge',
    city: 'Kitchener',
    region: 'Ontario',
    /** Query used by the reference site's “View Location” link. */
    mapsQuery: '239 Eden Oak Trail Kitchener Ontario',
  },

  rsvpDeadlineISO: '2026-11-20',
  rsvpDeadlineLabel: 'November 20, 2026',

  contacts: [
    { display: '548-333-2347', e164: '+15483332347' },
    { display: '548-333-2348', e164: '+15483332348' },
  ],

  messages: {
    invitation:
      'Flutter your wings and follow the sparkle! You’re invited to a magical evening of fairy dust, laughter, and birthday wishes.',
    closing: 'We can’t wait to celebrate with you!',
    heroTitle: 'Advika’s Magical Fairy Birthday',
    heroSubtitle: 'Once upon a fairy tale…',
    bookTitle: 'Once Upon a Magical Time…',
    attendingYes: 'Yay! Your magical adventure awaits!',
    attendingNo: 'We’ll miss you! Sending magical wishes your way.',
    countdownDone: 'THE MAGIC HAS BEGUN!',
    secretMagic: 'You discovered Advika’s secret magic!',
  },

  limits: {
    maxAttendees: 10,
    nameMax: 80,
    rsvpMessageMax: 300,
    wishMin: 3,
    wishMax: 140,
    wishNameMax: 40,
  },
} as const;

export type EventConfig = typeof eventConfig;

export const fullAddressLines = [
  eventConfig.venue.name,
  eventConfig.venue.street,
  eventConfig.venue.unit,
  `${eventConfig.venue.city}, ${eventConfig.venue.region}`,
] as const;

export const fullAddressOneLine = `${eventConfig.venue.name}, ${eventConfig.venue.street}, ${eventConfig.venue.unit}, ${eventConfig.venue.city}, ${eventConfig.venue.region}`;
