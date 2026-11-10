import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import jsPDF from 'jspdf';
import { useBooking } from '../context/BookingContext';
import Stepper from '../components/Stepper';
import { inr, getBookingRefundPolicy, maskPhone, maskEmail, CANCELLATION_POLICY_TEXT } from '../utils/format';
import { cancelHallBooking, getHallBookingById } from '../services/hallBookingService.js';
import { supabase } from '../../../../services/supabase.js';

export default function ConventionConfirmation() {
  const { confirmed, setConfirmed, resetBooking } = useBooking();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [booking, setBooking] = useState(confirmed);
  const [loading, setLoading] = useState(!confirmed);
  const [notFound, setNotFound] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [cancelMsg, setCancelMsg] = useState('');
  const [cancelNotice, setCancelNotice] = useState(false);
  const [cancelErr, setCancelErr] = useState('');
  const [resending, setResending] = useState(false);
  const [resendCount, setResendCount] = useState(0);
  const [resendMsg, setResendMsg] = useState('');

  // Fallback: if the booking state was lost on refresh, load it directly from Supabase.
  useEffect(() => {
    if (confirmed) { setBooking(confirmed); setLoading(false); return; }
    const id = params.get('id');
    if (!id) { setLoading(false); setNotFound(true); return; }
    getHallBookingById(id)
      .then((found) => {
        if (found) { setBooking(found); setConfirmed(found); }
        else setNotFound(true);
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [confirmed, params, setConfirmed]);

  const handleResendConfirmation = async () => {
    if (!booking?.id || resending || resendCount >= 3) return;
    setResending(true);
    setResendMsg('');
    try {
      const { data, error } = await supabase.functions.invoke('send-booking-confirmation', {
        body: { booking_id: booking.id, is_resend: true, service_type: 'hall' },
      });
      if (error) {
        if (error.message?.includes('RATE_LIMIT_EXCEEDED')) {
          setResendCount(3);
          setResendMsg('Maximum of 3 confirmation resends reached.');
          return;
        }
        throw error;
      }
      const newCount = resendCount + 1;
      setResendCount(newCount);
      setResendMsg(`Confirmation resent (${newCount}/3).`);
    } catch (err) {
      setResendMsg('Resend queued. Notifications are sent in log-only/delivery mode.');
      setResendCount(c => Math.min(3, c + 1));
    } finally {
      setResending(false);
    }
  };

  if (loading) {
    return <div className="max-w-2xl mx-auto px-4 py-16 text-center text-gray-600">Loading your booking…</div>;
  }

  if (notFound || !booking) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <p className="text-gray-600 mb-4">No recent booking found.</p>
        <Link to="/convention/book" className="text-navy underline decoration-gold">Start a new booking</Link>
      </div>
    );
  }

  const downloadableReceipt = () => {
    const doc = new jsPDF();
    const headerHeight = 80;
    doc.setFillColor('#1A1A5E');
    doc.rect(0, 0, 210, headerHeight, 'F');
    doc.setFillColor('#C9A227');
    doc.rect(0, headerHeight - 5, 210, 3, 'F');

    const emblemSize = 48;
    const emblemX = 24;
    const emblemY = (headerHeight - emblemSize) / 2;

    try {
      const emblemImg = '/images/brand/frcc-emblem-receipt.png';
      doc.addImage(emblemImg, 'PNG', emblemX, emblemY, emblemSize, emblemSize, '', 'FAST');
    } catch (e) {
      doc.setFont('times', 'bold');
      doc.setFontSize(18);
      doc.setTextColor('#C9A227');
      doc.text('FRCC', emblemX, (headerHeight + 10) / 2);
    }

    const textX = 84;
    doc.setFont('times', 'bold');
    doc.setFontSize(18);
    doc.setTextColor('#C9A227');
    doc.text('FRCC CONVENTIONS', textX, 52);

    doc.setFont('times', 'normal');
    doc.setFontSize(9);
    doc.setTextColor('#A0A0A0');
    doc.text('Film Recreation & Cultural Centre', textX, 68);

    const labelColor = '#0F1F3D';
    const valueColor = '#0F1F3D';

    const rows = [
      ['Booking Reference', booking.id],
      ['Hall & Type', booking.hallName || 'Convention Hall'],
      ['Venue', booking.venueName || '—'],
      ['Date', booking.date],
      ['Time Slot', `${booking.startTime} – ${booking.endTime}`],
      ['Expected Guests', `${booking.guests} guests`],
      ['Organizer', booking.organizerName],
      ['Contact Phone', booking.phone],
      ['Contact Email', booking.email],
      ['Payment Method', (booking.paymentMethod || 'UPI').replaceAll('_', ' ')],
      ['Total Paid', inr(booking.amountPaid ?? booking.amount)],
      ['Booking Status', booking.status],
    ];

    let y = 100;
    rows.forEach(([k, v]) => {
      doc.setFont('times', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(labelColor);
      doc.text(k, 20, y);
      doc.setFont('times', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(valueColor);
      doc.text(String(v), 80, y);
      y += 10;
    });

    doc.setFont('times', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(labelColor);
    doc.text(`Cancellation Policy: ${CANCELLATION_POLICY_TEXT}`, 20, y + 8, { maxWidth: 170 });
    doc.save(`FRCC-Receipt-${booking.id}.pdf`);
  };

  const doCancel = async () => {
    setCancelling(true); setCancelErr('');
    try {
      const r = await cancelHallBooking(booking.id);
      setCancelMsg('Booking cancelled successfully. Your slot is now released.');
      setCancelNotice(true);
      const updated = r.booking ? {
        ...r.booking,
        refundStatusText: r.refund?.refundStatusText || (r.refund?.refundAmount > 0 ? 'Refund pending' : 'No refund due'),
      } : {
        ...booking,
        status: 'CANCELLED',
        paymentStatus: r.refund?.refundAmount > 0 ? 'REFUNDED' : booking.paymentStatus,
        refundPercent: r.refund?.refundPercent ?? policy.refundPercent,
        refundAmount: r.refund?.refundAmount ?? policy.refundAmount,
        refundStatus: r.refund?.refundStatus ?? (policy.refundAmount > 0 ? 'PENDING' : 'NOT_APPLICABLE'),
        refundStatusText: r.refund?.refundStatusText ?? (policy.refundAmount > 0 ? 'Refund pending' : 'No refund due'),
        balanceDue: 0,
      };
      setBooking(updated);
      setConfirmed(updated);
      setCancelOpen(false);
    } catch (e) {
      setCancelErr(e.message || 'Cancellation request failed.');
    } finally { setCancelling(false); }
  };

  const statusUpper = String(booking.status || '').toUpperCase();
  const policy = getBookingRefundPolicy(booking);
  const eligible = policy.allowed && statusUpper === 'CONFIRMED';
  const started = policy.hoursUntilStart <= 0;
  const nonRefundable = Math.max(0, (Number(booking.amountPaid ?? booking.amount) || 0) - policy.refundAmount);

  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <Stepper current={4} />
      <h1 className="text-3xl mb-6 text-center">Booking Confirmed</h1>
      <div className="bg-white rounded shadow p-6">
        <p className="text-green-700 font-semibold mb-4">✓ Payment successful — your hall is booked.</p>
        {cancelMsg && <p className="text-green-700 text-sm mb-3">{cancelMsg}</p>}
        {cancelNotice && <p className="text-green-700 text-sm mb-3">Cancellation notice sent.</p>}
        {cancelErr && <p className="text-red-600 text-sm mb-3">{cancelErr}</p>}
        <dl className="grid sm:grid-cols-2 gap-y-2 gap-x-6 text-sm">
          <dt className="font-semibold">Booking ID</dt><dd>{booking.id}</dd>
          <dt className="font-semibold">Venue</dt><dd>{booking.venueName || '—'}</dd>
          <dt className="font-semibold">City</dt><dd>{booking.cityName || booking.cityId || '—'}</dd>
          <dt className="font-semibold">Area</dt><dd>{booking.areaName || booking.areaId || '—'}</dd>
          <dt className="font-semibold">Hall</dt><dd className="font-bold text-navy">{booking.hallName}</dd>
          <dt className="font-semibold">Date</dt><dd>{booking.date}</dd>
          <dt className="font-semibold">Time</dt><dd>{booking.startTime} – {booking.endTime}</dd>
          <dt className="font-semibold">Event</dt><dd>{booking.eventType} ({booking.guests} guests)</dd>
          <dt className="font-semibold">Organizer</dt><dd>{booking.organizerName}</dd>
          <dt className="font-semibold">Payment Method</dt><dd>{(booking.paymentMethod || 'UPI_ID').replaceAll('_', ' ')}</dd>
          <dt className="font-semibold">Instrument</dt><dd>{booking.maskedInstrument || booking.upiIdMasked || '—'}</dd>
          {booking.emiTenure && <><dt className="font-semibold">EMI</dt><dd>{booking.emiTenure} × ₹{booking.emiMonthlyAmount}</dd></>}
          {booking.gstin && <><dt className="font-semibold">GSTIN</dt><dd>{booking.gstin}</dd></>}
          {booking.utrNumber && <><dt className="font-semibold">UTR</dt><dd>{booking.utrNumber}</dd></>}
          <dt className="font-semibold">Amount</dt><dd>{inr(booking.amount)}</dd>
          <dt className="font-semibold">Amount Paid</dt><dd>{inr(booking.amountPaid ?? booking.amount)}</dd>
          {(booking.balanceDue ?? 0) > 0 && <><dt className="font-semibold">Due at venue</dt><dd className="text-amber-700 font-semibold">{inr(booking.balanceDue)}</dd></>}
          <dt className="font-semibold">Payment Status</dt><dd>{booking.paymentStatus}</dd>
          <dt className="font-semibold">Transaction Ref</dt><dd>{booking.transactionRef || '—'}</dd>
          <dt className="font-semibold">Status</dt><dd className={booking.status === 'CANCELLED' ? 'text-red-600 font-semibold' : 'text-green-700 font-semibold'}>{booking.status}</dd>
          {booking.status === 'CANCELLED' && (
            <>
              <dt className="font-semibold">Refund Status</dt>
              <dd className="text-amber-700 font-semibold">
                {booking.refundStatus === 'PROCESSED' ? 'Refund processed' : booking.refundAmount > 0 ? 'Refund pending' : 'No refund due'}
                {booking.refundAmount > 0 && ` (${inr(booking.refundAmount)})`}
              </dd>
            </>
          )}
        </dl>
        {(statusUpper === 'PENDING_VERIFICATION' || booking.paymentStatus === 'PENDING_VERIFICATION') && statusUpper !== 'CANCELLED' && (
          <p className="text-amber-700 text-sm mt-3">⏳ Your booking is pending verification. It will be confirmed once we receive your payment.</p>
        )}
        {booking.paymentStatus === 'PARTIAL' && <p className="text-amber-700 text-sm mt-3">Partial payment received — balance of {inr(booking.balanceDue)} is due at the venue.</p>}
        
        {/* Notification details & Resend button */}
        {statusUpper === 'CONFIRMED' && (
          <div className="mt-4 p-3 bg-stone-50 rounded border border-stone-200">
            <p className="text-xs text-gray-700">
              Confirmation notifications sent via Email, SMS &amp; WhatsApp to <strong>{maskPhone(booking.phone)}</strong> and <strong>{maskEmail(booking.email)}</strong>.
            </p>
            <div className="mt-2 flex items-center gap-3">
              <button
                type="button"
                onClick={handleResendConfirmation}
                disabled={resending || resendCount >= 3}
                className="text-xs bg-navy text-gold px-3 py-1.5 rounded font-semibold disabled:opacity-40 disabled:cursor-not-allowed hover:bg-navy-800"
              >
                {resending ? 'Sending…' : resendCount >= 3 ? 'Resend limit reached (3/3)' : `Resend Confirmation (${resendCount}/3)`}
              </button>
              {resendMsg && <span className="text-xs text-green-700 font-medium">{resendMsg}</span>}
            </div>
          </div>
        )}

        <p className="text-xs text-gray-500 mt-3">Cancellation policy: {CANCELLATION_POLICY_TEXT}</p>
        <div className="flex flex-wrap gap-3 mt-6">
          <button onClick={downloadableReceipt} className="bg-gold text-navy font-semibold px-5 py-2 rounded">Download Receipt (PDF)</button>
          <button onClick={() => { resetBooking(); navigate('/my-bookings'); }} className="bg-navy text-gold px-5 py-2 rounded">View My Bookings</button>
          {booking.status !== 'CANCELLED' && (
            <button disabled={!eligible} onClick={() => { setCancelOpen(true); setCancelMsg(''); setCancelErr(''); }}
              title={!eligible && started ? 'Event has started' : ''}
              className="border border-red-500 text-red-600 px-5 py-2 rounded disabled:opacity-40 disabled:cursor-not-allowed">Cancel Booking</button>
          )}
          {!eligible && started && booking.status === 'CONFIRMED' && (
            <p className="text-amber-600 text-sm w-full">Cancellation is not available after the event has started.</p>
          )}
        </div>
      </div>

      {cancelOpen && (
        <div className="fixed inset-0 bg-navy-900/70 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded p-6 max-w-md w-full shadow-xl">
            <h3 className="text-xl font-bold mb-2 text-navy">Cancel Booking?</h3>
            <p className="text-sm text-gray-600 mb-2">{booking.hallName} • {booking.date} {booking.startTime}–{booking.endTime}</p>
            
            <div className="bg-stone-50 border border-stone-200 rounded p-3 text-sm space-y-1 mb-3">
              <p>Time left: <strong>{Math.max(0, Math.floor(policy.hoursUntilStart))} hours</strong></p>
              <p>Refund Percentage: <strong className="text-green-700">{policy.refundPercent}%</strong></p>
              <p>Refund Amount: <strong className="text-green-700">{inr(policy.refundAmount)}</strong></p>
              <p>Non-refundable Amount: <strong className="text-gray-700">{inr(nonRefundable)}</strong></p>
              <p className="text-xs text-gray-500 pt-1">
                Refund status: <strong>{policy.refundAmount > 0 ? 'Refund pending' : 'No refund due'}</strong> (Refund will be credited as per your payment method timeline).
              </p>
            </div>

            {policy.hoursUntilStart < 48 && (
              <p className="text-amber-700 text-xs bg-amber-50 border border-amber-300 rounded px-3 py-2 mb-3">
                Cancelling within 48 hours of the event start gives a 50% refund.
              </p>
            )}

            <div className="flex justify-end gap-3">
              <button onClick={() => setCancelOpen(false)} className="border border-gray-300 rounded px-4 py-2 text-sm">Keep Booking</button>
              <button onClick={doCancel} disabled={cancelling} className="bg-red-600 text-white rounded px-4 py-2 text-sm font-semibold disabled:opacity-50">
                {cancelling ? 'Cancelling…' : 'Confirm Cancellation'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="mt-8 -mx-4 sm:-mx-0 bg-navy border-t-4 border-gold py-6 flex items-center justify-center">
        <button
          onClick={() => { resetBooking(); navigate('/'); }}
          className="bg-gold text-navy font-bold text-lg px-10 py-3 rounded shadow hover:bg-gold-light inline-flex items-center gap-2"
        >
          ← Back to Home
        </button>
      </div>
    </div>
  );
}
