// ---------------------------------------------------------------------------
// /config/pricing.js — Single source of truth for pricing rates and discounts.
// ---------------------------------------------------------------------------

export const MEMBER_DISCOUNT = 0.30;
export const MEMBER_DISCOUNT_PERCENT = Math.round(MEMBER_DISCOUNT * 100);
export const MEMBER_DISCOUNT_LABEL = `Member discount (${MEMBER_DISCOUNT_PERCENT}%)`;
export const MEMBER_PROMO_NOTE = `Members save ${MEMBER_DISCOUNT_PERCENT}% on every booking`;
export const memberDiscountPercent = MEMBER_DISCOUNT_PERCENT;

export default {
  MEMBER_DISCOUNT,
  MEMBER_DISCOUNT_PERCENT,
  MEMBER_DISCOUNT_LABEL,
  MEMBER_PROMO_NOTE,
  memberDiscountPercent,
};
