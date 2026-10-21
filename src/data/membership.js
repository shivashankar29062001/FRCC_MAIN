// ---------------------------------------------------------------------------
// /src/data/membership.js — FRCC Membership Plan & Privileges Data
// ONE Plan: FRCC Membership
// ---------------------------------------------------------------------------

import { memberDiscountPercent, healthCardDiscountPercent } from '../config/site.js';

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
 *   2. Health card: 30% discount at selected diagnostic centres
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
    discountPercent: memberDiscountPercent, // 30% discount on every booking
    healthCardDiscountPercent, // 30% discount at collaborating diagnostic centres
    imageSlot: 'serviceMembership',
    benefits: [
      `${memberDiscountPercent}% discount on every booking`,
      `Health card: ${healthCardDiscountPercent}% discount at collaborating diagnostic centres`,
      'Membership ID card and Health card',
      'Connect with film lovers',
      'Build industry relationships',
      'Experience the world of cinema',
      'Be part of exclusive film and cultural activities',
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
    title: `Health card: ${healthCardDiscountPercent}% discount at collaborating diagnostic centres`,
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
    description: `FRCC Membership with 30% booking discount and ${healthCardDiscountPercent}% health card savings.`,
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
  description: `Enjoy 30% member discount on every booking and ${healthCardDiscountPercent}% health savings across the entire campus.`,
  buttonText: 'Join now',
  buttonLink: '/membership/join',
};

export function getPlanById(id) {
  return plans.find((p) => p.id === id) || plans[0];
}

export const WIZARD_STEPS = [
  { id: 'plan', title: 'Plan' },
  { id: 'registration', title: 'Registration' },
  { id: 'personal', title: 'Personal details' },
  { id: 'family_profession', title: 'Family and profession' },
  { id: 'documents', title: 'Documents' },
  { id: 'payment', title: 'Payment' },
  { id: 'confirmation', title: 'Confirmation' },
];

export const MARITAL_STATUSES = [
  { value: 'Single', label: 'Single', hint: 'Not married' },
  { value: 'Married', label: 'Married', hint: 'Provide spouse details' },
  { value: 'Divorced', label: 'Divorced', hint: 'Legally divorced' },
  { value: 'Widowed', label: 'Widowed', hint: 'Surviving spouse' },
];

export const OCCUPATION_TYPES = [
  { value: 'Employed', label: 'Employed' },
  { value: 'Self-employed', label: 'Self-employed' },
  { value: 'Professional', label: 'Professional' },
  { value: 'Retired', label: 'Retired' },
  { value: 'Student', label: 'Student' },
  { value: 'Homemaker', label: 'Homemaker' },
  { value: 'Other', label: 'Other' },
];

export const CHILD_GENDER_OPTIONS = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
  { value: 'other', label: 'Other' },
];

export const MEMBERSHIP_COPY = {
  familyConsent:
    'I confirm these details are correct. For children, I confirm I am the parent or legal guardian and consent to FRCC storing this information for membership purposes.',
  aadhaarConsent: 'I agree to share my Aadhaar for membership verification *',
  aadhaarConsentNote: 'Your details are used only for membership verification.',
  passportPhotoNotice: 'Upload recent colour passport photograph (JPG or PNG, max 3 MB, minimum 300 × 400 px).',
};

export default {
  plans,
  PLANS_DATA,
  HERO_CARD,
  BENEFITS_DATA,
  HOW_IT_WORKS,
  FINAL_STRIP,
  getPlanById,
  WIZARD_STEPS,
  MARITAL_STATUSES,
  OCCUPATION_TYPES,
  CHILD_GENDER_OPTIONS,
  MEMBERSHIP_COPY,
};
