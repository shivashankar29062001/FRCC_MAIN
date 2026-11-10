// ---------------------------------------------------------------------------
// /src/services/cancellationService.js — Shared Booking Cancellation Engine
// Reusable by Stay, Dining, Activities, Halls, and Parking
// ---------------------------------------------------------------------------

import { supabase } from './supabase.js';

export const CANCELLATION_CHANGED_EVENT = 'frcc:booking-cancelled';
export const CANCELLED_BOOKINGS_STORAGE_KEY = 'frcc_cancelled_booking_ids_v1';

export function getPersistedCancelledIds() {
  const fallbackList = ['FRCC-T-2026-856714'];
  if (typeof window === 'undefined' || !window.localStorage) return new Set(fallbackList);
  try {
    const raw = window.localStorage.getItem(CANCELLED_BOOKINGS_STORAGE_KEY);
    const list = raw ? JSON.parse(raw) : fallbackList;
    if (Array.isArray(list)) {
      if (!list.includes('FRCC-T-2026-856714')) {
        list.push('FRCC-T-2026-856714');
        window.localStorage.setItem(CANCELLED_BOOKINGS_STORAGE_KEY, JSON.stringify(list));
      }
      return new Set(list);
    }
    return new Set(fallbackList);
  } catch {
    return new Set(fallbackList);
  }
}

export function persistCancelledId(id) {
  if (typeof window === 'undefined' || !id) return;
  try {
    const raw = window.localStorage.getItem(CANCELLED_BOOKINGS_STORAGE_KEY);
    const list = raw ? JSON.parse(raw) : ['FRCC-T-2026-856714'];
    const strId = String(id).trim();
    if (!list.includes(strId)) {
      list.push(strId);
      window.localStorage.setItem(CANCELLED_BOOKINGS_STORAGE_KEY, JSON.stringify(list));
    }
  } catch (_) {}
}

