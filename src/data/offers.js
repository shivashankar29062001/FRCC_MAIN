// ---------------------------------------------------------------------------
// /src/data/offers.js — SAMPLE OFFERS DATA
// ---------------------------------------------------------------------------
// Clearly marked editable sample offers for stay, hall, parking, activities,
// and membership. The client can edit or replace copy, image slots, and links
// here in one central place.
// ---------------------------------------------------------------------------

import { MEMBER_DISCOUNT_PERCENT } from '../config/pricing.js';
import { healthCardDiscountPercent } from '../config/site.js';

export const OFFERS_DATA = {
  stay: [
    {
      id: 'stay-member-rate',
      title: `${MEMBER_DISCOUNT_PERCENT}% Member Rate`,
      line: 'Member rate on every stay across all room types.',
      imageSlot: 'staySuite',
      link: '/book/hotel#booking',
    },
    {
      id: 'stay-extended-stay',
      title: 'Extended Weekend Stay',
      line: 'Flexible check-in and leisure access for consecutive nights.',
      imageSlot: 'exploreHotel',
      link: '/book/hotel#booking',
    },
    {
      id: 'stay-family-experience',
      title: 'Family Suite Experience',
      line: 'Spacious interconnecting rooms with lakeside garden views.',
      imageSlot: 'room-deluxe-lake-view',
      link: '/book/hotel#booking',
    },
  ],
  hall: [
    {
      id: 'hall-member-savings',
      title: `${MEMBER_DISCOUNT_PERCENT}% Member Savings`,
      line: 'Exclusive member pricing on all hall and banquet venues.',
      imageSlot: 'hallStage',
      link: '/book/hall#booking',
    },
    {
      id: 'hall-full-day',
      title: 'Full-Day Event Package',
      line: 'Comprehensive convention layout with AV and stage lighting.',
      imageSlot: 'hallConference',
      link: '/book/hall#booking',
    },
    {
      id: 'hall-banquet-gathering',
      title: 'Banquet & Reception Layout',
      line: 'Dedicated dining setup and bridal suite support.',
      imageSlot: 'hallWedding',
      link: '/book/hall#booking',
    },
  ],
  parking: [
    {
      id: 'parking-member-privilege',
      title: `${MEMBER_DISCOUNT_PERCENT}% Member Rate`,
      line: 'Member rate on reserved parking across all campus zones.',
      imageSlot: 'parkingEntry',
      link: '/book/parking#booking',
    },
    {
      id: 'parking-ev-priority',
      title: 'Priority EV Charging',
      line: 'Dedicated electric vehicle charging bays with fast turnaround.',
      imageSlot: 'parkingEV',
      link: '/book/parking#booking',
    },
    {
      id: 'parking-valet-service',
      title: 'Event Valet Coordination',
      line: 'Seamless vehicle drop-off and sheltered walkway access.',
      imageSlot: 'parkingValet',
      link: '/book/parking#booking',
    },
  ],
  activities: [
    {
      id: 'activities-member-rate',
      title: `${MEMBER_DISCOUNT_PERCENT}% Member Rate`,
      line: 'Member rate on every court, ground and pool session.',
      imageSlot: 'tennis',
      link: '/book/activities#booking',
    },
    {
      id: 'activities-multi-court',
      title: 'Multi-Court Game Sessions',
      line: 'Consecutive slots for family and group practice games.',
      imageSlot: 'badminton',
      link: '/book/activities#booking',
    },
    {
      id: 'activities-pool-evening',
      title: 'Twilight Pool Access',
      line: 'Heated outdoor swimming pool sessions with lane priority.',
      imageSlot: 'facilityPool',
      link: '/book/activities#booking',
    },
  ],
  membership: [
    {
      id: 'membership-savings',
      title: `${MEMBER_DISCOUNT_PERCENT}% Member Savings`,
      line: 'Member rate across hotel, halls, parking and sports for life.',
      imageSlot: 'membershipWide',
      link: '/membership#booking',
    },
    {
      id: 'membership-family',
      title: 'Family Privileges Plan',
      line: 'Extend campus facilities and guest passes to family members.',
      imageSlot: 'membershipLounge',
      link: '/membership#booking',
    },
    {
      id: 'membership-health-card',
      title: `${healthCardDiscountPercent}% Diagnostic Centre Discount`,
      line: 'Health card savings at selected diagnostic centres sent to WhatsApp.',
      imageSlot: 'galleryLounge',
      link: '/membership#booking',
    },
  ],
  dining: [
    {
      id: 'dining-member-discount',
      title: `${MEMBER_DISCOUNT_PERCENT}% Member Dining Privilege`,
      line: 'Exclusive member savings across all campus restaurants, cafes and bars.',
      imageSlot: 'dining-restaurant',
      link: '/dining/book',
    },
    {
      id: 'dining-weekend-buffet',
      title: 'Chef Special Weekend Brunch',
      line: 'Lavish multi-cuisine spreads with live counters and outdoor terrace seating.',
      imageSlot: 'dining-coffee-shop',
      link: '/dining/book',
    },
    {
      id: 'dining-rooftop-grill',
      title: 'Sunset Rooftop Grills & Sizzlers',
      line: 'Evening open-air dining with scenic panoramic views and artisan cocktails.',
      imageSlot: 'dining-rooftop-restaurant',
      link: '/dining/book',
    },
  ],
};

export default OFFERS_DATA;
