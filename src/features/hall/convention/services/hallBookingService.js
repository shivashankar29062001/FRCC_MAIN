import { supabase } from '../../../../services/supabase.js';
import { getRefundMethod } from '../../../../../shared/refundPolicy.js';

/**
 * Custom error thrown by hall booking Supabase operations so UI steps can
 * distinguish missing migrations, slot conflicts, expired holds, and auth errors.
 */
export class HallBookingError extends Error {
  constructor(code, message, details = null) {
    super(message);
    this.name = 'HallBookingError';
    this.code = code || 'UNKNOWN_ERROR';
    this.details = details;
  }
}

const KNOWN_ERROR_PREFIXES = [
  'ALREADY_BOOKED_BY_YOU',
  'SLOT_TAKEN',
  'HOLD_EXPIRED',
  'UNAUTHORIZED',
  'EVENT_STARTED',
  'BOOKING_NOT_FOUND',
  'HALL_NOT_FOUND',
  'INVALID_GUESTS',
  'INVALID_MOBILE',
  'INVALID_EMAIL',
  'INVALID_DATE',
  'INVALID_TIME_RANGE',
  'INVALID_STATUS',
  'INVALID_INPUT',
];

const HALL_RPC_OR_TABLE_NAMES = [
  'get_hall_availability',
  'create_hall_booking',
  'confirm_hall_booking',
  'expire_hall_hold',
  'mark_hall_booking_paid',
  'cancel_hall_booking',
  'convention_bookings',
  'convention_halls',
];

function isMissingMigrationError(err) {
  const code = String(err?.code || '').toUpperCase();
  const msg = String(err?.message || '').toLowerCase();
  const hint = String(err?.hint || '').toLowerCase();
  const details = String(err?.details || '').toLowerCase();

  if (
    code === 'PGRST202' ||
    code === 'PGRST205' ||
    msg.includes('could not find the function') ||
    msg.includes('schema cache') ||
    hint.includes('schema cache') ||
    details.includes('schema cache')
  ) {
    return true;
  }

  const referencesHallObject = HALL_RPC_OR_TABLE_NAMES.some(
    (name) => msg.includes(name) || details.includes(name),
  );
  if ((code === '42883' || code === '42P01') && referencesHallObject) {
    return true;
  }

  return (
    referencesHallObject &&
    ((msg.includes('function') && msg.includes('does not exist')) ||
      (msg.includes('relation') && msg.includes('does not exist')))
  );
}

/**
 * Normalize Supabase / Postgres errors into structured HallBookingError instances.
 */
export function parseHallBookingError(err, fallbackMessage = 'Hall booking request failed.') {
  if (err instanceof HallBookingError) return err;

  if (isMissingMigrationError(err)) {
    return new HallBookingError(
      'MIGRATION_REQUIRED',
      'Hall booking database functions are not available yet in Supabase. Please run supabase/migrations/20261110030000_hall_bookings_hold_and_rpcs.sql (and then 20261110040000_convention_bookings_overlap_constraint.sql) in the Supabase SQL Editor.',
      err,
    );
  }

  const rawMsg = String(err?.message || fallbackMessage).trim();
  const pgCode = String(err?.code || '').toUpperCase();

  if (pgCode === '23P01') {
    return new HallBookingError('SLOT_TAKEN', 'This time was just booked by someone else', err);
  }

  for (const prefix of KNOWN_ERROR_PREFIXES) {
    if (rawMsg.startsWith(`${prefix}:`) || rawMsg.includes(prefix)) {
      const cleaned = rawMsg.replace(new RegExp(`^${prefix}:\\s*`), '').trim();
      if (prefix === 'SLOT_TAKEN') {
        return new HallBookingError('SLOT_TAKEN', 'This time was just booked by someone else', err);
      }
      if (prefix === 'ALREADY_BOOKED_BY_YOU') {
        return new HallBookingError(
          'ALREADY_BOOKED_BY_YOU',
          'You already have a booking for this hall at this date and time',
          err,
        );
      }
      if (prefix === 'HOLD_EXPIRED') {
        return new HallBookingError(
          'HOLD_EXPIRED',
          cleaned || 'Your 10-minute slot hold has expired. Please choose your hall, date and time again.',
          err,
        );
      }
      if (prefix === 'UNAUTHORIZED') {
        return new HallBookingError('UNAUTHORIZED', cleaned || 'Please sign in to continue with your hall booking.', err);
      }
      return new HallBookingError(prefix, cleaned || rawMsg, err);
    }
  }

  if (rawMsg.toLowerCase().includes('row-level security')) {
    return new HallBookingError(
      'UNAUTHORIZED',
      'Please sign in with your account to book or manage a convention hall.',
      err,
    );
  }

  return new HallBookingError('UNKNOWN_ERROR', rawMsg || fallbackMessage, err);
}

