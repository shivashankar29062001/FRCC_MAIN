export const CITY_REGEX = /^[A-Za-z\s]+$/;
export const CITY_ERROR = 'City should contain only alphabets.';

/** Strip characters that are not letters or spaces (also applies to pasted text). */
export function sanitizeCityInput(value) {
  return String(value ?? '').replace(/[^A-Za-z ]/g, '');
}

/** Trim and collapse consecutive spaces. */
export function normalizeCity(value) {
  return String(value ?? '').replace(/\s+/g, ' ').trim();
}

/** A city is valid only when it contains letters and spaces and is not empty. */
export function isValidCity(value) {
  return CITY_REGEX.test(normalizeCity(value));
}
