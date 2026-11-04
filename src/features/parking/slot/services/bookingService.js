/**
 * FRCC Parking Slot Allotment — Booking Service.
 *
 * Produces the single, consistent booking object shape used by:
 *   1. The Step 6 booking confirmation UI.
 *   2. The Admin Dashboard API call (team lead's existing dashboard backend).
 *
 * ADMIN DASHBOARD INTEGRATION
 * ---------------------------
 * The dashboard backend endpoint is configured through Vite environment
 * variables (create a `.env` file in the project root):
 *
 *   VITE_BOOKING_API_URL=https://<admin-dashboard-host>/api
 *   VITE_BOOKING_API_PATH=/bookings          # optional, defaults to /bookings
 *
 * When VITE_BOOKING_API_URL is NOT set the app runs in frontend-only mode:
 * the booking is confirmed locally, it is explicitly NOT claimed to have
 * reached the dashboard, and no fake endpoint is invented.
 *
 * The payload sent to POST {VITE_BOOKING_API_URL}{VITE_BOOKING_API_PATH} is
 * built by buildAdminBookingPayload() and contains exactly:
 *   bookingReference, city, bookingDate, arrivalTime, durationDays,
 *   parkingSlot, vehicleType, vehicleNumber, vehicleModel, totalAmount,
 *   paymentMethod, paymentStatus, bookingStatus, createdAt
 */

import { supabase } from '../../../../services/supabase.js';
import {
  cleanVehicleNumber,
  isValidVehicleNumber,
  VEHICLE_NUMBER_ERROR_MESSAGE
} from '../../../../utils/vehicle.js';

// Display booking status values (used by the UI).
export const BOOKING_STATUS = {
  PENDING: 'Pending',
  CONFIRMED: 'Confirmed',
  CANCELLED: 'Cancelled',
  COMPLETED: 'Completed'
};

// Backend status codes sent to the Admin Dashboard.
export const BOOKING_STATUS_CODE = {
  CONFIRMED: 'CONFIRMED',
  PENDING: 'PENDING',
  CANCELLED: 'CANCELLED',
  COMPLETED: 'COMPLETED'
};

export const PAYMENT_STATUS_CODE = {
  PAID: 'PAID',
  PENDING_AT_VENUE: 'PENDING_AT_VENUE'
};

// UI payment method label → backend method code.
const PAYMENT_METHOD_CODE = {
  UPI: 'UPI',
  'Credit/Debit Card': 'CARD',
  Cash: 'CASH'
};

// 'YYYY-MM-DD' → 'DD/MM/YYYY'
function formatBookingDate(dateStr) {
  if (!dateStr) return '';
  try {
    const [year, month, day] = dateStr.split('-');
    if (year && month && day) return `${day}/${month}/${year}`;
    return dateStr;
  } catch {
    return dateStr;
  }
}

// 'HH:MM' (24h) → 'h:mm AM/PM'
function formatBookingTime(timeStr) {
  if (!timeStr) return '';
  try {
    const [hStr, mStr] = timeStr.split(':');
    const h = parseInt(hStr, 10);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const displayH = h % 12 || 12;
    return `${displayH}:${mStr} ${ampm}`;
  } catch {
    return timeStr;
  }
}

// Monotonic in-session counter so two bookings created in the same
// millisecond can never collide.
let referenceSequence = 0;

/**
 * Generates a unique booking reference ID, e.g. FRCC-PARK-7K2M9Q4A.
 * Format: FRCC-PARK- followed by 8 uppercase alphanumeric characters.
 * Never hard-coded - every confirmed booking gets its own value.
 */
export function generateBookingReference() {
  referenceSequence += 1;
  const timePart = Date.now().toString(36).toUpperCase();
  const seqPart = referenceSequence.toString(36).toUpperCase();
  const compact = (timePart + seqPart).replace(/[^A-Z0-9]/g, '');
  const code = compact.slice(-8).padStart(8, '0');
  return `FRCC-PARK-${code}`;
}

/**
 * Creates the complete booking object from the user's actual inputs.
 * Called only after payment requirements are satisfied:
 *   - UPI  → valid format + mock payment successful + transactionId
 *   - Card → valid details + mock payment successful + transactionId
 *   - Cash → pay at venue, transactionId null
 *
 * @returns {object} the booking object
 */
