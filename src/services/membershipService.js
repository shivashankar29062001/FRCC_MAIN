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
  try {
    let query = supabase.from('memberships').select('*');

    if (userId) {
      query = query.eq('user_id', userId);
    } else if (memberId) {
      query = query.eq('member_id', memberId);
    } else {
      const { data: sessionData, error: sessionErr } = await supabase.auth.getSession();
      if (sessionErr) {
        console.error('[membershipService] Auth session error in getUserMembership:', sessionErr);
      }
      const currentId = sessionData?.session?.user?.id;
      if (!currentId) return null;
      query = query.eq('user_id', currentId);
    }

    const { data, error } = await query.order('created_at', { ascending: false }).maybeSingle();

    if (error) {
      console.error('[membershipService] Error fetching membership from Supabase:', error);
      return null;
    }

    if (!data) return null;

    return {
      id: data.id,
      userId: data.user_id,
      memberId: data.member_id,
      name: data.name,
      mobile: data.mobile,
      email: data.email,
      planName: data.plan_name || 'FRCC Membership',
      planPrice: Number(data.plan_price || 0),
      amountPaid: Number(data.amount_paid ?? data.plan_price ?? 0),
      paymentMethod: data.payment_method,
      couponCode: data.coupon_code,
      isTest: data.is_test,
      status: data.status || 'Active',
      createdAt: data.created_at,
      validUntil: data.valid_until,
      dateOfBirth: data.date_of_birth || '',
      gender: data.gender || '',
      address: data.address_line || data.address || '',
      addressLine: data.address_line || data.address || '',
      city: data.city || '',
      state: data.state || '',
      pincode: data.pincode || '',
      emergencyContact: data.emergency_contact || '',
      aadhaarMasked: data.aadhaar_masked || '',
    };
  } catch (err) {
    console.error('[membershipService] Unexpected error in getUserMembership:', err);
    return null;
  }
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
      userId: membershipData.userId || null,
      memberId,
      name: membershipData.name || 'Member',
      mobile: membershipData.mobile || '',
      email: membershipData.email || '',
      planName: membershipData.planName || 'FRCC Membership',
      planPrice: Number(membershipData.planPrice || 0),
      amountPaid: Number(membershipData.amountPaid ?? membershipData.planPrice ?? 0),
      paymentMethod: membershipData.paymentMethod || 'upi',
      couponCode: membershipData.couponCode || null,
      isTest: Boolean(membershipData.isTest),
      status: 'Active',
      createdAt: membershipData.createdAt || new Date().toISOString(),
      validUntil: null,
      dateOfBirth: membershipData.dateOfBirth || membershipData.dob || '',
      gender: membershipData.gender || '',
      address: membershipData.address || membershipData.addressLine || '',
      addressLine: membershipData.addressLine || membershipData.address || '',
      city: membershipData.city || '',
      state: membershipData.state || '',
      pincode: membershipData.pincode || '',
      emergencyContact: membershipData.emergencyContact || '',
      aadhaarMasked: membershipData.aadhaarMasked || '',
    };
  }

  const { data: sessionData, error: sessionErr } = await supabase.auth.getSession();
  if (sessionErr) {
    console.error('[membershipService] Auth session error in saveUserMembership:', sessionErr);
  }
  const currentUserId = membershipData.userId || sessionData?.session?.user?.id || null;

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
    payment_id: membershipData.paymentId || null,
    order_id: membershipData.orderId || null,
    signature: membershipData.signature || null,
    date_of_birth: membershipData.dateOfBirth || membershipData.dob || null,
    gender: membershipData.gender || null,
    address_line: membershipData.addressLine || membershipData.address || null,
    city: membershipData.city || null,
    state: membershipData.state || null,
    pincode: membershipData.pincode || null,
    emergency_contact: membershipData.emergencyContact || null,
    aadhaar_masked: membershipData.aadhaarMasked || null,
    created_at: membershipData.createdAt || new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  let { data, error } = await supabase
    .from('memberships')
    .upsert(payload, { onConflict: 'member_id' })
    .select()
    .maybeSingle();

  // If table exists but some new columns haven't been migrated yet, retry with base columns
  if (error && error.message && error.message.includes('column')) {
    console.warn('[membershipService] Retrying membership upsert with base columns:', error.message);
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
      .maybeSingle();
    if (!retry.error) {
      data = retry.data;
      error = null;
    }
  }

  if (error) {
    console.error('[membershipService] Error saving membership to Supabase:', error);
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
    userId: currentUserId,
    memberId: data?.member_id || memberId,
    name: data?.name || membershipData.name || 'Member',
    mobile: data?.mobile || membershipData.mobile || '',
    email: data?.email || membershipData.email || '',
    planName: data?.plan_name || membershipData.planName || 'FRCC Membership',
    planPrice: Number(data?.plan_price || membershipData.planPrice || 0),
    amountPaid: Number(data?.amount_paid ?? membershipData.amountPaid ?? 0),
    paymentMethod: data?.payment_method || membershipData.paymentMethod || 'upi',
    couponCode: data?.coupon_code || membershipData.couponCode || null,
    isTest: Boolean(data?.is_test ?? membershipData.isTest),
    status: data?.status || 'Active',
    createdAt: data?.created_at || membershipData.createdAt || new Date().toISOString(),
    validUntil: data?.valid_until || membershipData.validUntil || null,
    dateOfBirth: membershipData.dateOfBirth || '',
    gender: membershipData.gender || '',
    address: membershipData.address || membershipData.addressLine || '',
    addressLine: membershipData.addressLine || membershipData.address || '',
    city: membershipData.city || '',
    state: membershipData.state || '',
    pincode: membershipData.pincode || '',
    emergencyContact: membershipData.emergencyContact || '',
    aadhaarMasked: membershipData.aadhaarMasked || '',
  };
}
