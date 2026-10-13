// ---------------------------------------------------------------------------
// /config/services.js — Services configuration and redirect endpoints.
// ---------------------------------------------------------------------------

import { MEMBERSHIP_URL as RAW_MEMBERSHIP_URL, getRedirect } from './redirects.js';

/**
 * Redirect URL for the membership service page.
 * Uses the configured URL from redirects.js if specified and not '#',
 * otherwise defaults to the in-app '/membership' showcase page.
 */
export const MEMBERSHIP_REDIRECT_URL = RAW_MEMBERSHIP_URL && RAW_MEMBERSHIP_URL !== '#'
  ? RAW_MEMBERSHIP_URL
  : '/membership';

export const MEMBERSHIP_URL = MEMBERSHIP_REDIRECT_URL;

export const SERVICES = Object.freeze({
  hotel: { id: 'hotel', label: 'Hotel', path: '/book/hotel', redirectUrl: getRedirect('hotel') || '#' },
  hall: { id: 'hall', label: 'Convention Hall', path: '/book/hall', redirectUrl: getRedirect('hall') || '#' },
  parking: { id: 'parking', label: 'Parking', path: '/book/parking', redirectUrl: getRedirect('parking') || '#' },
  activities: { id: 'activities', label: 'Activities', path: '/book/activities', redirectUrl: '/book/activities/process' },
  membership: { id: 'membership', label: 'Membership', path: '/membership', redirectUrl: MEMBERSHIP_REDIRECT_URL },
});

export function getServiceRedirect(key) {
  return SERVICES[key]?.redirectUrl || getRedirect(key);
}

export default {
  MEMBERSHIP_URL,
  MEMBERSHIP_REDIRECT_URL,
  SERVICES,
  getServiceRedirect,
};