export function timeToMinutes(t) {
  if (!t) return NaN;
  const [h = 0, m = 0] = String(t).slice(0, 5).split(':').map(Number);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return NaN;
  return h * 60 + m;
}

/**
 * Half-open interval overlap check [start, end) so back-to-back bookings
 * such as 15:00-16:00 and 16:00-17:00 do NOT conflict.
 */
export function doIntervalsOverlap(startA, endA, startB, endB) {
  const a1 = timeToMinutes(startA);
  const a2 = timeToMinutes(endA);
  const b1 = timeToMinutes(startB);
  const b2 = timeToMinutes(endB);
  if ([a1, a2, b1, b2].some(Number.isNaN)) return false;
  return a1 < b2 && b1 < a2;
}

export function findOverlappingInterval(intervals, startTime, endTime) {
  if (!Array.isArray(intervals) || !startTime || !endTime) return null;
  // Prefer highlighting the user's own conflicting booking when multiple exist.
  const ordered = [...intervals].sort((a, b) => Number(Boolean(b?.isMine)) - Number(Boolean(a?.isMine)));
  return ordered.find((iv) => doIntervalsOverlap(startTime, endTime, iv.startTime, iv.endTime)) || null;
}

function normalizeTimeString(t) {
  const s = String(t || '').slice(0, 5);
  return s;
}

/**
 * Map a convention_bookings database row to the camelCase booking shape expected by UI components.
 */
export function mapHallBookingRow(row) {
  if (!row) return null;
  const rawStatus = String(row.status || '').toLowerCase();
  return {
    id: row.id,
    userId: row.user_id,
    hallId: row.hall_id,
    hallName: row.hall_name || row.hall_id || 'Convention Hall',
    venueName: row.venue_name || row.venue || 'FRCC Club',
    venue: row.venue_name || row.venue || 'FRCC Club',
    cityName: row.city_name || '',
    areaName: row.area_name || '',
    cooling: row.cooling || 'AC',
    date: row.date ? String(row.date).slice(0, 10) : '',
    startTime: normalizeTimeString(row.start_time),
    endTime: normalizeTimeString(row.end_time),
    startAt: row.start_at || null,
    endAt: row.end_at || null,
    guests: Number(row.guests || 0),
    eventType: row.event_type || '',
    eventDetails: row.event_details || '',
    organizerName: row.organizer_name || '',
    phone: row.phone || '',
    email: row.email || '',
    specialRequests: row.special_requests || '',
    hallCharge: Number(row.hall_charge || 0),
    gst: Number(row.gst || 0),
    convenienceFee: Number(row.convenience_fee || 0),
    amount: Number(row.amount || 0),
    amountPaid: Number(row.amount_paid ?? row.amount ?? 0),
    balanceDue: Number(row.balance_due || 0),
    paymentMethod: row.payment_method || '',
    paymentStatus: row.payment_status || '',
    paymentId: row.payment_id || '',
    transactionRef: row.transaction_ref || '',
    maskedInstrument: row.masked_instrument || '',
    emiTenure: row.emi_tenure || null,
    emiMonthlyAmount: row.emi_monthly_amount ? Number(row.emi_monthly_amount) : null,
    gstin: row.gstin || '',
    utrNumber: row.utr_number || '',
    status: rawStatus ? rawStatus.toUpperCase() : '',
    rawStatus,
    holdExpiresAt: row.hold_expires_at || null,
    cancelledAt: row.cancelled_at || null,
    refundPercent: row.refund_percent != null ? Number(row.refund_percent) : null,
    refundAmount: row.refund_amount != null ? Number(row.refund_amount) : null,
    refundStatus: row.refund_status || '',
    refundMethod: row.refund_method || (row.payment_method ? getRefundMethod(row.payment_method) : ''),
    createdAt: row.created_at || null,
    updatedAt: row.updated_at || null,
  };
}

async function requireSession() {
  const { data, error } = await supabase.auth.getSession();
  if (error || !data?.session?.user) {
    throw new HallBookingError('UNAUTHORIZED', 'Please sign in to book or manage a hall reservation.');
  }
  return data.session;
}

/**
 * Fetch booked non-PII time ranges for a single hall & date from Supabase SECURITY DEFINER RPC.
 */
export async function getHallAvailability(hallId, date) {
  if (!hallId || !date) return [];

  const { data, error } = await supabase.rpc('get_hall_availability', {
    p_hall_id: String(hallId),
    p_date: String(date),
  });

  if (error) {
    throw parseHallBookingError(error, 'Failed to check hall availability.');
  }

  return (Array.isArray(data) ? data : []).map((row) => ({
    startTime: normalizeTimeString(row.start_time),
    endTime: normalizeTimeString(row.end_time),
    status: String(row.status || 'confirmed').toLowerCase(),
    isMine: Boolean(row.is_mine),
  }));
}

