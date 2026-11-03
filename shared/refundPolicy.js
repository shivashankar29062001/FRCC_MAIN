// Single source of truth for convention-hall cancellation/refund rules.
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
 * Calculate the cancellation/refund outcome from the event start and a clock.
 * @param {object} booking booking record (date, startTime, amountPaid, paymentMethod)
 * @param {Date|string|number} [now] server clock; defaults to the current time
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
