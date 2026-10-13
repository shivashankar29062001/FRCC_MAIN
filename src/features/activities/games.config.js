// ---------------------------------------------------------------------------
// /features/activities/games.config.js — THE SINGLE SOURCE OF TRUTH for
// Activities/Games. Every value is an editable placeholder.
// The listing page, the booking flow, pricing and availability all read
// from here, so adding or retuning a game means editing this file only.
//
// Game shape:
//   id, name, category ('indoor' | 'outdoor' | 'kids' | 'water'),
//   imageKey (slot in /src/config/images.js), blurb, level tag,
//   slotMinutes (slot length), hours { open, close } (24h, close exclusive),
//   pricePerSlot (INR), maxPlayers (capacity), playerLabel,
//   rentalPrice (optional equipment hire, INR),
//   extraFields (game-specific form fields, see FIELD TYPES below),
//   rules (Rules and safety notes), cancellationNote.
// ---------------------------------------------------------------------------

import { MEMBER_DISCOUNT, MEMBER_DISCOUNT_LABEL } from '../../config/pricing.js';
import { calculateTotal } from '../../utils/pricing.js';

export const GAME_CATEGORIES = Object.freeze({
  indoor: 'Indoor',
  outdoor: 'Outdoor',
  kids: 'Kids',
  water: 'Water',
});

// Filter chips on the listing page (All + one per category).
export const GAME_FILTERS = Object.freeze(['all', 'indoor', 'outdoor', 'kids', 'water']);

export const TAX_RATE = 0.18; // 18% GST
export const MEMBER_DISCOUNT_RATE = MEMBER_DISCOUNT;

// FIELD TYPES for extraFields:
//   select   { options: [{ value, label, price?, multiplier? }] }
//   number   { min, max, placeholder? }
//   text|tel { placeholder?, hint? }
//   checkbox { price? (added when checked), ack? (rules acknowledgement copy) }
// A `multiplier` on a selected option scales the base slot price
// (e.g. 2-hour kids play, half-ground football).

