import { supabase } from './supabase.js';

export function generateTicketId() {
  const num = Math.floor(1000 + Math.random() * 9000);
  return `TCK-${num}`;
}

/**
 * Raise a support ticket in Supabase.
 */
export async function createTicket({ category, priority = 'Normal', subject, details, name = '', email = '' }) {
  const { data: sessionData } = await supabase.auth.getSession();
  const userId = sessionData?.session?.user?.id || null;
  const ticketId = generateTicketId();

  const { data, error } = await supabase
    .from('support_tickets')
    .insert([
      {
        ticket_id: ticketId,
        user_id: userId,
        category,
        priority,
        subject,
        details,
        name,
        email,
        status: 'Open',
      },
    ])
    .select()
    .single();

  if (error) {
    console.error('Error creating ticket:', error);
    throw error;
  }
  return data;
}

/**
 * Send contact message to Supabase.
 */
export async function sendContactMessage({ name, email, message }) {
  const { data, error } = await supabase
    .from('contact_messages')
    .insert([
      {
        name,
        email,
        message,
        status: 'Unread',
      },
    ])
    .select()
    .single();

  if (error) {
    console.error('Error sending message:', error);
    throw error;
  }
  return data;
}

/**
 * Get all tickets for current user.
 */
export async function getUserTickets(userId = null) {
  let query = supabase.from('support_tickets').select('*').order('created_at', { ascending: false });
  if (userId) query = query.eq('user_id', userId);
  const { data, error } = await query;
  if (error) return [];
  return data;
}
