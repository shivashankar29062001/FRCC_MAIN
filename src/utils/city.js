export const CITY_REGEX = /^[A-Za-z\s]+$/;
export const CITY_ERROR = 'City should contain only alphabets (minimum 2 letters).';

export const PINCODE_REGEX = /^[1-9][0-9]{5}$/;
export const PINCODE_ERROR = 'Enter a valid 6-digit Indian PIN code.';

/** Strip characters that are not letters or spaces (also applies to pasted text). */
export function sanitizeCityInput(value) {
  return String(value ?? '').replace(/[^A-Za-z ]/g, '');
}

/** Trim and collapse consecutive spaces. */
export function normalizeCity(value) {
  return String(value ?? '').replace(/\s+/g, ' ').trim();
}

/** A city is valid only when it contains letters and spaces and is at least 2 characters. */
export function isValidCity(value) {
  const norm = normalizeCity(value);
  return norm.length >= 2 && CITY_REGEX.test(norm) && !/^\d+$/.test(norm);
}

/** Indian PIN code must be exactly 6 digits, first digit 1-9. */
export function isValidPincode(value) {
  const clean = String(value ?? '').replace(/\D/g, '');
  return PINCODE_REGEX.test(clean);
}

/** Address must not be empty, must be at least 5 chars with alphanumeric content. */
export function isValidAddress(value) {
  if (!value || typeof value !== 'string') return false;
  const trimmed = value.trim();
  return trimmed.length >= 5 && /[A-Za-z0-9]/.test(trimmed);
}
