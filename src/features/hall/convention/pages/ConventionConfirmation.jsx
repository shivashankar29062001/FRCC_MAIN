import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import jsPDF from 'jspdf';
import { useBooking } from '../context/BookingContext';
import Stepper from '../components/Stepper';
import { inr, canCancel } from '../utils/format';
import { api } from '../services/api';
import * as pay from '../services/payment';

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
  const [cancelErr, setCancelErr] = useState('');

  // Fallback: if the booking state was lost on refresh, load it by ID from the URL.
  useEffect(() => {
    if (confirmed) { setBooking(confirmed); setLoading(false); return; }
    const id = params.get('id');
    if (!id) { setLoading(false); setNotFound(true); return; }
    api('/bookings/my')
      .then(d => {
        const found = d.bookings.find(b => b.id === id);
        if (found) { setBooking(found); setConfirmed(found); }
        else setNotFound(true);
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [confirmed]);

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

    // ===================== HEADER (80px tall) =====================
    const headerHeight = 80;
    // Navy header band
    doc.setFillColor('#1A1A5E');
    doc.rect(0, 0, 210, headerHeight, 'F');
    // Gold accent line at bottom of header
    doc.setFillColor('#C9A227');
    doc.rect(0, headerHeight - 5, 210, 3, 'F');

    // --- Emblem: 48x48px round, top-left, 24px from left, vertically centred ---
    const emblemSize = 48;
    const emblemX = 24;
    const emblemY = (headerHeight - emblemSize) / 2; // (80 - 48) / 2 = 16px top margin

    try {
      const emblemImg = '/images/brand/frcc-emblem-receipt.png';
      doc.addImage(emblemImg, 'PNG', emblemX, emblemY, emblemSize, emblemSize, '', 'FAST');
    } catch (e) {
      // Fallback: bold "FRCC" in gold if image fails, console.error with real error
      console.error('Watermark/logo failed to load', e);
      doc.setFont('times', 'bold');
      doc.setFontSize(18);
      doc.setTextColor('#C9A227');
      doc.text('FRCC', emblemX, (headerHeight + 10) / 2);
    }

    // --- "FRCC CONVENTIONS" text: gold bold serif 18pt, 12px gap from emblem ---
    // Emblem ends at x = 24 + 48 = 72, text starts at x = 72 + 12 = 84
    const textX = 84;
    // Vertically centred in the 80px header: baseline centre ~ y=50
    doc.setFont('times', 'bold');
    doc.setFontSize(18);
    doc.setTextColor('#C9A227');
    doc.text('FRCC CONVENTIONS', textX, 52);

    // --- "Film Recreation & Cultural Centre" below, light grey 9pt ---
    doc.setFont('times', 'normal');
    doc.setFontSize(9);
    doc.setTextColor('#A0A0A0');
    doc.text('Film Recreation & Cultural Centre', textX, 68);
    // ===============================================================

    // --- WATERMARK: faint centered emblem on the page body =====================
    // 350px wide, 1:1 ratio, centered horizontally and vertically
    const watermarkSize = 350;
    const watermarkX = (doc.internal.pageSize.getWidth() - watermarkSize) / 2;
    const watermarkY = (doc.internal.pageSize.getHeight() - watermarkSize) / 2;

    try {
      const emblemImg = '/images/brand/frcc-emblem-receipt.png';
      // Set opacity 7% with multiply mode for subtle watermark
      doc.setOpacity(0.07, 'multiply');
      doc.addImage(emblemImg, 'PNG', watermarkX, watermarkY, watermarkSize, watermarkSize, '', 'FAST');
      // Reset opacity to 100% for all subsequent content
      doc.setOpacity(1);
    } catch (e) {
      // Fallback: skip watermark silently, PDF still generates
      console.error('Watermark failed to load', e);
    }
    // =========================================================================

    // Gold line under header already drawn above

    // ===================== RECEIPT CONTENT =====================
    // Labels: dark navy (#0F1F3D), values dark navy
    const labelColor = '#0F1F3D';
    const valueColor = '#0F1F3D';

    // Rows start at y = headerHeight + 24 = 104 (24px space between header and first row)
    const rows = [
      ['Booking ID', booking.id], ['Venue', booking.venueName || ''], ['Area', booking.areaName || booking.areaId || ''], ['City', booking.cityName || booking.cityId || ''],
      ['Hall', booking.hallName || ''],
      ['Date', booking.date], ['Time', `${booking.startTime} – ${booking.endTime}`], ['Event', booking.eventType],
      ['Guests', String(booking.guests)], ['Organizer', booking.organizerName],
      ['Amount', `Rs. ${booking.amount}`],
      ['Amount Paid', `Rs. ${booking.amountPaid ?? booking.amount}`],
      ['Balance Due', `Rs. ${booking.balanceDue ?? 0}`],
      ['Payment Method', (booking.paymentMethod || 'UPI_ID').replaceAll('_', ' ')],
      ['Instrument', booking.maskedInstrument || booking.upiIdMasked || ''],
      ['Payment Status', booking.paymentStatus],
      ['Transaction Ref', booking.transactionRef],
      ['Booking Status', booking.status],
    ];
    // First row starts at y = 104
    let y = headerHeight + 24; // 104
    rows.forEach(([k, v]) => {
      // Label (left) in dark navy
      doc.setFont('times', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(labelColor);
      doc.text(k, 20, y);
      // Value (right) in dark navy
      doc.setFont('times', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(valueColor);
      doc.text(String(v), 80, y);
      y += 10; // 10px line height (was 9, now slightly more for navy labels)
    });
    // Final line
    doc.setFont('times', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(labelColor);
    doc.text('Cancellation: 100% refund if cancelled more than 48 hours before the event.', 20, y + 8);
    doc.save(`FRCC-Receipt-${booking.id}.pdf`);
  };

  const doCancel = async () => {
    setCancelling(true); setCancelErr('');;
    try {
      const refundAmount = booking.amountPaid ?? booking.amount ?? 0;
      await pay.refund(booking.id, refundAmount);
      const r = await api(`/bookings/${booking.id}/cancel`, { method: 'POST' });
      setCancelMsg(r.message);
      const updated = { ...booking, status: 'CANCELLED', paymentStatus: 'REFUNDED', refundAmount: r.booking?.refundAmount ?? refundAmount };
      setBooking(updated);
      setConfirmed(updated);
      setCancelOpen(false);
    } catch (e) {
      setCancelErr(e.message);
    } finally { setCancelling(false); }
  };

  const eligible = canCancel(booking);

  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <Stepper current={4} />
      <h1 className="text-3xl mb-6 text-center">Booking Confirmed</h1>
      <div className="bg-white rounded shadow p-6">
        <p className="text-green-700 font-semibold mb-4">✓ Payment successful — your hall is booked.</p>
        {cancelMsg && <p className="text-green-700 text-sm mb-3">{cancelMsg}</p>}
        {cancelErr && <p className="text-red-600 text-sm mb-3">{cancelErr}</p>}
        <dl className="grid sm:grid-cols-2 gap-y-2 gap-x-6 text-sm">
          <dt className="font-semibold">Booking ID</dt><dd>{booking.id}</dd>
          <dt className="font-semibold">Venue</dt><dd>{booking.venueName || '—'}</dd>
          <dt className="font-semibold">City</dt><dd>{booking.cityName || booking.cityId || '—'}</dd>
          <dt className="font-semibold">Area</dt><dd>{booking.areaName || booking.areaId || '—'}</dd>
          <dt className="font-semibold">Hall</dt><dd>{booking.hallName}</dd>
          <dt className="font-semibold">Date</dt><dd>{booking.date}</dd>
          <dt className="font-semibold">Time</dt><dd>{booking.startTime} – {booking.endTime}</dd>
          <dt className="font-semibold">Event</dt><dd>{booking.eventType} ({booking.guests} guests)</dd>
          <dt className="font-semibold">Organizer</dt><dd>{booking.organizerName}</dd>
          <dt className="font-semibold">Payment Method</dt><dd>{(booking.paymentMethod || 'UPI_ID').replaceAll('_', ' ')}</dd>
          <dt className="font-semibold">Instrument</dt><dd>{booking.maskedInstrument || booking.upiIdMasked}</dd>
          {booking.emiTenure && <><dt className="font-semibold">EMI</dt><dd>{booking.emiTenure} × ₹{booking.emiMonthlyAmount}</dd></>}
          {booking.gstin && <><dt className="font-semibold">GSTIN</dt><dd>{booking.gstin}</dd></>}
          {booking.utrNumber && <><dt className="font-semibold">UTR</dt><dd>{booking.utrNumber}</dd></>}
          <dt className="font-semibold">Amount</dt><dd>{inr(booking.amount)}</dd>
          <dt className="font-semibold">Amount Paid</dt><dd>{inr(booking.amountPaid ?? booking.amount)}</dd>
          {(booking.balanceDue ?? 0) > 0 && <><dt className="font-semibold">Due at venue</dt><dd className="text-amber-700 font-semibold">{inr(booking.balanceDue)}</dd></>}
          <dt className="font-semibold">Payment Status</dt><dd>{booking.paymentStatus}</dd>
          <dt className="font-semibold">Transaction Ref</dt><dd>{booking.transactionRef}</dd>
          <dt className="font-semibold">Status</dt><dd className={booking.status === 'CANCELLED' ? 'text-red-600 font-semibold' : 'text-green-700 font-semibold'}>{booking.status}</dd>
        </dl>
        {booking.status === 'PENDING_VERIFICATION' && <p className="text-amber-700 text-sm mt-3">⏳ Your booking is pending verification. It will be confirmed once we receive your payment.</p>}
        {booking.paymentStatus === 'PARTIAL' && <p className="text-amber-700 text-sm mt-3">Partial payment received — balance of {inr(booking.balanceDue)} is due at the venue.</p>}
        <p className="text-xs text-gray-500 mt-4">Cancellation policy: Full refund (100%) of the amount paid if cancelled more than 48 hours before the event start. Cancellations within 48 hours are not permitted. EMI refunds go via the issuing bank; bank-transfer/corporate refunds are processed manually within 5-7 working days.</p>
        <div className="flex flex-wrap gap-3 mt-6">
          <button onClick={downloadableReceipt} className="bg-gold text-navy font-semibold px-5 py-2 rounded">Download Receipt (PDF)</button>
          <button onClick={() => { resetBooking(); navigate('/my-bookings'); }} className="bg-navy text-gold px-5 py-2 rounded">View My Bookings</button>
          {eligible && booking.status !== 'CANCELLED' && (
            <button onClick={() => { setCancelOpen(true); setCancelMsg(''); setCancelErr(''); }}
              className="border border-red-500 text-red-600 px-5 py-2 rounded">Cancel Booking</button>
          )}
        </div>
      </div>

      {cancelOpen && (
        <div className="fixed inset-0 bg-navy-900/70 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded p-6 max-w-md">
            <h3 className="text-xl mb-2">Cancel Booking?</h3>
            <p className="text-sm text-gray-600 mb-1">{booking.hallName} • {booking.date} {booking.startTime}–{booking.endTime}</p>
            <p className="mb-1">Refund amount: <strong className="text-green-700">{inr(booking.amountPaid ?? booking.amount)}</strong></p>
            <p className="text-sm text-gray-600 mb-4">
              Original payment method: {(booking.paymentMethod || '').replaceAll('_', ' ')} • {booking.maskedInstrument || ''}
              {['EMI_CREDIT', 'EMI_NO_COST', 'EMI_DEBIT'].includes(booking.paymentMethod) && ' — EMI refunds are processed via the issuing bank.'}
              {['BANK_TRANSFER', 'CORPORATE_INVOICE'].includes(booking.paymentMethod) && ' — Refund will be processed manually within 5-7 working days.'}
              {booking.paymentMethod === 'ADVANCE_PAY_AT_VENUE' && ' — Only the advance amount has been refunded.'}
            </p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setCancelOpen(false)} className="border rounded px-4 py-2">Keep Booking</button>
              <button onClick={doCancel} disabled={cancelling} className="bg-red-600 text-white rounded px-4 py-2 disabled:opacity-50">{cancelling ? 'Cancelling…' : 'Confirm Cancellation'}</button>
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