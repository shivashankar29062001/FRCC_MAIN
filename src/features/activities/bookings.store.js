// ---------------------------------------------------------------------------
// Activities/Games mock booking store — state + localStorage under ONE key,
// so a refresh keeps bookings and Profile reads the same data.
// Shape per booking:
//   { bookingId, userId, game, date, slot, players, extras, amount, status,
//     createdAt }   status: 'Confirmed' | 'Pending' | 'Cancelled'
// Payments: { id, bookingId, method, amount, date, status }.
// TODO(Phase 2): replace with POST/GET /api/activities/bookings and
//   GET /api/payments (server-issued IDs, receipts, cancellation).
// ---------------------------------------------------------------------------

import { useCallback, useEffect, useState } from 'react';

export const BOOKINGS_STORAGE_KEY = 'frcc.activities.bookings.v1';
const CHANGED_EVENT = 'frcc:activity-bookings-changed';

function safeParse(raw) {
  try {
    const v = raw ? JSON.parse(raw) : null;
    if (v && Array.isArray(v.bookings) && Array.isArray(v.payments)) return v;
    return null;
  } catch {
    return null;
  }
}

export function readStore() {
  if (typeof window === 'undefined') return { bookings: [], payments: [] };
  try {
    return safeParse(window.localStorage.getItem(BOOKINGS_STORAGE_KEY)) || { bookings: [], payments: [] };
  } catch {
    return { bookings: [], payments: [] };
  }
}

function writeStore(next) {
  try {
    window.localStorage.setItem(BOOKINGS_STORAGE_KEY, JSON.stringify(next));
  } catch {
    /* storage disabled — in-memory readers still work per load */
  }
  window.dispatchEvent(new CustomEvent(CHANGED_EVENT));
}

let paySeq = 5000;

/**
 * Persist a completed booking + its payment line.
 * @returns {{ booking, payment }}
 */
export function saveActivityBooking({ booking, payment }) {
  const store = readStore();
  const record = { ...booking, createdAt: booking.createdAt || new Date().toISOString() };
  paySeq += 1;
  // `date` is stored as an ISO timestamp; the UI formats it as DD/MM/YYYY, HH:MM.
  const payRecord = payment
    ? { id: `PAY-${paySeq}`, bookingId: record.bookingId, ...payment, date: new Date().toISOString() }
    : null;
  writeStore({
    bookings: [record, ...store.bookings],
    payments: payRecord ? [payRecord, ...store.payments] : store.payments,
  });
  return { booking: record, payment: payRecord };
}

/** Reactive reader — Profile and any other page stay in sync. */
export function useActivityBookings() {
  const [store, setStore] = useState(readStore);
  useEffect(() => {
    const reload = () => setStore(readStore());
    window.addEventListener(CHANGED_EVENT, reload);
    window.addEventListener('storage', reload);
    return () => {
      window.removeEventListener(CHANGED_EVENT, reload);
      window.removeEventListener('storage', reload);
    };
  }, []);
  const refresh = useCallback(() => setStore(readStore()), []);
  return { bookings: store.bookings, payments: store.payments, refresh };
}
