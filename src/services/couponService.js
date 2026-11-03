// TODO-REMOVE-TEST-COUPON
// Coupon verification and redemption service for FRCC Membership join flow.

import { supabase } from './supabase.js';
import { TEST_COUPONS } from '../config/testCoupons.js'; // TODO-REMOVE-TEST-COUPON

/**
 * Validate a coupon code against Supabase database.
 * Falls back to src/config/testCoupons.js if database table is not yet reachable.
 * @param {string} rawCode
 * @returns {Promise<{ valid: boolean, code?: string, percent_off?: number, is_test?: boolean, error?: string }>}
 */
export async function validateCoupon(rawCode) {
  // TODO-REMOVE-TEST-COUPON
  const code = (rawCode || '').trim().toUpperCase();
  if (!code) {
    return { valid: false, error: 'Please enter a coupon code.' };
  }

  // Check built-in test coupons first (e.g. FRCC1 for ₹1 payment testing)
  const local = validateLocalFallbackCoupon(code);
  if (local.valid) {
    return local;
  }

  try {
    const { data, error } = await supabase
      .from('coupons')
      .select('code, percent_off, max_uses, used_count, expires_at, active, is_test')
      .ilike('code', code)
      .maybeSingle();

    if (error) {
      console.warn('Coupon table lookup error, falling back to local list:', error.message);
      return local;
    }

    if (!data) {
      return { valid: false, error: 'Invalid coupon code.' };
    }

    if (!data.active) {
      return { valid: false, error: 'This coupon is no longer active.' };
    }

    if (data.expires_at && new Date(data.expires_at) < new Date()) {
      return { valid: false, error: 'This coupon has expired.' };
    }

    if (data.used_count >= data.max_uses) {
      return { valid: false, error: 'This coupon code has reached its maximum uses.' };
    }

    return {
      valid: true,
      code: data.code,
      percent_off: data.percent_off !== undefined && data.percent_off !== null ? Number(data.percent_off) : 100,
      fixed_final_price: data.fixed_final_price !== undefined ? Number(data.fixed_final_price) : undefined,
      is_test: Boolean(data.is_test),
    };
  } catch (err) {
    console.warn('Coupon validation error, falling back to local list:', err);
    return local;
  }
}

/**
 * Fallback validation using src/config/testCoupons.js
 */
function validateLocalFallbackCoupon(code) {
  // TODO-REMOVE-TEST-COUPON
  const item = TEST_COUPONS.find(
    (c) => c.code.trim().toUpperCase() === code.trim().toUpperCase()
  );

  if (!item) {
    return { valid: false, error: 'Invalid coupon code.' };
  }

  if (!item.active) {
    return { valid: false, error: 'This coupon is no longer active.' };
  }

  if (item.expires_at && new Date(item.expires_at) < new Date()) {
    return { valid: false, error: 'This coupon has expired.' };
  }

  if (item.used_count >= item.max_uses) {
    return { valid: false, error: 'This coupon has reached its maximum uses.' };
  }

  return {
    valid: true,
    code: item.code,
    percent_off: item.percent_off !== undefined ? Number(item.percent_off) : undefined,
    fixed_final_price: item.fixed_final_price !== undefined ? Number(item.fixed_final_price) : undefined,
    is_test: Boolean(item.is_test),
  };
}

/**
 * Atomically redeem coupon count when membership is saved.
 * @param {string} rawCode
 */
export async function redeemCoupon(rawCode) {
  // TODO-REMOVE-TEST-COUPON
  const code = (rawCode || '').trim().toUpperCase();
  if (!code) return;

  try {
    // Attempt RPC first if created
    const { data: rpcData, error: rpcErr } = await supabase.rpc('redeem_membership_coupon', { p_code: code });
    if (!rpcErr && rpcData?.valid) return;

    // Standard increment via update
    const { data } = await supabase
      .from('coupons')
      .select('id, used_count')
      .ilike('code', code)
      .maybeSingle();

    if (data) {
      await supabase
        .from('coupons')
        .update({ used_count: (data.used_count || 0) + 1 })
        .eq('id', data.id);
      return;
    }
  } catch (err) {
    console.warn('Could not increment remote coupon used_count:', err);
  }

  // Fallback update on local list
  const item = TEST_COUPONS.find(
    (c) => c.code.trim().toUpperCase() === code
  );
  if (item) {
    item.used_count = (item.used_count || 0) + 1;
  }
}

