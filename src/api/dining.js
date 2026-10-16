// ---------------------------------------------------------------------------
// /src/api/dining.js — Dining & Table Booking API Service
// ---------------------------------------------------------------------------

import { supabase } from '../services/supabase.js';
import { venues as LOCAL_VENUES } from '../data/dining.js';

const isMock = typeof import.meta !== 'undefined' && import.meta.env?.VITE_USE_MOCK === 'true';

// In-memory and localStorage persistence for table bookings
const STORAGE_KEY = 'frcc_table_bookings_v1';

function getStoredBookings() {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveStoredBookings(items) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {
    /* ignore storage errors */
  }
}

/**
 * Returns all dining venues.
 */
export async function getVenues() {
  return LOCAL_VENUES;
}

/**
 * Returns a specific venue by ID.
 */
export async function getVenueById(id) {
  return LOCAL_VENUES.find((v) => v.id === id) || null;
}

/**
 * Venue time slot generation based on venue hours and existing bookings.
 */
const VENUE_SLOTS = {
  restaurant: [
    '12:00 PM', '12:30 PM', '01:00 PM', '01:30 PM', '02:00 PM',
    '07:00 PM', '07:30 PM', '08:00 PM', '08:30 PM', '09:00 PM', '09:30 PM', '10:00 PM',
  ],
  'coffee-shop': [
    '08:00 AM', '09:00 AM', '10:00 AM', '11:00 AM', '03:00 PM',
    '04:00 PM', '05:00 PM', '06:00 PM', '07:00 PM', '08:00 PM',
  ],
  pub: [
    '04:30 PM', '05:30 PM', '06:30 PM', '07:30 PM', '08:30 PM', '09:30 PM', '10:30 PM',
  ],
  'lounge-bar': [
    '05:30 PM', '06:30 PM', '07:30 PM', '08:30 PM', '09:30 PM', '10:30 PM', '11:00 PM',
  ],
  'rooftop-restaurant': [
    '06:30 PM', '07:00 PM', '07:30 PM', '08:00 PM', '08:30 PM', '09:00 PM', '09:30 PM', '10:00 PM',
  ],
};

/**
 * Get available table slots for a venue and date with remaining seats.
 * @param {string} venueId
 * @param {string} date - DD/MM/YYYY or YYYY-MM-DD
 */
export async function getTableSlots(venueId, date) {
  const times = VENUE_SLOTS[venueId] || VENUE_SLOTS.restaurant;
  const stored = getStoredBookings();

  // Pseudo-random baseline seats per slot seeded by date and time
  const dateStr = String(date || '').replace(/\D/g, '');
  const dateNum = Number(dateStr) || 123;

  return times.map((time, idx) => {
    // Capacity baseline between 8 and 20 seats
    const baseline = 8 + ((dateNum + idx * 7) % 13);

    // Count already booked guests for this venue, date, and slot
    const booked = stored
      .filter((b) => b.venue_id === venueId && b.date === date && b.time === time)
      .reduce((sum, b) => sum + (Number(b.guests) || 0), 0);

    const seatsLeft = Math.max(0, baseline - booked);

    return {
      id: `${venueId}-${idx}`,
      time,
      seatsLeft,
      available: seatsLeft > 0,
    };
  });
}

/**
 * Create a table booking (free, no payment, idempotent via client_request_id).
 */