/**
 * Reserve a hall slot with status = 'held' and hold_expires_at = now() + 10 minutes
 * BEFORE opening payment, using the authoritative server-side RPC.
 */
export async function createHallBooking(payload) {
  await requireSession();

  const { data, error } = await supabase.rpc('create_hall_booking', {
    p_hall_id: String(payload.hallId || ''),
    p_date: String(payload.date || ''),
    p_start_time: `${normalizeTimeString(payload.startTime)}:00`,
    p_end_time: `${normalizeTimeString(payload.endTime)}:00`,
    p_guests: Number(payload.guests || 0),
    p_event_type: String(payload.eventType || ''),
    p_organizer_name: String(payload.organizerName || ''),
    p_phone: String(payload.phone || ''),
    p_email: String(payload.email || ''),
    p_event_details: String(payload.eventDetails || ''),
    p_special_requests: String(payload.specialRequests || ''),
    p_venue_name: payload.venueName || payload.venue || null,
    p_city_name: payload.cityName || null,
    p_area_name: payload.areaName || null,
    p_cooling: payload.cooling || null,
    p_held_booking_id: payload.heldBookingId || null,
  });

  if (error) {
    throw parseHallBookingError(error, 'Could not reserve hall slot.');
  }

  const booking = mapHallBookingRow(data);
  if (!booking?.id) {
    throw new HallBookingError('UNKNOWN_ERROR', 'Unexpected empty response while holding hall slot.');
  }
  return booking;
}

/**
 * Send confirmation notification through the Supabase Edge Function (non-fatal if mail provider is disabled).
 */
export async function sendHallBookingConfirmation({ type = 'hall_confirmed', booking, refund } = {}) {
  if (!booking?.id) return { sent: false };
  try {
    const { data, error } = await supabase.functions.invoke('send-booking-confirmation', {
      body: {
        type,
        bookingId: booking.id,
        booking,
        refund,
      },
    });
    if (error) return { sent: false, error: error.message || 'Notification delivery unavailable.' };
    return { sent: true, data };
  } catch (err) {
    return { sent: false, error: err?.message || 'Notification delivery unavailable.' };
  }
}

/**
 * Confirm a held hall booking after payment succeeds.
 * TODO-RAZORPAY: Verify server-side Razorpay signature/paymentId before calling confirm_hall_booking
 * once live gateway keys are wired into Supabase Edge Functions.
 */
export async function confirmHallBooking({
  bookingId,
  paymentMethod = 'UPI_ID',
  amountPaid = null,
  transactionRef = null,
  maskedInstrument = null,
  emiTenure = null,
  emiMonthlyAmount = null,
  gstin = null,
  utrNumber = null,
}) {
  await requireSession();

  const { data, error } = await supabase.rpc('confirm_hall_booking', {
    p_booking_id: String(bookingId || ''),
    p_payment_method: String(paymentMethod || 'UPI_ID'),
    p_amount_paid: amountPaid != null ? Number(amountPaid) : null,
    p_transaction_ref: transactionRef ? String(transactionRef) : null,
    p_masked_instrument: maskedInstrument ? String(maskedInstrument) : null,
    p_emi_tenure: emiTenure != null ? Number(emiTenure) : null,
    p_emi_monthly_amount: emiMonthlyAmount != null ? Number(emiMonthlyAmount) : null,
    p_gstin: gstin ? String(gstin) : null,
    p_utr_number: utrNumber ? String(utrNumber) : null,
  });

  if (error) {
    throw parseHallBookingError(error, 'Failed to confirm hall booking.');
  }

  const booking = mapHallBookingRow(data);
  const notification = await sendHallBookingConfirmation({ type: 'hall_confirmed', booking });

  return {
    booking,
    delivery: notification,
  };
}

/**
 * Explicitly release a held booking when the 10-minute payment window expires or user abandons payment.
 */
export async function expireHallHold(bookingId) {
  if (!bookingId) return { ok: false };
  const { data: sessionData } = await supabase.auth.getSession();
  if (!sessionData?.session?.user) return { ok: false };

  const { data, error } = await supabase.rpc('expire_hall_hold', {
    p_booking_id: String(bookingId),
  });

  if (error) {
    if (isMissingMigrationError(error)) {
      throw parseHallBookingError(error);
    }
    return { ok: false };
  }
  return data || { ok: true };
}

/**
 * List the authenticated user's convention hall bookings directly from Supabase.
 * Uncommitted 'held' / 'expired' drafts are excluded by default.
 */
