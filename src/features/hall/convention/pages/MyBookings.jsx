import { useEffect, useState } from 'react';
import { api } from '../services/api';
import { inr, hoursUntilEvent, canCancel, CANCEL_WINDOW_HOURS } from '../utils/format';
import * as pay from '../services/payment';
import { getCurrentUser } from '../services/auth';

const TABS = ['Upcoming', 'Completed', 'Cancelled'];

function classify(b) {
  if (b.status === 'CANCELLED') return 'Cancelled';
  const over = hoursUntilEvent(b.date, b.endTime) < 0;
  return over ? 'Completed' : 'Upcoming';
}

export default function MyBookings() {
  const [bookings, setBookings] = useState([]);
  const [tab, setTab] = useState('Upcoming');
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState(null);
  const [cancelFor, setCancelFor] = useState(null);
  const [cancelling, setCancelling] = useState(false);

  const user = getCurrentUser();

  const load = (silent = false) => {
    if (!silent) setLoading(true);
    api('/bookings/my')
      .then(d => setBookings(d.bookings))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  // The newly paid booking must appear immediately — refetch when the tab regains
  // focus and poll lightly so a fresh payment shows without a manual refresh.
  useEffect(() => {
    const onFocus = () => load(true);
    window.addEventListener('focus', onFocus);
    const t = setInterval(() => load(true), 10000);
    return () => { window.removeEventListener('focus', onFocus); clearInterval(t); };
  }, []);

  const filtered = bookings.filter(b => classify(b) === tab);

  const doCancel = async () => {
    setCancelling(true);
    try {
      const refundAmount = cancelFor.amountPaid ?? cancelFor.amount ?? 0;
      // Refund goes to the original payment method (mock in test mode).
      await pay.refund(cancelFor.id, refundAmount);
      const r = await api(`/bookings/${cancelFor.id}/cancel`, { method: 'POST' });
      setMsg(r.message);
      setCancelFor(null);
      load();
    } catch (e) { setError(e.message); } finally { setCancelling(false); }
  };

  const refundNote = (b) => {
    if (['EMI_CREDIT', 'EMI_NO_COST', 'EMI_DEBIT'].includes(b.paymentMethod)) return 'Refund via issuing bank per its policy.';
    if (['BANK_TRANSFER', 'CORPORATE_INVOICE'].includes(b.paymentMethod)) return 'Refund will be processed manually within 5-7 working days.';
    if (b.paymentMethod === 'ADVANCE_PAY_AT_VENUE') return 'Only the advance amount has been refunded.';
    return 'Refunded to the original payment method.';
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      <h1 className="text-3xl mb-6">My Bookings</h1>
      <div className="flex gap-2 mb-6">
        {TABS.map(t => <button key={t} onClick={() => setTab(t)} className={`px-4 py-2 rounded-full border ${tab === t ? 'bg-navy text-gold border-gold' : 'bg-white text-navy'}`}>{t}</button>)}
      </div>

      {error && <p className="text-red-600 mb-4">{error}</p>}
      {msg && <p className="text-green-700 mb-4">{msg}</p>}

      {loading ? <p>Loading…</p> : filtered.length === 0 ? (
        <p className="text-gray-500 bg-white rounded shadow p-6 text-center">No bookings yet.</p>
      ) : (
        <div className="grid gap-4">
          {filtered.map(b => {
            const cancellable = canCancel(b);
            const within48 = b.status === 'CONFIRMED' && classify(b) === 'Upcoming' && hoursUntilEvent(b.date, b.startTime) <= CANCEL_WINDOW_HOURS;
            return (
              <div key={b.id} className="bg-white rounded shadow p-4 flex flex-col sm:flex-row gap-4">
                <img src={b.hall?.images?.[0] || '/images/halls/grand-ballroom.svg'} alt={b.hallName} loading="lazy" className="w-full sm:w-40 h-28 object-cover rounded" onError={(e) => { e.target.src = '/images/halls/grand-ballroom.svg'; }} />
                <div className="flex-1 text-sm">
                  <p className="font-bold text-navy">{b.hallName}{b.venueName ? ` • ${b.venueName}` : ''}</p>
                  <p>ID: {b.id} • {b.eventType}</p>
                  <p>{b.date} • {b.startTime}–{b.endTime} • {b.guests} guests</p>
                  <p>Amount: {inr(b.amount)} • Payment: {b.paymentStatus} • <span className={b.status === 'CONFIRMED' ? 'text-green-700' : b.status === 'CANCELLED' ? 'text-red-600' : 'text-amber-600'}>{b.status}</span></p>
                  <p className="text-gray-600">Paid via {(b.paymentMethod || 'UPI_ID').replaceAll('_', ' ')} {b.maskedInstrument ? `• ${b.maskedInstrument}` : ''}{b.balanceDue > 0 ? ` • Due at venue: ${inr(b.balanceDue)}` : ''}</p>
                  {b.status === 'PENDING_VERIFICATION' && <button onClick={async () => { await api(`/bookings/${b.id}/mark-paid`, { method: 'POST' }); setMsg('Marked as paid (admin mock).'); load(); }} className="text-xs border border-amber-600 text-amber-700 rounded px-2 py-0.5">Admin mock: Mark as Paid</button>}
                  {within48 && <p className="text-amber-600 mt-1">Cancellation is not available within 48 hours of the event.</p>}
                  {b.status === 'CANCELLED' && <p className="text-red-600 mt-1">Cancelled • Refund: {inr(b.refundAmount)} — {refundNote(b)}</p>}
                  <div className="flex gap-2 mt-3 flex-wrap">
                    <button onClick={() => setView(view === b.id ? null : b.id)} className="border border-navy text-navy rounded px-3 py-1">View Details</button>
                    {b.status === 'CONFIRMED' && classify(b) === 'Upcoming' && (
                      <button disabled={!cancellable} onClick={() => setCancelFor(b)} title={within48 ? 'Within 48 hours' : ''}
                        className="border border-red-500 text-red-600 rounded px-3 py-1 disabled:opacity-40 disabled:cursor-not-allowed">Cancel Booking</button>
                    )}
                  </div>
                  {view === b.id && (
                    <div className="mt-3 bg-stone-50 rounded p-3 text-xs space-y-1">
                      <p>Organizer: {b.organizerName} • {b.phone} • {b.email}</p>
                      <p>Venue: {b.venueName || '—'} • {b.areaName || b.areaId || '—'} • {b.cityName || b.cityId || '—'}</p>
                      <p>Details: {b.eventDetails || '—'} • Special requests: {b.specialRequests || '—'}</p>
                      <p>Method: {(b.paymentMethod || 'UPI_ID').replaceAll('_', ' ')} • Instrument: {b.maskedInstrument || b.upiIdMasked || '—'} • Ref: {b.transactionRef}</p>
                      <p>Amount paid: {inr(b.amountPaid ?? b.amount)}{b.balanceDue > 0 ? ` • Balance due at venue: ${inr(b.balanceDue)}` : ''}</p>
                      {b.emiTenure && <p>EMI: {b.emiTenure} × {inr(b.emiMonthlyAmount)}</p>}
                      {b.gstin && <p>GSTIN: {b.gstin}</p>}
                      {b.utrNumber && <p>UTR: {b.utrNumber}</p>}
                      {b.status === 'CANCELLED' && <p>Cancelled at {new Date(b.cancelledAt).toLocaleString()} • Refund: {inr(b.refundAmount)} — {refundNote(b)}</p>}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {cancelFor && (
        <div className="fixed inset-0 bg-navy-900/70 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded p-6 max-w-md">
            <h3 className="text-xl mb-2">Cancel Booking?</h3>
            <p className="text-sm text-gray-600 mb-1">{cancelFor.hallName} • {cancelFor.date} {cancelFor.startTime}–{cancelFor.endTime}</p>
            <p className="mb-1">Refund amount: <strong className="text-green-700">{inr(cancelFor.amountPaid ?? cancelFor.amount)}</strong> (100% — cancelled more than 48 hours before the event).</p>
            <p className="text-sm text-gray-600 mb-4">Refunded to your original payment method — {(cancelFor.paymentMethod || '').replaceAll('_', ' ')} • {cancelFor.maskedInstrument || ''}. {refundNote(cancelFor)}</p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setCancelFor(null)} className="border rounded px-4 py-2">Keep Booking</button>
              <button onClick={doCancel} disabled={cancelling} className="bg-red-600 text-white rounded px-4 py-2 disabled:opacity-50">{cancelling ? 'Cancelling…' : 'Confirm Cancellation'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}