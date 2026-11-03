/**
 * Utility functions for Indian mobile numbers and contact formatting.
 * Rules:
 * - Accept spaces, "+91" or leading 0 and strip them.
 * - Store 10 digits.
 * - Validate against /^[6-9]\d{9}$/ (10 digits starting with 6, 7, 8, or 9).
 * - Display as: +91 XXXXX XXXXX
 */

export {
  sanitizeMobileInput,
  isValidIndianMobile,
  formatIndianMobileDisplay,
  normalizeIndianMobile,
} from './mobile.js';

/**
 * Strips whitespace, dashes, "+91", leading "91" (if 12 digits), or leading "0" (if 11 digits).
 * Returns the normalized numeric digit string.
 * @param {string|number} raw
 * @returns {string}
 */
export function normalizeMobile(raw) {
  if (!raw) return '';
  let digits = String(raw).trim().replace(/\D/g, '');
  if (digits.length === 12 && digits.startsWith('91')) {
    digits = digits.slice(2);
  } else if (digits.length === 11 && digits.startsWith('0')) {
    digits = digits.slice(1);
  }
  return digits.slice(0, 10);
}

/**
 * Validates whether the given input is a valid 10-digit Indian mobile number.
 * @param {string|number} raw
 * @returns {boolean}
 */
export function isValidMobile(raw) {
  const digits = normalizeMobile(raw);
  return /^[6-9]\d{9}$/.test(digits);
}

/**
 * Formats a 10-digit mobile number for display as: +91 XXXXX XXXXX
 * If not 10 valid digits, returns the trimmed raw string.
 * @param {string|number} raw
 * @returns {string}
 */
export function formatMobileDisplay(raw) {
  if (!raw) return '';
  const digits = normalizeMobile(raw);
  if (/^[6-9]\d{9}$/.test(digits)) {
    return `+91 ${digits.slice(0, 5)} ${digits.slice(5)}`;
  }
  return String(raw).trim();
}

/**
 * Checks whether an email address is a synthetic legacy placeholder (@frcc.member).
 * @param {string} email
 * @returns {boolean}
 */
export function isLegacySyntheticEmail(email) {
  return Boolean(email && String(email).trim().toLowerCase().endsWith('@frcc.member'));
}
