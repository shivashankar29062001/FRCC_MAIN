// ---------------------------------------------------------------------------
// Indian mobile number validation shared by the FRCC API server.
// A valid number is exactly 10 digits and starts with 6, 7, 8 or 9.
// ---------------------------------------------------------------------------

const INDIAN_MOBILE_REGEX = /^[6-9][0-9]{9}$/;
const INDIAN_MOBILE_MESSAGE = 'Please enter a valid 10-digit Indian mobile number.';

/** True when the value is a valid 10-digit Indian mobile number. */
function isValidIndianMobile(value) {
  return INDIAN_MOBILE_REGEX.test(String(value == null ? '' : value).trim());
}

/** Strip everything except digits and cap the value at 10 characters. */
function sanitizeMobileInput(value) {
  return String(value == null ? '' : value).replace(/\D/g, '').slice(0, 10);
}

module.exports = {
  INDIAN_MOBILE_REGEX,
  INDIAN_MOBILE_MESSAGE,
  isValidIndianMobile,
  sanitizeMobileInput,
};