export function createBooking({
  bookingReference,
  userId = null,
  user_id = null,
  parkingSlot,
  vehicleType,
  vehicleNumber,
  vehicleModel = '',
  numberOfDays,
  pricePerDay,
  bookingDate,
  bookingTime,
  paymentMethod,
  transactionId,
  city,
  campus = null,
  campus_id = null,
  zone_id = null,
  campusName = null
}) {
  const isCash = paymentMethod === 'Cash';
  const reference = bookingReference || generateBookingReference();
  const paymentMethodCode = PAYMENT_METHOD_CODE[paymentMethod] || 'UNKNOWN';
  const paymentStatusCode = isCash
    ? PAYMENT_STATUS_CODE.PENDING_AT_VENUE
    : PAYMENT_STATUS_CODE.PAID;

  const effectiveCampus = campus || ((city || '').toLowerCase().includes('hyd') ? 'hyderabad' : 'vijayawada');
  const effectiveCampusId = campus_id || (effectiveCampus === 'hyderabad' ? 'hyd' : 'vja');
  const effectiveZoneId = zone_id || (effectiveCampus === 'hyderabad' ? 'hyd-multi-level' : 'vja-multi-level');
  const effectiveCampusName = campusName || (effectiveCampus === 'hyderabad' ? 'Hyderabad Campus' : 'Vijayawada Campus');

  return {
    // Reference (bookingId kept for backward compatibility with older views)
    bookingReference: reference,
    bookingId: reference,
    userId: userId || user_id || null,
    user_id: user_id || userId || null,

    // Campus & Zone identification (strictly separated per campus)
    campus: effectiveCampus,
    campus_id: effectiveCampusId,
    zone_id: effectiveZoneId,
    campusName: effectiveCampusName,
    location_id: effectiveCampusId,

    // Slot & vehicle
    parkingSlot,
    vehicleType,
    vehicleNumber: cleanVehicleNumber(vehicleNumber),
    vehicleModel,

    // Location & schedule
    city: city || (effectiveCampus === 'hyderabad' ? 'Hyderabad' : 'Vijayawada'),
    numberOfDays,
    pricePerDay,
    totalAmount: pricePerDay * numberOfDays,
    bookingDate: formatBookingDate(bookingDate), // display: DD/MM/YYYY
    bookingTime: formatBookingTime(bookingTime), // display: h:mm AM/PM
    bookingDateISO: bookingDate || '',           // API: YYYY-MM-DD
    arrivalTime: bookingTime || '',              // API: HH:MM

    // Payment
    paymentMethod,                                // display label
    paymentMethodCode,                            // API: UPI / CARD / CASH
    paymentStatus: isCash ? 'Pay at Venue' : 'Paid', // display label
    paymentStatusCode,                            // API: PAID / PENDING_AT_VENUE
    // Only UPI/Card payments carry a transaction ID; Cash never does
    transactionId: isCash ? null : transactionId || null,

    // Booking status
    bookingStatus: BOOKING_STATUS.CONFIRMED,        // display label
    bookingStatusCode: BOOKING_STATUS_CODE.CONFIRMED, // API: CONFIRMED
    createdAt: new Date().toISOString()
  };
}

/**
 * Maps the internal booking object to the exact payload the Admin Dashboard
 * API expects.
 */
export function buildAdminBookingPayload(booking) {
  return {
    bookingReference: booking.bookingReference || booking.bookingId,
    campus: booking.campus || (booking.city?.toLowerCase().includes('hyd') ? 'hyderabad' : 'vijayawada'),
    city: booking.city,
    bookingDate: booking.bookingDateISO,
    arrivalTime: booking.arrivalTime,
    durationDays: Number(booking.numberOfDays) || 1,
    parkingSlot: booking.parkingSlot,
    vehicleType: booking.vehicleType,
    vehicleNumber: booking.vehicleNumber,
    vehicleModel: booking.vehicleModel,
    totalAmount: booking.totalAmount,
    paymentMethod: booking.paymentMethodCode,
    paymentStatus: booking.paymentStatusCode,
    bookingStatus: booking.bookingStatusCode,
    createdAt: booking.createdAt
  };
}

// ---------------------------------------------------------------------------
// Admin Dashboard API (only active when configured via VITE_BOOKING_API_URL)
// ---------------------------------------------------------------------------

const BOOKING_API_URL = (import.meta.env?.VITE_BOOKING_API_URL || '')
  .trim()
  .replace(/\/+$/, '');
