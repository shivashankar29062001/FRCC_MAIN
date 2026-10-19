/**
 * FRCC Parking Slot Allotment — Booking Service.
 *
 * Produces the single, consistent booking object shape used by:
 *   1. The Step 6 booking confirmation UI.
 *   2. The Admin Dashboard API call (team lead's existing dashboard backend).
 *
 * ADMIN DASHBOARD INTEGRATION
 * ---------------------------
 * The dashboard backend endpoint is configured through Vite environment
 * variables (create a `.env` file in the project root):
 *
 *   VITE_BOOKING_API_URL=https://<admin-dashboard-host>/api
 *   VITE_BOOKING_API_PATH=/bookings          # optional, defaults to /bookings
 *
 * When VITE_BOOKING_API_URL is NOT set the app runs in frontend-only mode:
 * the booking is confirmed locally, it is explicitly NOT claimed to have
 * reached the dashboard, and no fake endpoint is invented.
 *
 * The payload sent to POST {VITE_BOOKING_API_URL}{VITE_BOOKING_API_PATH} is
 * built by buildAdminBookingPayload() and contains exactly:
 *   bookingReference, city, bookingDate, arrivalTime, durationDays,
 *   parkingSlot, vehicleType, vehicleNumber, vehicleModel, totalAmount,
 *   paymentMethod, paymentStatus, bookingStatus, createdAt
 */

// Display booking status values (used by the UI).
export const BOOKING_STATUS = {
  PENDING: 'Pending',
  CONFIRMED: 'Confirmed',
  CANCELLED: 'Cancelled',
  COMPLETED: 'Completed'
};

// Backend status codes sent to the Admin Dashboard.
export const BOOKING_STATUS_CODE = {
  CONFIRMED: 'CONFIRMED',
  PENDING: 'PENDING',
  CANCELLED: 'CANCELLED',
  COMPLETED: 'COMPLETED'
};

export const PAYMENT_STATUS_CODE = {
  PAID: 'PAID',
  PENDING_AT_VENUE: 'PENDING_AT_VENUE'
};

// UI payment method label → backend method code.
const PAYMENT_METHOD_CODE = {
  UPI: 'UPI',
  'Credit/Debit Card': 'CARD',
  Cash: 'CASH'
};

// 'YYYY-MM-DD' → 'DD/MM/YYYY'
function formatBookingDate(dateStr) {
  if (!dateStr) return '';
  try {
    const [year, month, day] = dateStr.split('-');
    if (year && month && day) return `${day}/${month}/${year}`;
    return dateStr;
  } catch {
    return dateStr;
  }
}

// 'HH:MM' (24h) → 'h:mm AM/PM'
function formatBookingTime(timeStr) {
  if (!timeStr) return '';
  try {
    const [hStr, mStr] = timeStr.split(':');
    const h = parseInt(hStr, 10);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const displayH = h % 12 || 12;
    return `${displayH}:${mStr} ${ampm}`;
  } catch {
    return timeStr;
  }
}

// Monotonic in-session counter so two bookings created in the same
// millisecond can never collide.
let referenceSequence = 0;

/**
 * Generates a unique booking reference ID, e.g. FRCC-PARK-7K2M9Q4A.
 * Format: FRCC-PARK- followed by 8 uppercase alphanumeric characters.
 * Never hard-coded - every confirmed booking gets its own value.
 */
export function generateBookingReference() {
  referenceSequence += 1;
  const timePart = Date.now().toString(36).toUpperCase();
  const seqPart = referenceSequence.toString(36).toUpperCase();
  const compact = (timePart + seqPart).replace(/[^A-Z0-9]/g, '');
  const code = compact.slice(-8).padStart(8, '0');
  return `FRCC-PARK-${code}`;
}

/**
 * Creates the complete booking object from the user's actual inputs.
 * Called only after payment requirements are satisfied:
 *   - UPI  → valid format + mock payment successful + transactionId
 *   - Card → valid details + mock payment successful + transactionId
 *   - Cash → pay at venue, transactionId null
 *
 * @returns {object} the booking object
 */
