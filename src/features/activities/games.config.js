// ---------------------------------------------------------------------------
// /features/activities/games.config.js — Activities and Games configuration.
// Reads from the central data source in /src/data/activities.js.
// ---------------------------------------------------------------------------

import { MEMBER_DISCOUNT, MEMBER_DISCOUNT_LABEL } from '../../config/pricing.js';
import { calculateTotal, formatInr, formatINR } from '../../utils/pricing.js';
import { games as DATA_GAMES } from '../../data/activities.js';
import { ACTIVITY_LOCATIONS } from '../../data/bookingLocations.js';

export const GAME_CATEGORIES = Object.freeze({
  indoor: 'Indoor',
  outdoor: 'Outdoor',
  kids: 'Kids',
  water: 'Water',
  fitness: 'Fitness',
});

// Filter chips on the listing page (All + one per category).
export const GAME_FILTERS = Object.freeze(['all', 'indoor', 'outdoor', 'kids', 'water', 'fitness']);

export const TAX_RATE = 0.18; // 18% GST
export const MEMBER_DISCOUNT_RATE = MEMBER_DISCOUNT;

// Single source of truth loaded directly from src/data/activities.js
export const GAMES = DATA_GAMES.map((g) => ({
  ...g,
  category: g.subCategory || g.category,
}));

export function gameById(id) {
  return GAMES.find((g) => g.id === id) || null;
}

/** True for group/capacity activities where slot.remaining limits player count. */
export function isGroupActivity(gameId) {
  return gameId === 'swimming-pool' || gameId === 'kids-play-area' || gameId === 'luxury-gym';
}

/** Maximum bookable players for a game + slot selection. */
export function getMaxPlayersForSlot(game, slotItem = null) {
  const baseMax = game?.maxPlayers || 99;
  if (isGroupActivity(game?.id) && slotItem && slotItem.remaining !== undefined) {
    return Math.min(baseMax, slotItem.remaining);
  }
  return baseMax;
}

/**
 * Validate Kids Play Area child ages (must be integers 3–10, matching child count).
 * Returns '' if valid, or a user-facing error message string.
 */
export function validateChildAges(rawValue, childrenCount = 0) {
  const str = String(rawValue || '').trim();
  if (!str) {
    return '“Child age(s)” is required.';
  }
  if (!/^[\d,\s]+$/.test(str)) {
    return 'Enter valid child age(s) between 3 and 10, separated by commas (e.g. 4, 6, 7).';
  }
  const tokens = str.split(/[\s,]+/).filter(Boolean);
  if (tokens.length === 0) {
    return 'Enter valid child age(s) between 3 and 10.';
  }
  for (const tok of tokens) {
    if (!/^\d{1,2}$/.test(tok)) {
      return `Invalid age “${tok}”. Kids Play Area is strictly for ages 3–10 (e.g. 4, 6, 7).`;
    }
    const age = Number(tok);
    if (age < 3 || age > 10) {
      return `Child age ${tok} is out of range — Kids Play Area allows ages 3–10 only.`;
    }
  }
  const count = Number(childrenCount);
  if (Number.isFinite(count) && count >= 1 && tokens.length !== count) {
    const example = Array.from({ length: Math.min(count, 4) }, (_, idx) => 4 + (idx % 6)).join(', ');
    return `Enter ${count} child age${count > 1 ? 's' : ''} (ages 3–10) separated by commas (e.g. ${example}).`;
  }
  return '';
}

