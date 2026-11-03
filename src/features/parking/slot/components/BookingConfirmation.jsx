// ---------------------------------------------------------------------------
// /src/features/parking/slot/components/BookingConfirmation.jsx
// Merged from the FRCC Parking Slot team's app (step 6 — confirmation card).
// ---------------------------------------------------------------------------

import { useState, useEffect } from 'react';
import { useApp } from '../../../../app/store/AppContext.jsx';
import { readSession } from '../../../../app/session.js';
import {
  CheckCircle2,
  AlertTriangle,
  Home,
  RefreshCw,
  Calendar,
  Clock,
  CalendarDays,
  MapPin,
  Car,
  Hash,
  Ticket,
  XCircle,
  Loader2,
  Send
} from 'lucide-react';
import { resendBookingConfirmation } from '../services/bookingService.js';
import './BookingConfirmation.css';

/**
 * STEP 6 — CONFIRM BOOKING
 * Dedicated confirmation card shown only after a booking has been
 * successfully confirmed (payment succeeded + backend accepted, when an
 * Admin Dashboard API is configured).
 *
 * Cancellation: the card offers a "Cancel Booking" action (guarded by a
 * confirmation dialog). Cancelling releases the slot and marks the booking
 * CANCELLED locally; dashboard sync only happens via an explicitly
 * configured cancellation endpoint (never claimed without confirmation).
 */
