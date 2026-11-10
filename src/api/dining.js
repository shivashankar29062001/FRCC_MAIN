// ---------------------------------------------------------------------------
// /src/api/dining.js — Dining & Table Booking API Service
// ---------------------------------------------------------------------------

import { supabase } from '../services/supabase.js';
import { isValidIndianMobile } from '../utils/mobile.js';
import { venues as LOCAL_VENUES } from '../data/dining.js';
import { isBookingCancelledLocally } from '../services/cancellationService.js';

const isMock = typeof import.meta !== 'undefined' && import.meta.env?.VITE_USE_MOCK === 'true';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
function isUuid(val) {
  return typeof val === 'string' && UUID_REGEX.test(val.trim());
}

/**
 * Extracts normalized campus/city location metadata from dining booking fields or embedded [Location: ...] notes tag.
 */
export function extractDiningLocation(b, localMatch = null) {
  const explicitCity = String(b?.city_id || b?.cityId || '').trim().toLowerCase();
  const explicitCityName = String(b?.city_name || b?.cityName || '').trim();
  const explicitArea = String(b?.area_name || b?.areaName || '').trim();
  const explicitVenueLoc = String(b?.venue_location_name || b?.venueLocationName || '').trim();
  const explicitLoc = String(b?.location || '').trim();

  if (explicitCity || explicitArea || explicitLoc) {
    const combined = `${explicitCity} ${explicitCityName} ${explicitArea} ${explicitVenueLoc} ${explicitLoc}`.toLowerCase();
    const isHyd = combined.includes('hyd');
    const areaName = explicitArea || (isHyd ? 'Hyderabad Campus' : 'Vijayawada Campus');
    const venueLocationName = explicitVenueLoc || (isHyd ? 'Hyderabad Club Dining' : 'FRCC Clubhouse Dining');
    return {
      cityId: isHyd ? 'hyd' : (explicitCity || 'vja'),
      cityName: explicitCityName || (isHyd ? 'Hyderabad' : 'Vijayawada'),
      areaName,
      venueLocationName,
      location: explicitLoc || (venueLocationName && areaName && !venueLocationName.includes(areaName) ? `${areaName} — ${venueLocationName}` : areaName),
    };
  }

  const notesStr = String(b?.notes || b?.special_request || b?.specialRequest || localMatch?.notes || '');
  const locMatch = notesStr.match(/\[Location:\s*([^|]+)\s*\|\s*([^|]+)\s*\|\s*([^|]+)\s*\|\s*([^\]]+)\]/i);
  if (locMatch) {
    const cityId = locMatch[1].trim();
    const cityName = locMatch[2].trim();
    const areaName = locMatch[3].trim();
    const venueLocationName = locMatch[4].trim();
    const isHyd = cityId.toLowerCase().includes('hyd') || cityName.toLowerCase().includes('hyd') || areaName.toLowerCase().includes('hyd');
    return {
      cityId: isHyd ? 'hyd' : cityId,
      cityName: isHyd ? 'Hyderabad' : cityName,
      areaName: isHyd ? 'Hyderabad Campus' : areaName,
      venueLocationName,
      location: venueLocationName && areaName && !venueLocationName.includes(areaName)
        ? `${areaName} — ${venueLocationName}`
        : (areaName || venueLocationName),
    };
  }

  if (localMatch && (localMatch.location || localMatch.areaName || localMatch.cityName)) {
    const lText = `${localMatch.cityId || ''} ${localMatch.cityName || ''} ${localMatch.areaName || ''} ${localMatch.location || ''}`.toLowerCase();
    const isHyd = lText.includes('hyd');
    return {
      cityId: localMatch.cityId || (isHyd ? 'hyd' : 'vja'),
      cityName: localMatch.cityName || (isHyd ? 'Hyderabad' : 'Vijayawada'),
      areaName: localMatch.areaName || (isHyd ? 'Hyderabad Campus' : 'Vijayawada Campus'),
      venueLocationName: localMatch.venueLocationName || (isHyd ? 'Hyderabad Club Dining' : 'FRCC Clubhouse Dining'),
      location: localMatch.location || localMatch.areaName || (isHyd ? 'Hyderabad Campus — Hyderabad Club Dining' : 'Vijayawada Campus'),
    };
  }

  const allText = `${notesStr} ${b?.city_id || b?.cityId || ''} ${b?.city_name || b?.cityName || ''} ${b?.area_name || b?.areaName || ''} ${b?.venue_location_name || b?.venueLocationName || ''} ${b?.location || ''}`.toLowerCase();
  if (allText.includes('hyd') || allText.includes('hyderabad')) {
    return {
      cityId: 'hyd',
      cityName: 'Hyderabad',
      areaName: 'Hyderabad Campus',
      venueLocationName: 'Hyderabad Club Dining',
      location: 'Hyderabad Campus — Hyderabad Club Dining',
    };
  }

  return {
    cityId: b?.city_id || b?.cityId || 'vja',
    cityName: b?.city_name || b?.cityName || 'Vijayawada',
    areaName: b?.area_name || b?.areaName || 'Vijayawada Campus',
    venueLocationName: b?.venue_location_name || b?.venueLocationName || 'FRCC Clubhouse Dining',
    location: b?.location || b?.area_name || b?.areaName || 'Vijayawada Campus',
  };
}