/** Determine canonical campus key ('vja' or 'hyd') for an activity record or location input. */
export function getActivityCampusKey(input) {
  const details = input?.details && typeof input.details === 'object' ? input.details : {};
  const combined = [
    typeof input === 'string' ? input : '',
    input?.city_id,
    input?.cityId,
    input?.city_name,
    input?.cityName,
    input?.area_name,
    input?.areaName,
    input?.venue_location_id,
    input?.venueLocationId,
    input?.location,
    details.cityId,
    details.cityName,
    details.areaName,
    details.venueLocationId,
    details.location,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  return combined.includes('hyd') ? 'hyd' : 'vja';
}

/** Resolve full activity location metadata from ACTIVITY_LOCATIONS. */
export function resolveActivityLocation(input = {}) {
  const campusKey = getActivityCampusKey(input);
  const cityObj =
    ACTIVITY_LOCATIONS.find((c) => String(c.id).toLowerCase() === campusKey) ||
    ACTIVITY_LOCATIONS[0];
  const requestedVenueId = input?.venueLocationId || input?.venue_location_id || input?.venueId || '';
  const venueObj =
    cityObj?.venues?.find((v) => String(v.id) === String(requestedVenueId)) ||
    cityObj?.venues?.[0];

  return {
    cityId: cityObj?.id || campusKey,
    cityName: cityObj?.name || (campusKey === 'hyd' ? 'Hyderabad' : 'Vijayawada'),
    venueLocationId: venueObj?.id || `${campusKey}-activities`,
    venueLocationName: venueObj?.name || 'Sports Complex',
    areaName: venueObj?.areaName || (campusKey === 'hyd' ? 'Hyderabad Campus' : 'Vijayawada Campus'),
    location:
      venueObj?.displayName ||
      (campusKey === 'hyd' ? 'Hyderabad Campus — Sports Complex' : 'Vijayawada Campus — Sports Complex'),
  };
}

/** Check whether an activity booking matches the requested game and campus location. */
export function matchesActivityBooking(booking, gameId, gameTitle, locationInfo = null) {
  if (!booking) return false;
  const matchesGame =
    booking.game_id === gameId ||
    booking.gameId === gameId ||
    booking.game === gameId ||
    booking.details?.gameId === gameId ||
    booking.details?.game === gameId ||
    (booking.title && gameTitle && booking.title.toLowerCase().includes(gameTitle.toLowerCase()));

  if (!matchesGame) return false;
  if (!locationInfo) return true;

  const targetCampus = getActivityCampusKey(locationInfo);
  const bookingCampus = getActivityCampusKey(booking);
  return bookingCampus === targetCampus;
}

/**
 * Price quote for a game + selections.
 * - Games: sessions x 1500 ("per session")
 * - Swimming pool: hours x 1000
 * - Luxury Gym: shows ₹8,000 per month (Monthly Membership: 8000)
 *
 * @param {object} game config entry
 * @param {{ extras?: object, equipment?: boolean, sessions?: number, hours?: number }} selections
 * @param {boolean} isMember — member-price line.
 * @returns {{ lines: Array<{label: string, value: number}>, subtotal: number, discount: number, total: number }}
 */
export function quotePrice(game, selections = {}, isMember = false) {
  if (!game) return { isFree: false, lines: [], subtotal: 0, discount: 0, total: 0 };
  const extras = selections.extras || {};

  const configuredPrice = game.pricePerSlot ?? game.price ?? 1500;
  const isFreeGame = Boolean(game.isFree || configuredPrice === 0);

  let base = configuredPrice;
  let unitLabel = 'per session';

  if (isFreeGame) {
    base = 0;
    unitLabel = 'Complimentary (Free)';
  } else if (game.id === 'luxury-gym') {
    base = game.price ?? 8000;
    unitLabel = 'Monthly Membership (₹8,000 per month)';
  } else if (game.id === 'swimming-pool' || game.pricingUnit === 'per-hour') {
    const hours = Math.max(1, Number(extras.hours || selections.hours || 1));
    const perHour = game.price ?? 1000;
    base = perHour * hours;
    unitLabel = `${hours} hr${hours > 1 ? 's' : ''} (${formatInr(perHour)}/hr)`;
  } else {
    // Games: sessions x rate ("per session")
    const sessions = Math.max(1, Number(extras.sessions || selections.sessions || 1));
    const perSession = game.price ?? 1500;
    base = perSession * sessions;
    unitLabel = `${sessions} session${sessions > 1 ? 's' : ''} (${formatInr(perSession)} per session)`;
  }

  const itemLines = [];
  itemLines.push({ label: `${game.name} · ${unitLabel}`, value: base });

  let addOns = 0;
  for (const f of game.extraFields || []) {
    if (f.id === 'tier' || f.id === 'hours' || f.id === 'sessions') continue;
    if (f.type !== 'checkbox' || !f.price || !extras[f.id]) continue;
    addOns += f.price;
    itemLines.push({ label: f.label.replace(/\s*\(\+₹[\d,]+\)\s*$/, ''), value: f.price });
  }
  if (selections.equipment && game.rentalPrice > 0) {
    addOns += game.rentalPrice;
    itemLines.push({ label: 'Equipment rental', value: game.rentalPrice });
  }

  const subtotal = base + addOns;
  const pricing = calculateTotal(subtotal, isMember);

  const lines = [];
  if (itemLines.length > 1) {
    lines.push(...itemLines);
  }
  lines.push({ label: 'Subtotal', value: pricing.subtotal });
  if (isMember && pricing.discount > 0) {
    lines.push({ label: MEMBER_DISCOUNT_LABEL, value: -pricing.discount });
  }

  return {
    isFree: isFreeGame && pricing.total === 0,
    lines,
    subtotal: pricing.subtotal,
    discount: pricing.discount,
    total: pricing.total,
  };
}

export { formatInr, formatINR };

export default {
  GAME_CATEGORIES,
  GAME_FILTERS,
  TAX_RATE,
  MEMBER_DISCOUNT_RATE,
  GAMES,
  gameById,
  quotePrice,
  formatInr,
  formatINR,
};
