// ---------------------------------------------------------------------------
// /src/features/parking/slot/components/BookingConfirmation.jsx
// Merged from the FRCC Parking Slot team's app (step 6 — confirmation card).
// ---------------------------------------------------------------------------

import { useState, useEffect } from 'react';
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
  Loader2
} from 'lucide-react';
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
export default function BookingConfirmation({
  booking,
  apiStatus,
  onDone,
  onBookAnother,
  onCancelBooking,
  isCancelling,
  cancelSyncState,
  isDemoPayment
}) {
  const [confirmingCancel, setConfirmingCancel] = useState(false);

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

        {/* Admin dashboard sync note (never claims success unless it happened) */}
        {!isCancelled && apiStatus === 'success' && (
          <p className="confirmation-sync-note is-success" id="confirmation-sync-note">
            <CheckCircle2 size={14} />
            <span>Synced with the FRCC admin dashboard.</span>
          </p>
        )}
        {!isCancelled && apiStatus === 'not_configured' && (
          <p className="confirmation-sync-note is-info" id="confirmation-sync-note">
            <AlertTriangle size={14} />
            <span>
              Saved on this device. Admin dashboard sync is not configured yet.
            </span>
          </p>
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