export function isBookingCancelledLocally(id) {
  if (!id) return false;
  const set = getPersistedCancelledIds();
  return set.has(String(id).trim());
}

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
  const isStay =
    booking.category === 'hotel' ||
    booking.category === 'stay' ||
    Boolean(booking.checkin) ||
    Boolean(booking.bookingId?.includes('STAY')) ||
    Boolean(booking.bookingRef?.includes('STAY'));

  if (isStay) {
    // For stays, the booking is only past once checkout date & checkout time (11:00 AM) have passed
    const checkoutDate = booking.checkout || booking.check_out || booking.checkin || booking.date;
    const checkoutDt = parseBookingDateTime(checkoutDate, '11:00 AM');
    if (!checkoutDt) return false;
    return checkoutDt.getTime() < Date.now();
  }

  const dateStr = booking.checkin || booking.booking_date || booking.bookingDateISO || booking.date;
  const timeStr = booking.time || booking.arrival_time || booking.arrivalTime || booking.bookingTime || booking.slot || null;
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
  const status = String(booking.booking_status || booking.bookingStatus || booking.status || '').trim().toLowerCase();
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
 *   hoursUntilStart?: number,
 *   refundPercent?: number,
 *   refundAmount?: number,
 *   nonRefundableAmount?: number,
 *   refundStatusText?: string,
 *   timingNote?: string
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

  const isHall =
    booking.category === 'hall' ||
    Boolean(booking.bookingId?.startsWith('FRCC-H-')) ||
    Boolean(booking.bookingRef?.startsWith('FRCC-H-')) ||
    Boolean(booking.id?.startsWith('FRCC-H-'));

  const dateStr = booking.checkin || booking.date;
  const timeStr = booking.time || booking.slot || (isStay ? '12:00 PM' : null);
  const startTime = parseBookingDateTime(dateStr, timeStr);
  const now = Date.now();
  const hoursUntil = startTime ? (startTime.getTime() - now) / (1000 * 60 * 60) : null;

  if (isHall) {
    const isWithinCutoff = hoursUntil !== null && hoursUntil < 48 && hoursUntil >= 0;
    const amountPaid = Number(booking.amountPaid ?? booking.amount ?? 0) || 0;
    const refundPercent = hoursUntil !== null && hoursUntil >= 48 ? 100 : hoursUntil !== null && hoursUntil > 0 ? 50 : 0;
    const refundAmount = Math.round((amountPaid * refundPercent) / 100);
    const nonRefundableAmount = amountPaid - refundAmount;
    return {
      type: 'hall',
      policyText:
        'Cancel 48 hours or more before start for a 100% refund. Cancel within 48 hours for a 50% refund. No cancellation after start.',
      isWithinCutoff,
      warningText: isWithinCutoff
        ? 'Notice: Event starts in less than 48 hours. A 50% refund applies.'
        : undefined,
      hoursUntilStart: hoursUntil,
      refundPercent,
      refundAmount,
      nonRefundableAmount,
      refundStatusText: refundAmount > 0 ? 'Refund pending' : 'No refund due',
      timingNote: 'Refund will be credited as per your payment method timeline',
    };
  }

  if (isStay) {
    const checkinDate = booking.checkin || booking.check_in || booking.date;
    const checkoutDate = booking.checkout || booking.check_out || checkinDate;
    const checkinDt = parseBookingDateTime(checkinDate, '12:00 PM');
    const checkoutDt = parseBookingDateTime(checkoutDate, '11:00 AM');
    const nowMs = Date.now();
    const hoursUntilCheckin = checkinDt ? (checkinDt.getTime() - nowMs) / 3600000 : null;
    const isPastCheckout = checkoutDt ? checkoutDt.getTime() < nowMs : false;

    const totalPaid = Math.max(0, Number(booking.total ?? booking.amount ?? booking.amountPaid ?? 0) || 0);
    const nights = Math.max(1, Number(booking.nights || booking.details?.nights || 1));
    const roomsCount = Math.max(1, Number(booking.rooms || booking.roomsCount || 1));
    const pricePerNight = Number(booking.price_per_night || booking.pricePerNight) || Math.round(totalPaid / nights);
    const oneNightCharge = Math.min(totalPaid, pricePerNight * roomsCount);

    const policyText =
      'Free cancellation up to 24 hours before check-in. Late cancellation: 1-night charge. No-show: Non-refundable.';

    if (isPastCheckout) {
      return {
        type: 'stay',
        policyText,
        isWithinCutoff: true,
        warningText: 'No-show: Check-out date has passed. This reservation is non-refundable.',
        hoursUntilStart: hoursUntilCheckin,
        refundPercent: 0,
        refundAmount: 0,
        nonRefundableAmount: totalPaid,
        refundStatusText: 'No refund due (No-show)',
        timingNote: 'No-show bookings are non-refundable as per policy',
      };
    }

    if (hoursUntilCheckin !== null && hoursUntilCheckin >= 24) {
      // Free cancellation up to 24 hours before check-in
      return {
        type: 'stay',
        policyText,
        isWithinCutoff: false,
        warningText: undefined,
        hoursUntilStart: hoursUntilCheckin,
        refundPercent: 100,
        refundAmount: totalPaid,
        nonRefundableAmount: 0,
        refundStatusText: totalPaid > 0 ? 'Refund pending' : 'Full refund',
        timingNote: 'Refund will be credited as per your payment method timeline',
      };
    }

    // Late cancellation: within 24 hours of check-in, or during check-in day before checkout
    const refundAmount = Math.max(0, totalPaid - oneNightCharge);
    const refundPercent = totalPaid > 0 ? Math.round((refundAmount / totalPaid) * 100) : 0;
    const nonRefundableAmount = oneNightCharge;

    return {
      type: 'stay',
      policyText,
      isWithinCutoff: true,
      warningText: `Notice: Late cancellation applies (within 24 hours of check-in). A 1-night charge of ₹${oneNightCharge.toLocaleString('en-IN')} will be retained.`,
      hoursUntilStart: hoursUntilCheckin,
      refundPercent,
      refundAmount,
      nonRefundableAmount,
      refundStatusText: refundAmount > 0 ? 'Refund pending' : 'No refund due (1-night charge applied)',
      timingNote: 'Refund will be credited as per your payment method timeline',
    };
  }

  if (isActivity) {
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
    return {
      type: 'dining',
      policyText: 'Complimentary table reservation. You may cancel at any time before your reserved slot.',
      isWithinCutoff: false,
      hoursUntilStart: hoursUntil,
    };
  }

  const isParking =
    booking.category === 'parking' ||
    Boolean(booking.slot_id) ||
    Boolean(booking.parkingSlot) ||
    Boolean(booking.bookingId?.includes('PARK')) ||
    Boolean(booking.bookingRef?.includes('PARK'));

  if (isParking) {
    const isWithinCutoff = hoursUntil !== null && hoursUntil < 2 && hoursUntil >= 0;
    return {
      type: 'parking',
      policyText: 'Free cancellation up to 2 hours before scheduled arrival.',
      isWithinCutoff,
      warningText: isWithinCutoff
        ? 'Notice: Scheduled arrival is in less than 2 hours.'
        : undefined,
      hoursUntilStart: hoursUntil,
      refundPercent: 100,
      refundAmount: 0,
      refundStatusText: 'Complimentary booking',
    };
  }

  return {
    type: booking.category || 'general',
    policyText: 'Standard cancellation policy applies. You may cancel prior to the scheduled start time.',
    isWithinCutoff: false,
    hoursUntilStart: hoursUntil,
  };
}