export const GAMES = [
  {
    id: 'badminton',
    name: 'Badminton',
    category: 'indoor',
    imageKey: 'badminton',
    blurb: 'Four indoor wooden courts with floodlights and rackets on hire.',
    level: 'All levels',
    slotMinutes: 60,
    hours: { open: 6, close: 22 },
    pricePerSlot: 300,
    maxPlayers: 4,
    playerLabel: 'Players',
    rentalPrice: 50,
    extraFields: [
      { id: 'court', label: 'Court number', type: 'select', required: true, options: ['Court 1', 'Court 2', 'Court 3', 'Court 4'] },
    ],
    rules: ['Non-marking shoes only on wooden courts.', 'Report 10 minutes before your slot; late arrival shortens play.'],
    cancellationNote: 'Free cancellation up to 6 hours before the slot.',
  },
  {
    id: 'tennis',
    name: 'Tennis',
    category: 'outdoor',
    imageKey: 'tennis',
    blurb: 'Two clay courts with evening lighting and a ball machine on request.',
    level: 'Intermediate',
    slotMinutes: 60,
    hours: { open: 6, close: 21 },
    pricePerSlot: 500,
    maxPlayers: 4,
    playerLabel: 'Players',
    rentalPrice: 100,
    extraFields: [
      { id: 'court', label: 'Court number', type: 'select', required: true, options: ['Court 1', 'Court 2'] },
    ],
    rules: ['Clay-court shoes recommended; hard soles damage the surface.', 'Play stops during heavy rain — slots are rescheduled, not refunded.'],
    cancellationNote: 'Free cancellation up to 6 hours before the slot.',
  },
  {
    id: 'cricket',
    name: 'Cricket',
    category: 'outdoor',
    imageKey: 'cricket',
    blurb: 'Full ground for matches plus covered nets for evening practice.',
    level: 'All levels',
    slotMinutes: 120,
    hours: { open: 6, close: 20 },
    pricePerSlot: 1500,
    maxPlayers: 22,
    playerLabel: 'Players (both teams)',
    rentalPrice: 150,
    extraFields: [
      {
        id: 'format', label: 'Ground or net practice', type: 'select', required: true,
        options: [{ value: 'ground', label: 'Full ground' }, { value: 'nets', label: 'Net practice' }],
      },
      { id: 'teamSize', label: 'Team size (per side)', type: 'number', required: true, min: 2, max: 11, placeholder: 'e.g. 11' },
    ],
    rules: ['Spikes allowed on the ground only, never in the nets.', 'Own tennis-ball kits welcome; leather balls issued at the counter.'],
    cancellationNote: 'Free cancellation up to 24 hours before the slot.',
  },
  {
    id: 'table-tennis',
    name: 'Table Tennis',
    category: 'indoor',
    imageKey: 'table-tennis',
    blurb: 'Six tournament tables with barriers, bats and balls on hire.',
    level: 'All levels',
    slotMinutes: 30,
    hours: { open: 7, close: 22 },
    pricePerSlot: 150,
    maxPlayers: 4,
    playerLabel: 'Players',
    rentalPrice: 30,
    extraFields: [
      { id: 'table', label: 'Table number', type: 'select', required: true, options: ['Table 1', 'Table 2', 'Table 3', 'Table 4', 'Table 5', 'Table 6'] },
    ],
    rules: ['One table per booking; doubles share a single 30-minute slot.', 'Please return bats and balls to the counter after play.'],
    cancellationNote: 'Free cancellation up to 2 hours before the slot.',
  },
  {
    id: 'volleyball',
    name: 'Volleyball',
    category: 'outdoor',
    imageKey: 'volleyball',
    blurb: 'Two sand-dressed outdoor courts with evening floodlights.',
    level: 'All levels',
    slotMinutes: 60,
    hours: { open: 6, close: 21 },
    pricePerSlot: 400,
    maxPlayers: 12,
    playerLabel: 'Players (both teams)',
    rentalPrice: 50,
    extraFields: [
      { id: 'court', label: 'Court number', type: 'select', required: true, options: ['Court A', 'Court B'] },
      { id: 'teamSize', label: 'Team size (per side)', type: 'number', required: true, min: 2, max: 6, placeholder: 'e.g. 6' },
    ],
    rules: ['Barefoot or sand socks only — no studded footwear.', 'Nets are lowered outside booked hours; staff set them up per slot.'],
    cancellationNote: 'Free cancellation up to 6 hours before the slot.',
  },
  {
    id: 'chess',
    name: 'Chess',
    category: 'indoor',
    imageKey: 'chess',
    blurb: 'Quiet indoor lounge with tournament sets and clocks on request.',
    level: 'All levels',
    slotMinutes: 60,
    hours: { open: 8, close: 21 },
    pricePerSlot: 100,
    maxPlayers: 2,
    playerLabel: 'Players',
    rentalPrice: 0,
    extraFields: [
      { id: 'table', label: 'Table number', type: 'select', required: true, options: ['Table 1', 'Table 2', 'Table 3', 'Table 4'] },
    ],
    rules: ['Silence please — the lounge hosts simultaneous casual games.', 'Tournament clocks available free at the counter.'],
    cancellationNote: 'Free cancellation up to 2 hours before the slot.',
  },
  {
    id: 'carom',
    name: 'Carom',
    category: 'indoor',
    imageKey: 'carom',
    blurb: 'Club-grade carom boards in the indoor games room.',
    level: 'All levels',
    slotMinutes: 60,
    hours: { open: 8, close: 22 },
    pricePerSlot: 120,
    maxPlayers: 4,
    playerLabel: 'Players',
    rentalPrice: 0,
    extraFields: [
      { id: 'table', label: 'Board number', type: 'select', required: true, options: ['Board 1', 'Board 2', 'Board 3', 'Board 4'] },
    ],
    rules: ['Powder provided; please keep boards dry and covered after use.', 'Singles and doubles welcome on the same hourly slot.'],
    cancellationNote: 'Free cancellation up to 2 hours before the slot.',
  },
  {
    id: 'golf',
    name: 'Golf',
    category: 'outdoor',
    imageKey: 'golf',
    blurb: 'Nine-hole course with tee-time slots, buggy and equipment hire.',
    level: 'Members & guests',
    slotMinutes: 60,
    hours: { open: 6, close: 18 },
    pricePerSlot: 900,
    maxPlayers: 4,
    playerLabel: 'Players (max 4 per tee time)',
    rentalPrice: 300,
    extraFields: [
      { id: 'players', label: 'Number of players', type: 'number', required: true, min: 1, max: 4, placeholder: '1–4' },
      { id: 'buggy', label: 'Buggy hire (+₹500)', type: 'checkbox', price: 500, hint: 'Shared buggy for the full tee time.' },
      { id: 'equipment', label: 'Equipment rental (+₹300)', type: 'checkbox', price: 300, hint: 'Half-set, balls and tees included.' },
    ],
    rules: ['Collared shirts and soft spikes; denim not permitted on the course.', 'Tee times start sharp — late groups join from the next available tee.'],
    cancellationNote: 'Free cancellation up to 24 hours before the tee time.',
  },
  {
    id: 'swimming-pool',
    name: 'Swimming Pool',
    category: 'water',
    imageKey: 'swimming-pool',
    blurb: 'Temperature-controlled 25 m pool with coached batches and lanes.',
    level: 'All levels',
    slotMinutes: 60,
    hours: { open: 6, close: 20 },
    pricePerSlot: 250,
    maxPlayers: 20,
    playerLabel: 'Swimmers',
    rentalPrice: 50,
    extraFields: [
      { id: 'adults', label: 'Adults', type: 'number', required: true, min: 0, max: 20, placeholder: 'e.g. 2' },
      { id: 'children', label: 'Children (under 12)', type: 'number', required: true, min: 0, max: 20, placeholder: 'e.g. 1' },
      {
        id: 'swimwearAck', label: 'Swimwear & safety rules', type: 'checkbox', required: true, ack: true,
        ackText: 'I confirm proper swimwear and a pre-swim shower for everyone in this booking, and that children stay in the shallow section unless accompanied by an adult.',
      },
    ],
    rules: ['Proper swimwear and a shower before entering — no exceptions.', 'Maximum 20 swimmers per batch; lifeguard instructions are final.'],
    cancellationNote: 'Free cancellation up to 6 hours before the batch.',
  },
  {
    id: 'kids-play-area',
    name: 'Kids Play Area',
    category: 'kids',
    imageKey: 'kids-play-area',
    blurb: 'Supervised indoor play zone with slides, ball pit and soft flooring.',
    level: 'Ages 3–10',
    slotMinutes: 60,
    hours: { open: 9, close: 20 },
    pricePerSlot: 200,
    maxPlayers: 10,
    playerLabel: 'Children',
    rentalPrice: 0,
    extraFields: [
      {
        id: 'duration', label: 'Duration', type: 'select', required: true,
        options: [
          { value: '1hr', label: '1 hour', multiplier: 1 },
          { value: '2hr', label: '2 hours', multiplier: 2 },
        ],
      },
      { id: 'ages', label: 'Child age(s)', type: 'text', required: true, placeholder: 'e.g. 4, 6, 7' },
      { id: 'guardian', label: 'Guardian name', type: 'text', required: true, placeholder: 'Full name', hint: 'Must stay on premises during play.' },
      { id: 'guardianMobile', label: 'Guardian mobile', type: 'tel', required: true, placeholder: '10-digit mobile number' },
      {
        id: 'safetyAck', label: 'Safety rules', type: 'checkbox', required: true, ack: true,
        ackText: 'I confirm the children are aged 3–10, socks are worn inside the zone, and a guardian stays on the premises for the whole session.',
      },
    ],
    rules: ['Ages 3–10 only; socks mandatory, shoes stay outside.', 'One guardian per group must remain on the premises throughout.'],
    cancellationNote: 'Free cancellation up to 4 hours before the session.',
  },
  {
    id: 'football',
    name: 'Football',
    category: 'outdoor',
    imageKey: 'football',
    blurb: 'Floodlit natural-turf ground, bookable full or half for matches.',
    level: 'All levels',
    slotMinutes: 60,
    hours: { open: 6, close: 21 },
    pricePerSlot: 800,
    maxPlayers: 22,
    playerLabel: 'Players (both teams)',
    rentalPrice: 100,
    extraFields: [
      {
        id: 'ground', label: 'Ground size', type: 'select', required: true,
        options: [
          { value: 'full', label: 'Full ground', multiplier: 1 },
          { value: 'half', label: 'Half ground', multiplier: 0.6 },
        ],
      },
      { id: 'teamSize', label: 'Team size (per side)', type: 'number', required: true, min: 3, max: 11, placeholder: 'e.g. 7' },
    ],
    rules: ['Studded boots allowed on turf; change off-turf before entering the lobby.', 'Bib sets issued at the counter against a refundable deposit.'],
    cancellationNote: 'Free cancellation up to 24 hours before the slot.',
  },
];

