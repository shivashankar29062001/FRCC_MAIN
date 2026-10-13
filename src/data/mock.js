// Shared mock data used across services.
// NOTE (Phase 1 scope): Hotel / Hall / Parking / Membership keep NO mock data —
// those flows live on their own teams' pages. Activities/Games owns its own
// mock data in /features/activities/games.config.js (single source of truth).
// TODO(Phase 2): replace with /api reference data (payment gateways, plans…).

export const PAYMENT_METHODS = [
  { id: 'upi', label: 'UPI', hint: 'GPay / PhonePe / Paytm' },
  { id: 'card', label: 'Card', hint: 'Credit / Debit' },
  { id: 'netbanking', label: 'Net Banking', hint: 'All major banks' },
  { id: 'pay_at_venue', label: 'Pay at Venue', hint: 'Pay on arrival' },
];
