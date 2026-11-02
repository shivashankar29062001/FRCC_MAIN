// ---------------------------------------------------------------------------
// Activities/Games booking store — state + localStorage + Supabase sync.
// Persists bookings and payments to Supabase while keeping local state responsive.
// ---------------------------------------------------------------------------

import { useCallback, useEffect, useState } from 'react';
import { createBooking as createBookingInSupabase, getUserBookings, getUserPayments } from '../../services/bookingsService.js';
import { readSession } from '../../app/session.js';

export const BASE_BOOKINGS_STORAGE_KEY = 'frcc.activities.bookings.v1';
export const BOOKINGS_STORAGE_KEY = BASE_BOOKINGS_STORAGE_KEY;
const CHANGED_EVENT = 'frcc:activity-bookings-changed';

// Clean legacy non-user-specific storage key on load once
try {
  if (typeof window !== 'undefined' && window.localStorage) {
    window.localStorage.removeItem(BASE_BOOKINGS_STORAGE_KEY);
  }
} catch {
  /* ignore */
}

export function getBookingsStorageKey(userId) {
  return userId ? `${BASE_BOOKINGS_STORAGE_KEY}.${userId}` : `${BASE_BOOKINGS_STORAGE_KEY}.anon`;
}

function safeParse(raw) {
  try {
    const v = raw ? JSON.parse(raw) : null;
    if (v && Array.isArray(v.bookings) && Array.isArray(v.payments)) return v;
    return null;
  } catch {
    return null;
  }
}

export function readStore(userId = null) {
  if (typeof window === 'undefined') return { bookings: [], payments: [] };
  try {
    const key = getBookingsStorageKey(userId);
    return safeParse(window.localStorage.getItem(key)) || { bookings: [], payments: [] };
  } catch {
    return { bookings: [], payments: [] };
  }
}

function writeStore(next, userId = null) {
  try {
    const key = getBookingsStorageKey(userId);
    window.localStorage.setItem(key, JSON.stringify(next));
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
  const currentUserId = booking?.userId || booking?.user_id || null;
  const store = readStore(currentUserId);
  const record = {
    ...booking,
    userId: currentUserId,
    user_id: currentUserId,
    category: booking.category || 'activity',
    createdAt: booking.createdAt || new Date().toISOString(),
  };
  paySeq += 1;
  const payRecord = payment
    ? {
        id: `PAY-${paySeq}`,
        bookingId: record.bookingId,
        userId: currentUserId,
        user_id: currentUserId,
        ...payment,
        date: new Date().toISOString(),
      }
    : null;

  writeStore(
    {
      bookings: [record, ...store.bookings.filter((b) => b.bookingId !== record.bookingId)],
      payments: payRecord ? [payRecord, ...store.payments.filter((p) => p.id !== payRecord.id)] : store.payments,
    },
    currentUserId
  );

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
export function useActivityBookings(currentUserOrId = null) {
  const activeUserId = typeof currentUserOrId === 'object' && currentUserOrId !== null
    ? (currentUserOrId.id || currentUserOrId.userId || null)
    : (currentUserOrId || (typeof window !== 'undefined' ? (readSession()?.id || null) : null));

  const [store, setStore] = useState(() => (activeUserId ? readStore(activeUserId) : { bookings: [], payments: [] }));

  const fetchRemote = useCallback(async () => {
    if (!activeUserId) {
      setStore({ bookings: [], payments: [] });
      return;
    }
    try {
      const [remoteBookings, remotePayments] = await Promise.all([
        getUserBookings(activeUserId),
        getUserPayments(activeUserId),
      ]);

      if (remoteBookings.length > 0 || remotePayments.length > 0) {
        const local = readStore(activeUserId);
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
          window.localStorage.setItem(getBookingsStorageKey(activeUserId), JSON.stringify(merged));
        } catch {
          /* ignore */
        }
        setStore(merged);
      }
    } catch (err) {
      console.warn('Could not sync remote bookings:', err);
    }
  }, [activeUserId]);

  useEffect(() => {
    if (!activeUserId) {
      setStore({ bookings: [], payments: [] });
      return undefined;
    }

    setStore(readStore(activeUserId));
    const reload = () => setStore(readStore(activeUserId));
    window.addEventListener(CHANGED_EVENT, reload);
    window.addEventListener('storage', reload);
    fetchRemote();

    return () => {
      window.removeEventListener(CHANGED_EVENT, reload);
      window.removeEventListener('storage', reload);
    };
  }, [activeUserId, fetchRemote]);

  const refresh = useCallback(() => {
    if (!activeUserId) {
      setStore({ bookings: [], payments: [] });
      return;
    }
    setStore(readStore(activeUserId));
    fetchRemote();
  }, [activeUserId, fetchRemote]);

  return {
    bookings: activeUserId ? store.bookings : [],
    payments: activeUserId ? store.payments : [],
    refresh,
  };
}
