// ---------------------------------------------------------------------------
// /features/activities/availability.service.js — Slot availability for Activities
// Authoritative slot availability from Supabase RPC get_slot_availability(game_id, date)
// with direct live bookings query fallback and client cache so availability always reflects actual DB records.
// ---------------------------------------------------------------------------

import { gameById, isGroupActivity as isGroupGame, matchesActivityBooking } from './games.config.js';
import { supabase } from '../../services/supabase.js';
import { getLocalActiveActivityBookings } from './bookings.store.js';

function toMinutes(hhmm) {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

export function toHHMM(minutes) {
  const h = String(Math.floor(minutes / 60)).padStart(2, '0');
  const m = String(minutes % 60).padStart(2, '0');
  return `${h}:${m}`;
}

/** End time of a slot given the game's slot length. */
export function slotEnd(gameId, startHHMM) {
  const game = gameById(gameId);
  const len = game?.slotMinutes || 60;
  return toHHMM(toMinutes(startHHMM) + len);
}

/** "06:00 – 07:00" style range label. */
export function slotRange(gameId, startHHMM) {
  return `${startHHMM} – ${slotEnd(gameId, startHHMM)}`;
}

/**
 * Fetch authoritative slot availability from database RPC get_slot_availability,
 * with live direct query fallback to public.bookings and client cache.
 * For group activities (Swimming Pool, Kids Play Area, Gym), capacity decreases by the
 * number of swimmers / players booked (not just 1 per booking).
 *
 * @param {string} gameId
 * @param {string} dateISO 'YYYY-MM-DD'
 * @returns {Promise<Array<{ time: string, range: string, capacity: number, bookedCount: number, remaining: number, status: string, booked: boolean }>>}
 */
export async function getSlotAvailability(gameId, dateISO, locationInfo = null) {
  if (!gameId || !dateISO) return [];

  const game = gameById(gameId);
  const gameTitle = game?.name || gameId;
  const baseSlots = getSlots(gameId, dateISO);
  const isGroupActivity = isGroupGame(gameId);

  const activeBookings = [];

  // 1. Try authoritative database RPC when no campus-specific filter is needed
  let rpcSucceeded = false;
  if (!locationInfo) {
    try {
      const { data, error } = await supabase.rpc('get_slot_availability', {
        p_game_id: gameId,
        p_date: dateISO,
      });

      if (!error && Array.isArray(data) && data.length > 0) {
        rpcSucceeded = true;
        data.forEach((s) => {
          const count = Number(s.booked_count ?? 0);
          if (count > 0) {
            activeBookings.push({ slot: s.slot, players: count, booking_id: `rpc_${s.slot}` });
          }
        });
      }
    } catch (_) {
      // Fall through to direct table query
    }
  }

  // 2. Query public.bookings directly using existing schema columns (filtered by game and campus)
  if (!rpcSucceeded) {
    try {
      const { data: dbBookings, error: dbErr } = await supabase
        .from('bookings')
        .select('id, booking_id, slot, players, status, title, area_name, details')
        .eq('category', 'activity')
        .eq('date', String(dateISO))
        .in('status', ['Confirmed', 'Pending', 'confirmed', 'pending']);

      if (!dbErr && Array.isArray(dbBookings)) {
        dbBookings.forEach((b) => {
          if (matchesActivityBooking(b, gameId, gameTitle, locationInfo)) {
            activeBookings.push(b);
          }
        });
      }
    } catch (err) {
      console.warn('[availability.service] Direct bookings availability query failed:', err);
    }
  }

  // 3. Include confirmed bookings persisted on this device for the same game & campus
  try {
    const localBookings = getLocalActiveActivityBookings();
    localBookings.forEach((lb) => {
      const matchesDate = String(lb.date) === String(dateISO);
      const isCancelled = lb.status && ['cancelled', 'Cancelled'].includes(lb.status);
      if (matchesDate && !isCancelled && matchesActivityBooking(lb, gameId, gameTitle, locationInfo)) {
        const id = lb.booking_id || lb.bookingId || lb.id;
        const exists = activeBookings.some((ab) => (ab.booking_id || ab.bookingId || ab.id) === id);
        if (!exists) {
          activeBookings.push(lb);
        }
      }
    });
  } catch (_) {}

  // 4. Calculate live remaining capacity per slot (summing actual swimmers/players for group activities)
  return baseSlots.map((s) => {
    const slotBookings = activeBookings.filter((b) => {
      if (!b.slot) return false;
      const str = String(b.slot).trim();
      return str === s.time || str.startsWith(s.time);
    });

    const bookedCount = slotBookings.reduce((sum, b) => {
      if (isGroupActivity) {
        const count = Number(b.players || b.details?.players || b.guests || 1);
        return sum + (Number.isFinite(count) && count > 0 ? count : 1);
      }
      return sum + 1;
    }, 0);

    const remaining = Math.max(0, s.capacity - bookedCount);
    const booked = remaining <= 0;
    const status = booked ? 'full' : remaining <= 3 ? 'almost_full' : 'available';

    return {
      ...s,
      bookedCount,
      remaining,
      status,
      booked,
    };
  });
}

/**
 * Offline / local slot fallback based on game operating hours.
 * @param {string} gameId
 * @param {string} dateISO 'YYYY-MM-DD'
 * @returns {Array<{ time: string, range: string, capacity: number, bookedCount: number, remaining: number, status: string, booked: boolean }>}
 */
export function getSlots(gameId, dateISO) {
  const game = gameById(gameId);
  if (!game || !dateISO) return [];
  const { open, close } = game.hours || { open: 6, close: 22 };
  const len = game.slotMinutes || 60;
  const capacity = game.id === 'swimming-pool' ? 20 : game.id === 'kids-play-area' ? 15 : game.id === 'luxury-gym' ? 30 : 1;

  const today = new Date();
  const todayISO = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  const nowMinutes = today.getHours() * 60 + today.getMinutes();
  const isToday = dateISO === todayISO;

  const slots = [];
  for (let m = open * 60; m + len <= close * 60; m += len) {
    const time = toHHMM(m);
    const past = isToday && m <= nowMinutes + 15; // 15-min buffer
    const remaining = past ? 0 : capacity;
    const booked = past;
    const status = booked ? 'full' : 'available';

    slots.push({
      time,
      range: slotRange(gameId, time),
      capacity,
      bookedCount: past ? capacity : 0,
      remaining,
      status,
      booked,
    });
  }
  return slots;
}