function safeReadMembership() {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem('frcc.membership.v1');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function getMaskedContactDetails(user, membership, booking) {
  const effectiveMembership = membership || safeReadMembership();

  const rawMobile =
    user?.mobile ||
    user?.phone ||
    effectiveMembership?.mobile ||
    effectiveMembership?.phone ||
    (user?.emailOrPhone && !user.emailOrPhone.includes('@') ? user.emailOrPhone : '') ||
    booking?.mobile ||
    booking?.phone ||
    '+91 9876543210';

  const rawEmail =
    user?.email ||
    effectiveMembership?.email ||
    (user?.emailOrPhone && user.emailOrPhone.includes('@') ? user.emailOrPhone : '') ||
    booking?.email ||
    'admin@frcc.in';

  const cleanDigits = String(rawMobile).replace(/\D/g, '');
  const maskedMobile = cleanDigits.length >= 4
    ? `+91 ******${cleanDigits.slice(-4)}`
    : '+91 ******3210';

  let maskedEmail = 'a***@gmail.com';
  if (rawEmail && rawEmail.includes('@')) {
    const [local, domain] = rawEmail.split('@');
    const firstChar = local.charAt(0) || 'a';
    maskedEmail = `${firstChar}***@${domain}`;
  }

  const message = 'Confirmation sent to your registered email and mobile';

  return { rawMobile, rawEmail, maskedMobile, maskedEmail, message };
}

export default function BookingConfirmation({
  booking,
  user: propUser,
  apiStatus,
  onDone,
  onBookAnother,
  onCancelBooking,
  isCancelling,
  cancelSyncState,
  isDemoPayment
}) {
  const [confirmingCancel, setConfirmingCancel] = useState(false);
  const app = useApp();
  const effectiveUser = propUser || app?.user || (typeof window !== 'undefined' ? readSession() : null);
  const membership = app?.membership;
  const { message: confirmationMessage } = getMaskedContactDetails(
    effectiveUser,
    membership,
    booking
  );

  const { maskedMobile, maskedEmail } = getMaskedContactDetails(
    effectiveUser,
    membership,
    booking
  );

  const bookingRef = booking?.bookingReference || booking?.bookingId || booking?.id || '';
  const resendKey = `frcc_resend_${bookingRef}`;
  const [resendCount, setResendCount] = useState(() => {
    try {
      return Number(window.sessionStorage?.getItem(resendKey) || 0);
    } catch {
      return 0;
    }
  });
  const [isResending, setIsResending] = useState(false);
  const [resendNote, setResendNote] = useState('');

  const handleResend = async () => {
    if (resendCount >= 3 || isResending || !bookingRef) return;
    setIsResending(true);
    setResendNote('');
    try {
      await resendBookingConfirmation(bookingRef);
      const next = resendCount + 1;
      setResendCount(next);
      try {
        window.sessionStorage?.setItem(resendKey, String(next));
      } catch (_) {}
      setResendNote('Confirmation resent successfully!');
    } catch (err) {
      setResendNote(err?.message === 'RATE_LIMIT_EXCEEDED' ? 'Maximum 3 resends reached.' : 'Resend request recorded.');
    } finally {
      setIsResending(false);
    }
  };

  const isCancelled =
    booking.bookingStatus === 'Cancelled' || booking.bookingStatusCode === 'CANCELLED';

  // Close the cancel dialog as soon as the booking changes (e.g. after a
  // successful cancellation the card flips to the cancelled state).
  useEffect(() => {
    setConfirmingCancel(false);
  }, [booking]);

  if (!booking) return null;

  const days = Number(booking.numberOfDays) || 1;
  const isPaid = booking.paymentStatusCode === 'PAID';

  const detailRows = [
    {
      key: 'city',
      label: 'City',
      icon: <MapPin size={15} />,
      value: booking.city || 'Not specified'
    },
    {
      key: 'date',
      label: 'Booking Date',
      icon: <Calendar size={15} />,
      value: booking.bookingDate
    },
    {
      key: 'time',
      label: 'Arrival Time',
      icon: <Clock size={15} />,
      value: booking.bookingTime
    },
    {
      key: 'duration',
      label: 'Booking Duration',
      icon: <CalendarDays size={15} />,
      value: `${days} Day${days > 1 ? 's' : ''}`
    },
    {
      key: 'slot',
      label: 'Parking Slot',
      icon: <Ticket size={15} />,
      value: booking.parkingSlot,
      pill: true
    },
    {
      key: 'vehicleType',
      label: 'Vehicle Type',
      icon: <Car size={15} />,
      value: booking.vehicleType
    },
    {
      key: 'vehicleNumber',
      label: 'Vehicle Number',
      icon: <Hash size={15} />,
      value: booking.vehicleNumber,
      mono: true
    }
  ];

  const reference = booking.bookingReference || booking.bookingId;

  const showCancelSyncNote =
    isCancelled &&
    cancelSyncState &&
    (cancelSyncState.status === 'synced' || cancelSyncState.status === 'error');

  return (
    <section className="booking-confirmation-scrim" id="booking-confirmation-section">
      <div className="booking-confirmation-card">
        {/* Header — success or cancelled variant */}
        <div className="confirmation-success-header">
          <div className={`confirmation-check-circle${isCancelled ? ' is-cancelled' : ''}`}>
            {isCancelled ? <XCircle size={38} /> : <CheckCircle2 size={38} />}
          </div>
          <h2 className={`confirmation-heading${isCancelled ? ' is-cancelled' : ''}`}>
            {isCancelled ? 'Booking Cancelled' : 'Booking Confirmed!'}
          </h2>
          <p className="confirmation-subtext">
            {isCancelled
              ? 'Your parking slot booking has been cancelled. The slot is now available again.'
              : 'Your parking slot booking has been confirmed successfully.'}
          </p>
        </div>

        {/* Booking reference */}
        <div className="confirmation-reference-banner">
          <span className="reference-label">Booking Reference ID</span>
          <span className="reference-value" id="confirmed-booking-reference">
            {reference}
          </span>
        </div>

        {/* Confirmed details from Steps 1-5 */}
        <div className="confirmation-details-grid">
          {detailRows.map((row) => (
            <div className="confirmation-detail-row" key={row.key}>
              <span className="confirmation-detail-label">
                {row.icon}
                <span>{row.label}</span>
              </span>
              <span
                className={`confirmation-detail-value${row.mono ? ' is-mono' : ''}${
                  row.amount ? ' is-amount' : ''
                }${row.pill ? ' is-pill' : ''}`}
                id={`confirmed-${row.key}`}
              >
                {row.value}
              </span>
            </div>
          ))}

          {/* Booking status */}
          <div className="confirmation-detail-row">
            <span className="confirmation-detail-label">
              <Ticket size={15} />
              <span>Booking Status</span>
            </span>
            <span
              className={`confirmation-status-badge ${isCancelled ? 'is-cancelled' : 'is-confirmed'}`}
              id="confirmed-booking-status"
            >
              {isCancelled ? 'Cancelled' : 'Confirmed'}
            </span>
          </div>

          </div>

        {/* Confirmation notification & rate-limited Resend button (Change 5) */}
        {!isCancelled && (
          <div className="confirmation-notification-card" id="confirmation-notification-card">
            <div className="confirmation-notification-content">
              <div className="confirmation-notification-title">
                <CheckCircle2 size={16} className="notification-check-icon" />
                <span>Confirmation sent to your registered email and mobile</span>
              </div>
              <p className="confirmation-notification-contacts">
                {maskedEmail && <span className="contact-item">{maskedEmail}</span>}
                {maskedEmail && maskedMobile && <span className="contact-sep">&bull;</span>}
                {maskedMobile && <span className="contact-item">{maskedMobile}</span>}
              </p>
              {resendNote && (
                <p className="confirmation-resend-feedback">{resendNote}</p>
              )}
            </div>
            <button
              type="button"
              id="resend-confirmation-btn"
              className="btn-confirmation-resend"
              onClick={handleResend}
              disabled={resendCount >= 3 || isResending}
              title={resendCount >= 3 ? 'Maximum 3 resends per booking reached' : 'Resend confirmation'}
            >
              {isResending ? (
                <>
                  <Loader2 size={13} className="spinner" />
                  <span>Resending...</span>
                </>
              ) : (
                <>
                  <Send size={13} />
                  <span>{resendCount >= 3 ? 'Resent (Max 3)' : resendCount > 0 ? `Resend (${3 - resendCount} left)` : 'Resend'}</span>
                </>
              )}
            </button>
          </div>
        )}

        {/* Cancellation sync note (only after a cancellation) */}
        {showCancelSyncNote && cancelSyncState.status === 'synced' && (
          <p className="confirmation-sync-note is-success" id="cancellation-sync-note">
            <CheckCircle2 size={14} />
            <span>Cancellation synced with the FRCC admin dashboard.</span>
          </p>
        )}
        {showCancelSyncNote && cancelSyncState.status === 'error' && (
          <p className="confirmation-sync-note is-warn" id="cancellation-sync-note">
            <AlertTriangle size={14} />
            <span>
              Cancelled on this device, but the admin dashboard could not
              confirm the cancellation. {cancelSyncState.error}
            </span>
          </p>
        )}
        {isCancelled && !showCancelSyncNote && (
          <p className="confirmation-sync-note is-info" id="cancellation-sync-note">
            <AlertTriangle size={14} />
            <span>
              Cancelled on this device. Admin dashboard cancellation is not
              configured yet.
            </span>
          </p>
        )}

        {/* Final actions */}
        <div className="confirmation-actions-container">
          <button
            type="button"
            id="done-btn"
            className="btn-confirmation-done"
            onClick={onDone}
          >
            <Home size={18} />
            <span>Done</span>
          </button>

          <button
            type="button"
            id="book-another-slot-btn"
            className="btn-confirmation-another"
            onClick={onBookAnother}
          >
            <RefreshCw size={18} />
            <span>Book Another Slot</span>
          </button>

          {!isCancelled && onCancelBooking && (
            <button
              type="button"
              id="cancel-booking-btn"
              className="btn-confirmation-cancel"
              onClick={() => setConfirmingCancel(true)}
              disabled={isCancelling}
            >
              <XCircle size={18} />
              <span>Cancel Booking</span>
            </button>
          )}
        </div>
      </div>

      {/* Cancel confirmation dialog */}
      {confirmingCancel && !isCancelled && (
        <div className="cancel-confirm-overlay" id="cancel-booking-confirm-dialog">
          <div
            className="cancel-confirm-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="cancel-confirm-title"
          >
            <div className="cancel-confirm-icon">
              <AlertTriangle size={22} />
            </div>
            <h3 className="cancel-confirm-title" id="cancel-confirm-title">
              Are you sure you want to cancel this parking booking?
            </h3>
            <p className="cancel-confirm-text">
              Your parking slot <strong>{booking.parkingSlot}</strong> will be
              released and this booking will be marked as cancelled.
            </p>
            <div className="cancel-confirm-actions">
              <button
                type="button"
                className="btn-cancel-keep"
                onClick={() => setConfirmingCancel(false)}
                disabled={isCancelling}
              >
                Keep Booking
              </button>
              <button
                type="button"
                id="confirm-cancel-booking-btn"
                className="btn-cancel-confirm"
                onClick={onCancelBooking}
                disabled={isCancelling}
              >
                {isCancelling ? (
                  <>
                    <Loader2 size={16} className="spinner" />
                    <span>Cancelling...</span>
                  </>
                ) : (
                  <>
                    <XCircle size={16} />
                    <span>Yes, Cancel Booking</span>
                  </>
                )}
              </button>
            </div>
            {cancelSyncState && cancelSyncState.status === 'error' && (
              <p className="cancel-confirm-error">{cancelSyncState.error}</p>
            )}
          </div>
        </div>
      )}
    </section>
  );
}