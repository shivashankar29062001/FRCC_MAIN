// ---------------------------------------------------------------------------
// /src/data/membership.js — FRCC Membership Plan & Privileges Data
// ONE Plan: FRCC Membership
// ---------------------------------------------------------------------------

export const HERO_CARD = {
  eyebrow: 'Membership',
  title: 'Join FRCC',
  description: 'One lifetime membership for rooms, halls, parking, sports, and health privileges.',
  buttonText: 'Join now',
  buttonLink: '/membership/join',
};

/**
 * ONE plan: FRCC Membership
 * Price: ₹1,00,000
 * Validity: "lifetime" (SAMPLE, comment: confirm lifetime or yearly)
 * Benefits:
 *   1. 30% discount on every booking
 *   2. Health card: 20% discount at selected diagnostic centres
 *   3. Membership ID card and Health card sent to your WhatsApp
 * Diagnostic Centres: [] (SAMPLE, empty)
 */
export const plans = [
  {
    id: 'frcc-membership',
    name: 'FRCC Membership',
    price: 100000, // one-time fee
    amount: 100000,
    validity: 'lifetime',
    period: 'lifetime',
    discountPercent: 30, // 30% discount on every booking
    healthCardDiscountPercent: 20, // 20% discount at collaborating diagnostic centres
    imageSlot: 'serviceMembership',
    benefits: [
      '30% discount on every booking',
      'Health card: 20% discount at collaborating diagnostic centres',
      'Membership ID card and Health card',
    ],
    diagnosticCentres: [], // empty, list not provided yet
    healthCardNote: 'Discount valid only at diagnostic centres collaborating with FRCC.',
  },
];

export const PLANS_DATA = plans;

export const BENEFITS_DATA = [
  {
    id: 'booking-discount',
    title: '30% discount on every booking',
    icon: 'HotelIcon',
  },
  {
    id: 'health-card',
    title: 'Health card: 20% discount at collaborating diagnostic centres',
    icon: 'CalendarIcon',
  },
  {
    id: 'membership-cards',
    title: 'Membership ID card and Health card',
    icon: 'UsersIcon',
  },
  {
    id: 'sports-courts',
    title: 'Full club, pool, gym and courts access',
    icon: 'GamepadIcon',
  },
];

export const HOW_IT_WORKS = [
  {
    step: 1,
    title: 'Review plan',
    description: 'FRCC Membership with 30% booking discount and 20% health card savings.',
  },
  {
    step: 2,
    title: 'Register',
    description: 'Enter your basic contact details and member profile information.',
  },
  {
    step: 3,
    title: 'Verify and pay',
    description: 'Complete membership verification and one-time enrollment payment.',
  },
  {
    step: 4,
    title: 'Get ID and Health card',
    description: 'Membership ID card and Health card are delivered straight to your WhatsApp.',
  },
];

export const FINAL_STRIP = {
  eyebrow: 'Lifetime Privileges',
  title: 'Belong to FRCC for life',
  description: 'Enjoy 30% member discount on every booking and 20% health savings across the entire campus.',
  buttonText: 'Join now',
  buttonLink: '/membership/join',
};

export function getPlanById(id) {
  return plans.find((p) => p.id === id) || plans[0];
}

export default {
  plans,
  PLANS_DATA,
  HERO_CARD,
  BENEFITS_DATA,
  HOW_IT_WORKS,
  FINAL_STRIP,
  getPlanById,
};
