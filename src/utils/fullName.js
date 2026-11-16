export const FULL_NAME_REGEX = /^[A-Za-z\s]+$/;
export const FULL_NAME_ERROR = 'Full name should contain only alphabets.';
export const NAME_REGEX = FULL_NAME_REGEX;
export const NAME_ERROR = 'Name should contain only alphabets.';

/** Strip characters that are not letters or spaces (also applies to pasted text). */
export function sanitizeFullNameInput(value) {
  return String(value ?? '').replace(/[^A-Za-z ]/g, '');
}
export const sanitizeNameInput = sanitizeFullNameInput;

/** Trim and collapse consecutive spaces. */
export function normalizeFullName(value) {
  return String(value ?? '').replace(/\s+/g, ' ').trim();
}
export const normalizeName = normalizeFullName;

/** A full name must contain letters/spaces only and at least two letters. */
export function isValidFullName(value) {
  const name = normalizeFullName(value);
  return FULL_NAME_REGEX.test(name) && name.replace(/[^A-Za-z]/g, '').length >= 2;
}
export const isValidName = isValidFullName;

/** Error message using the field's own label where one exists. */
export function nameError(label = 'Name') {
  return `${label} should contain only alphabets.`;
}