export function stripDiningLocationTag(notesStr) {
  return String(notesStr || '')
    .replace(/\s*\[Location:[^\]]+\]\s*/gi, ' ')
    .trim();
}

export function normalizeDiningDateISO(rawDate) {
  const s = String(rawDate || '').trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(s);
  if (m) {
    return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
  }
  return '';
}

function getISTNow() {
  const now = new Date();
  const dateISO = now.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
  const parts = now
    .toLocaleTimeString('en-GB', { timeZone: 'Asia/Kolkata', hour12: false, hour: '2-digit', minute: '2-digit' })
    .split(':')
    .map(Number);
  const minutes = (Number(parts[0]) || 0) * 60 + (Number(parts[1]) || 0);
  return { dateISO, minutes };
}

export function parseSlotMinutes(timeStr) {
  const raw = String(timeStr || '').trim().toUpperCase();
  const ampm = /^(\d{1,2}):(\d{2})\s*(AM|PM)$/.exec(raw);
  if (ampm) {
    let h = Number(ampm[1]);
    const m = Number(ampm[2]);
    const period = ampm[3];
    if (period === 'AM' && h === 12) h = 0;
    if (period === 'PM' && h < 12) h += 12;
    return h * 60 + m;
  }
  const hhmm = /^(\d{1,2}):(\d{2})$/.exec(raw);
  if (hhmm) {
    return Number(hhmm[1]) * 60 + Number(hhmm[2]);
  }
  return NaN;
}

/**
 * Returns true if the given dining reservation date & time slot has already passed in Asia/Kolkata.
 */
export function isDiningSlotPast(dateInput, timeStr) {
  const iso = normalizeDiningDateISO(dateInput);
  if (!iso) return true;
  const { dateISO: todayIST, minutes: nowMins } = getISTNow();
  if (iso < todayIST) return true;
  if (iso > todayIST) return false;
  const slotMins = parseSlotMinutes(timeStr);
  if (Number.isNaN(slotMins)) return false;
  return slotMins <= nowMins;
}

// In-memory and localStorage persistence for table bookings
const BASE_STORAGE_KEY = 'frcc_table_bookings_v1';

// Remove legacy non-user-specific storage key on startup
try {
  if (typeof window !== 'undefined' && window.localStorage) {
    window.localStorage.removeItem(BASE_STORAGE_KEY);
  }
} catch {
  /* ignore */
}

