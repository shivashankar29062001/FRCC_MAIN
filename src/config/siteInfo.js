// ---------------------------------------------------------------------------
// src/config/siteInfo.js — THE ONLY FILE holding FRCC's real-world details.
//
// REPLACE BEFORE LAUNCH: the phone, email, address and hours below are
// placeholders. The footer, the Support page and the member home all read from
// here, so editing this one file updates every page at once.
// Social entries left as '' are hidden automatically.
// ---------------------------------------------------------------------------

import {
  name,
  shortName,
  tagline,
  phone,
  vijayawadaPhone,
  hyderabadPhone,
  whatsappNumber,
  whatsappLink,
  email,
  hours,
  hyderabadAddress,
  locations,
} from './site.js';

export const SITE_INFO = {
  // Brand
  name: shortName,
  tagline,
  fullName: name,

  // Registered Office Contact
  address: {
    line1: 'D.No. 24-29-210A, Durgapuram, Gulabithota Road',
    line2: 'Vijayawada, NTR District',
    line3: 'Andhra Pradesh – 520003',
  },

  // Hyderabad Office Contact
  hyderabadAddress: {
    line1: 'Second Floor, Samridhi Vasyam, D No 1/98/9/3/23, Capital Pk Rd',
    line2: 'Above Axis bank Image gardens branch, Jaihind Enclave, Madhapur',
    line3: 'Hyderabad, Telangana 500081',
  },

  // Locations / Offices
  locations: [
    {
      id: 'vja',
      city: 'Vijayawada',
      title: 'Vijayawada (Registered Office)',
      line1: 'D.No. 24-29-210A, Durgapuram, Gulabithota Road',
      line2: 'Vijayawada, NTR District',
      line3: 'Andhra Pradesh – 520003',
      fullAddress: 'D.No. 24-29-210A, Durgapuram, Gulabithota Road, Vijayawada, NTR District, Andhra Pradesh – 520003',
      phone: '+91 98663 33787',
      whatsappNumber: '919866333787',
      isDefault: true,
    },
    {
      id: 'hyd',
      city: 'Hyderabad',
      title: 'Hyderabad Office',
      line1: 'Second Floor, Samridhi Vasyam, D No 1/98/9/3/23, Capital Pk Rd',
      line2: 'Above Axis bank Image gardens branch, Jaihind Enclave, Madhapur',
      line3: 'Hyderabad, Telangana 500081',
      fullAddress: 'Second Floor, Samridhi Vasyam, D No 1/98/9/3/23, Capital Pk Rd, Above Axis bank Image gardens branch, Jaihind Enclave, Madhapur, Hyderabad, Telangana 500081',
      phone: '+91 73967 44556',
      whatsappNumber: '917396744556',
      isDefault: false,
    },
  ],
  phone,
  vijayawadaPhone,
  hyderabadPhone,
  whatsappNumber,
  whatsappLink,
  email, // SAMPLE hello@frcc.example
  hours, // SAMPLE Front desk open 6 AM – 11 PM daily

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
export function getAddressLines(locationId) {
  if (locationId === 'hyd') {
    return [SITE_INFO.hyderabadAddress.line1, SITE_INFO.hyderabadAddress.line2, SITE_INFO.hyderabadAddress.line3].filter(Boolean);
  }
  return [SITE_INFO.address.line1, SITE_INFO.address.line2, SITE_INFO.address.line3].filter(Boolean);
}

// Helper to get Hyderabad formatted address lines
export function getHyderabadAddressLines() {
  return [SITE_INFO.hyderabadAddress.line1, SITE_INFO.hyderabadAddress.line2, SITE_INFO.hyderabadAddress.line3].filter(Boolean);
}

// Helper to get all locations
export function getAllLocations() {
  return SITE_INFO.locations || [];
}

// Helper to get social entries that have URLs
export function getActiveSocialLinks() {
  return Object.entries(SITE_INFO.social)
    .filter(([, url]) => url && url.length > 0)
    .map(([key, url]) => ({ key, url, label: key.charAt(0).toUpperCase() + key.slice(1) }));
}