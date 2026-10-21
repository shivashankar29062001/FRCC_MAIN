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

/**
 * Upload passport photo to the private bucket 'member-photos' at `<user_id>/photo.jpg`.
 * Upsert is true to allow replacing.
 */
export async function uploadPassportPhoto(blob) {
  if (typeof import.meta !== 'undefined' && import.meta.env?.VITE_USE_MOCK === 'true') {
    return 'mock-user/photo.jpg';
  }

  const { data: sessionData, error: sessionErr } = await supabase.auth.getSession();
  if (sessionErr) {
    console.error('[membershipService] Auth session error in uploadPassportPhoto:', sessionErr);
    throw sessionErr;
  }

  const currentUserId = sessionData?.session?.user?.id;
  if (!currentUserId) {
    const err = new Error('You must be signed in to upload your passport photograph.');
    console.error('[membershipService]', err);
    throw err;
  }

  const photoPath = `${currentUserId}/photo.jpg`;
  const { error } = await supabase.storage
    .from('member-photos')
    .upload(photoPath, blob, {
      upsert: true,
      contentType: 'image/jpeg',
    });

  if (error) {
    console.error('[membershipService] Supabase storage upload error:', error);
    throw error;
  }

  return photoPath;
}

/**
 * Rebuild a signed URL for a photo stored in the private 'member-photos' bucket.
 */
export async function getPassportPhotoSignedUrl(photoPath) {
  if (!photoPath) return null;
  if (typeof import.meta !== 'undefined' && import.meta.env?.VITE_USE_MOCK === 'true') {
    return null;
  }

  try {
    const { data, error } = await supabase.storage
      .from('member-photos')
      .createSignedUrl(photoPath, 3600);

    if (error) {
      console.warn('[membershipService] Could not generate signed URL for passport photo:', error);
      return null;
    }
    return data?.signedUrl || null;
  } catch (err) {
    console.warn('[membershipService] Error in getPassportPhotoSignedUrl:', err);
    return null;
  }
}

/**
 * Upsert member_profiles and replace member_children rows (delete then insert in one operation).
 * user_id is strictly derived from the authenticated session, never from client input.
 */
export async function saveMemberProfileAndChildren(profileData = {}, children = []) {
  if (typeof import.meta !== 'undefined' && import.meta.env?.VITE_USE_MOCK === 'true') {
    return { success: true, isMock: true };
  }

  const { data: sessionData, error: sessionErr } = await supabase.auth.getSession();
  if (sessionErr) {
    console.error('[membershipService] Auth session error in saveMemberProfileAndChildren:', sessionErr);
    throw sessionErr;
  }

  const currentUserId = sessionData?.session?.user?.id;
  if (!currentUserId) {
    const noUserErr = new Error('You must be signed in to save membership profile details.');
    console.error('[membershipService]', noUserErr);
    throw noUserErr;
  }

  const profilePayload = {
    user_id: currentUserId,
    marital_status: profileData.marital_status || null,
    spouse_name: profileData.spouse_name || null,
    spouse_dob: profileData.spouse_dob || null,
    spouse_mobile: profileData.spouse_mobile || null,
    occupation_type: profileData.occupation_type || null,
    employer_name: profileData.employer_name || null,
    designation: profileData.designation || null,
    work_city: profileData.work_city || null,
    work_email: profileData.work_email || null,
    business_name: profileData.business_name || null,
    business_nature: profileData.business_nature || null,
    profession: profileData.profession || null,
    organisation: profileData.organisation || null,
    photo_path: profileData.photo_path || null,
  };

  const { error: profileError } = await supabase
    .from('member_profiles')
    .upsert(profilePayload, { onConflict: 'user_id' });

  if (profileError) {
    console.error('[membershipService] Error upserting member_profiles:', profileError);
    throw profileError;
  }

  // Replace member_children rows (delete then insert in one operation)
  const { error: deleteError } = await supabase
    .from('member_children')
    .delete()
    .eq('user_id', currentUserId);

  if (deleteError) {
    console.error('[membershipService] Error replacing member_children (delete phase):', deleteError);
    throw deleteError;
  }

  const validChildren = Array.isArray(children)
    ? children
        .filter((c) => c && c.name && c.name.trim())
        .map((c) => ({
          user_id: currentUserId,
          name: c.name.trim(),
          dob: c.dob ? c.dob.trim() : null,
          gender: c.gender || null,
        }))
    : [];

  if (validChildren.length > 0) {
    const { error: insertError } = await supabase
      .from('member_children')
      .insert(validChildren);

    if (insertError) {
      console.error('[membershipService] Error replacing member_children (insert phase):', insertError);
      throw insertError;
    }
  }

  return { success: true };
}
