// ---------------------------------------------------------------------------
// Indian mobile number validation — shared by every FRCC form.
// A valid number is exactly 10 digits and starts with 6, 7, 8 or 9.
// ---------------------------------------------------------------------------

export const INDIAN_MOBILE_REGEX = /^[6-9][0-9]{9}$/;
export const INDIAN_MOBILE_MESSAGE = 'Please enter a valid 10-digit Indian mobile number.';
export const INDIAN_MOBILE_PLACEHOLDER = 'Enter 10-digit mobile number';

/**
 * Strips non-digits, leading country code (+91, 91) or trunk prefix (0),
 * and clamps to at most 10 digits.
 */
export function sanitizeMobileInput(value) {
  let digits = String(value ?? '').replace(/\D/g, '');
  if (digits.length === 12 && digits.startsWith('91')) {
    digits = digits.slice(2);
  } else if (digits.length === 11 && digits.startsWith('0')) {
    digits = digits.slice(1);
  }
  return digits.slice(0, 10);
}

export const normalizeIndianMobile = sanitizeMobileInput;

/** Formats a 10-digit number as +91 XXXXX XXXXX for display */
export function formatIndianMobileDisplay(value) {
  const digits = sanitizeMobileInput(value);
  if (!digits) return '';
  if (digits.length <= 5) return `+91 ${digits}`;
  return `+91 ${digits.slice(0, 5)} ${digits.slice(5)}`;
}

/** Returns true only for a valid 10-digit Indian mobile number. */
export function isValidIndianMobile(value) {
  const digits = sanitizeMobileInput(value);
  return INDIAN_MOBILE_REGEX.test(digits);
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
    return isValidIndianMobile(trimmed);
  }
  return true;
}
