// ---------------------------------------------------------------------------
// /features/activities/games.config.js — Activities and Games configuration.
// Reads from the central data source in /src/data/activities.js.
// ---------------------------------------------------------------------------

import { MEMBER_DISCOUNT, MEMBER_DISCOUNT_LABEL } from '../../config/pricing.js';
import { calculateTotal, formatInr, formatINR } from '../../utils/pricing.js';
import { games as DATA_GAMES } from '../../data/activities.js';

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

/**
 * Price quote for a game + selections.
 * - Games: sessions x 1500 ("per session")
 * - Swimming pool: hours x 1000
 * - Luxury Gym: shows "₹2,000 to ₹3,000 per month" and selected tier price (Standard: 2000, Premium: 3000)
 *
 * @param {object} game config entry
 * @param {{ extras?: object, equipment?: boolean, sessions?: number, hours?: number }} selections
 * @param {boolean} isMember — member-price line.
 * @returns {{ lines: Array<{label: string, value: number}>, subtotal: number, discount: number, total: number }}
 */
export function quotePrice(game, selections = {}, isMember = false) {
  if (!game) return { lines: [], subtotal: 0, discount: 0, total: 0 };
  const extras = selections.extras || {};

  let base = game.pricePerSlot || game.price || 1500;
  let unitLabel = 'per session';

  if (game.id === 'luxury-gym') {
    const selectedTier = extras.tier || 'standard';
    base = selectedTier === 'premium' ? (game.priceTo || 3000) : (game.priceFrom || 2000);
    unitLabel = selectedTier === 'premium' ? 'Premium Tier (₹3,000 per month)' : 'Standard Tier (₹2,000 per month)';
  } else if (game.id === 'swimming-pool' || game.pricingUnit === 'per-hour') {
    const hours = Math.max(1, Number(extras.hours || selections.hours || 1));
    base = (game.price || 1000) * hours;
    unitLabel = `${hours} hr${hours > 1 ? 's' : ''} (${formatInr(game.price || 1000)}/hr)`;
  } else {
    // Games: sessions x 1500 ("per session")
    const sessions = Math.max(1, Number(extras.sessions || selections.sessions || 1));
    base = (game.price || 1500) * sessions;
    unitLabel = `${sessions} session${sessions > 1 ? 's' : ''} (${formatInr(game.price || 1500)} per session)`;
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
