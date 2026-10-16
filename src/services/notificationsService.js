import { supabase } from './supabase.js';

/**
 * Fetch broadcast and user notifications from Supabase.
 */
export async function getNotifications(userId = null) {
  let query = supabase
    .from('notifications')
    .select('*')
    .order('created_at', { ascending: false });

  if (userId) {
    query = query.or(`user_id.eq.${userId},user_id.is.null`);
  } else {
    query = query.is('user_id', null);
  }

  const { data, error } = await query;
  if (error) {
    console.warn('Error fetching notifications:', error);
    return [];
  }
  return data || [];
}

/**
 * Mark notification as read.
 */
export async function markNotificationAsRead(notificationId) {
  const { data, error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('id', notificationId)
    .select()
    .single();

  if (error) throw error;
  return data;
}
