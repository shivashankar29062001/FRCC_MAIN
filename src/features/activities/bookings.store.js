// ---------------------------------------------------------------------------
// /features/activities/bookings.store.js — Activities Booking Store
// Directly integrates with Supabase database RPCs (create_activity_booking,
// cancel_activity_booking) and queries.
// LocalStorage and client-side mock data for bookings have been completely removed.
// ---------------------------------------------------------------------------

import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../../services/supabase.js';
import { getUserBookings, getUserPayments } from '../../services/bookingsService.js';
import { readSession } from '../../app/session.js';

export const CHANGED_EVENT = 'frcc:activity-bookings-changed';

// Clean legacy localStorage keys on startup so stale mock bookings are not kept
try {
  if (typeof window !== 'undefined' && window.localStorage) {
    const keysToRemove = [];
    for (let i = 0; i < window.localStorage.length; i += 1) {
      const k = window.localStorage.key(i);
      if (k && k.startsWith('frcc.activities.bookings.')) {
        keysToRemove.push(k);
      }
    }
    keysToRemove.forEach((k) => window.localStorage.removeItem(k));
  }
} catch {
  /* ignore */
}

/**
 * Creates an activity booking atomically in Supabase via RPC create_activity_booking.
 * Enforces database-level advisory locking, availability, and duplicate prevention.
 *
 * @param {{
 *   gameId: string,
 *   date: string,
 *   slot: string,
 *   players: number,
 *   userName?: string,
 *   mobile?: string,
 *   email?: string,
 *   paymentMethod?: string,
 *   details?: object
 * }} params
 * @returns {Promise<object>} The created booking row
 */
export async function createActivityBookingRemote({
  gameId,
  date,
  slot,
  players = 1,
  userName = null,
  mobile = null,
  email = null,
  paymentMethod = 'upi',
  details = {},
}) {
  const { data, error } = await supabase.rpc('create_activity_booking', {
    p_game_id: gameId,
    p_date: date,
    p_slot: slot,
    p_players: Number(players || 1),
    p_user_name: userName || null,
    p_mobile: mobile || null,
    p_email: email || null,
    p_payment_method: paymentMethod || 'upi',
    p_details: details || {},
  });

  if (error) {
    throw error;
  }

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(CHANGED_EVENT));
  }

  return data;
}

/**
 * Cancels an activity booking in Supabase and immediately frees slot capacity.
 * @param {string} bookingId
 * @returns {Promise<object>}
 */
export async function cancelActivityBookingRemote(bookingId) {
  if (!bookingId) throw new Error('Booking ID is required.');

  const { data, error } = await supabase.rpc('cancel_activity_booking', {
    p_booking_id: bookingId,
  });

  if (error) {
    throw error;
  }

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(CHANGED_EVENT));
  }

  return data;
}

/**
 * Backward-compatible helper to save an activity booking directly to Supabase.
 */
export async function saveActivityBooking({ booking, payment }) {
  const record = await createActivityBookingRemote({
    gameId: booking.game || booking.gameId,
    date: booking.date,
    slot: booking.slot,
    players: booking.players,
    userName: booking.userName || booking.name,
    mobile: booking.mobile,
    email: booking.email,
    paymentMethod: booking.paymentMethod || payment?.method || 'upi',
    details: {
      ...booking.extras,
      gameName: booking.gameName,
    },
  });

  return { booking: record, payment: null };
}

/**
 * Reactive reader for user activity bookings and payment history directly from Supabase.
 * @param {string|object|null} currentUserOrId
 */
export function useActivityBookings(currentUserOrId = null) {
  const activeUserId =
    typeof currentUserOrId === 'object' && currentUserOrId !== null
      ? (currentUserOrId.id || currentUserOrId.userId || null)
      : (currentUserOrId || (typeof window !== 'undefined' ? (readSession()?.id || null) : null));

  const [bookings, setBookings] = useState([]);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchRemote = useCallback(async () => {
    if (!activeUserId) {
      setBookings([]);
      setPayments([]);
      return;
    }

    setLoading(true);
    try {
      const [remoteBookings, remotePayments] = await Promise.all([
        getUserBookings(activeUserId),
        getUserPayments(activeUserId),
      ]);
      setBookings(remoteBookings);
      setPayments(remotePayments);
      setError(null);
    } catch (err) {
      console.warn('Could not sync remote bookings from database:', err);
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [activeUserId]);

  useEffect(() => {
    fetchRemote();
    const reload = () => fetchRemote();
    window.addEventListener(CHANGED_EVENT, reload);
    return () => {
      window.removeEventListener(CHANGED_EVENT, reload);
    };
  }, [fetchRemote]);

  return {
    bookings,
    payments,
    loading,
    error,
    refresh: fetchRemote,
  };
}