export function createBooking({
  bookingReference,
  parkingSlot,
  vehicleType,
  vehicleNumber,
  vehicleModel = '',
  numberOfDays,
  pricePerDay,
  bookingDate,
  bookingTime,
  paymentMethod,
  transactionId,
  city
}) {
  const isCash = paymentMethod === 'Cash';
  const reference = bookingReference || generateBookingReference();
  const paymentMethodCode = PAYMENT_METHOD_CODE[paymentMethod] || 'UNKNOWN';
  const paymentStatusCode = isCash
    ? PAYMENT_STATUS_CODE.PENDING_AT_VENUE
    : PAYMENT_STATUS_CODE.PAID;

  return {
    // Reference (bookingId kept for backward compatibility with older views)
    bookingReference: reference,
    bookingId: reference,

    // Slot & vehicle
    parkingSlot,
    vehicleType,
    vehicleNumber,
    vehicleModel,

    // Location & schedule
    city: city || '',
    numberOfDays,
    pricePerDay,
    totalAmount: pricePerDay * numberOfDays,
    bookingDate: formatBookingDate(bookingDate), // display: DD/MM/YYYY
    bookingTime: formatBookingTime(bookingTime), // display: h:mm AM/PM
    bookingDateISO: bookingDate || '',           // API: YYYY-MM-DD
    arrivalTime: bookingTime || '',              // API: HH:MM

    // Payment
    paymentMethod,                                // display label
    paymentMethodCode,                            // API: UPI / CARD / CASH
    paymentStatus: isCash ? 'Pay at Venue' : 'Paid', // display label
    paymentStatusCode,                            // API: PAID / PENDING_AT_VENUE
    // Only UPI/Card payments carry a transaction ID; Cash never does
    transactionId: isCash ? null : transactionId || null,

    // Booking status
    bookingStatus: BOOKING_STATUS.CONFIRMED,        // display label
    bookingStatusCode: BOOKING_STATUS_CODE.CONFIRMED, // API: CONFIRMED
    createdAt: new Date().toISOString()
  };
}

/**
 * Maps the internal booking object to the exact payload the Admin Dashboard
 * API expects.
 */
export function buildAdminBookingPayload(booking) {
  return {
    bookingReference: booking.bookingReference || booking.bookingId,
    city: booking.city,
    bookingDate: booking.bookingDateISO,
    arrivalTime: booking.arrivalTime,
    durationDays: Number(booking.numberOfDays) || 1,
    parkingSlot: booking.parkingSlot,
    vehicleType: booking.vehicleType,
    vehicleNumber: booking.vehicleNumber,
    vehicleModel: booking.vehicleModel,
    totalAmount: booking.totalAmount,
    paymentMethod: booking.paymentMethodCode,
    paymentStatus: booking.paymentStatusCode,
    bookingStatus: booking.bookingStatusCode,
    createdAt: booking.createdAt
  };
}

// ---------------------------------------------------------------------------
// Admin Dashboard API (only active when configured via VITE_BOOKING_API_URL)
// ---------------------------------------------------------------------------

const BOOKING_API_URL = (import.meta.env.VITE_BOOKING_API_URL || '')
  .trim()
  .replace(/\/+$/, '');
const BOOKING_API_PATH = (import.meta.env.VITE_BOOKING_API_PATH || '/bookings').trim();

export function isBookingApiConfigured() {
  return BOOKING_API_URL.length > 0;
}

export function getBookingApiEndpoint() {
  if (!isBookingApiConfigured()) return '';
  const path = BOOKING_API_PATH.startsWith('/') ? BOOKING_API_PATH : `/${BOOKING_API_PATH}`;
  return `${BOOKING_API_URL}${path}`;
}

/**
 * Sends a confirmed booking to the Admin Dashboard API.
 * Resolves when the backend accepts the booking, rejects otherwise so the UI
 * can surface a clear error and offer a safe retry.
 *
 * @returns {Promise<{ok: boolean, configured: boolean, skipped?: boolean, data?: any}>}
 */
