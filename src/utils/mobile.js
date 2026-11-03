// ---------------------------------------------------------------------------
// Indian mobile number validation — shared by every FRCC form.
// A valid number is exactly 10 digits and starts with 6, 7, 8 or 9.
// ---------------------------------------------------------------------------

export const INDIAN_MOBILE_REGEX = /^[6-9][0-9]{9}$/;
export const INDIAN_MOBILE_MESSAGE = 'Please enter a valid 10-digit Indian mobile number.';
export const INDIAN_MOBILE_PLACEHOLDER = 'Enter 10-digit mobile number';

/** Strip everything except digits and cap the value at 10 characters. */
export function sanitizeMobileInput(value) {
  return String(value ?? '').replace(/\D/g, '').slice(0, 10);
}

/** Returns true only for a valid 10-digit Indian mobile number. */
export function isValidIndianMobile(value) {
  return INDIAN_MOBILE_REGEX.test(String(value ?? '').trim());
}

/**
 * True when a combined "email or phone" value should be treated as a phone.
 * Alphabetic handles are left untouched so existing sign-in IDs keep working.
 */
export function isPhoneLike(value) {
  const trimmed = String(value ?? '').trim();
  return trimmed.length > 0 && !trimmed.includes('@') && /^[+\d][\d\s-]*$/.test(trimmed);
}

/** Validate a combined email-or-mobile value. Empty values are optional. */
export function isValidEmailOrIndianMobile(value, { required = false } = {}) {
  const trimmed = String(value ?? '').trim();
  if (!trimmed) return !required;
  if (trimmed.includes('@')) return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed);
  if (isPhoneLike(trimmed)) {
    return INDIAN_MOBILE_REGEX.test(trimmed.replace(/\D/g, ''));
  }
  return true;
}
