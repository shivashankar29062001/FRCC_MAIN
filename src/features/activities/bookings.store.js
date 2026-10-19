// ---------------------------------------------------------------------------
// Activities/Games booking store — state + localStorage + Supabase sync.
// Persists bookings and payments to Supabase while keeping local state responsive.
// ---------------------------------------------------------------------------

import { useCallback, useEffect, useState } from 'react';
import { createBooking as createBookingInSupabase, getUserBookings, getUserPayments } from '../../services/bookingsService.js';

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
 * Persist a completed booking + its payment line to both localStorage and Supabase.
 * @returns {{ booking, payment }}
 */
export function saveActivityBooking({ booking, payment }) {
  const store = readStore();
  const record = {
    ...booking,
    category: booking.category || 'activity',
    createdAt: booking.createdAt || new Date().toISOString(),
  };
  paySeq += 1;
  const payRecord = payment
    ? { id: `PAY-${paySeq}`, bookingId: record.bookingId, ...payment, date: new Date().toISOString() }
    : null;

  writeStore({
    bookings: [record, ...store.bookings.filter((b) => b.bookingId !== record.bookingId)],
    payments: payRecord ? [payRecord, ...store.payments.filter((p) => p.id !== payRecord.id)] : store.payments,
  });

  // Sync to Supabase in the background
  createBookingInSupabase(record, payRecord)
    .then(() => {
      // Dispatch reload to fetch any server-side generated fields
      window.dispatchEvent(new CustomEvent(CHANGED_EVENT));
    })
    .catch((err) => {
      console.warn('Background Supabase booking sync error:', err);
    });

  return { booking: record, payment: payRecord };
}

/** Reactive reader — Profile and any other page stay in sync. */
export function useActivityBookings() {
  const [store, setStore] = useState(readStore);

  const fetchRemote = useCallback(async () => {
    try {
      const [remoteBookings, remotePayments] = await Promise.all([
        getUserBookings(),
        getUserPayments(),
      ]);

      if (remoteBookings.length > 0 || remotePayments.length > 0) {
        const local = readStore();
        // Merge without duplicating
        const bookingMap = new Map();
        [...local.bookings, ...remoteBookings].forEach((b) => {
          const key = b.bookingId || b.id;
          if (key && !bookingMap.has(key)) bookingMap.set(key, b);
        });

        const paymentMap = new Map();
        [...local.payments, ...remotePayments].forEach((p) => {
          const key = p.id || p.payment_id;
          if (key && !paymentMap.has(key)) paymentMap.set(key, p);
        });

        const merged = {
          bookings: Array.from(bookingMap.values()),
          payments: Array.from(paymentMap.values()),
        };

        try {
          window.localStorage.setItem(BOOKINGS_STORAGE_KEY, JSON.stringify(merged));
        } catch {
          /* ignore */
        }
        setStore(merged);
      }
    } catch (err) {
      console.warn('Could not sync remote bookings:', err);
    }
  }, []);

  useEffect(() => {
    const reload = () => setStore(readStore());
    window.addEventListener(CHANGED_EVENT, reload);
    window.addEventListener('storage', reload);
    fetchRemote();

    return () => {
      window.removeEventListener(CHANGED_EVENT, reload);
      window.removeEventListener('storage', reload);
    };
  }, [fetchRemote]);

  const refresh = useCallback(() => {
    setStore(readStore());
    fetchRemote();
  }, [fetchRemote]);

  return { bookings: store.bookings, payments: store.payments, refresh };
}
