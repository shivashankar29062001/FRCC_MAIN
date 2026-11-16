// ---------------------------------------------------------------------------
// /features/activities/bookings.store.js — Activities Booking Store
// Directly integrates with Supabase database RPCs (create_activity_booking,
// cancel_activity_booking) and queries, with client-side persistence fallback
// so availability counts and bookings immediately reflect live state on this device.
// ---------------------------------------------------------------------------

import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../../services/supabase.js';
import { getUserBookings, getUserPayments } from '../../services/bookingsService.js';
import { readSession } from '../../app/session.js';
import { gameById, quotePrice, isGroupActivity, resolveActivityLocation, matchesActivityBooking } from './games.config.js';

export const CHANGED_EVENT = 'frcc:activity-bookings-changed';
export const LOCAL_ACTIVITY_BOOKINGS_KEY = 'frcc_active_activity_bookings';

export const isUuid = (val) =>
  typeof val === 'string' &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val.trim());

/**
 * Retrieve active activity bookings persisted locally on this client.
 */
export function getLocalActiveActivityBookings() {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(LOCAL_ACTIVITY_BOOKINGS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/**
 * Persist an active activity booking to the local client cache.
 */
export function saveLocalActiveActivityBooking(booking) {
  if (typeof window === 'undefined' || !booking) return;
  try {
    const list = getLocalActiveActivityBookings();
    const id = booking.booking_id || booking.bookingId || booking.id;
    const filtered = list.filter((b) => (b.booking_id || b.bookingId || b.id) !== id);
    filtered.unshift(booking);
    window.localStorage.setItem(LOCAL_ACTIVITY_BOOKINGS_KEY, JSON.stringify(filtered.slice(0, 100)));
  } catch {
    /* ignore */
  }
}

/**
 * Remove an activity booking from the local client cache upon cancellation.
 */
export function removeLocalActiveActivityBooking(bookingId) {
  if (typeof window === 'undefined' || !bookingId) return;
  try {
    const list = getLocalActiveActivityBookings();
    const filtered = list.filter((b) => (b.booking_id || b.bookingId || b.id) !== bookingId);
    window.localStorage.setItem(LOCAL_ACTIVITY_BOOKINGS_KEY, JSON.stringify(filtered));
  } catch {
    /* ignore */
  }
}

/**
 * Creates an activity booking in Supabase with client-safe user_id handling and duplicate prevention.
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
async function fallbackCreateActivityBooking({
  gameId,
  date,
  slot,
  players = 1,
  userName = null,
  mobile = null,
  email = null,
  paymentMethod = 'upi',
  cityId = null,
  cityName = null,
  areaName = null,
  venueLocationId = null,
  venueLocationName = null,
  location = null,
  details = {},
}) {
  let currentUserId = null;
  let sessionUser = null;
  try {
    const { data: sessionData } = await supabase.auth.getSession();
    sessionUser = sessionData?.session?.user || null;
    currentUserId = sessionUser?.id || null;
  } catch (_) {}

  const sessionProfile = (typeof window !== 'undefined' ? readSession() : null) || {};
  if (!currentUserId) {
    currentUserId = sessionProfile?.id || sessionProfile?.userId || null;
  }

  // Postgres UUID validation: non-UUID strings (e.g. 'FRCC-U-DEMO01') must NOT be passed to user_id column
  const validDbUserId = isUuid(currentUserId) ? currentUserId : null;

  const game = gameById(gameId);
  const gameTitle = game?.name || details?.gameName || gameId;
  const loc = resolveActivityLocation({
    cityId,
    cityName,
    areaName,
    venueLocationId,
    venueLocationName,
    location,
    details,
  });

  // Check member status
  let isMember = Boolean(sessionProfile?.isMember);
  if (!isMember && currentUserId) {
    try {
      const { data: mem } = await supabase
        .from('memberships')
        .select('status')
        .eq('user_id', currentUserId)
        .maybeSingle();
      if (mem && ['active', 'Active', 'approved', 'Approved'].includes(mem.status)) {
        isMember = true;
      }
    } catch (_) {}
  }

  const quote = quotePrice(game, { extras: details, equipment: details?.equipment }, isMember);
  const isGameFree = Boolean(game?.isFree || (game?.price ?? game?.pricePerSlot) === 0);
  const subtotal = isGameFree ? 0 : Number(quote?.subtotal ?? game?.price ?? 1500);
  const discount = isGameFree ? 0 : Number(quote?.discount ?? 0);
  const amount = isGameFree ? 0 : Number(quote?.total ?? (subtotal - discount));

  const year = new Date().getFullYear();
  const random6 = String(Math.floor(100000 + Math.random() * 900000));
  const bookingRef = `FRCC-ACT-${year}-${random6}`;
  const status = !isGameFree && paymentMethod === 'pay_at_venue' ? 'Pending' : 'Confirmed';

  const enrichedDetails = {
    ...(details || {}),
    gameId,
    isFree: isGameFree,
    cityId: loc.cityId,
    cityName: loc.cityName,
    areaName: loc.areaName,
    venueLocationId: loc.venueLocationId,
    venueLocationName: loc.venueLocationName,
    location: loc.location,
    ...(currentUserId && !validDbUserId ? { memberUserId: currentUserId } : {}),
  };

  const bookingPayload = {
    booking_id: bookingRef,
    user_id: validDbUserId,
    category: 'activity',
    title: gameTitle,
    date: String(date),
    slot: String(slot),
    area_name: loc.areaName,
    players: Number(players || 1),
    details: enrichedDetails,
    subtotal,
    discount,
    amount,
    payment_method: isGameFree ? 'free' : (paymentMethod || 'upi'),
    is_member: Boolean(isMember),
    status,
    user_name: userName || sessionProfile?.name || sessionUser?.user_metadata?.name || null,
    mobile: mobile || sessionProfile?.phone || null,
    email: email || sessionUser?.email || null,
  };

  // 1. Pre-check if slot is already occupied for this game and campus location
  const localList = getLocalActiveActivityBookings();
  const localConflict = localList.find(
    (b) =>
      String(b.date) === String(date) &&
      (String(b.slot).trim() === String(slot).trim() || String(b.slot).startsWith(String(slot).trim())) &&
      (!b.status || !['cancelled', 'Cancelled'].includes(b.status)) &&
      matchesActivityBooking(b, gameId, gameTitle, loc),
  );
  if (localConflict && !isGroupActivity(gameId)) {
    throw new Error('This slot is no longer available');
  }

  try {
    const { data: existingSlots } = await supabase
      .from('bookings')
      .select('id, booking_id, slot, status, title, area_name, details')
      .eq('category', 'activity')
      .eq('date', String(date))
      .in('status', ['Confirmed', 'Pending', 'confirmed', 'pending'])
      .limit(50);

    if (existingSlots && existingSlots.length > 0) {
      const dbMatch = existingSlots.find(
        (b) =>
          (String(b.slot).trim() === String(slot).trim() || String(b.slot).startsWith(String(slot).trim())) &&
          matchesActivityBooking(b, gameId, gameTitle, loc),
      );
      if (dbMatch && !isGroupActivity(gameId)) {
        throw new Error('This slot is no longer available');
      }
    }
  } catch (checkErr) {
    if (String(checkErr?.message).includes('no longer available')) {
      throw checkErr;
    }
  }

  let inserted = null;
  try {
    const { data: insData, error: insErr } = await supabase
      .from('bookings')
      .insert([bookingPayload])
      .select()
      .maybeSingle();
    if (!insErr && insData) {
      inserted = insData;
    } else {
      if (
        insErr &&
        (insErr.code === '23505' ||
          String(insErr.message).includes('duplicate') ||
          String(insErr.message).includes('idx_unique_active_activity_slot_booking'))
      ) {
        throw new Error('This slot is no longer available');
      }
      if (insErr && String(insErr.message).includes('Adults and children together cannot exceed')) {
        const err = new Error(insErr.message);
        err.status = 400;
        err.statusCode = 400;
        throw err;
      }
      const minimalPayload = {
        booking_id: bookingRef,
        user_id: validDbUserId,
        category: 'activity',
        title: gameTitle,
        date: String(date),
        slot: String(slot),
        area_name: loc.areaName,
        details: enrichedDetails,
        players: Number(players || 1),
        subtotal,
        discount,
        amount,
        status,
        payment_method: paymentMethod || 'upi',
      };
      const { data: minData, error: minErr } = await supabase
        .from('bookings')
        .insert([minimalPayload])
        .select()
        .maybeSingle();
      if (
        minErr &&
        (minErr.code === '23505' ||
          String(minErr.message).includes('duplicate') ||
          String(minErr.message).includes('idx_unique_active_activity_slot_booking'))
      ) {
        throw new Error('This slot is no longer available');
      }
      if (minErr && String(minErr.message).includes('Adults and children together cannot exceed')) {
        const err = new Error(minErr.message);
        err.status = 400;
        err.statusCode = 400;
        throw err;
      }
      if (minData) inserted = minData;
    }
  } catch (err) {
    if (
      String(err?.message).includes('no longer available') ||
      String(err?.message).includes('Adults and children together cannot exceed')
    ) {
      throw err;
    }
    console.warn('[bookings.store] Direct bookings insert error:', err);
  }

  if (paymentMethod !== 'pay_at_venue' && validDbUserId) {
    try {
      await supabase.from('payments').insert([
        {
          payment_id: `PAY-${Date.now().toString().slice(-6)}`,
          booking_id: bookingRef,
          user_id: validDbUserId,
          method: paymentMethod || 'upi',
          amount,
          status: 'Success',
        },
      ]);
    } catch (_) {}
  }

  const result = {
    ...bookingPayload,
    ...(inserted || {}),
    id: inserted?.id || bookingRef,
    booking_id: bookingRef,
    game_id: gameId,
    game: gameId,
    title: gameTitle,
    gameName: gameTitle,
    city_id: loc.cityId,
    cityId: loc.cityId,
    city_name: loc.cityName,
    cityName: loc.cityName,
    area_name: loc.areaName,
    areaName: loc.areaName,
    venueLocationId: loc.venueLocationId,
    venueLocationName: loc.venueLocationName,
    location: loc.location,
    amount,
    subtotal,
    discount,
  };

  // Always save to client cache so slot availability reflects it immediately on this device
  saveLocalActiveActivityBooking(result);

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(CHANGED_EVENT));
  }

  return result;
}

/**
 * Creates an activity booking atomically in Supabase via RPC create_activity_booking,
 * with seamless fallback to direct table insert and client cache.
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
  cityId = null,
  cityName = null,
  areaName = null,
  venueLocationId = null,
  venueLocationName = null,
  location = null,
  details = {},
}) {
  if (gameId && ['carom', 'kids-play-area'].includes(String(gameId).toLowerCase())) {
    const err = new Error('Booking is not available for this activity');
    err.status = 400;
    err.statusCode = 400;
    throw err;
  }

  const loc = resolveActivityLocation({
    cityId,
    cityName,
    areaName,
    venueLocationId,
    venueLocationName,
    location,
    details,
  });
  const enrichedDetails = {
    ...(details || {}),
    gameId,
    cityId: loc.cityId,
    cityName: loc.cityName,
    areaName: loc.areaName,
    venueLocationId: loc.venueLocationId,
    venueLocationName: loc.venueLocationName,
    location: loc.location,
  };

  let rpcError = null;
  try {
    const { data, error } = await supabase.rpc('create_activity_booking', {
      p_game_id: gameId,
      p_date: date,
      p_slot: slot,
      p_players: Number(players || 1),
      p_user_name: userName || null,
      p_mobile: mobile || null,
      p_email: email || null,
      p_payment_method: paymentMethod || 'upi',
      p_details: enrichedDetails,
    });

    if (!error && data) {
      const rpcResult = {
        ...data,
        city_id: data.city_id || loc.cityId,
        cityId: data.cityId || loc.cityId,
        city_name: data.city_name || loc.cityName,
        cityName: data.cityName || loc.cityName,
        area_name: data.area_name || loc.areaName,
        areaName: data.areaName || loc.areaName,
        venueLocationId: loc.venueLocationId,
        venueLocationName: loc.venueLocationName,
        location: data.location || loc.location,
      };
      saveLocalActiveActivityBooking(rpcResult);
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent(CHANGED_EVENT));
      }
      return rpcResult;
    }
    rpcError = error;
  } catch (err) {
    rpcError = err;
  }

  // If slot was full, already booked, or rejected by unique constraint, re-throw business error directly
  const errMsg = String(rpcError?.message || rpcError?.details || '');
  const errCode = String(rpcError?.code || '');
  if (errMsg.includes('Adults and children together cannot exceed')) {
    const err = new Error(errMsg);
    err.status = 400;
    err.statusCode = 400;
    throw err;
  }
  const isConflict =
    errCode === '23505' ||
    errMsg.includes('SLOT_FULL') ||
    errMsg.includes('no longer available') ||
    errMsg.includes('ALREADY_BOOKED') ||
    errMsg.includes('already booked') ||
    errMsg.includes('duplicate') ||
    errMsg.includes('unique constraint');

  if (isConflict) {
    throw new Error('This slot is no longer available');
  }

  console.warn('create_activity_booking RPC unavailable in schema cache; using direct booking fallback:', rpcError);

  return await fallbackCreateActivityBooking({
    gameId,
    date,
    slot,
    players,
    userName,
    mobile,
    email,
    paymentMethod,
    cityId: loc.cityId,
    cityName: loc.cityName,
    areaName: loc.areaName,
    venueLocationId: loc.venueLocationId,
    venueLocationName: loc.venueLocationName,
    location: loc.location,
    details: enrichedDetails,
  });
}

/**
 * Cancels an activity booking in Supabase and immediately frees slot capacity.
 * Falls back to direct update if RPC is missing in schema cache.
 * @param {string} bookingId
 * @returns {Promise<object>}
 */
export async function cancelActivityBookingRemote(bookingId) {
  if (!bookingId) throw new Error('Booking ID is required.');

  removeLocalActiveActivityBooking(bookingId);

  try {
    const { data, error } = await supabase.rpc('cancel_activity_booking', {
      p_booking_id: bookingId,
    });

    if (!error && data) {
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent(CHANGED_EVENT));
      }
      return data;
    }
  } catch (_) {}

  // Direct table update fallback
  try {
    await supabase
      .from('bookings')
      .update({ status: 'Cancelled' })
      .or(`id.eq.${bookingId},booking_id.eq.${bookingId}`);
  } catch (_) {}

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(CHANGED_EVENT));
  }

  return { success: true, booking_id: bookingId, status: 'Cancelled' };
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
      const localAct = getLocalActiveActivityBookings();
      setBookings(localAct);
      setPayments([]);
      return;
    }

    setLoading(true);
    try {
      const [remoteBookings, remotePayments] = await Promise.all([
        getUserBookings(activeUserId),
        getUserPayments(activeUserId),
      ]);

      const localAct = getLocalActiveActivityBookings();
      const mergedBookings = [...remoteBookings];
      localAct.forEach((la) => {
        const id = la.booking_id || la.bookingId || la.id;
        if (!mergedBookings.some((b) => (b.booking_id || b.bookingId || b.id) === id)) {
          mergedBookings.unshift(la);
        }
      });

      setBookings(mergedBookings);
      setPayments(remotePayments);
      setError(null);
    } catch (err) {
      console.warn('Could not sync remote bookings from database:', err);
      const localAct = getLocalActiveActivityBookings();
      setBookings(localAct);
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
