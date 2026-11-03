// ---------------------------------------------------------------------------
// /src/utils/vehicle.js — Indian vehicle registration number validation
// Standard format: AP39AB1234 (2 letters, 1-2 digits, 1-3 letters, 4 digits)
// BH series format: 22BH1234AA (2 digits, BH, 4 digits, 1-2 letters)
// ---------------------------------------------------------------------------

export const VEHICLE_NUMBER_REGEX_STANDARD = /^[A-Z]{2}\d{1,2}[A-Z]{1,3}\d{4}$/;
export const VEHICLE_NUMBER_REGEX_BH = /^\d{2}BH\d{4}[A-Z]{1,2}$/;

export const VEHICLE_NUMBER_ERROR_MESSAGE = 'Enter a valid vehicle number, e.g. AP39AB1234';

/**
 * Strips spaces, hyphens, non-alphanumeric chars, converts to uppercase,
 * and clamps to 11 characters maximum.
 */
export function cleanVehicleNumber(val) {
  if (!val) return '';
  return String(val)
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, 11);
}

/**
 * Validates whether the given vehicle registration number conforms to
 * either the standard Indian registration pattern or the Bharat (BH) series.
 */
export function isValidVehicleNumber(val) {
  if (!val) return false;
  const cleaned = cleanVehicleNumber(val);
  return VEHICLE_NUMBER_REGEX_STANDARD.test(cleaned) || VEHICLE_NUMBER_REGEX_BH.test(cleaned);
}

export default {
  VEHICLE_NUMBER_REGEX_STANDARD,
  VEHICLE_NUMBER_REGEX_BH,
  VEHICLE_NUMBER_ERROR_MESSAGE,
  cleanVehicleNumber,
  isValidVehicleNumber,
};

