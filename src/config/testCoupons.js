// TODO-REMOVE-TEST-COUPON
// Temporary local list fallback for test coupons

export const TEST_COUPONS = [
  {
    code: 'FRCC1',
    fixed_final_price: 1,
    max_uses: 1000,
    used_count: 0,
    active: true,
    is_test: true,
    expires_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    code: 'TEST1',
    fixed_final_price: 1,
    max_uses: 1000,
    used_count: 0,
    active: true,
    is_test: true,
    expires_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    code: 'PAY1',
    fixed_final_price: 1,
    max_uses: 1000,
    used_count: 0,
    active: true,
    is_test: true,
    expires_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
  },
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
