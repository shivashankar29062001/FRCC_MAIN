import { useEffect, useState } from 'react';
import { api } from '../services/api';
import { inr, hoursUntilEvent, getBookingRefundPolicy, getRefundMethod, maskPhone, maskEmail } from '../utils/format';
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
  const [cancelNotice, setCancelNotice] = useState(false);

  const user = getCurrentUser();

  const load = (silent = false) => {
    if (!silent) setLoading(true);
    api('/bookings/my')
      .then(d => setBookings(d.bookings || []))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  useEffect(() => {
    const onFocus = () => load(true);
    window.addEventListener('focus', onFocus);
    const t = setInterval(() => load(true), 10000);
    return () => { window.removeEventListener('focus', onFocus); clearInterval(t); };
  }, []);

  const filtered = bookings.filter(b => classify(b) === tab);

  const doCancel = async () => {
    if (!cancelFor) return;
    setCancelling(true);
    try {
      const r = await api(`/bookings/${cancelFor.id}/cancel`, { method: 'POST' });
      setMsg(r.message || 'Booking cancelled successfully.');
      setCancelNotice(true);
      setCancelFor(null);
      load();
      pay.refund(cancelFor.id, r.booking?.refundAmount ?? 0).catch(e => console.error('Refund call failed:', e.message));
    } catch (e) {
      setError(e.message || 'Failed to cancel booking.');
    } finally {
      setCancelling(false);
    }
  };

  const refundNote = (b) => getRefundMethod(b.paymentMethod);

  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      <h1 className="text-3xl mb-6 font-bold text-navy">My Bookings</h1>
      <div className="flex gap-2 mb-6">
        {TABS.map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-full border transition ${
              tab === t ? 'bg-navy text-gold border-gold font-semibold' : 'bg-white text-navy hover:bg-stone-50'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {error && <p className="text-red-600 mb-4">{error}</p>}
      {msg && <p className="text-green-700 mb-4">{msg}</p>}
      {cancelNotice && <p className="text-green-700 text-sm mb-4">Cancellation notice sent.</p>}

      {loading ? (
        <p className="text-gray-500">Loading…</p>
      ) : filtered.length === 0 ? (
        <p className="text-gray-500 bg-white rounded shadow p-6 text-center">No bookings yet.</p>
      ) : (
        <div className="grid gap-4">
          {filtered.map(b => {
            const policy = getBookingRefundPolicy(b);
            const cancellable = policy.allowed;
            const started = policy.hoursUntilStart <= 0;
            return (
              <div key={b.id} className="bg-white rounded shadow p-4 flex flex-col sm:flex-row gap-4">
                <img
                  src={b.hall?.images?.[0] || '/images/halls/hyderabad-banquet-hall/hyderabad-banquet-hall-1.jpg'}
                  alt={b.hallName}
                  loading="lazy"
                  className="w-full sm:w-40 h-28 object-cover rounded"
                  onError={(e) => { e.currentTarget.src = '/images/placeholder.svg'; }}
                />
                <div className="flex-1 text-sm">
                  <p className="font-bold text-navy text-base">{b.hallName}{b.venueName ? ` • ${b.venueName}` : ''}</p>
                  <p>ID: {b.id} • {b.eventType}</p>
                  <p>{b.date} • {b.startTime}–{b.endTime} • {b.guests} guests</p>
                  <p>
                    Amount: {inr(b.amount)} • Payment: {b.paymentStatus} •{' '}
                    <span className={b.status === 'CONFIRMED' ? 'text-green-700 font-semibold' : b.status === 'CANCELLED' ? 'text-red-600 font-semibold' : 'text-amber-600 font-semibold'}>
                      {b.status}
                    </span>
                  </p>
                  <p className="text-gray-600">
                    Paid via {(b.paymentMethod || 'UPI_ID').replaceAll('_', ' ')} {b.maskedInstrument ? `• ${b.maskedInstrument}` : ''}
                    {b.balanceDue > 0 ? ` • Due at venue: ${inr(b.balanceDue)}` : ''}
                  </p>
                  {b.status === 'PENDING_VERIFICATION' && (
                    <button
                      onClick={async () => {
                        await api(`/bookings/${b.id}/mark-paid`, { method: 'POST' });
                        setMsg('Marked as paid (admin mock).');
                        load();
                      }}
                      className="text-xs border border-amber-600 text-amber-700 rounded px-2 py-0.5 mt-1"
                    >
                      Admin mock: Mark as Paid
                    </button>
                  )}
                  {b.status === 'CONFIRMED' && (
                    <p className="text-xs text-gray-500 mt-1">Confirmation sent to {maskPhone(b.phone)} and {maskEmail(b.email)}</p>
                  )}
                  {started && b.status === 'CONFIRMED' && (
                    <p className="text-amber-600 mt-1">Cancellation is not available after the event has started.</p>
                  )}
                  {b.status === 'CANCELLED' && (
                    <p className="text-red-600 mt-1">
                      Cancelled • Refund: {inr(b.refundAmount)}{b.refundPercent != null ? ` (${b.refundPercent}%)` : ''} —{' '}
                      <strong>{b.refundStatus === 'PROCESSED' ? 'Refund processed' : b.refundAmount > 0 ? 'Refund pending' : 'No refund due'}</strong>{' '}
                      ({b.refundMethod || refundNote(b)})
                    </p>
                  )}
                  <div className="flex gap-2 mt-3 flex-wrap">
                    <button onClick={() => setView(view === b.id ? null : b.id)} className="border border-navy text-navy rounded px-3 py-1 hover:bg-stone-50">
                      {view === b.id ? 'Hide Details' : 'View Details'}
                    </button>
                    {b.status === 'CONFIRMED' && classify(b) === 'Upcoming' && (
                      <button
                        disabled={!cancellable}
                        onClick={() => setCancelFor(b)}
                        title={!cancellable && started ? 'Event has started' : ''}
                        className="border border-red-500 text-red-600 rounded px-3 py-1 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-red-50"
                      >
                        Cancel Booking
                      </button>
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
                      {b.status === 'CANCELLED' && (
                        <p>
                          Cancelled at {new Date(b.cancelledAt || b.cancelled_at).toLocaleString()} • Refund: {inr(b.refundAmount)} ({b.refundStatus === 'PROCESSED' ? 'Refund processed' : 'Refund pending'})
                        </p>
                      )}
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
          <div className="bg-white rounded p-6 max-w-md w-full shadow-xl">
            <h3 className="text-xl font-bold mb-2 text-navy">Cancel Booking?</h3>
            <p className="text-sm text-gray-600 mb-2">{cancelFor.hallName} • {cancelFor.date} {cancelFor.startTime}–{cancelFor.endTime}</p>
            {(() => {
              const p = getBookingRefundPolicy(cancelFor);
              const paid = Number(cancelFor.amountPaid ?? cancelFor.amount) || 0;
              const nonRefundable = Math.max(0, paid - p.refundAmount);
              return (
                <div className="bg-stone-50 border border-stone-200 rounded p-3 text-sm space-y-1 mb-3">
                  <p>Time left: <strong>{Math.max(0, Math.floor(p.hoursUntilStart))} hours</strong></p>
                  <p>Refund Percentage: <strong className="text-green-700">{p.refundPercent}%</strong></p>
                  <p>Refund Amount: <strong className="text-green-700">{inr(p.refundAmount)}</strong></p>
                  <p>Non-refundable Amount: <strong className="text-gray-700">{inr(nonRefundable)}</strong></p>
                  <p className="text-xs text-gray-500 pt-1">
                    Refund Status: <strong>{p.refundAmount > 0 ? 'Refund pending' : 'No refund due'}</strong> (Refund will be credited as per your payment method timeline).
                  </p>
                  {p.hoursUntilStart < 48 && (
                    <p className="text-amber-700 text-xs bg-amber-50 border border-amber-300 rounded px-2 py-1 mt-1">
                      Cancelling within 48 hours of the event start gives a 50% refund.
                    </p>
                  )}
                </div>
              );
            })()}
            <div className="flex justify-end gap-3">
              <button onClick={() => setCancelFor(null)} className="border border-gray-300 rounded px-4 py-2 text-sm">Keep Booking</button>
              <button onClick={doCancel} disabled={cancelling} className="bg-red-600 text-white rounded px-4 py-2 text-sm font-semibold disabled:opacity-50">
                {cancelling ? 'Cancelling…' : 'Confirm Cancellation'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
