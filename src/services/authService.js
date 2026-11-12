import { supabase } from './supabase.js';
import { normalizeMobile } from '../utils/phone.js';
import { isPhoneLike, isValidIndianMobile, INDIAN_MOBILE_MESSAGE } from '../utils/mobile.js';
import { isValidName, nameError } from '../utils/fullName.js';

/**
 * Format user login identifier. If legacy phone login is enabled via VITE_ENABLE_LEGACY_PHONE_LOGIN
 * and input has 10 digits, maps to digits@frcc.member for backward compatibility.
 * Otherwise, requires and returns a trimmed, lowercased real email.
 */
function resolveAuthIdentifier(emailInput) {
  const trimmed = (emailInput || '').trim();
  const allowLegacy = typeof import.meta !== 'undefined' && import.meta.env?.VITE_ENABLE_LEGACY_PHONE_LOGIN === 'true';
  if (allowLegacy) {
    const digits = normalizeMobile(trimmed);
    if (/^[6-9]\d{9}$/.test(digits)) {
      return `${digits}@frcc.member`;
    }
  }
  return trimmed.toLowerCase();
}

/**
 * Sign up a new user with Supabase Auth & create/sync profile.
 * Accounts require a real email and mobile number. Never generates a synthetic email.
 */
export async function signUp({ name, email, mobile, password }) {
  const cleanEmail = (email || '').trim().toLowerCase();
  const cleanPhone = normalizeMobile(mobile);
  const cleanName = (name || '').trim();

  const { data, error } = await supabase.auth.signUp({
    email: cleanEmail,
    password,
    options: {
      data: {
        name: cleanName,
        phone: cleanPhone,
        mobile: cleanPhone,
        is_member: false,
      },
    },
  });

  if (error) throw error;

  // If user is returned, ensure profile row exists in public.profiles with real email and mobile
  if (data?.user) {
    const uidCode = `FRCC-U-${data.user.id.substring(0, 6).toUpperCase()}`;
    await supabase
      .from('profiles')
      .upsert({
        id: data.user.id,
        user_id_code: uidCode,
        name: cleanName || 'Member',
        email: cleanEmail,
        phone: cleanPhone,
        is_member: false,
      })
      .select()
      .maybeSingle();
  }

  return data;
}

/**
 * Sign in existing user with email and password.
 * If VITE_ENABLE_LEGACY_PHONE_LOGIN="true", a 10-digit mobile is mapped to legacy @frcc.member auth.
 */
export async function signIn({ email, password }) {
  const authEmail = resolveAuthIdentifier(email);
  const { data, error } = await supabase.auth.signInWithPassword({
    email: authEmail,
    password,
  });

  if (error) throw error;
  return data;
}

/**
 * Sign out current user.
 */
export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

/**
 * Get current session and profile.
 */
export async function getCurrentUser() {
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();
  if (sessionError || !session?.user) return null;

  const profile = await getUserProfile(session.user.id);
  return {
    ...session.user,
    profile,
  };
}

/**
 * Fetch profile row from public.profiles
 */
export async function getUserProfile(userId) {
  if (!userId) return null;
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();

  if (error) {
    console.warn('Error fetching profile:', error);
    return null;
  }
  return data;
}

/**
 * Update user's personal details.
 */
export async function updateProfile(userId, updates) {
  if (!userId) throw new Error('Missing user id');
  if (updates?.phone && isPhoneLike(updates.phone) && !isValidIndianMobile(updates.phone)) {
    throw new Error(INDIAN_MOBILE_MESSAGE);
  }
  if (updates?.name && !isValidName(updates.name)) {
    throw new Error(nameError('Full name'));
  }
  const { data, error } = await supabase
    .from('profiles')
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq('id', userId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Update authenticated user's password.
 */
export async function updatePassword(newPassword) {
  const { data, error } = await supabase.auth.updateUser({
    password: newPassword,
  });
  if (error) throw error;
  return data;
}

/**
 * Resolve the redirect URL for password reset.
 * Supports VITE_SITE_URL (for custom/public domains) and respects the app's base path.
 */
export function getPasswordResetRedirectUrl() {
  const envUrl = (import.meta.env.VITE_SITE_URL || import.meta.env.VITE_PUBLIC_URL || '').trim();
  if (envUrl) {
    const cleanEnv = envUrl.replace(/\/+$/, '');
    return `${cleanEnv}/profile?tab=password`;
  }
  const origin = window.location.origin.replace(/\/+$/, '');
  const base = (import.meta.env.BASE_URL || '/').replace(/^\/+/, '').replace(/\/+$/, '');
  const prefix = base ? `${origin}/${base}` : origin;
  return `${prefix}/profile?tab=password`;
}

/**
 * Update authenticated user's email with verification.
 * Sends a confirmation email to the new address before completing the update.
 */
export async function updateEmail(newEmail) {
  const cleanEmail = (newEmail || '').trim().toLowerCase();
  const redirectTo = getPasswordResetRedirectUrl().replace('/profile?tab=password', '/profile');
  const { data, error } = await supabase.auth.updateUser(
    { email: cleanEmail },
    { emailRedirectTo: redirectTo }
  );
  if (error) throw error;
  return data;
}

/**
 * Send password reset email using the user's real email address.
 */
export async function resetPassword(email) {
  const cleanEmail = (email || '').trim().toLowerCase();
  const redirectTo = getPasswordResetRedirectUrl();
  const { data, error } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
    redirectTo,
  });
  if (error) throw error;
  return data;
}

/**
 * Subscribe to Supabase auth state changes.
 */
export function onAuthStateChange(callback) {
  return supabase.auth.onAuthStateChange((event, session) => {
    callback(event, session);
  });
}

/**
 * Check whether the current user is an admin.
 * Calls RPC is_admin() or checks the admins table directly.
 */
export async function checkIsAdmin(userId = null) {
  try {
    const { data, error } = await supabase.rpc('is_admin');
    if (!error && typeof data === 'boolean') return data;
  } catch {
    /* ignore and try direct query */
  }

  let uid = userId;
  if (!uid) {
    const { data: sessionData } = await supabase.auth.getSession();
    uid = sessionData?.session?.user?.id;
  }
  if (!uid) return false;

  const { data, error } = await supabase
    .from('admins')
    .select('user_id')
    .eq('user_id', uid)
    .maybeSingle();

  return Boolean(!error && data?.user_id);
}

