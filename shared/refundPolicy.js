// Single source of truth for cancellation/refund rules.
// Used by the API, the UI, receipts and notification messages.
// Times are interpreted as IST (Asia/Kolkata, UTC+05:30); India has no DST.

export const CANCELLATION_WINDOW_HOURS = 48;

export const CANCELLATION_POLICY_TEXT =
  'Cancel more than 48 hours before the event start for a 100% refund. ' +
  'Cancel within 48 hours of the event start for a 50% refund. ' +
  'No cancellation after the event has started.';

const IST_OFFSET = '+05:30';

export function getEventStart(booking) {
  if (!booking || !booking.date || !booking.startTime) return null;
  const date = String(booking.date);
  const [rawHour = '0', rawMinute = '0'] = String(booking.startTime).split(':');
  const hour = String(Number(rawHour)).padStart(2, '0');
  const minute = String(Number(rawMinute)).padStart(2, '0');
  const start = new Date(`${date}T${hour}:${minute}:00${IST_OFFSET}`);
  return Number.isNaN(start.getTime()) ? null : start;
}

export function getRefundMethod(paymentMethod) {
  const method = String(paymentMethod || '').toUpperCase();
  if (method === 'BANK_TRANSFER' || method === 'CORPORATE_INVOICE') {
    return 'Refund will be processed manually within 5-7 working days.';
  }
  if (method === 'ADVANCE_PAY_AT_VENUE') {
    return 'Refund will be made to the original payment method for the advance paid. The balance due is cancelled.';
  }
  if (method.startsWith('EMI')) {
    return 'Refund will be processed via the issuing bank.';
  }
  return 'Refund will be made to the original payment method.';
}

/**
 * Calculate convention hall cancellation/refund outcome from event start and a clock.
 * @param {object} booking booking record (date, startTime, amountPaid, paymentMethod)
 * @param {Date|string|number} [now] server clock; defaults to current time
 * @returns {{allowed:boolean, refundPercent:number, refundAmount:number,
 *   hoursUntilStart:number, reason:string, refundMethod:string, policyText:string}}
 */
export function getRefundPolicy(booking, now = new Date()) {
  const start = getEventStart(booking);
  const clock = now instanceof Date ? now : new Date(now);
  const amountPaid = Math.max(0, Number(booking?.amountPaid ?? booking?.amount ?? 0) || 0);
  const refundMethod = getRefundMethod(booking?.paymentMethod);

  if (!start || Number.isNaN(clock.getTime())) {
    return {
      allowed: false,
      refundPercent: 0,
      refundAmount: 0,
      hoursUntilStart: 0,
      reason: 'Cancellation is not available for this booking.',
      refundMethod,
      policyText: CANCELLATION_POLICY_TEXT,
    };
  }

  const hoursUntilStart = (start.getTime() - clock.getTime()) / 3600000;

  if (hoursUntilStart <= 0) {
    return {
      allowed: false,
      refundPercent: 0,
      refundAmount: 0,
      hoursUntilStart,
      reason: 'Cancellation is not available after the event has started.',
      refundMethod,
      policyText: CANCELLATION_POLICY_TEXT,
    };
  }

  // Exactly 48 hours counts as "within 48 hours" (50%).
  const refundPercent = hoursUntilStart >= CANCELLATION_WINDOW_HOURS ? 100 : 50;
  const refundAmount = Math.round(amountPaid * refundPercent) / 100;

  return {
    allowed: true,
    refundPercent,
    refundAmount,
    hoursUntilStart,
    reason: `${refundPercent}% refund applies if cancelled now.`,
    refundMethod,
    policyText: CANCELLATION_POLICY_TEXT,
  };
}

export const STAY_CANCELLATION_POLICY_TEXT =
  'Free cancellation up to 24 hours before check-in. Late cancellation: 1-night charge. No-show: Non-refundable.';

/**
 * Calculate stay cancellation/refund outcome according to policy:
 * - Free cancellation up to 24 hours before check-in (100% refund)
 * - Late cancellation (< 24 hours before check-in until checkout): 1-night charge
 * - No-show (after checkout): Non-refundable (0% refund)
 */
export function calculateStayRefund(booking, now = new Date()) {
  const clock = now instanceof Date ? now : new Date(now);
  const totalPaid = Math.max(0, Number(booking?.total ?? booking?.amount ?? booking?.amountPaid ?? 0) || 0);
  const nights = Math.max(1, Number(booking?.nights || 1));
  const rooms = Math.max(1, Number(booking?.rooms || 1));
  const pricePerNight = Number(booking?.price_per_night || booking?.pricePerNight) || Math.round(totalPaid / nights);
  const oneNightCharge = Math.min(totalPaid, pricePerNight * rooms);

  const checkinDate = booking?.check_in || booking?.checkin || booking?.date;
  const checkoutDate = booking?.check_out || booking?.checkout || checkinDate;

  if (!checkinDate) {
    return {
      allowed: false,
      refundPercent: 0,
      refundAmount: 0,
      nonRefundableAmount: totalPaid,
      reason: 'Invalid check-in date',
      policyText: STAY_CANCELLATION_POLICY_TEXT,
    };
  }

  const checkinDt = new Date(`${String(checkinDate).slice(0, 10)}T12:00:00+05:30`);
  const checkoutDt = new Date(`${String(checkoutDate).slice(0, 10)}T11:00:00+05:30`);
  const hoursUntilCheckin = (checkinDt.getTime() - clock.getTime()) / 3600000;
  const isPastCheckout = checkoutDt.getTime() < clock.getTime();

  if (isPastCheckout) {
    return {
      allowed: false,
      isNoShow: true,
      refundPercent: 0,
      refundAmount: 0,
      nonRefundableAmount: totalPaid,
      reason: 'Check-out date has passed. No-show bookings are non-refundable.',
      policyText: STAY_CANCELLATION_POLICY_TEXT,
    };
  }

  if (hoursUntilCheckin >= 24) {
    return {
      allowed: true,
      isLateCancellation: false,
      hoursUntilCheckin,
      refundPercent: 100,
      refundAmount: totalPaid,
      retentionAmount: 0,
      nonRefundableAmount: 0,
      refundStatus: totalPaid > 0 ? 'PENDING' : 'NONE',
      statusText: totalPaid > 0 ? 'Refund pending' : 'Full refund',
      policyText: STAY_CANCELLATION_POLICY_TEXT,
    };
  }

  // Late cancellation (< 24 hours)
  const refundAmount = Math.max(0, totalPaid - oneNightCharge);
  const refundPercent = totalPaid > 0 ? Math.round((refundAmount / totalPaid) * 100) : 0;
  return {
    allowed: true,
    isLateCancellation: true,
    hoursUntilCheckin,
    refundPercent,
    refundAmount,
    retentionAmount: oneNightCharge,
    nonRefundableAmount: oneNightCharge,
    refundStatus: refundAmount > 0 ? 'PENDING' : 'NOT_APPLICABLE',
    statusText: refundAmount > 0 ? 'Refund pending' : 'No refund due (1-night charge applied)',
    policyText: STAY_CANCELLATION_POLICY_TEXT,
  };
}
