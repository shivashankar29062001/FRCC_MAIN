// ---------------------------------------------------------------------------
// /src/services/cancellationService.js — Shared Booking Cancellation Engine
// Reusable by Stay, Dining, Activities, Halls, and Parking
// ---------------------------------------------------------------------------

import { supabase } from './supabase.js';

export const CANCELLATION_CHANGED_EVENT = 'frcc:booking-cancelled';

/**
 * Robust date & time parser for bookings across all services.
 * Handles 'DD/MM/YYYY' and 'YYYY-MM-DD' plus 'hh:mm AM/PM' or 'HH:mm'.
 *
 * @param {string} dateStr
 * @param {string|null} timeStr
 * @returns {Date|null}
 */
export function parseBookingDateTime(dateStr, timeStr = null) {
  if (!dateStr) return null;
  const s = String(dateStr).trim();
  let year, month, day;

  if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(s)) {
    const parts = s.split('/');
    day = Number(parts[0]);
    month = Number(parts[1]) - 1;
    year = Number(parts[2]);
  } else if (/^\d{4}-\d{2}-\d{2}/.test(s)) {
    const parts = s.slice(0, 10).split('-');
    year = Number(parts[0]);
    month = Number(parts[1]) - 1;
    day = Number(parts[2]);
  } else {
    const d = new Date(s);
    if (isNaN(d.getTime())) return null;
    return d;
  }

  let hour = 12; // default midday for stay checkin
  let minute = 0;

  if (timeStr) {
    const t = String(timeStr).trim();
    const match12 = t.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
    const match24 = t.match(/(\d{1,2}):(\d{2})/);
    if (match12) {
      let h = Number(match12[1]);
      minute = Number(match12[2]);
      const ampm = match12[3].toUpperCase();
      if (ampm === 'PM' && h < 12) h += 12;
      if (ampm === 'AM' && h === 12) h = 0;
      hour = h;
    } else if (match24) {
      hour = Number(match24[1]);
      minute = Number(match24[2]);
    }
  }

  return new Date(year, month, day, hour, minute, 0);
}

/**
 * Returns true if the booking's checkin or start time is in the past.
 *
 * @param {object} booking
 * @returns {boolean}
 */
export function isBookingInPast(booking) {
  if (!booking) return false;
  const dateStr = booking.checkin || booking.date;
  const timeStr = booking.time || booking.slot || (booking.checkin ? '12:00 PM' : null);
  const dt = parseBookingDateTime(dateStr, timeStr);
  if (!dt) return false;
  return dt.getTime() < Date.now();
}

/**
 * Determines whether a booking is eligible for cancellation.
 * Past bookings and already cancelled/completed bookings cannot be cancelled.
 *
 * @param {object} booking
 * @returns {boolean}
 */
export function canCancelBooking(booking) {
  if (!booking) return false;
  const status = String(booking.status || '').trim().toLowerCase();
  if (['cancelled', 'completed', 'rejected', 'failed'].includes(status)) {
    return false;
  }
  return !isBookingInPast(booking);
}

/**
 * Computes cancellation policy details, warnings, and cutoff proximity.
 *
 * @param {object} booking
 * @returns {{
 *   type: string,
 *   policyText: string,
 *   isWithinCutoff: boolean,
 *   warningText?: string,
 *   hoursUntilStart?: number
 * }}
 */