export async function submitBookingToAdmin(booking) {
  if (!isBookingApiConfigured()) {
    // Frontend-only mode: nothing to call, and we never pretend it was sent.
    return { ok: true, configured: false, skipped: true };
  }

  const response = await fetch(getBookingApiEndpoint(), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(buildAdminBookingPayload(booking))
  });

  if (!response.ok) {
    let message = `Admin dashboard rejected the booking (HTTP ${response.status}).`;
    try {
      const data = await response.json();
      if (data && (data.message || data.error)) {
        message = data.message || data.error;
      }
    } catch (_) {
      // Non-JSON error body - keep the default message.
    }
    throw new Error(message);
  }

  let data = null;
  try {
    data = await response.json();
  } catch (_) {
    // Empty/JSON-less success body is acceptable.
  }

  return { ok: true, configured: true, data };
}

// ---------------------------------------------------------------------------
// Booking cancellation (admin dashboard) — READY FOR LATER BACKEND USE.
//
// Cancelling a booking is always applied locally in the frontend (slot made
// available again, status set to CANCELLED, retained records updated).
//
// The admin dashboard is only notified when an explicit cancellation endpoint
// is configured via a dedicated env var, so no guessed/emailed endpoint is
// ever called and no dashboard cancellation is ever claimed without backend
// confirmation:
//
//   VITE_BOOKING_CANCEL_PATH=/bookings/{ref}/cancel
//
// The `{ref}` placeholder is replaced with the encoded booking reference.
// ---------------------------------------------------------------------------

const BOOKING_CANCEL_PATH = (import.meta.env.VITE_BOOKING_CANCEL_PATH || '').trim();

export function isBookingCancelApiConfigured() {
  return BOOKING_API_URL.length > 0 && BOOKING_CANCEL_PATH.length > 0;
}

export function getBookingCancelEndpoint(reference) {
  if (!isBookingCancelApiConfigured()) return '';
  const path = BOOKING_CANCEL_PATH.startsWith('/') ? BOOKING_CANCEL_PATH : `/${BOOKING_CANCEL_PATH}`;
  return `${BOOKING_API_URL}${path.replace('{ref}', encodeURIComponent(reference || ''))}`;
}

/**
 * Payload shape recommended for the admin cancellation endpoint. Includes the
 * full booking record with the status overridden to CANCELLED so the backend
 * has everything it needs to void the booking.
 */
export function buildAdminCancellationPayload(booking) {
  return {
    ...buildAdminBookingPayload(booking),
    bookingStatus: BOOKING_STATUS_CODE.CANCELLED
  };
}

/**
 * Sends a cancellation to the Admin Dashboard API.
 * Resolves only when the backend accepts the cancellation. When no
 * cancellation endpoint is configured it is skipped and never claimed.
 *
 * @returns {Promise<{ok: boolean, configured: boolean, skipped?: boolean, data?: any}>}
 */
export async function cancelBookingToAdmin(booking) {
  if (!isBookingCancelApiConfigured()) {
    // Frontend-only mode: nothing to call, and we never pretend the
    // dashboard was updated.
    return { ok: true, configured: false, skipped: true };
  }

  const reference = booking.bookingReference || booking.bookingId;
  const response = await fetch(getBookingCancelEndpoint(reference), {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(buildAdminCancellationPayload(booking))
  });

  if (!response.ok) {
    let message = `Admin dashboard rejected the cancellation (HTTP ${response.status}).`;
    try {
      const data = await response.json();
      if (data && (data.message || data.error)) {
        message = data.message || data.error;
      }
    } catch (_) {
      // Non-JSON error body - keep the default message.
    }
    throw new Error(message);
  }

  let data = null;
  try {
    data = await response.json();
  } catch (_) {
    // Empty/JSON-less success body is acceptable.
  }

  return { ok: true, configured: true, data };
}
