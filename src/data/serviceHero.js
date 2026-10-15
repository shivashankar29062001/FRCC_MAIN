// ---------------------------------------------------------------------------
// /src/data/serviceHero.js — Service hero copy & metadata
// Facts drawn exclusively from verified campus entities (rooms, venues, etc.)
// ---------------------------------------------------------------------------

import { name, shortName, tagline } from '../config/site.js';

export const SERVICE_HERO_DATA = {
  stay: {
    eyebrow: 'STAY AT FRCC',
    headline: 'Rooms made for rest',
    phrases: [
      'Deluxe lake view.',
      'Poolside villa.',
      'Garden view rooms.',
      'Executive suites.',
    ],
    linkText: 'Explore rooms',
    linkTarget: '#content',
    statSuffix: 'on every stay',
  },
  hall: {
    eyebrow: 'CELEBRATIONS & EVENTS',
    headline: 'Grand spaces for grand days',
    phrases: [
      'Grand convention hall.',
      'Executive boardroom.',
      'Banquet hall.',
      'Convention center.',
    ],
    linkText: 'Explore halls',
    linkTarget: '#content',
    statSuffix: 'on every event',
  },
  parking: {
    eyebrow: 'CAMPUS PARKING',
    headline: 'Reserve before you arrive',
    phrases: [
      'Basement parking.',
      'Lakeside surface parking.',
      'Terrace event parking.',
      'Multi-level parking.',
    ],
    linkText: 'Explore zones',
    linkTarget: '#content',
    statSuffix: 'on every slot',
  },
  activities: {
    eyebrow: 'SPORTS & RECREATION',
    headline: 'Eleven games across campus',
    phrases: [
      'Indoor badminton courts.',
      'Outdoor tennis courts.',
      'Resort swimming pool.',
      'Cricket practice nets.',
    ],
    linkText: 'Explore activities',
    linkTarget: '#content',
    statSuffix: 'on every game',
  },
  membership: {
    eyebrow: 'LIFETIME PRIVILEGES',
    headline: 'Belong for a lifetime',
    phrases: [
      '30% discount on every booking.',
      'Health card: 20% discount.',
      'One card across the campus.',
      'ID & Health card on WhatsApp.',
    ],
    linkText: 'Explore plan',
    linkTarget: '#content',
    statSuffix: 'on every booking',
  },
  hub: {
    eyebrow: `WELCOME TO ${shortName}`,
    headline: name,
    phrases: [
      tagline,
      'Stay in comfort.',
      'Play every game.',
      'Celebrate every occasion.',
      'Belong for life.',
    ],
    linkText: 'Explore campus',
    linkTarget: '#explore',
    statSuffix: 'on every booking',
  },
};

export default SERVICE_HERO_DATA;