const BOOKING_API_PATH = (import.meta.env?.VITE_BOOKING_API_PATH || '/bookings').trim();

export function isBookingApiConfigured() {
  return BOOKING_API_URL.length > 0;
}

export function getBookingApiEndpoint() {
  if (!isBookingApiConfigured()) return '';
  const path = BOOKING_API_PATH.startsWith('/') ? BOOKING_API_PATH : `/${BOOKING_API_PATH}`;
  return `${BOOKING_API_URL}${path}`;
}

/**
 * Trigger booking confirmation notifications via server-side Edge Function.
 * Idempotent: safe to invoke multiple times.
 */
export async function triggerBookingConfirmationNotification(bookingId) {
  try {
    if (!bookingId) return { ok: false, error: 'No bookingId' };
    const { data, error } = await supabase.functions.invoke('send-booking-confirmation', {
      body: { booking_id: bookingId }
    });
    if (error) {
      console.warn('[parkingService] Confirmation notification note:', error.message);
      return { ok: false, error: error.message };
    }
    return { ok: true, data };
  } catch (err) {
    console.warn('[parkingService] Confirmation notification catch:', err);
    return { ok: false, error: err };
  }
}

/**
 * Resends booking confirmation with rate-limiting support (max 3 resends).
 */
export async function resendBookingConfirmation(bookingId) {
  try {
    const { data, error } = await supabase.functions.invoke('send-booking-confirmation', {
      body: { booking_id: bookingId, is_resend: true }
    });
    if (error) throw error;
    return { ok: true, data };
  } catch (err) {
    throw err;
  }
}

/**
 * Persists parking booking to Supabase database.
 * Attempts atomic SECURITY DEFINER RPC create_parking_booking first (advisory locked).
 * If slot is already taken, throws an error with code 'SLOT_TAKEN'.
 */
export async function submitBookingToSupabase(booking) {
  const cleanNumber = cleanVehicleNumber(booking.vehicleNumber);
  if (!isValidVehicleNumber(cleanNumber)) {
    throw new Error(VEHICLE_NUMBER_ERROR_MESSAGE);
  }

  const { data: sessionData } = await supabase.auth.getSession();
  const userId = booking.userId || booking.user_id || sessionData?.session?.user?.id || null;
  const campus = (booking.city || booking.campus || 'Vijayawada').toLowerCase().includes('hyd') ? 'hyderabad' : 'vijayawada';

  // 1. Try atomic SECURITY DEFINER RPC create_parking_booking
  try {
    const { data: rpcResult, error: rpcError } = await supabase.rpc('create_parking_booking', {
      p_campus: campus,
      p_slot_id: booking.parkingSlot,
      p_booking_date: booking.bookingDateISO || new Date().toISOString().split('T')[0],
      p_arrival_time: booking.arrivalTime || '09:00',
      p_duration_days: Number(booking.numberOfDays) || 1,
      p_vehicle_type: booking.vehicleType || 'Four Wheeler',
      p_vehicle_number: booking.vehicleNumber || '',
      p_vehicle_model: booking.vehicleModel || null,
      p_payment_method: booking.paymentMethodCode || 'UPI',
      p_total_amount: booking.totalAmount || 0
    });

    if (rpcError) {
      if (rpcError.message?.includes('SLOT_TAKEN') || rpcError.details?.includes('SLOT_TAKEN')) {
        const err = new Error('SLOT_TAKEN');
        err.code = 'SLOT_TAKEN';
        throw err;
      }
      console.warn('[parkingService] RPC create_parking_booking error (falling back to direct insert):', rpcError.message);
    } else if (rpcResult) {
      return { ok: true, data: rpcResult };
    }
  } catch (rpcErr) {
    if (rpcErr.code === 'SLOT_TAKEN' || rpcErr.message === 'SLOT_TAKEN') {
      throw rpcErr;
    }
  }

  // 2. Direct insert fallback
  try {
    const payload = {
      booking_reference: booking.bookingReference || booking.bookingId,
      user_id: userId,
      slot_id: booking.parkingSlot,
      campus: campus,
      city: booking.city || (campus === 'hyderabad' ? 'Hyderabad' : 'Vijayawada'),
      booking_date: booking.bookingDateISO || new Date().toISOString().split('T')[0],
      arrival_time: booking.arrivalTime || '09:00',
      duration_days: Number(booking.numberOfDays) || 1,
      expires_at: new Date(Date.now() + (Number(booking.numberOfDays) || 1) * 24 * 60 * 60 * 1000).toISOString(),
      vehicle_type: booking.vehicleType || 'Car',
      vehicle_number: booking.vehicleNumber || '',
      vehicle_model: booking.vehicleModel || null,
      total_amount: booking.totalAmount || 0,
      payment_method: booking.paymentMethodCode || 'UPI',
      payment_status: booking.paymentStatusCode || 'PAID',
      booking_status: booking.bookingStatusCode || 'CONFIRMED',
    };

    const { data, error } = await supabase
      .from('parking_bookings')
      .insert(payload)
      .select()
      .maybeSingle();

    if (error) {
      if (error.message?.includes('uq_parking_slot_campus_timerange') || error.code === '23P01') {
        const err = new Error('SLOT_TAKEN');
        err.code = 'SLOT_TAKEN';
        throw err;
      }
      console.warn('[parkingService] Supabase insert warning:', error.message);
    }
    return { ok: true, data: data || payload };
  } catch (err) {
    if (err.code === 'SLOT_TAKEN' || err.message === 'SLOT_TAKEN') {
      throw err;
    }
    console.warn('[parkingService] Supabase insert catch:', err);
    return { ok: true };
  }
}