export function gameById(id) {
  return GAMES.find((g) => g.id === id) || null;
}

/**
 * Price quote for a game + selections.
 * @param {object} game config entry
 * @param {{ extras?: object, equipment?: boolean }} selections
 * @param {boolean} isMember — member-price line.
 * @returns {{ lines: Array<{label: string, value: number}>, total: number }}
 */
export function quotePrice(game, selections = {}, isMember = false) {
  const extras = selections.extras || {};
  let multiplier = 1;
  for (const f of game.extraFields) {
    if ((f.type === 'select') && f.options?.length && typeof f.options[0] === 'object') {
      const chosen = f.options.find((o) => o.value === extras[f.id]);
      if (chosen?.multiplier) multiplier = chosen.multiplier;
    }
  }
  const base = Math.round(game.pricePerSlot * multiplier);
  const itemLines = [];
  itemLines.push({ label: `${game.name} · ${game.slotMinutes} min slot`, value: base });

  let addOns = 0;
  for (const f of game.extraFields) {
    if (f.type !== 'checkbox' || !f.price || !extras[f.id]) continue;
    addOns += f.price;
    itemLines.push({ label: f.label.replace(/\s*\(\+₹[\d,]+\)\s*$/, ''), value: f.price });
  }
  if (selections.equipment && game.rentalPrice > 0) {
    addOns += game.rentalPrice;
    itemLines.push({ label: 'Equipment rental', value: game.rentalPrice });
  }

  const subtotal = base + addOns;
  const pricing = calculateTotal(subtotal, isMember);

  const lines = [];
  if (itemLines.length > 1) {
    lines.push(...itemLines);
  }
  lines.push({ label: 'Subtotal', value: pricing.subtotal });
  if (isMember && pricing.discount > 0) {
    lines.push({ label: MEMBER_DISCOUNT_LABEL, value: -pricing.discount });
  }

  return {
    lines,
    subtotal: pricing.subtotal,
    discount: pricing.discount,
    total: pricing.total,
  };
}

export function formatINR(n) {
  const v = Number(n) || 0;
  return v < 0 ? `−₹${Math.abs(v).toLocaleString('en-IN')}` : `₹${v.toLocaleString('en-IN')}`;
}
