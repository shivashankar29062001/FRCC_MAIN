// ---------------------------------------------------------------------------
// /src/data/serviceHero.js — Service hero copy & metadata
// Facts drawn exclusively from verified campus entities (rooms, venues, etc.)
// ---------------------------------------------------------------------------

import { name, shortName, tagline, healthCardDiscountPercent } from '../config/site.js';

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
    to: '/stay#content',
    statSuffix: 'on every stay',
  },
  dining: {
    eyebrow: 'FRCC DINING',
    headline: 'Restaurants, lounges and cafes',
    phrases: [
      'Multi-cuisine family restaurant.',
      'Artisan coffee and fresh bakes.',
      'Evening lounge bar and pub.',
      'Open-air rooftop grills.',
    ],
    linkText: 'Explore venues',
    linkTarget: '#content',
    to: '/dining#content',
    statSuffix: 'on dining',
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
    to: '/halls#content',
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
    to: '/parking#content',
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
    to: '/activities#content',
    statSuffix: 'on every game',
  },
  membership: {
    eyebrow: 'LIFETIME PRIVILEGES',
    headline: 'Belong for a lifetime',
    phrases: [
      '30% discount on every booking.',
      `Health card: ${healthCardDiscountPercent}% discount.`,
      'One card across the campus.',
      'ID & Health card on WhatsApp.',
    ],
    linkText: 'Explore plan',
    linkTarget: '#content',
    to: '/membership#content',
    statSuffix: 'on every booking',
  },
  events: {
    eyebrow: 'FILM & CULTURAL EVENTS',
    headline: 'Cinema, conversations and culture',
    phrases: [
      'Short film screenings.',
      'Workshops and masterclasses.',
      'Filmmakers and artists meetups.',
      'Cultural evenings and performances.',
    ],
    linkText: 'Explore events',
    linkTarget: '#content',
    to: '/events#content',
    statSuffix: 'on member passes',
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
    to: '/home#explore',
    statSuffix: 'on every booking',
  },
};

export default SERVICE_HERO_DATA;
