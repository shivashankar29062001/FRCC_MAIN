// ---------------------------------------------------------------------------
// /config/redirects.js — THE ONLY FILE you need to change to plug in the
// Hotel, Convention Hall, Parking, Activities/Games and Membership teams'
// booking pages. Phase 1: these booking flows live on separate pages, so we
// only link out to them. TODO(Phase 2): replace the "#" placeholders with the
// real routes/URLs those teams ship (e.g. "https://booking.frcc.club/hotel").
// ---------------------------------------------------------------------------

export const HOTEL_BOOKING_URL = '/book/hotel';
export const HALL_BOOKING_URL = '/halls/book';
export const PARKING_BOOKING_URL = '/parking/book';
export const ACTIVITIES_BOOKING_URL = '/book/activities/process';
export const MEMBERSHIP_URL = '/membership';

/**
 * false (default) → navigate in the SAME tab.
 * true            → open in a NEW tab (window.open with noopener).
 */
export const OPEN_IN_NEW_TAB = false;

/** Named keys so pages never hard-code a URL string. */
export const REDIRECT_KEYS = Object.freeze({
  hotel: 'hotel',
  hall: 'hall',
  parking: 'parking',
  activities: 'activities',
  membership: 'membership',
});

const URLS = {
  [REDIRECT_KEYS.hotel]: HOTEL_BOOKING_URL,
  [REDIRECT_KEYS.hall]: HALL_BOOKING_URL,
  [REDIRECT_KEYS.parking]: PARKING_BOOKING_URL,
  [REDIRECT_KEYS.activities]: ACTIVITIES_BOOKING_URL,
  [REDIRECT_KEYS.membership]: MEMBERSHIP_URL,
};

/** A "#" / empty value means "the other team's URL is not wired up yet". */
export function isPlaceholder(url) {
  return !url || url === '#' || url.startsWith('#');
}

export function getRedirect(key) {
  return URLS[key];
}

/**
 * Opens a team page using OPEN_IN_NEW_TAB.
 * @returns {boolean} false when the URL is still a placeholder (nothing opened).
 */
export function openTeamPage(key) {
  const url = getRedirect(key);
  if (isPlaceholder(url)) return false;
  if (OPEN_IN_NEW_TAB) {
    window.open(url, '_blank', 'noopener,noreferrer');
  } else {
    window.location.assign(url);
  }
  return true;
}
