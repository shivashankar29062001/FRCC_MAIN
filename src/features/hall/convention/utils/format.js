import {
  getRefundPolicy,
  getRefundMethod,
  CANCELLATION_POLICY_TEXT,
  CANCELLATION_WINDOW_HOURS,
} from '../../../../../shared/refundPolicy.js';

// One rule for the whole app: the UI imports the exact function the API uses.
export { getRefundPolicy, getRefundMethod, CANCELLATION_POLICY_TEXT, CANCELLATION_WINDOW_HOURS };

export const inr = (n) => '₹' + Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 });

export function hoursUntilEvent(date, startTime) {
  const [h, m] = String(startTime || '00:00').split(':').map(Number);
  const start = new Date(`${date}T00:00:00`);
  start.setHours(h, m, 0, 0);
  return (start.getTime() - Date.now()) / 3600000;
}

export function eventStart(date, startTime) {
  const [h, m] = String(startTime || '00:00').split(':').map(Number);
  const start = new Date(`${date}T00:00:00`);
  start.setHours(h, m, 0, 0);
  return start;
}

// Same time rule as the API. Whether the booking is still CONFIRMED is a
// separate check, because pending and cancelled bookings cannot be cancelled.
export const getBookingRefundPolicy = getRefundPolicy;

export function canCancel(booking, now = new Date()) {
  return booking?.status === 'CONFIRMED' && getRefundPolicy(booking, now).allowed;
}

// Masked the same way the server masks recipients, so both agree.
export function maskPhone(raw) {
  let digits = String(raw || '').replace(/\D/g, '');
  if (digits.length === 11 && digits.startsWith('0')) digits = digits.slice(1);
  if (digits.length === 10) digits = `91${digits}`;
  if (digits.length !== 12 || !digits.startsWith('91')) return 'your registered number';
  return `+91******${digits.slice(-4)}`;
}

export function maskEmail(raw) {
  const [local = '', domain = ''] = String(raw || '').trim().split('@');
  if (!domain) return 'your registered email';
  return `${local.slice(0, 1)}***@${domain}`;
}
