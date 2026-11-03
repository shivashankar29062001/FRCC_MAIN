// ---------------------------------------------------------------------------
// /features/activities/availability.service.js — Slot availability for Activities
// Authoritative slot availability from Supabase RPC get_slot_availability(game_id, date).
// ---------------------------------------------------------------------------

import { gameById } from './games.config.js';
import { supabase } from '../../services/supabase.js';

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
 * Fetch authoritative slot availability from database RPC get_slot_availability.
 * @param {string} gameId
 * @param {string} dateISO 'YYYY-MM-DD'
 * @returns {Promise<Array<{ time: string, range: string, capacity: number, bookedCount: number, remaining: number, status: string, booked: boolean }>>}
 */
export async function getSlotAvailability(gameId, dateISO) {
  if (!gameId || !dateISO) return [];

  try {
    const { data, error } = await supabase.rpc('get_slot_availability', {
      p_game_id: gameId,
      p_date: dateISO,
    });

    if (error) {
      console.warn('get_slot_availability RPC returned error:', error);
      throw error;
    }

    if (Array.isArray(data) && data.length > 0) {
      return data.map((s) => ({
        time: s.slot,
        range: s.slot_range || slotRange(gameId, s.slot),
        capacity: Number(s.capacity ?? 1),
        bookedCount: Number(s.booked_count ?? 0),
        remaining: Number(s.remaining ?? 0),
        status: s.status || (Number(s.remaining ?? 0) <= 0 ? 'full' : 'available'),
        booked: Number(s.remaining ?? 0) <= 0 || s.status === 'full',
      }));
    }
  } catch (err) {
    console.warn('Database slot availability fetch failed, falling back to local slots:', err);
    return getSlots(gameId, dateISO);
  }

  return getSlots(gameId, dateISO);
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
  const capacity = game.id === 'swimming-pool' ? 20 : game.id === 'kids-play-area' ? 15 : (game.maxPlayers || 4);

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
