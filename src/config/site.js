// ---------------------------------------------------------------------------
// /src/config/site.js — Site configuration
// ---------------------------------------------------------------------------

import { MEMBER_DISCOUNT_PERCENT, MEMBER_PROMO_NOTE } from './pricing.js';

export const name = 'Film Recreation & Cultural Centre';
export const shortName = 'FRCC';
export const tagline = 'Reel stories... real connections...';

export const memberDiscountPercent = MEMBER_DISCOUNT_PERCENT;
export const memberPromoNote = MEMBER_PROMO_NOTE;

export const siteConfig = {
  name,
  shortName,
  tagline,
  memberDiscountPercent,
  memberPromoNote,
};

export default siteConfig;