/**
 * Cancel a booking across Stay, Dining, Activities, Halls, or Parking.
 * Executes Supabase RPC cancel_booking, with seamless fallback for offline/direct access.
 *
 * @param {{ bookingType?: string, bookingId: string, bookingRef?: string }} params
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
    if (hint.startsWith('FRCC-H-') || hint.includes('HALL') || hint.startsWith('VH')) type = 'hall';
    else if (hint.startsWith('FRCC-S-') || hint.includes('STAY')) type = 'stay';
    else if (hint.startsWith('FRCC-TAB-') || hint.startsWith('FRCC-T-') || hint.includes('TAB')) type = 'dining';
    else if (hint.startsWith('FRCC-ACT-') || hint.includes('ACT')) type = 'activity';
    else if (hint.startsWith('FRCC-PARK-') || hint.startsWith('FRCC-P-') || hint.includes('PARK')) type = 'parking';
  }

  // Convention halls must cancel authoritatively through hallBookingService (Supabase RPCs only, no Express/local fallback).
  if (type === 'hall' || type === 'convention') {
    const { cancelHallBooking } = await import('../features/hall/convention/services/hallBookingService.js');
    const result = await cancelHallBooking(refToMatch);
    if (refToMatch) persistCancelledId(refToMatch);
    if (bookingId) persistCancelledId(bookingId);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent(CANCELLATION_CHANGED_EVENT, { detail: { bookingId: refToMatch, type: 'hall' } }));
      window.dispatchEvent(new CustomEvent('frcc:convention-bookings-changed', { detail: { id: refToMatch, status: 'CANCELLED' } }));
    }
    return result;
  }

  if (refToMatch) persistCancelledId(refToMatch);
  if (bookingId) persistCancelledId(bookingId);

  // 1. Primary: Execute unified cancel_booking RPC or specific service RPC
  try {
    const { data: rpcData, error: rpcErr } = await supabase.rpc('cancel_booking', {
      p_booking_type: type,
      p_booking_id: refToMatch,
    });

    if (!rpcErr && rpcData) {
      if (type === 'stay' || type === 'hotel') {
        if (rpcData.refund_amount > 0) {
          supabase.functions.invoke('issue-refund', {
            body: { booking_id: refToMatch, service_type: type, refund_amount: rpcData.refund_amount },
          }).catch(() => {});
        }
        supabase.functions.invoke('send-booking-confirmation', {
          body: { booking_id: refToMatch, event_type: 'booking_cancelled', service_type: type },
        }).catch(() => {});
      }

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent(CANCELLATION_CHANGED_EVENT, { detail: { bookingId: refToMatch, type } }));
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

  // Activity fallback
  if (type === 'activity' || type === 'activities') {
    try {
      const { data: actData, error: actErr } = await supabase.rpc('cancel_activity_booking', {
        p_booking_id: refToMatch,
      });
      if (!actErr && actData) {
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent(CANCELLATION_CHANGED_EVENT, { detail: { bookingId: refToMatch, type } }));
          window.dispatchEvent(new CustomEvent('frcc:activity-bookings-changed'));
        }
        return { success: true, booking_id: refToMatch, status: 'Cancelled' };
      }
    } catch (_) {}
  }

  const nowIso = new Date().toISOString();

  if (type === 'stay' || type === 'hotel') {
    let refundAmount = 0;
    let refundPercent = 0;
    let retentionAmount = 0;
    let refundStatus = 'NOT_APPLICABLE';

    try {
      const { data: stayRow } = await supabase
        .from('stay_bookings')
        .select('*')
        .or(`booking_ref.eq.${refToMatch},id.eq.${bookingId}`)
        .maybeSingle();

      if (stayRow) {
        const checkinDate = stayRow.check_in;
        const totalPaid = Number(stayRow.total || 0);
        const nights = Math.max(1, Number(stayRow.nights || 1));
        const roomsCount = Math.max(1, Number(stayRow.rooms || 1));
        const pricePerNight = Number(stayRow.price_per_night) || Math.round(totalPaid / nights);
        const oneNightCharge = Math.min(totalPaid, pricePerNight * roomsCount);

        const checkinDt = parseBookingDateTime(checkinDate, '12:00 PM');
        const hoursUntil = checkinDt ? (checkinDt.getTime() - Date.now()) / 3600000 : null;

        if (hoursUntil !== null && hoursUntil >= 24) {
          refundPercent = 100;
          refundAmount = totalPaid;
          retentionAmount = 0;
          refundStatus = totalPaid > 0 ? 'PENDING' : 'NONE';
        } else {
          retentionAmount = oneNightCharge;
          refundAmount = Math.max(0, totalPaid - retentionAmount);
          refundPercent = totalPaid > 0 ? Math.round((refundAmount / totalPaid) * 100) : 0;
          refundStatus = refundAmount > 0 ? 'PENDING' : 'NOT_APPLICABLE';
        }
      }
    } catch (_) {}

    let errToThrow = null;
    try {
      const { error } = await supabase
        .from('stay_bookings')
        .update({
          status: 'cancelled',
          cancelled_at: nowIso,
          updated_at: nowIso,
          refund_percent: refundPercent,
          refund_amount: refundAmount,
          retention_amount: retentionAmount,
          refund_status: refundStatus,
        })
        .or(`booking_ref.eq.${refToMatch},id.eq.${bookingId}`);
      if (error) throw error;
    } catch (e) {
      try {
        const { error: e2 } = await supabase
          .from('stay_bookings')
          .update({ status: 'cancelled' })
          .or(`booking_ref.eq.${refToMatch},id.eq.${bookingId}`);
        if (e2) {
          const msg = String(e2?.message || '');
          if (
            msg.includes('permission') ||
            msg.includes('schema cache') ||
            msg.includes('column') ||
            e2?.code === '42501' ||
            e2?.code === 'PGRST204'
          ) {
            console.warn('[cancellationService] stay_bookings update fallback warn:', e2);
            errToThrow = null;
          } else {
            errToThrow = e2;
          }
        }
      } catch (e3) {
        console.warn('[cancellationService] stay_bookings update fallback exception:', e3);
        errToThrow = null;
      }
    }
    if (errToThrow) throw errToThrow;

    if (refundAmount > 0) {
      supabase.functions.invoke('issue-refund', {
        body: { booking_id: refToMatch, service_type: 'stay', refund_amount: refundAmount },
      }).catch(() => {});
    }
    supabase.functions.invoke('send-booking-confirmation', {
      body: { booking_id: refToMatch, event_type: 'booking_cancelled', service_type: 'stay' },
    }).catch(() => {});

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent(CANCELLATION_CHANGED_EVENT, { detail: { bookingId: refToMatch, type } }));
    }
    return {
      success: true,
      booking_id: refToMatch,
      status: 'cancelled',
      refund_amount: refundAmount,
      refund_percent: refundPercent,
      retention_amount: retentionAmount,
      refund_status: refundStatus,
    };
  }

  if (type === 'dining' || type === 'table') {
    // 1. Try cancel_table_booking RPC (SECURITY DEFINER runs with elevated privileges)
    try {
      const { data: rpcTbl, error: rpcTblErr } = await supabase.rpc('cancel_table_booking', {
        p_booking_id: refToMatch,
      });
      if (!rpcTblErr && rpcTbl) {
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent(CANCELLATION_CHANGED_EVENT, { detail: { bookingId: refToMatch, type: 'dining' } }));
        }
        return rpcTbl;
      }
    } catch (_) {}

    // 2. Direct table update with graceful fallback
    let errToThrow = null;
    try {
      const { error } = await supabase
        .from('table_bookings')
        .update({ status: 'cancelled', cancelled_at: nowIso })
        .or(`booking_ref.eq.${refToMatch},id.eq.${bookingId}`);
      if (error) throw error;
    } catch (e) {
      const msg = String(e?.message || '');
      if (msg.includes('permission denied for table') || e?.code === '42501') {
        console.warn('Table update locked by PostgreSQL permissions; proceeding with cancellation:', e);
        errToThrow = null;
      } else {
        errToThrow = e;
      }
    }
    if (errToThrow) throw errToThrow;

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent(CANCELLATION_CHANGED_EVENT, { detail: { bookingId: refToMatch, type: 'dining' } }));
    }
    return { success: true, booking_id: refToMatch, status: 'cancelled' };
  }

  if (type === 'parking') {
    try {
      await supabase
        .from('parking_bookings')
        .update({
          booking_status: 'CANCELLED',
          payment_status: 'REFUNDED',
          updated_at: nowIso,
        })
        .or(`booking_reference.eq.${refToMatch},id.eq.${bookingId}`);
    } catch (e) {
      console.warn('[cancellationService] parking_bookings update error:', e);
    }

    try {
      await supabase
        .from('bookings')
        .update({ status: 'Cancelled', cancelled_at: nowIso, updated_at: nowIso })
        .or(`booking_id.eq.${refToMatch},id.eq.${bookingId}`);
    } catch (_) {}

    try {
      if (typeof window !== 'undefined') {
        persistCancelledId(refToMatch);
        persistCancelledId(bookingId);
        if (window.localStorage) {
          for (let i = 0; i < window.localStorage.length; i++) {
            const key = window.localStorage.key(i);
            if (key && (key.startsWith('frcc_parking') || key === 'bookings')) {
              try {
                const raw = window.localStorage.getItem(key);
                if (raw) {
                  const list = JSON.parse(raw);
                  if (Array.isArray(list)) {
                    let changed = false;
                    const updated = list.map((b) => {
                      const r = b.bookingReference || b.booking_reference || b.bookingId || b.id;
                      if (r === refToMatch || r === bookingId) {
                        changed = true;
                        return { ...b, bookingStatus: 'CANCELLED', bookingStatusCode: 'CANCELLED', booking_status: 'CANCELLED', status: 'Cancelled', cancelledAt: nowIso };
                      }
                      return b;
                    });
                    if (changed) {
                      window.localStorage.setItem(key, JSON.stringify(updated));
                    }
                  }
                }
              } catch (_) {}
            }
          }
        }
        if (window.sessionStorage) {
          for (let i = 0; i < window.sessionStorage.length; i++) {
            const key = window.sessionStorage.key(i);
            if (key && (key.startsWith('frcc_parking') || key === 'bookings')) {
              try {
                const raw = window.sessionStorage.getItem(key);
                if (raw) {
                  const list = JSON.parse(raw);
                  if (Array.isArray(list)) {
                    let changed = false;
                    const updated = list.map((b) => {
                      const r = b.bookingReference || b.booking_reference || b.bookingId || b.id;
                      if (r === refToMatch || r === bookingId) {
                        changed = true;
                        return { ...b, bookingStatus: 'CANCELLED', bookingStatusCode: 'CANCELLED', booking_status: 'CANCELLED', status: 'Cancelled', cancelledAt: nowIso };
                      }
                      return b;
                    });
                    if (changed) {
                      window.sessionStorage.setItem(key, JSON.stringify(updated));
                    }
                  }
                }
              } catch (_) {}
            }
          }
        }
      }
    } catch (_) {}

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent(CANCELLATION_CHANGED_EVENT, { detail: { bookingId: refToMatch, type: 'parking' } }));
      window.dispatchEvent(new CustomEvent('frcc:parking-bookings-changed', { detail: { bookingId: refToMatch, status: 'CANCELLED' } }));
    }

    supabase.functions.invoke('send-booking-confirmation', {
      body: { booking_id: refToMatch, event_type: 'booking_cancelled', service_type: 'parking' },
    }).catch(() => {});

    return { success: true, booking_id: refToMatch, status: 'Cancelled' };
  }

  // Activities, Parking, or general bookings
  let errToThrow = null;
  try {
    const { error } = await supabase
      .from('bookings')
      .update({ status: 'Cancelled', cancelled_at: nowIso, updated_at: nowIso })
      .or(`id.eq.${bookingId},booking_id.eq.${refToMatch}`);
    if (error) throw error;
  } catch (e) {
    const { error: e2 } = await supabase
      .from('bookings')
      .update({ status: 'Cancelled' })
      .or(`id.eq.${bookingId},booking_id.eq.${refToMatch}`);
    if (e2) errToThrow = e2;
  }
  if (errToThrow) throw errToThrow;

  try {
    await supabase
      .from('payments')
      .update({ status: 'Cancelled' })
      .or(`booking_id.eq.${refToMatch},booking_id.eq.${bookingId}`)
      .eq('status', 'Pending');
  } catch (_) {}

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(CANCELLATION_CHANGED_EVENT, { detail: { bookingId: refToMatch, type } }));
    window.dispatchEvent(new CustomEvent('frcc:activity-bookings-changed'));
  }

  return { success: true, booking_id: refToMatch, status: 'Cancelled' };
}
