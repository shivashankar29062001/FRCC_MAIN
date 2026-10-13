// ---------------------------------------------------------------------------
// /utils/pricing.js — Pricing calculation helper functions.
// ---------------------------------------------------------------------------

import { MEMBER_DISCOUNT } from '../config/pricing.js';

/**
 * Calculates booking totals with member discount applied.
 *
 * @param {number|string} subtotal - The subtotal amount before discount.
 * @param {boolean} isMember - Whether the user has an active membership.
 * @returns {{ subtotal: number, discount: number, total: number }}
 */
export function calculateTotal(subtotal = 0, isMember = false) {
  const roundedSubtotal = Math.round(Number(subtotal) || 0);
  const discount = isMember ? Math.round(roundedSubtotal * MEMBER_DISCOUNT) : 0;
  const total = Math.max(0, Math.round(roundedSubtotal - discount));

  return {
    subtotal: roundedSubtotal,
    discount,
    total,
  };
}

export default calculateTotal;
