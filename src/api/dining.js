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

  // Convert DD/MM/YYYY into YYYY-MM-DD for database DATE column if needed
  let bookingDate = payload.date;
  if (bookingDate && /^\d{2}\/\d{2}\/\d{4}$/.test(bookingDate)) {
    const [dd, mm, yyyy] = bookingDate.split('/');
    bookingDate = `${yyyy}-${mm}-${dd}`;
  }

  // 1. Mock mode handling
  if (isMock) {
    const stored = getStoredBookings();
    const existing = stored.find((b) => b.client_request_id === clientRequestId);
    if (existing) {
      return existing;
    }

    const year = new Date().getFullYear();
    const random6 = String(Math.floor(100000 + Math.random() * 900000));
    const bookingRef = `FRCC-T-${year}-${random6}`;
    const venue = LOCAL_VENUES.find((v) => v.id === (payload.venueId || payload.venue_id)) || LOCAL_VENUES[0];

    const mockBooking = {
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

    stored.push(mockBooking);
    saveStoredBookings(stored);
    return mockBooking;
  }

  // 2. Real database execution via create_table_booking RPC
  // NEVER fall back to mock on failure. Throw the error cleanly.
  const rpcParams = {
    p_client_request_id: clientRequestId,
    p_venue_id: payload.venueId || payload.venue_id,
    p_date: bookingDate,
    p_time: payload.time || payload.slot,
    p_guests: Number(payload.guests || 2),
    p_name: payload.name || payload.guestName || payload.guest_name || '',
    p_mobile: payload.mobile || payload.guestMobile || payload.guest_mobile || '',
    p_email: payload.email || payload.guestEmail || payload.guest_email || '',
    p_notes: payload.notes || payload.specialRequest || null,
    p_age_confirmed: Boolean(payload.ageConfirmed || payload.age_confirmed),
  };

  const { data, error } = await supabase.rpc('create_table_booking', rpcParams);

  if (error) {
    console.error('Database error in create_table_booking RPC:', error);
    throw new Error(error.message || 'Failed to reserve table in database.');
  }

  if (!data) {
    throw new Error('Database did not return a confirmed reservation.');
  }

  const venue = LOCAL_VENUES.find((v) => v.id === data.venue_id) || { name: data.venue_id };

  const formattedBooking = {
    id: data.id,
    client_request_id: data.client_request_id,
    booking_ref: data.booking_ref,
    bookingRef: data.booking_ref,
    bookingId: data.booking_ref,
    category: 'dining',
    service: 'dining',
    user_id: data.user_id,
    venue_id: data.venue_id,
    venue_name: venue.name,
    venueName: venue.name,
    date: data.date,
    time: data.time_slot,
    slot: data.time_slot,
    guests: data.guests,
    guest_name: data.guest_name,
    guest_mobile: data.guest_mobile,
    guest_email: data.guest_email,
    notes: data.notes,
    status: data.status || 'confirmed',
    is_free: true,
    total: 0,
    qrValue: `FRCC:TABLE:${data.booking_ref}`,
    created_at: data.created_at,
    createdAt: data.created_at,
  };

  // Keep a local cached copy for offline viewing
  const stored = getStoredBookings();
  stored.push(formattedBooking);
  saveStoredBookings(stored);

  return formattedBooking;
}

/**
 * Fetch table bookings for the given user ID or signed-in user.
 */
export async function getMyTableBookings(userId = null) {
  if (isMock) {
    const localList = getStoredBookings();
    if (userId) {
      return localList
        .filter((b) => !b.user_id || b.user_id === userId)
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    }
    return [...localList].reverse();
  }

  // Real Database read from table_bookings
  const { data: sessionData } = await supabase.auth.getSession();
  const uid = userId || sessionData?.session?.user?.id;

  if (!uid) {
    return [];
  }

  const { data, error } = await supabase
    .from('table_bookings')
    .select('*, dining_venues(*)')
    .eq('user_id', uid)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching table_bookings from database:', error);
    throw error;
  }

  return (data || []).map((b) => {
    const venueName = b.dining_venues?.name 
      || LOCAL_VENUES.find((v) => v.id === b.venue_id)?.name 
      || b.venue_id;

    return {
      id: b.id,
      booking_ref: b.booking_ref,
      bookingRef: b.booking_ref,
      bookingId: b.booking_ref,
      category: 'dining',
      service: 'dining',
      user_id: b.user_id,
      venue_id: b.venue_id,
      venue_name: venueName,
      venueName,
      date: b.date,
      time: b.time_slot,
      slot: b.time_slot,
      guests: b.guests,
      guest_name: b.guest_name,
      guest_mobile: b.guest_mobile,
      guest_email: b.guest_email,
      notes: b.notes,
      status: b.status || 'confirmed',
      is_free: true,
      total: 0,
      qrValue: `FRCC:TABLE:${b.booking_ref}`,
      created_at: b.created_at,
      createdAt: b.created_at,
    };
  });
}
