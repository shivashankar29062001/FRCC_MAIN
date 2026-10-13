// ---------------------------------------------------------------------------
// /utils/dates.js — ONE place for date formatting. The site shows every date as
// DD/MM/YYYY (page copy, booking summaries, receipts, profile tables).
//
// NOTE on date INPUTS: the booking bar types dates as DD/MM/YYYY itself (a
// masked text field), so every date the visitor sees and every date they enter
// is in one format. A native <input type="date"> cannot do that — the browser
// draws its own picker in its own locale (see MDN) — so the bar does not use
// one. Values are converted to/from 'YYYY-MM-DD' with parseDMY() below.
// ---------------------------------------------------------------------------

/** 'YYYY-MM-DD' → 'DD/MM/YYYY'. Returns '—' when there is no value. */
export function formatDMY(value) {
  if (!value) return '—';
  const [y, m, d] = String(value).slice(0, 10).split('-');
  if (!y || !m || !d) return String(value);
  return `${d}/${m}/${y}`;
}

/**
 * 'DD/MM/YYYY' → 'YYYY-MM-DD', or null when the text is not a real calendar
 * date (empty, half-typed, '31/02/2026'…). Used by the booking bar so the
 * field can be typed in the site's own date format and still hand the booking
 * flow the ISO value it expects.
 */
export function parseDMY(value) {
  const match = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(String(value || '').trim());
  if (!match) return null;
  const day = Number(match[1]);
  const month = Number(match[2]);
  const year = Number(match[3]);
  const iso = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  const check = new Date(`${iso}T00:00:00Z`);
  if (Number.isNaN(check.getTime())) return null;
  // Round-trip catches impossible days (31 February) that Date would roll over.
  if (check.getUTCFullYear() !== year || check.getUTCMonth() + 1 !== month || check.getUTCDate() !== day) return null;
  return iso;
}

/** ISO timestamp (or Date) → 'DD/MM/YYYY, HH:MM'. */
export function formatDMYTime(value) {
  if (!value) return '—';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return formatDMY(value);
  const pad = (n) => String(n).padStart(2, '0');
  return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()}, ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export default { formatDMY, parseDMY, formatDMYTime };
