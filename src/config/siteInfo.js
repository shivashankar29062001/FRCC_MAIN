// ---------------------------------------------------------------------------
// src/config/siteInfo.js — THE ONLY FILE holding FRCC's real-world details.
//
// REPLACE BEFORE LAUNCH: the phone, email, address and hours below are
// placeholders. The footer, the Support page and the member home all read from
// here, so editing this one file updates every page at once.
// Social entries left as '' are hidden automatically.
// ---------------------------------------------------------------------------

import { name, shortName, tagline } from './site.js';

export const SITE_INFO = {
  // Brand
  name: shortName,
  tagline,
  fullName: name,

  // Contact (fictional — replace with real info before launch)
  address: {
    line1: 'FRCC Campus, Hyderabad',
    line2: 'Telangana 500001',
    line3: '',
  },
  phone: '+91 40 6789 0123',
  email: 'hello@frcc.club',
  hours: 'Front desk open 6 AM – 11 PM daily',

  // Social (empty strings = hide the icon)
  social: {
    instagram: '',
    linkedin: '',
    youtube: '',
    twitter: '',
    facebook: '',
  },

  // SEO / meta
  meta: {
    title: `${shortName} | ${name}`,
    description: name,
    ogImage: '/og-image.jpg',
  },

  // Footer copyright
  copyright: '© 2026 FRCC. All rights reserved.',
};

// Helper to get formatted address lines (filters empty)
export function getAddressLines() {
  return [SITE_INFO.address.line1, SITE_INFO.address.line2, SITE_INFO.address.line3].filter(Boolean);
}

// Helper to get social entries that have URLs
export function getActiveSocialLinks() {
  return Object.entries(SITE_INFO.social)
    .filter(([, url]) => url && url.length > 0)
    .map(([key, url]) => ({ key, url, label: key.charAt(0).toUpperCase() + key.slice(1) }));
}