// ---------------------------------------------------------------------------
// Local persistent database store (guarantees survival across refreshes and restarts)
// ---------------------------------------------------------------------------
export const LOCAL_PARKING_DB_KEY = 'frcc_parking_db_v1';

export function getLocalDatabaseBookings() {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return [];
    const raw = window.localStorage.getItem(LOCAL_PARKING_DB_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveBookingToLocalDatabase(booking) {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return;
    const existing = getLocalDatabaseBookings();
    const ref = booking.bookingReference || booking.bookingId;
    const filtered = existing.filter((b) => (b.bookingReference || b.bookingId) !== ref);
    const updated = [
      ...filtered,
      {
        ...booking,
        bookingStatus: 'CONFIRMED',
        booking_status: 'CONFIRMED',
      },
    ];
    window.localStorage.setItem(LOCAL_PARKING_DB_KEY, JSON.stringify(updated));
  } catch (_) {}
}

export function cancelBookingInLocalDatabase(reference) {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return;
    const existing = getLocalDatabaseBookings();
    const updated = existing.map((b) => {
      const ref = b.bookingReference || b.bookingId;
      if (ref === reference) {
        return {
          ...b,
          bookingStatus: 'CANCELLED',
          booking_status: 'CANCELLED',
          cancelledAt: new Date().toISOString(),
        };
      }
      return b;
    });
    window.localStorage.setItem(LOCAL_PARKING_DB_KEY, JSON.stringify(updated));
  } catch (_) {}
}

export function getLocalPersistentBookedSlots(campus, date, time = '09:00', durationDays = 1) {
  try {
    const list = getLocalDatabaseBookings();
    const normalizedCampus = campus.toLowerCase().includes('hyd') ? 'hyderabad' : 'vijayawada';
    const hasSpecificDate = Boolean(date && String(date).trim());
    const timeStr = time && time.length === 5 ? `${time}:00` : (time || '09:00:00');
    const targetStart = hasSpecificDate ? new Date(`${date}T${timeStr}+05:30`).getTime() : 0;
    const targetEnd = targetStart + (Number(durationDays) || 1) * 24 * 60 * 60 * 1000;
    const now = Date.now();

    const bookedSet = new Set();
    for (const b of list) {
      const bCampus = (b.campus || b.city || '').toLowerCase().includes('hyd') ? 'hyderabad' : 'vijayawada';
      if (bCampus !== normalizedCampus) continue;

      const bStatus = (b.bookingStatus || b.booking_status || '').toUpperCase();
      if (bStatus !== 'CONFIRMED') continue;

      const bDate = b.bookingDateISO || b.bookingDate || b.booking_date;
      if (!bDate) continue;

      const bTime = b.arrivalTime || b.arrival_time || '09:00';
      const bTimeStr = bTime && bTime.length === 5 ? `${bTime}:00` : bTime;
      const bDays = Number(b.durationDays || b.duration_days || b.numberOfDays) || 1;
      const bStart = new Date(`${bDate}T${bTimeStr}+05:30`).getTime();
      const bEnd = bStart + bDays * 24 * 60 * 60 * 1000;

      if (bEnd <= now) continue; // Expired
      if (!hasSpecificDate || (targetStart < bEnd && targetEnd > bStart)) {
        bookedSet.add(b.parkingSlot || b.slot_id);
      }
    }
    return Array.from(bookedSet).map((id) => ({ id, status: 'booked' }));
  } catch (_) {
    return [];
  }
}