export function getCancellationPolicyInfo(booking) {
  if (!booking) {
    return {
      type: 'general',
      policyText: 'Standard booking cancellation policy.',
      isWithinCutoff: false,
    };
  }

  const isDining =
    booking.category === 'dining' ||
    Boolean(booking.bookingId?.includes('TAB')) ||
    Boolean(booking.bookingRef?.includes('TAB'));

  const isStay =
    !isDining &&
    (booking.category === 'hotel' ||
      booking.category === 'stay' ||
      Boolean(booking.checkin) ||
      Boolean(booking.bookingId?.includes('STAY')) ||
      Boolean(booking.bookingRef?.includes('STAY')));

  const isActivity =
    !isDining &&
    !isStay &&
    (booking.category === 'activity' ||
      Boolean(booking.bookingId?.includes('ACT')) ||
      Boolean(booking.bookingRef?.includes('ACT')));

  const isHallOrParking =
    !isDining &&
    !isStay &&
    !isActivity &&
    (booking.category === 'hall' || booking.category === 'parking');

  const dateStr = booking.checkin || booking.date;
  const timeStr = booking.time || booking.slot || (isStay ? '12:00 PM' : null);
  const startTime = parseBookingDateTime(dateStr, timeStr);
  const now = Date.now();
  const hoursUntil = startTime ? (startTime.getTime() - now) / (1000 * 60 * 60) : null;

  if (isStay) {
    // Stay Policy: Free cancellation up to 48 hours before check-in. Within 48 hours: 1-night retention fee.
    const isWithinCutoff = hoursUntil !== null && hoursUntil < 48 && hoursUntil >= 0;
    return {
      type: 'stay',
      policyText:
        'Free cancellation up to 48 hours before check-in. Cancellations within 48 hours are subject to a 1-night retention fee.',
      isWithinCutoff,
      warningText: isWithinCutoff
        ? 'Notice: Check-in is in less than 48 hours. Per the Stay cancellation policy, this cancellation is subject to a 1-night retention fee.'
        : undefined,
      hoursUntilStart: hoursUntil,
    };
  }

  if (isActivity) {
    // Activity Policy: Free cancellation up to 6 hours before the slot.
    const isWithinCutoff = hoursUntil !== null && hoursUntil < 6 && hoursUntil >= 0;
    return {
      type: 'activity',
      policyText: 'Free cancellation up to 6 hours before your slot.',
      isWithinCutoff,
      warningText: isWithinCutoff
        ? 'Notice: Your slot starts in less than 6 hours. The free cancellation window has passed.'
        : undefined,
      hoursUntilStart: hoursUntil,
    };
  }

  if (isDining) {
    // Dining Policy: Complimentary reservation, cancel anytime prior to slot.
    return {
      type: 'dining',
      policyText: 'Complimentary table reservation. You may cancel at any time before your reserved slot.',
      isWithinCutoff: false,
      hoursUntilStart: hoursUntil,
    };
  }

  if (isHallOrParking) {
    return {
      type: booking.category || 'general',
      policyText: 'Standard cancellation policy applies. You may cancel prior to the scheduled start time.',
      isWithinCutoff: false,
      hoursUntilStart: hoursUntil,
    };
  }

  return {
    type: 'general',
    policyText: 'You may cancel this reservation before the scheduled date.',
    isWithinCutoff: false,
    hoursUntilStart: hoursUntil,
  };
}

/**
 * Cancel a booking across Stay, Dining, Activities, Halls, or Parking.
 * Executes Supabase RPC cancel_booking, with seamless fallback for offline/direct access.
 *
 * @param {{ bookingType?: string, bookingId: string }} params
 * @returns {Promise<object>}
 */
