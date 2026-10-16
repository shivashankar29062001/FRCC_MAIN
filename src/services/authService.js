import { supabase } from './supabase.js';

/**
 * Format user login identifier. If user entered a plain phone or handle without @,
 * format it as a valid auth identifier.
 */
function normalizeEmail(emailOrPhone) {
  const trimmed = (emailOrPhone || '').trim();
  if (trimmed.includes('@')) return trimmed.toLowerCase();
  const digitsOnly = trimmed.replace(/\D/g, '');
  if (digitsOnly.length >= 10) return `${digitsOnly}@frcc.member`;
  return `${trimmed.toLowerCase().replace(/[^a-z0-9]/g, '')}@frcc.member`;
}

/**
 * Sign up a new user with Supabase Auth & create/sync profile.
 */
export async function signUp({ name, emailOrPhone, password }) {
  const email = normalizeEmail(emailOrPhone);
  const cleanPhone = emailOrPhone.includes('@') ? '' : emailOrPhone.trim();

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        name: (name || '').trim(),
        phone: cleanPhone,
        raw_contact: emailOrPhone,
        is_member: false,
      },
    },
  });

  if (error) throw error;

  // If user is returned, ensure profile row exists in public.profiles
  if (data?.user) {
    const uidCode = `FRCC-U-${data.user.id.substring(0, 6).toUpperCase()}`;
    await supabase
      .from('profiles')
      .upsert({
        id: data.user.id,
        user_id_code: uidCode,
        name: (name || 'Member').trim(),
        email: data.user.email,
        phone: cleanPhone,
        is_member: false,
      })
      .select()
      .maybeSingle();
  }

  return data;
}

/**
 * Sign in existing user with email/password.
 */
export async function signIn({ emailOrPhone, password }) {
  const email = normalizeEmail(emailOrPhone);
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
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
 * Send password reset email.
 */
export async function resetPassword(emailOrPhone) {
  const email = normalizeEmail(emailOrPhone);
  const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/profile?tab=password`,
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
