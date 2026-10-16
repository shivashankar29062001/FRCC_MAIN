import { supabase } from './supabase.js';

export function generateMemberId() {
  const year = new Date().getFullYear();
  const random6 = String(Math.floor(100000 + Math.random() * 900000));
  return `FRCC-${year}-${random6}`;
}

/**
 * Fetch membership for a given user or member ID.
 */
export async function getUserMembership(userId = null, memberId = null) {
  let query = supabase.from('memberships').select('*');

  if (userId) {
    query = query.eq('user_id', userId);
  } else if (memberId) {
    query = query.eq('member_id', memberId);
  } else {
    const { data: sessionData } = await supabase.auth.getSession();
    const currentId = sessionData?.session?.user?.id;
    if (!currentId) return null;
    query = query.eq('user_id', currentId);
  }

  const { data, error } = await query.order('created_at', { ascending: false }).maybeSingle();

  if (error) {
    console.warn('Error fetching membership:', error);
    return null;
  }

  if (!data) return null;

  return {
    memberId: data.member_id,
    name: data.name,
    mobile: data.mobile,
    email: data.email,
    planName: data.plan_name,
    planPrice: Number(data.plan_price || 0),
    status: data.status,
    createdAt: data.created_at,
    validUntil: data.valid_until,
  };
}

/**
 * Save / enroll a membership into Supabase and update user's profile.
 */
export async function saveUserMembership(membershipData) {
  const memberId = membershipData.memberId || generateMemberId();

  // Support VITE_USE_MOCK mode
  if (typeof import.meta !== 'undefined' && import.meta.env?.VITE_USE_MOCK === 'true') {
    const mockId = `mock-mem-${Date.now()}`;
    return {
      id: mockId,
      memberId,
      name: membershipData.name || 'Member',
      mobile: membershipData.mobile || '',
      email: membershipData.email || '',
      planName: membershipData.planName || 'FRCC Membership',
      planPrice: Number(membershipData.planPrice || 0),
      status: 'Active',
      createdAt: membershipData.createdAt || new Date().toISOString(),
      validUntil: null,
    };
  }

  const { data: sessionData } = await supabase.auth.getSession();
  const currentUserId = sessionData?.session?.user?.id || null;

  const payload = {
    user_id: currentUserId,
    member_id: memberId,
    name: membershipData.name || 'Member',
    mobile: membershipData.mobile || '',
    email: membershipData.email || '',
    plan_name: membershipData.planName || 'FRCC Membership',
    plan_price: Number(membershipData.planPrice || 0),
    payment_method: membershipData.paymentMethod || 'upi',
    status: 'Active',
    amount_paid: Number(membershipData.amountPaid ?? membershipData.planPrice ?? 0), // TODO-REMOVE-TEST-COUPON
    coupon_code: membershipData.couponCode || null, // TODO-REMOVE-TEST-COUPON
    is_test: Boolean(membershipData.isTest), // TODO-REMOVE-TEST-COUPON
    created_at: membershipData.createdAt || new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  let { data, error } = await supabase
    .from('memberships')
    .upsert(payload, { onConflict: 'member_id' })
    .select()
    .single();

  // If table exists but coupon audit columns haven't been migrated yet, retry with base columns
  if (error && error.message && error.message.includes('column')) {
    const fallbackPayload = {
      user_id: currentUserId,
      member_id: memberId,
      name: membershipData.name || 'Member',
      mobile: membershipData.mobile || '',
      email: membershipData.email || '',
      plan_name: membershipData.planName || 'FRCC Membership',
      plan_price: Number(membershipData.planPrice || 0),
      payment_method: membershipData.paymentMethod || 'upi',
      status: 'Active',
      created_at: membershipData.createdAt || new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    const retry = await supabase
      .from('memberships')
      .upsert(fallbackPayload, { onConflict: 'member_id' })
      .select()
      .single();
    if (!retry.error) {
      data = retry.data;
      error = null;
    }
  }

  if (error) {
    console.error('Error saving membership:', error);
    throw error;
  }

  // TODO-REMOVE-TEST-COUPON
  if (membershipData.couponCode) {
    import('./couponService.js')
      .then(({ redeemCoupon }) => redeemCoupon(membershipData.couponCode))
      .catch((err) => console.warn('Could not redeem coupon:', err));
  }

  // Update profile to mark as member
  if (currentUserId) {
    await supabase
      .from('profiles')
      .update({ is_member: true, updated_at: new Date().toISOString() })
      .eq('id', currentUserId);
  }

  return {
    id: data?.id || memberId,
    memberId: data?.member_id || memberId,
    name: data?.name,
    mobile: data?.mobile,
    email: data?.email,
    planName: data?.plan_name,
    planPrice: Number(data?.plan_price || 0),
    status: data?.status || 'Active',
    createdAt: data?.created_at,
    validUntil: data?.valid_until,
  };
}
