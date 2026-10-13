// ---------------------------------------------------------------------------
// Slot availability for Activities/Games — ONE FILE.
// Generates per-game, per-date slots from games.config.js (hours + slot
// length) with a deterministic booked subset, so the grid is stable across
// reloads for the same game + date.
// ---------------------------------------------------------------------------

import { gameById } from './games.config.js';

function hashString(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i += 1) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

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
 * @param {string} gameId
 * @param {string} dateISO 'YYYY-MM-DD'
 * @returns {Array<{ time: string, booked: boolean }>}
 */
export function getSlots(gameId, dateISO) {
  const game = gameById(gameId);
  if (!game || !dateISO) return [];
  const { open, close } = game.hours;
  const len = game.slotMinutes;
  const seed = hashString(`${gameId}|${dateISO}`);

  const today = new Date();
  const todayISO = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  const nowMinutes = today.getHours() * 60 + today.getMinutes();
  const isToday = dateISO === todayISO;

  const slots = [];
  let i = 0;
  for (let m = open * 60; m + len <= close * 60; m += len, i += 1) {
    const time = toHHMM(m);
    // Deterministic: ~1 in 3 slots reads as booked for this game + date.
    const mockBooked = (seed + i * 7 + Math.floor(seed / (i + 3))) % 10 < 3;
    const past = isToday && m <= nowMinutes + 30; // 30-min booking buffer
    slots.push({ time, booked: mockBooked || past });
  }
  return slots;
}
