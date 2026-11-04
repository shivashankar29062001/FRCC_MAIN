// ---------------------------------------------------------------------------
// /src/utils/vehicle.js — Vehicle registration number validation
// Required format: AP74HU7654 (e.g. AP - State, 74 - RTO, HU - Series, 7654 - Number)
// Regex: ^[A-Z]{2}[0-9]{2}[A-Z]{2}[0-9]{4}$ (exactly 10 alphanumeric characters)
// ---------------------------------------------------------------------------

export const VEHICLE_NUMBER_REGEX = /^[A-Z]{2}[0-9]{2}[A-Z]{2}[0-9]{4}$/;
export const VEHICLE_NUMBER_ERROR_MESSAGE = 'Invalid vehicle registration number. Expected format: AP74HU7654';

// Keep legacy export aliases for backward compatibility if any imports exist
export const VEHICLE_NUMBER_REGEX_STANDARD = VEHICLE_NUMBER_REGEX;
export const VEHICLE_NUMBER_REGEX_BH = VEHICLE_NUMBER_REGEX;

/**
 * Automatically converts lowercase letters into uppercase, removes spaces
 * and special characters, and limits to exactly 10 characters maximum.
 */
export function cleanVehicleNumber(val) {
  if (!val) return '';
  return String(val)
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, 10);
}

/**
 * Validates whether the vehicle registration number strictly conforms to:
 * ^[A-Z]{2}[0-9]{2}[A-Z]{2}[0-9]{4}$
 * (Accepts exactly 10 characters: 2 uppercase letters, 2 digits, 2 uppercase letters, 4 digits.
 * No spaces or special characters allowed.)
 */
export function isValidVehicleNumber(val) {
  if (!val || typeof val !== 'string') return false;
  return VEHICLE_NUMBER_REGEX.test(val);
}

export default {
  VEHICLE_NUMBER_REGEX,
  VEHICLE_NUMBER_REGEX_STANDARD,
  VEHICLE_NUMBER_REGEX_BH,
  VEHICLE_NUMBER_ERROR_MESSAGE,
  cleanVehicleNumber,
  isValidVehicleNumber,
};