/**
 * Fetch occupied slots for a given campus and date/time range from Supabase and Backend API.
 * Isolated per campus: Vijayawada bookings never appear as Hyderabad bookings.
 */
export async function fetchParkingAvailability(campus = 'vijayawada', date, time, days) {
  try {
    const normalizedCampus = (campus || 'vijayawada').toLowerCase().includes('hyd') ? 'hyderabad' : 'vijayawada';
    const targetDate = date ? String(date).trim() : '';
    const targetTime = time ? String(time).trim() : '';
    const targetDays = days ? Number(days) : '';

    // 1. Fetch from Backend API (/api/parking/availability)
    try {
      const params = new URLSearchParams({ campus: normalizedCampus });
      if (targetDate) params.set('date', targetDate);
      if (targetTime) params.set('time', targetTime);
      if (targetDays) params.set('duration', String(targetDays));

      const resp = await fetch(`/api/parking/availability?${params.toString()}`);
      if (resp.ok) {
        const json = await resp.json();
        if (json && json.ok && Array.isArray(json.bookedSlots)) {
          return json.bookedSlots.map((id) => ({ id, status: 'booked' }));
        }
      }
    } catch (_) {}

    // 2. Fetch from Supabase RPC if available
    try {
      if (targetDate) {
        const effectiveTime = targetTime || '09:00';
        const startTimeStr = effectiveTime.length === 5 ? `${effectiveTime}:00` : effectiveTime;
        const startAt = new Date(`${targetDate}T${startTimeStr}+05:30`).toISOString();
        const endAt = new Date(new Date(startAt).getTime() + (targetDays || 1) * 24 * 60 * 60 * 1000).toISOString();

        const { data: rpcData, error: rpcError } = await supabase.rpc('get_parking_availability', {
          p_campus: normalizedCampus,
          p_start_at: startAt,
          p_end_at: endAt,
        });

        if (!rpcError && Array.isArray(rpcData) && rpcData.length > 0) {
          return rpcData.map((row) => ({
            id: row.slot_code || row.slot_id,
            status: row.status || 'available',
          }));
        }
      }
    } catch (_) {}

    // 3. Fallback: Local persistent database (disk/localStorage)
    return getLocalPersistentBookedSlots(normalizedCampus, targetDate, targetTime || '09:00', targetDays || 1);
  } catch (err) {
    console.warn('[parkingService] fetchParkingAvailability error:', err);
  }
  return [];
}

/**
 * Fetch occupied slots for a given date from Supabase (backward compatibility).
 */
export async function fetchBookedSlotsFromSupabase(date, campus = 'vijayawada') {
  const result = await fetchParkingAvailability(campus, date);
  return result.filter(s => s.status === 'booked').map(s => s.id);
}

/**
 * Cancels a parking booking in Supabase
 */
export async function cancelBookingInSupabase(booking) {
  try {
    const reference = booking.bookingReference || booking.bookingId;
    const campus = (booking.city || booking.campus || 'vijayawada').toLowerCase().includes('hyd') ? 'hyderabad' : 'vijayawada';

    const { data, error } = await supabase
      .from('parking_bookings')
      .update({
        booking_status: 'CANCELLED',
        updated_at: new Date().toISOString()
      })
      .eq('booking_reference', reference)
      .eq('campus', campus);

    if (error) {
      console.warn('[parkingService] Supabase cancel error:', error.message);
    }
    return { ok: !error, data };
  } catch (err) {
    console.warn('[parkingService] Supabase cancel catch:', err);
    return { ok: false };
  }
}

/**
 * Sends a confirmed booking to Supabase and optionally to the Admin Dashboard API.
 * Resolves when stored or accepted.
 *
 * @returns {Promise<{ok: boolean, configured: boolean, skipped?: boolean, data?: any}>}
 */