export async function createTableBooking(payload) {
  const clientRequestId = payload.clientRequestId || payload.client_request_id
    || `tbl_req_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

  const stored = getStoredBookings();

  // Idempotency: return existing booking if client_request_id matches
  const existing = stored.find((b) => b.client_request_id === clientRequestId);
  if (existing) {
    return existing;
  }

  const year = new Date().getFullYear();
  const random6 = String(Math.floor(100000 + Math.random() * 900000));
  const bookingRef = `FRCC-TAB-${year}-${random6}`;

  const venue = LOCAL_VENUES.find((v) => v.id === (payload.venueId || payload.venue_id)) || LOCAL_VENUES[0];

  const booking = {
    id: `tab_${Date.now()}`,
    client_request_id: clientRequestId,
    booking_ref: bookingRef,
    bookingRef,
    bookingId: bookingRef,
    category: 'dining',
    service: 'dining',
    user_id: payload.userId || payload.user_id || null,
    venue_id: venue.id,
    venue_name: venue.name,
    venueName: venue.name,
    date: payload.date,
    time: payload.time || payload.slot,
    slot: payload.time || payload.slot,
    guests: Number(payload.guests || 2),
    guest_name: payload.name || payload.guestName || payload.guest_name || 'Guest',
    guest_mobile: payload.mobile || payload.guestMobile || payload.guest_mobile || '',
    guest_email: payload.email || payload.guestEmail || payload.guest_email || '',
    notes: payload.notes || payload.specialRequest || '',
    status: 'confirmed',
    is_free: true,
    total: 0,
    qrValue: `FRCC:TABLE:${bookingRef}`,
    created_at: new Date().toISOString(),
    createdAt: new Date().toISOString(),
  };

  // If not mock mode and Supabase is configured, try recording in Supabase
  if (!isMock && supabase) {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const currentUserId = booking.user_id || sessionData?.session?.user?.id || null;

      await supabase.from('table_bookings').insert({
        client_request_id: clientRequestId,
        booking_ref: bookingRef,
        user_id: currentUserId,
        venue_id: booking.venue_id,
        date: booking.date,
        time_slot: booking.time,
        guests: booking.guests,
        guest_name: booking.guest_name,
        guest_mobile: booking.guest_mobile,
        guest_email: booking.guest_email,
        notes: booking.notes,
        status: 'confirmed',
      });
    } catch (err) {
      // Table may not exist yet, fallback cleanly to local storage
      console.warn('Note: Could not persist to remote table_bookings, stored locally:', err);
    }
  }

  stored.push(booking);
  saveStoredBookings(stored);

  return booking;
}

/**
 * Fetch table bookings for the given user ID or signed-in user.
 */
export async function getMyTableBookings(userId = null) {
  const localList = getStoredBookings();

  if (!isMock && supabase) {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const uid = userId || sessionData?.session?.user?.id;
      if (uid) {
        const { data, error } = await supabase
          .from('table_bookings')
          .select('*')
          .eq('user_id', uid)
          .order('created_at', { ascending: false });

        if (!error && data && data.length > 0) {
          // Merge with any local ones
          const remoteMapped = data.map((b) => ({
            id: b.id,
            booking_ref: b.booking_ref,
            bookingRef: b.booking_ref,
            bookingId: b.booking_ref,
            category: 'dining',
            service: 'dining',
            user_id: b.user_id,
            venue_id: b.venue_id,
            venue_name: LOCAL_VENUES.find((v) => v.id === b.venue_id)?.name || b.venue_id,
            venueName: LOCAL_VENUES.find((v) => v.id === b.venue_id)?.name || b.venue_id,
            date: b.date,
            time: b.time_slot,
            slot: b.time_slot,
            guests: b.guests,
            guest_name: b.guest_name,
            guest_mobile: b.guest_mobile,
            guest_email: b.guest_email,
            status: b.status || 'confirmed',
            is_free: true,
            total: 0,
            qrValue: `FRCC:TABLE:${b.booking_ref}`,
            created_at: b.created_at,
            createdAt: b.created_at,
          }));

          const combined = [...localList, ...remoteMapped];
          const seen = new Set();
          return combined.filter((b) => {
            const ref = b.booking_ref || b.id;
            if (seen.has(ref)) return false;
            seen.add(ref);
            return true;
          }).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        }
      }
    } catch (err) {
      console.warn('Could not query remote table_bookings:', err);
    }
  }

  // Filter local list for this user if userId is provided
  if (userId) {
    return localList
      .filter((b) => !b.user_id || b.user_id === userId)
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  }

  return [...localList].reverse();
}
