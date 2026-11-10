import { supabase } from './supabase.js';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const LOCAL_TICKETS_KEY = 'frcc_support_tickets_v1';

function isUuid(val) {
  return typeof val === 'string' && UUID_REGEX.test(val.trim());
}

function getStoredLocalTickets(userId = null) {
  if (typeof window === 'undefined' || !window.localStorage) return [];
  try {
    const raw = window.localStorage.getItem(LOCAL_TICKETS_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(parsed)) return [];
    if (!userId) return parsed;
    return parsed.filter((t) => !t.user_id || t.user_id === userId);
  } catch {
    return [];
  }
}

function saveLocalTicket(ticket) {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    const raw = window.localStorage.getItem(LOCAL_TICKETS_KEY);
    const list = raw ? JSON.parse(raw) : [];
    const updated = [ticket, ...(Array.isArray(list) ? list : [])];
    window.localStorage.setItem(LOCAL_TICKETS_KEY, JSON.stringify(updated.slice(0, 50)));
  } catch {
    /* ignore storage errors */
  }
}

export function generateTicketId() {
  const num = Math.floor(1000 + Math.random() * 9000);
  return `TCK-${num}`;
}

/**
 * Raise a support ticket in Supabase.
 */
export async function createTicket({
  category,
  priority = 'Normal',
  subject,
  details,
  name = '',
  email = '',
  userId = null,
}) {
  let validUserId = null;
  try {
    const { data: sessionData } = await supabase.auth.getSession();
    const authUid = sessionData?.session?.user?.id;
    if (authUid && isUuid(authUid)) {
      validUserId = authUid;
    } else if (userId && isUuid(userId)) {
      validUserId = userId;
    }
  } catch {
    if (userId && isUuid(userId)) {
      validUserId = userId;
    }
  }

  const ticketId = generateTicketId();
  const ticketRecord = {
    ticket_id: ticketId,
    user_id: validUserId,
    category,
    priority,
    subject,
    details: details || '',
    name: name || '',
    email: email || '',
    status: 'Open',
    created_at: new Date().toISOString(),
  };

  try {
    // Minimal insert without .select() so anon/new tickets don't trip SELECT RLS policy
    const { error } = await supabase
      .from('support_tickets')
      .insert([
        {
          ticket_id: ticketRecord.ticket_id,
          user_id: ticketRecord.user_id,
          category: ticketRecord.category,
          priority: ticketRecord.priority,
          subject: ticketRecord.subject,
          details: ticketRecord.details,
          name: ticketRecord.name,
          email: ticketRecord.email,
          status: ticketRecord.status,
        },
      ]);

    if (error) {
      console.warn('[supportService] Supabase ticket insert notice:', error?.message || error);
      // On RLS restriction or offline failure, preserve ticket locally so user is not blocked
      saveLocalTicket(ticketRecord);
      return ticketRecord;
    }

    saveLocalTicket(ticketRecord);
    return ticketRecord;
  } catch (err) {
    console.warn('[supportService] createTicket network/runtime warning:', err);
    saveLocalTicket(ticketRecord);
    return ticketRecord;
  }
}

/**
 * Send contact message to Supabase.
 */
export async function sendContactMessage({ name, email, message }) {
  const { error } = await supabase
    .from('contact_messages')
    .insert([
      {
        name,
        email,
        message,
        status: 'Unread',
      },
    ]);

  if (error) {
    console.error('Error sending message:', error);
    throw error;
  }
  return { success: true };
}

/**
 * Get all tickets for current user.
 */
export async function getUserTickets(userId = null) {
  const localTickets = getStoredLocalTickets(userId);
  try {
    let query = supabase.from('support_tickets').select('*').order('created_at', { ascending: false });
    if (userId && isUuid(userId)) {
      query = query.eq('user_id', userId);
    }
    const { data, error } = await query;
    if (!error && Array.isArray(data)) {
      const seen = new Set(data.map((t) => t.ticket_id));
      const merged = [...data, ...localTickets.filter((t) => !seen.has(t.ticket_id))];
      return merged;
    }
  } catch {
    /* fallback to local tickets */
  }
  return localTickets;
}
