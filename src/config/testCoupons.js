// TODO-REMOVE-TEST-COUPON
// Temporary local list fallback for test coupons

export const TEST_COUPONS = [
  {
    code: 'FRCC-TEST-100',
    percent_off: 100,
    max_uses: 50,
    used_count: 0,
    active: true,
    is_test: true,
    expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
  },
];