export async function cancelBooking({ bookingType = 'auto', bookingId, bookingRef = null }) {
  if (!bookingId) {
    throw new Error('Booking ID or reference is required.');
  }

  const { data: sessionData } = await supabase.auth.getSession();
  const currentUserId = sessionData?.session?.user?.id;

  if (!currentUserId) {
    throw new Error('You must be signed in to cancel a booking.');
  }

  const refToMatch = bookingRef || bookingId;

  // Normalize service type
  let type = String(bookingType || 'auto').toLowerCase();
  if (type === 'auto') {
    const hint = String(refToMatch || '');
    if (hint.startsWith('FRCC-S-') || hint.includes('STAY')) type = 'stay';
    else if (hint.startsWith('FRCC-TAB-') || hint.startsWith('FRCC-T-') || hint.includes('TAB')) type = 'dining';
    else if (hint.startsWith('FRCC-ACT-') || hint.includes('ACT')) type = 'activity';
  }

  // 1. Primary: Execute unified cancel_booking RPC or specific service RPC
  try {
    const { data: rpcData, error: rpcErr } = await supabase.rpc('cancel_booking', {
      p_booking_type: type,
      p_booking_id: bookingId,
    });

    if (!rpcErr && rpcData) {
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent(CANCELLATION_CHANGED_EVENT, { detail: { bookingId, type } }));
        window.dispatchEvent(new CustomEvent('frcc:activity-bookings-changed'));
      }
      return rpcData;
    }

    if (rpcErr && !rpcErr.message?.includes('function') && !rpcErr.message?.includes('does not exist')) {
      throw rpcErr;
    }
  } catch (err) {
    const msg = String(err?.message || err);
    if (msg.includes('INVALID_STATUS') || msg.includes('UNAUTHORIZED') || msg.includes('BOOKING_NOT_FOUND')) {
      throw err;
    }
  }

  // 1b. Try existing activity-specific RPC if activity
  if (type === 'activity' || type === 'activities') {
    try {
      const { data: actData, error: actErr } = await supabase.rpc('cancel_activity_booking', {
        p_booking_id: bookingId,
      });
      if (!actErr && actData) {
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent(CANCELLATION_CHANGED_EVENT, { detail: { bookingId, type } }));
          window.dispatchEvent(new CustomEvent('frcc:activity-bookings-changed'));
        }
        return { success: true, booking_id: bookingId, status: 'Cancelled' };
      }
    } catch (_) {}
  }

  // 2. Fallback: Direct table update resilient to missing cancelled_at column
  const nowIso = new Date().toISOString();

  if (type === 'stay' || type === 'hotel') {
    let errToThrow = null;
    try {
      const { error } = await supabase
        .from('stay_bookings')
        .update({ status: 'cancelled', cancelled_at: nowIso, updated_at: nowIso })
        .or(`booking_ref.eq.${bookingId},id.eq.${bookingId}`);
      if (error) throw error;
    } catch (e) {
      const { error: e2 } = await supabase
        .from('stay_bookings')
        .update({ status: 'cancelled' })
        .or(`booking_ref.eq.${bookingId},id.eq.${bookingId}`);
      if (e2) errToThrow = e2;
    }
    if (errToThrow) throw errToThrow;

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent(CANCELLATION_CHANGED_EVENT, { detail: { bookingId, type } }));
    }
    return { success: true, booking_id: bookingId, status: 'cancelled' };
  }

  if (type === 'dining' || type === 'table') {
    let errToThrow = null;
    try {
      const { error } = await supabase
        .from('table_bookings')
        .update({ status: 'cancelled', cancelled_at: nowIso })
        .or(`booking_ref.eq.${bookingId},id.eq.${bookingId}`);
      if (error) throw error;
    } catch (e) {
      const { error: e2 } = await supabase
        .from('table_bookings')
        .update({ status: 'cancelled' })
        .or(`booking_ref.eq.${bookingId},id.eq.${bookingId}`);
      if (e2) errToThrow = e2;
    }
    if (errToThrow) throw errToThrow;

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent(CANCELLATION_CHANGED_EVENT, { detail: { bookingId, type } }));
    }
    return { success: true, booking_id: bookingId, status: 'cancelled' };
  }

  // Activities, Halls, Parking, or general bookings
  let errToThrow = null;
  try {
    const { error } = await supabase
      .from('bookings')
      .update({ status: 'Cancelled', cancelled_at: nowIso, updated_at: nowIso })
      .or(`id.eq.${bookingId},booking_id.eq.${refToMatch}`);
    if (error) throw error;
  } catch (e) {
    // If cancelled_at or updated_at column is missing, update status only
    const { error: e2 } = await supabase
      .from('bookings')
      .update({ status: 'Cancelled' })
      .or(`id.eq.${bookingId},booking_id.eq.${refToMatch}`);
    if (e2) errToThrow = e2;
  }
  if (errToThrow) throw errToThrow;

  // Also update payment to cancelled if pending
  try {
    await supabase
      .from('payments')
      .update({ status: 'Cancelled' })
      .or(`booking_id.eq.${refToMatch},booking_id.eq.${bookingId}`)
      .eq('status', 'Pending');
  } catch (_) {}

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(CANCELLATION_CHANGED_EVENT, { detail: { bookingId, type } }));
    window.dispatchEvent(new CustomEvent('frcc:activity-bookings-changed'));
  }

  return { success: true, booking_id: bookingId, status: 'Cancelled' };
}

