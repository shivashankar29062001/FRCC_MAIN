// ---------------------------------------------------------------------------
// /src/features/hall/convention/config/halls.config.js
// Single source of truth for Hall capacities, cooling, and cancellation rules
// ---------------------------------------------------------------------------

export const HALL_CAPACITIES = {
  BOARD_ROOM: 100,
  MEETING_ROOM: 200,
  CONFERENCE_ROOM: 300,
  BANQUET_HALL: 1500,
  CONVENTION_HALL: 10000,
  CONVENTION_ROOM: 10000,
  'Board Room': 100,
  'Meeting Room': 200,
  'Conference Room': 300,
  'Banquet Hall': 1500,
  'Convention Hall': 10000,
  'Convention Room': 10000,
};

export const HALL_TYPES = [
  'Board Room',
  'Meeting Room',
  'Conference Room',
  'Convention Hall',
  'Banquet Hall',
];

export const COOLING_OPTIONS = [
  { id: 'ALL', label: 'All cooling' },
  { id: 'AC', label: 'AC' },
  { id: 'NON_AC', label: 'Non-AC' },
];

export const GUEST_COUNT_CHIPS = [30, 50, 100, 250, 500, 1000, 1500, 5000, 10000];

export const CANCELLATION_WINDOW_HOURS = 48;

export const HALL_CANCELLATION_POLICY_TEXT =
  'Cancel 48 hours or more before event start for a 100% refund. ' +
  'Cancel within 48 hours of event start for a 50% refund. ' +
  'No refund after event has started.';

/**
 * Calculates hours until event start using Asia/Kolkata timezone (UTC+5:30)
 */
export function getHoursUntilEvent(date, startTime, now = new Date()) {
  if (!date) return null;
  const [rawH = '0', rawM = '0'] = String(startTime || '00:00').split(':');
  const h = String(Number(rawH)).padStart(2, '0');
  const m = String(Number(rawM)).padStart(2, '0');
  // Asia/Kolkata is strictly UTC+05:30 without DST
  const start = new Date(`${date}T${h}:${m}:00+05:30`);
  if (Number.isNaN(start.getTime())) return null;
  const clock = now instanceof Date ? now : new Date(now);
  return (start.getTime() - clock.getTime()) / 3600000;
}

/**
 * Computes cancellation eligibility and refund preview for hall bookings.
 */
export function calculateHallRefund(bookingOrAmount, nowOrHours = new Date()) {
  let hoursUntil;
  let amountPaid = 0;

  if (typeof bookingOrAmount === 'number') {
    amountPaid = Math.max(0, bookingOrAmount);
    hoursUntil = typeof nowOrHours === 'number' ? nowOrHours : null;
  } else {
    const booking = bookingOrAmount || {};
    amountPaid = Math.max(0, Number(booking.amountPaid ?? booking.amount_paid ?? booking.amount ?? 0) || 0);
    if (typeof booking.hoursUntil === 'number') {
      hoursUntil = booking.hoursUntil;
    } else if (typeof nowOrHours === 'number') {
      hoursUntil = nowOrHours;
    } else {
      hoursUntil = getHoursUntilEvent(booking.date, booking.startTime || booking.start_time, nowOrHours);
    }
  }

  if (hoursUntil === null) {
    return {
      allowed: false,
      hoursLeft: 0,
      refundPercent: 0,
      refundAmount: 0,
      nonRefundableAmount: amountPaid,
      refundStatus: 'NOT_APPLICABLE',
      statusText: 'No refund due',
      reason: 'Invalid event schedule or booking.',
      policyText: HALL_CANCELLATION_POLICY_TEXT,
    };
  }

  // After start -> 0% refund
  if (hoursUntil <= 0) {
    return {
      allowed: false,
      hoursLeft: Math.max(0, hoursUntil),
      refundPercent: 0,
      refundAmount: 0,
      nonRefundableAmount: amountPaid,
      refundStatus: 'NOT_APPLICABLE',
      statusText: 'No refund due',
      reason: 'Cancellation is not available after the event has started.',
      policyText: HALL_CANCELLATION_POLICY_TEXT,
    };
  }

  // >= 48 hours before start -> 100% refund; < 48 hours -> 50% refund
  const refundPercent = hoursUntil >= CANCELLATION_WINDOW_HOURS ? 100 : 50;
  const refundAmount = Math.round((amountPaid * refundPercent) / 100);
  const nonRefundableAmount = amountPaid - refundAmount;

  return {
    allowed: true,
    hoursLeft: hoursUntil,
    refundPercent,
    refundAmount,
    nonRefundableAmount,
    refundStatus: refundAmount > 0 ? 'PENDING' : 'NOT_APPLICABLE',
    statusText: refundAmount > 0 ? 'Refund pending' : 'No refund due',
    reason: `${refundPercent}% refund applicable (${Math.floor(hoursUntil)}h before start).`,
    policyText: HALL_CANCELLATION_POLICY_TEXT,
  };
}
