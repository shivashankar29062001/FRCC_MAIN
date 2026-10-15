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

/**
 * Formats an amount into Indian Rupees with Indian grouping (e.g. ₹1,00,000).
 *
 * @param {number|string} amount - The amount to format.
 * @returns {string} Formatted INR currency string.
 */
export function formatInr(amount) {
  if (amount === null || amount === undefined || amount === '') return '';
  if (typeof amount === 'string' && amount.startsWith('₹')) return amount;
  const num = Number(amount);
  if (Number.isNaN(num)) return String(amount);
  const rounded = Math.round(num);
  if (rounded < 0) {
    return `-₹${Math.abs(rounded).toLocaleString('en-IN')}`;
  }
  return `₹${rounded.toLocaleString('en-IN')}`;
}

export const formatINR = formatInr;

export default {
  calculateTotal,
  formatInr,
  formatINR,
};