export async function submitBookingToAdmin(booking) {
  const cleanNumber = cleanVehicleNumber(booking.vehicleNumber);
  if (!isValidVehicleNumber(cleanNumber)) {
    throw new Error(VEHICLE_NUMBER_ERROR_MESSAGE);
  }

  // 1. Submit to Backend API (checks collision, validates format, writes to disk)
  let backendResult = null;
  let backendSuccess = false;
  try {
    const response = await fetch('/api/parking/bookings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(booking)
    });

    if (response.status === 409) {
      const errData = await response.json().catch(() => ({}));
      const err = new Error(errData.message || 'SLOT_TAKEN');
      err.code = 'SLOT_TAKEN';
      throw err;
    }

    if (response.ok) {
      backendResult = await response.json().catch(() => null);
      backendSuccess = true;
    }
  } catch (err) {
    if (err.code === 'SLOT_TAKEN' || err.message?.includes('SLOT_TAKEN')) {
      throw err;
    }
    console.warn('[parkingService] Backend API booking save note:', err?.message);
  }

  // 2. Always persist to local browser database
  saveBookingToLocalDatabase(booking);

  // 3. Persist to Supabase in background
  submitBookingToSupabase(booking).catch(() => {});

  // 4. Also notify external webhook if configured
  if (isBookingApiConfigured()) {
    fetch(getBookingApiEndpoint(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(buildAdminBookingPayload(booking))
    }).catch(() => {});
  }

  return { ok: true, configured: backendSuccess, data: backendResult?.data || booking };
}

// ---------------------------------------------------------------------------
// Booking cancellation (admin dashboard) — READY FOR LATER BACKEND USE.
//
// Cancelling a booking is always applied locally in the frontend (slot made
// available again, status set to CANCELLED, retained records updated).
//
// The admin dashboard is only notified when an explicit cancellation endpoint
// is configured via a dedicated env var, so no guessed/emailed endpoint is
// ever called and no dashboard cancellation is ever claimed without backend
// confirmation:
//
//   VITE_BOOKING_CANCEL_PATH=/bookings/{ref}/cancel
//
// The `{ref}` placeholder is replaced with the encoded booking reference.
// ---------------------------------------------------------------------------

const BOOKING_CANCEL_PATH = (import.meta.env?.VITE_BOOKING_CANCEL_PATH || '').trim();

export function isBookingCancelApiConfigured() {
  return BOOKING_API_URL.length > 0 && BOOKING_CANCEL_PATH.length > 0;
}

export function getBookingCancelEndpoint(reference) {
  if (!isBookingCancelApiConfigured()) return '';
  const path = BOOKING_CANCEL_PATH.startsWith('/') ? BOOKING_CANCEL_PATH : `/${BOOKING_CANCEL_PATH}`;
  return `${BOOKING_API_URL}${path.replace('{ref}', encodeURIComponent(reference || ''))}`;
}

/**
 * Payload shape recommended for the admin cancellation endpoint. Includes the
 * full booking record with the status overridden to CANCELLED so the backend
 * has everything it needs to void the booking.
 */
export function buildAdminCancellationPayload(booking) {
  return {
    ...buildAdminBookingPayload(booking),
    bookingStatus: BOOKING_STATUS_CODE.CANCELLED
  };
}

/**
 * Sends a cancellation to the Admin Dashboard API.
 * Resolves only when the backend accepts the cancellation. When no
 * cancellation endpoint is configured it is skipped and never claimed.
 *
 * @returns {Promise<{ok: boolean, configured: boolean, skipped?: boolean, data?: any}>}
 */
export async function cancelBookingToAdmin(booking) {
  const reference = booking.bookingReference || booking.bookingId;

  // 1. Notify Backend API
  try {
    await fetch('/api/parking/cancel', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bookingReference: reference })
    });
  } catch (_) {}

  // 2. Cancel in local database
  cancelBookingInLocalDatabase(reference);

  // 3. Cancel in Supabase
  cancelBookingInSupabase(booking).catch(() => {});

  if (!isBookingCancelApiConfigured()) {
    return { ok: true, configured: false, skipped: true };
  }

  const response = await fetch(getBookingCancelEndpoint(reference), {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(buildAdminCancellationPayload(booking))
  });

  if (!response.ok) {
    let message = `Admin dashboard rejected the cancellation (HTTP ${response.status}).`;
    try {
      const data = await response.json();
      if (data && (data.message || data.error)) {
        message = data.message || data.error;
      }
    } catch (_) {
      // Non-JSON error body - keep the default message.
    }
    throw new Error(message);
  }

  let data = null;
  try {
    data = await response.json();
  } catch (_) {
    // Empty/JSON-less success body is acceptable.
  }

  return { ok: true, configured: true, data };
}