function getTableStorageKey(userId) {
  return userId ? `${BASE_STORAGE_KEY}.${userId}` : `${BASE_STORAGE_KEY}.anon`;
}

function getStoredBookings(userId = null) {
  if (typeof window === 'undefined') return [];
  try {
    const key = getTableStorageKey(userId);
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveStoredBookings(items, userId = null) {
  if (typeof window === 'undefined') return;
  try {
    const key = getTableStorageKey(userId);
    window.localStorage.setItem(key, JSON.stringify(items));
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
 * Queries Supabase get_available_table_slots RPC when online and always disables
 * past time slots on today's Asia/Kolkata date across all dining venues.
 * @param {string} venueId
 * @param {string} date - DD/MM/YYYY or YYYY-MM-DD
 */
export async function getTableSlots(venueId, date) {
  const times = VENUE_SLOTS[venueId] || VENUE_SLOTS.restaurant;
  const isoDate = normalizeDiningDateISO(date);

  if (!isMock && isoDate) {
    try {
      const { data, error } = await supabase.rpc('get_available_table_slots', {
        p_venue_id: venueId,
        p_date: isoDate,
      });
      if (!error && Array.isArray(data) && data.length > 0) {
        return data.map((row, idx) => {
          const time = row.time_slot;
          const past = isDiningSlotPast(isoDate, time);
          const seatsLeft = past ? 0 : Number(row.seats_left ?? 0);
          return {
            id: `${venueId}-${idx}`,
            time,
            seatsLeft,
            isPast: past,
            available: !past && Boolean(row.available) && seatsLeft > 0,
          };
        });
      }
    } catch {
      /* fallback to baseline local slots */
    }
  }

  const stored = getStoredBookings();
  const dateStr = String(date || '').replace(/\D/g, '');
  const dateNum = Number(dateStr) || 123;

  return times.map((time, idx) => {
    const past = isoDate ? isDiningSlotPast(isoDate, time) : false;
    const baseline = 8 + ((dateNum + idx * 7) % 13);
    const booked = stored
      .filter((b) => b.venue_id === venueId && (b.date === date || b.date === isoDate) && b.time === time)
      .reduce((sum, b) => sum + (Number(b.guests) || 0), 0);

    const seatsLeft = past ? 0 : Math.max(0, baseline - booked);

    return {
      id: `${venueId}-${idx}`,
      time,
      seatsLeft,
      isPast: past,
      available: !past && seatsLeft > 0,
    };
  });
}

/**
 * Create a table booking (free, no payment, idempotent via client_request_id).
 */
export async function createTableBooking(payload) {
  const mobile = payload.mobile || payload.guestMobile || payload.guest_mobile;
  if (mobile && !isValidIndianMobile(mobile)) {
    throw new Error('Please enter a valid 10-digit Indian mobile number.');
  }
  const clientRequestId = payload.clientRequestId || payload.client_request_id
    || `tbl_req_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

  const bookingDate = normalizeDiningDateISO(payload.date);
  const slotTime = payload.time || payload.slot;
  if (!bookingDate) {
    throw new Error('Please select a valid reservation date.');
  }
  const { dateISO: todayIST } = getISTNow();
  if (bookingDate < todayIST) {
    throw new Error('Reservation date cannot be in the past.');
  }
  if (isDiningSlotPast(bookingDate, slotTime)) {
    throw new Error('Selected time slot has already passed. Please choose an upcoming time slot.');
  }

  let sessionUserId = null;
  try {
    const { data: sessionData } = await supabase.auth.getSession();
    sessionUserId = sessionData?.session?.user?.id || null;
  } catch (_) {}

  const currentUserId = sessionUserId || payload.userId || payload.user_id;

  // 1. Mock or demo user (non-UUID) handling
  if (isMock || (currentUserId && !isUuid(currentUserId))) {
    const stored = getStoredBookings(currentUserId);
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
      user_id: currentUserId,
      userId: currentUserId,
      venue_id: venue.id,
      venue_name: venue.name,
      venueName: venue.name,
      city_id: payload.cityId || 'vja',
      cityId: payload.cityId || 'vja',
      city_name: payload.cityName || 'Vijayawada',
      cityName: payload.cityName || 'Vijayawada',
      venue_location_name: payload.venueLocationName || 'FRCC Clubhouse Dining',
      venueLocationName: payload.venueLocationName || 'FRCC Clubhouse Dining',
      area_name: payload.areaName || 'Vijayawada Campus',
      areaName: payload.areaName || 'Vijayawada Campus',
      location: payload.location || payload.areaName || 'Vijayawada Campus',
      date: payload.date,
      time: payload.time || payload.slot,
      slot: payload.time || payload.slot,
      guests: Number(payload.guests || 2),
      guest_name: payload.name || payload.guestName || payload.guest_name || 'Guest',
      guest_mobile: payload.mobile || payload.guestMobile || payload.guest_mobile || '',
      guest_email: payload.email || payload.guestEmail || payload.guest_email || '',
      notes: payload.notes || payload.specialRequest || '',
      status: 'CONFIRMED',
      is_free: true,
      total: 0,
      qrValue: `FRCC:TABLE:${bookingRef}`,
      created_at: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    };

    stored.push(mockBooking);
    saveStoredBookings(stored, currentUserId);
    return mockBooking;
  }

  // 2. Real database execution via create_table_booking RPC
  // NEVER fall back to mock on failure. Throw the error cleanly.
  const rpcParams = {
    p_client_request_id: clientRequestId,
    p_venue_id: payload.venueId || payload.venue_id,
    p_date: bookingDate,
    p_time: slotTime,
    p_guests: Number(payload.guests || 2),
    p_name: payload.name || payload.guestName || payload.guest_name || '',
    p_mobile: payload.mobile || payload.guestMobile || payload.guest_mobile || '',
    p_email: payload.email || payload.guestEmail || payload.guest_email || '',
    p_notes: payload.notes || payload.specialRequest || null,
    p_age_confirmed: Boolean(payload.ageConfirmed || payload.age_confirmed),
    p_user_id: currentUserId || null,
    p_city_id: payload.cityId || null,
    p_city_name: payload.cityName || null,
    p_area_name: payload.areaName || null,
    p_venue_location_name: payload.venueLocationName || null,
    p_location: payload.location || null,
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
  const effectiveUserId = data.user_id || currentUserId;
  const loc = extractDiningLocation(data, payload);

  const formattedBooking = {
    id: data.id,
    uuid: data.id,
    rawId: data.id,
    client_request_id: data.client_request_id,
    booking_ref: data.booking_ref,
    bookingRef: data.booking_ref,
    bookingId: data.booking_ref,
    category: 'dining',
    service: 'dining',
    user_id: effectiveUserId,
    userId: effectiveUserId,
    venue_id: data.venue_id,
    venue_name: venue.name,
    venueName: venue.name,
    city_id: loc.cityId,
    cityId: loc.cityId,
    city_name: loc.cityName,
    cityName: loc.cityName,
    venue_location_name: loc.venueLocationName,
    venueLocationName: loc.venueLocationName,
    area_name: loc.areaName,
    areaName: loc.areaName,
    location: loc.location,
    date: data.date,
    time: data.time_slot,
    slot: data.time_slot,
    guests: data.guests,
    guest_name: data.guest_name,
    guest_mobile: data.guest_mobile,
    guest_email: data.guest_email,
    notes: data.notes,
    status: String(data.status || 'CONFIRMED').toUpperCase(),
    is_free: true,
    total: 0,
    qrValue: `FRCC:TABLE:${data.booking_ref}`,
    created_at: data.created_at,
    createdAt: data.created_at,
  };

  // Keep a local cached copy for offline viewing
  const stored = getStoredBookings(effectiveUserId);
  stored.push(formattedBooking);
  saveStoredBookings(stored, effectiveUserId);

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('frcc:table-bookings-changed', { detail: formattedBooking }));
    window.dispatchEvent(new CustomEvent('frcc:booking-created', { detail: formattedBooking }));
  }

  return formattedBooking;
}

/**
 * Fetch table bookings for the given user ID or signed-in user.
 */
export async function getMyTableBookings(userId = null) {
  const { data: sessionData } = await supabase.auth.getSession();
  const uid = userId || sessionData?.session?.user?.id;

  if (!uid) {
    return [];
  }

  const localList = getStoredBookings(uid);

  if (isMock || !isUuid(uid)) {
    return localList
      .filter((b) => !b.user_id || b.user_id === uid || b.userId === uid)
      .map((b) => {
        const loc = extractDiningLocation(b);
        return {
          ...b,
          city_id: loc.cityId,
          cityId: loc.cityId,
          city_name: loc.cityName,
          cityName: loc.cityName,
          venue_location_name: loc.venueLocationName,
          venueLocationName: loc.venueLocationName,
          area_name: loc.areaName,
          areaName: loc.areaName,
          location: loc.location,
        };
      })
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
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

  const localByRef = new Map();
  localList.forEach((l) => {
    if (l.booking_ref) localByRef.set(String(l.booking_ref), l);
    if (l.id) localByRef.set(String(l.id), l);
    if (l.client_request_id) localByRef.set(String(l.client_request_id), l);
  });

  const remoteMapped = (data || []).map((b) => {
    const venueName = b.dining_venues?.name 
      || LOCAL_VENUES.find((v) => v.id === b.venue_id)?.name 
      || b.venue_id;
    const localMatch =
      localByRef.get(String(b.booking_ref)) ||
      localByRef.get(String(b.id)) ||
      localByRef.get(String(b.client_request_id)) ||
      null;
    const loc = extractDiningLocation(b, localMatch);

    return {
      id: b.id,
      uuid: b.id,
      rawId: b.id,
      booking_ref: b.booking_ref,
      bookingRef: b.booking_ref,
      bookingId: b.booking_ref,
      category: 'dining',
      service: 'dining',
      user_id: b.user_id,
      userId: b.user_id,
      venue_id: b.venue_id,
      venue_name: venueName,
      venueName,
      city_id: loc.cityId,
      cityId: loc.cityId,
      city_name: loc.cityName,
      cityName: loc.cityName,
      venue_location_name: loc.venueLocationName,
      venueLocationName: loc.venueLocationName,
      area_name: loc.areaName,
      areaName: loc.areaName,
      location: loc.location,
      date: b.date,
      time: b.time_slot,
      slot: b.time_slot,
      guests: b.guests,
      guest_name: b.guest_name,
      guest_mobile: b.guest_mobile,
      guest_email: b.guest_email,
      notes: b.notes,
      status: (isBookingCancelledLocally(b.booking_ref) || isBookingCancelledLocally(b.id))
        ? 'CANCELLED'
        : String(b.status || 'CONFIRMED').toUpperCase(),
      is_free: true,
      total: 0,
      qrValue: `FRCC:TABLE:${b.booking_ref}`,
      created_at: b.created_at,
      createdAt: b.created_at,
    };
  });

  const seenRefs = new Set(remoteMapped.map((r) => String(r.booking_ref || r.id)));
  const extraLocals = localList
    .filter((l) => !seenRefs.has(String(l.booking_ref || l.id)))
    .map((b) => {
      const loc = extractDiningLocation(b);
      return {
        ...b,
        city_id: loc.cityId,
        cityId: loc.cityId,
        city_name: loc.cityName,
        cityName: loc.cityName,
        venue_location_name: loc.venueLocationName,
        venueLocationName: loc.venueLocationName,
        area_name: loc.areaName,
        areaName: loc.areaName,
        location: loc.location,
      };
    });

  return [...remoteMapped, ...extraLocals].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
}