export async function getMyHallBookings(userIdOverride = null, { includeHolds = false } = {}) {
  let userId = userIdOverride;
  if (!userId) {
    const { data } = await supabase.auth.getSession();
    userId = data?.session?.user?.id || null;
  }
  if (!userId) return [];

  const { data, error } = await supabase
    .from('convention_bookings')
    .select('*')
    .eq('user_id', userId)
    .order('date', { ascending: false })
    .order('created_at', { ascending: false });

  if (error) {
    throw parseHallBookingError(error, 'Could not fetch hall bookings.');
  }

  const mapped = (Array.isArray(data) ? data : []).map(mapHallBookingRow);
  if (includeHolds) return mapped;
  return mapped.filter((b) => b.rawStatus !== 'held' && b.rawStatus !== 'expired');
}

/**
 * Fetch a single hall booking owned by the signed-in user via owner-only RLS.
 */
export async function getHallBookingById(bookingId) {
  if (!bookingId) return null;
  const session = await requireSession();

  const { data, error } = await supabase
    .from('convention_bookings')
    .select('*')
    .eq('id', String(bookingId))
    .eq('user_id', session.user.id)
    .maybeSingle();

  if (error) {
    throw parseHallBookingError(error, 'Could not load booking details.');
  }
  return mapHallBookingRow(data);
}

/**
 * Cancel a hall booking via Supabase cancel_hall_booking RPC, trigger refund and notification Edge Functions.
 */
export async function cancelHallBooking(bookingId) {
  await requireSession();

  const { data: rpcData, error } = await supabase.rpc('cancel_hall_booking', {
    p_booking_id: String(bookingId || ''),
  });

  if (error) {
    throw parseHallBookingError(error, 'Could not cancel hall booking.');
  }

  if (!rpcData || !rpcData.success) {
    throw new HallBookingError('UNKNOWN_ERROR', rpcData?.message || 'Hall cancellation failed.');
  }

  // Trigger Supabase refund and notification Edge Functions (non-blocking if mail/gateway is in test mode)
  // TODO-RAZORPAY: Reconcile asynchronous refund webhook status once live Razorpay keys are configured.
  const refundAmount = Number(rpcData.refund_amount || 0);
  if (refundAmount > 0) {
    supabase.functions
      .invoke('issue-refund', {
        body: {
          bookingType: 'hall',
          bookingId: rpcData.booking_id || bookingId,
          amount: refundAmount,
          refundPercent: rpcData.refund_percent,
        },
      })
      .catch(() => {});
  }

  supabase.functions
    .invoke('send-booking-confirmation', {
      body: {
        type: 'hall_cancelled',
        bookingId: rpcData.booking_id || bookingId,
        refundAmount,
        refundPercent: rpcData.refund_percent,
      },
    })
    .catch(() => {});

  let booking = null;
  try {
    booking = await getHallBookingById(rpcData.booking_id || bookingId);
  } catch {
    booking = null;
  }

  const refund = {
    refundPercent: Number(rpcData.refund_percent ?? 0),
    refundAmount,
    refundStatus: rpcData.refund_status || 'PENDING',
    refundStatusText: rpcData.refund_status_text || '',
    refundMethod: rpcData.refund_timing_note || getRefundMethod(booking?.paymentMethod),
    hoursUntilStart: rpcData.hours_until_start,
  };

  return {
    ...rpcData,
    ok: true,
    booking,
    refund,
  };
}

/**
 * Mark an offline-verified hall booking (bank transfer / corporate invoice) as PAID via Supabase RPC.
 */
export async function markHallBookingPaid(bookingId) {
  await requireSession();

  const { data, error } = await supabase.rpc('mark_hall_booking_paid', {
    p_booking_id: String(bookingId || ''),
  });

  if (error) {
    throw parseHallBookingError(error, 'Could not update payment status.');
  }

  return mapHallBookingRow(data);
}

/**
 * Verify UPI VPA format cleanly without Express fallback.
 * TODO-RAZORPAY: Replace local syntax verification with Razorpay/Cashfree VPA validation API.
 */
export async function verifyHallUpi(upiId) {
  const clean = String(upiId || '').trim();
  const valid = /^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z]{2,64}$/.test(clean);
  if (!valid || clean.toLowerCase().startsWith('fail@')) {
    return { ok: false, reason: 'Invalid UPI ID format or verification declined.' };
  }
  if (clean.toLowerCase() === 'success@frcc') {
    return { ok: true, valid: true, upiId: clean, name: 'Test User', handle: 'frcc' };
  }
  const [localPart = 'member', bankPart = 'upi'] = clean.split('@');
  const formattedName = localPart
    .split(/[._-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(' ');
  return {
    ok: true,
    valid: true,
    upiId: clean,
    name: formattedName || 'Verified UPI Payee',
    handle: bankPart,
  };
}
