// ---------------------------------------------------------------------------
// /src/data/activities.js — FRCC Sports & Activities Games Data
// ---------------------------------------------------------------------------

export const games = [
  {
    id: 'badminton',
    name: 'Badminton',
    category: 'indoor',
    price: 1500,
    pricePerSlot: 1500,
    pricingUnit: 'per-session', // Client: pricingUnit "per-session", price 1500
    unit: 'per-session',
    slotMinutes: 60, // SAMPLE
    openFrom: '06:00',
    openTo: '22:00',
    maxPlayers: 4,
    imageKey: 'badminton',
    blurb: 'Four indoor wooden courts with floodlights and rackets on hire.',
    level: 'All levels',
    hours: { open: 6, close: 22 },
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
    price: 1500,
    pricePerSlot: 1500,
    pricingUnit: 'per-session', // Client: pricingUnit "per-session", price 1500
    unit: 'per-session',
    slotMinutes: 60, // SAMPLE
    openFrom: '06:00',
    openTo: '21:00',
    maxPlayers: 4,
    imageKey: 'tennis',
    blurb: 'Two clay courts with evening lighting and a ball machine on request.',
    level: 'Intermediate',
    hours: { open: 6, close: 21 },
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
    price: 1500,
    pricePerSlot: 1500,
    pricingUnit: 'per-session', // Client: pricingUnit "per-session", price 1500
    unit: 'per-session',
    slotMinutes: 60, // SAMPLE
    openFrom: '06:00',
    openTo: '20:00',
    maxPlayers: 22,
    imageKey: 'cricket',
    blurb: 'Full ground for matches plus covered nets for practice.',
    level: 'All levels',
    hours: { open: 6, close: 20 },
    playerLabel: 'Players (both teams)',
    rentalPrice: 150,
    extraFields: [
      {
        id: 'format',
        label: 'Ground or net practice',
        type: 'select',
        required: true,
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
    price: 1500,
    pricePerSlot: 1500,
    pricingUnit: 'per-session', // Client: pricingUnit "per-session", price 1500
    unit: 'per-session',
    slotMinutes: 60, // SAMPLE
    openFrom: '07:00',
    openTo: '22:00',
    maxPlayers: 4,
    imageKey: 'table-tennis',
    blurb: 'Six tournament tables with barriers, bats and balls on hire.',
    level: 'All levels',
    hours: { open: 7, close: 22 },
    playerLabel: 'Players',
    rentalPrice: 30,
    extraFields: [
      { id: 'table', label: 'Table number', type: 'select', required: true, options: ['Table 1', 'Table 2', 'Table 3', 'Table 4', 'Table 5', 'Table 6'] },
    ],
    rules: ['One table per booking; doubles share a single 60-minute slot.', 'Please return bats and balls to the counter after play.'],
    cancellationNote: 'Free cancellation up to 2 hours before the slot.',
  },
  {
    id: 'volleyball',
    name: 'Volleyball',
    category: 'outdoor',
    price: 1500,
    pricePerSlot: 1500,
    pricingUnit: 'per-session', // Client: pricingUnit "per-session", price 1500
    unit: 'per-session',
    slotMinutes: 60, // SAMPLE
    openFrom: '06:00',
    openTo: '21:00',
    maxPlayers: 12,
    imageKey: 'volleyball',
    blurb: 'Two sand-dressed outdoor courts with evening floodlights.',
    level: 'All levels',
    hours: { open: 6, close: 21 },
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
    price: 1500,
    pricePerSlot: 1500,
    pricingUnit: 'per-session', // Client: pricingUnit "per-session", price 1500
    unit: 'per-session',
    slotMinutes: 60, // SAMPLE
    openFrom: '08:00',
    openTo: '21:00',
    maxPlayers: 2,
    imageKey: 'chess',
    blurb: 'Quiet indoor lounge with tournament sets and clocks on request.',
    level: 'All levels',
    hours: { open: 8, close: 21 },
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
    price: 1500,
    pricePerSlot: 1500,
    pricingUnit: 'per-session', // Client: pricingUnit "per-session", price 1500
    unit: 'per-session',
    slotMinutes: 60, // SAMPLE
    openFrom: '08:00',
    openTo: '22:00',
    maxPlayers: 4,
    imageKey: 'carom',
    blurb: 'Club-grade carom boards in the indoor games room.',
    level: 'All levels',
    hours: { open: 8, close: 22 },
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
    price: 1500,
    pricePerSlot: 1500,
    pricingUnit: 'per-session', // Client: pricingUnit "per-session", price 1500
    unit: 'per-session',
    slotMinutes: 60, // SAMPLE
    openFrom: '06:00',
    openTo: '18:00',
    maxPlayers: 4,
    imageKey: 'golf',
    blurb: 'Nine-hole course with tee-time slots, buggy and equipment hire.',
    level: 'Members & guests',
    hours: { open: 6, close: 18 },
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
    pricingUnit: 'per-hour', // Client: pricingUnit "per-hour"
    price: 1000, // Client: price 1000
    pricePerSlot: 1000,
    slotMinutes: 60,
    unit: 'per-hour', // Client specified
    openFrom: '06:00',
    openTo: '20:00',
    maxPlayers: 20,
    imageKey: 'swimming-pool',
    blurb: 'Temperature-controlled 25 m pool with coached batches and lanes.',
    level: 'All levels',
    hours: { open: 6, close: 20 },
    playerLabel: 'Swimmers',
    rentalPrice: 50,
    extraFields: [
      {
        id: 'hours',
        label: 'Duration (Hours)',
        type: 'select',
        required: true,
        options: [
          { value: '1', label: '1 hour (₹1,000)' },
          { value: '2', label: '2 hours (₹2,000)' },
          { value: '3', label: '3 hours (₹3,000)' },
          { value: '4', label: '4 hours (₹4,000)' },
        ],
      },
      { id: 'adults', label: 'Adults', type: 'number', required: true, min: 0, max: 20, placeholder: 'e.g. 2' },
      { id: 'children', label: 'Children (under 12)', type: 'number', required: true, min: 0, max: 20, placeholder: 'e.g. 1' },
      {
        id: 'swimwearAck',
        label: 'Swimwear & safety rules',
        type: 'checkbox',
        required: true,
        ack: true,
        ackText: 'I confirm proper swimwear and a pre-swim shower for everyone in this booking, and that children stay in the shallow section unless accompanied by an adult.',
      },
    ],
    rules: ['Proper swimwear and a shower before entering — no exceptions.', 'Maximum 20 swimmers per batch; lifeguard instructions are final.'],
    cancellationNote: 'Free cancellation up to 6 hours before the batch.',
  },
  {
    id: 'kids-play-area',
    name: 'Kids Play Area',
    category: 'indoor',
    subCategory: 'kids',
    price: 1500,
    pricePerSlot: 1500,
    pricingUnit: 'per-session', // Client: pricingUnit "per-session", price 1500
    unit: 'per-session',
    slotMinutes: 60, // SAMPLE
    openFrom: '09:00',
    openTo: '20:00',
    maxPlayers: 10,
    imageKey: 'kids-play-area',
    blurb: 'Supervised indoor play zone with slides, ball pit and soft flooring.',
    level: 'Ages 3–10',
    hours: { open: 9, close: 20 },
    playerLabel: 'Children',
    rentalPrice: 0,
    extraFields: [
      {
        id: 'duration',
        label: 'Duration',
        type: 'select',
        required: true,
        options: [
          { value: '1hr', label: '1 hour', multiplier: 1 },
          { value: '2hr', label: '2 hours', multiplier: 2 },
        ],
      },
      { id: 'ages', label: 'Child age(s)', type: 'text', required: true, placeholder: 'e.g. 4, 6, 7' },
      { id: 'guardian', label: 'Guardian name', type: 'text', required: true, placeholder: 'Full name', hint: 'Must stay on premises during play.' },
      { id: 'guardianMobile', label: 'Guardian mobile', type: 'tel', required: true, placeholder: '10-digit mobile number' },
      {
        id: 'safetyAck',
        label: 'Safety rules',
        type: 'checkbox',
        required: true,
        ack: true,
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
    price: 1500,
    pricePerSlot: 1500,
    pricingUnit: 'per-session', // Client: pricingUnit "per-session", price 1500
    unit: 'per-session',
    slotMinutes: 60, // SAMPLE
    openFrom: '06:00',
    openTo: '21:00',
    maxPlayers: 22,
    imageKey: 'football',
    blurb: 'Floodlit natural-turf ground, bookable full or half for matches.',
    level: 'All levels',
    hours: { open: 6, close: 21 },
    playerLabel: 'Players (both teams)',
    rentalPrice: 100,
    extraFields: [
      {
        id: 'ground',
        label: 'Ground size',
        type: 'select',
        required: true,
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
  {
    id: 'squash',
    name: 'Squash',
    category: 'indoor',
    price: 1500,
    pricePerSlot: 1500,
    pricingUnit: 'per-session',
    unit: 'per-session',
    slotMinutes: 60,
    openFrom: '06:00', // SAMPLE
    openTo: '22:00', // SAMPLE
    maxPlayers: 4,
    imageKey: 'squash',
    blurb: 'Two international-standard glass-back squash courts with wooden flooring.', // SAMPLE
    level: 'All levels', // SAMPLE
    hours: { open: 6, close: 22 }, // SAMPLE
    playerLabel: 'Players', // SAMPLE
    rentalPrice: 50, // SAMPLE
    extraFields: [
      { id: 'court', label: 'Court number', type: 'select', required: true, options: ['Court 1', 'Court 2'] }, // SAMPLE
    ],
    rules: ['Non-marking indoor court shoes mandatory.', 'Report 10 minutes prior to your slot time.'], // SAMPLE
    cancellationNote: 'Free cancellation up to 6 hours before the slot.', // SAMPLE
  },
  {
    id: 'basketball',
    name: 'Basketball',
    category: 'outdoor',
    price: 1500,
    pricePerSlot: 1500,
    pricingUnit: 'per-session',
    unit: 'per-session',
    slotMinutes: 60,
    openFrom: '06:00', // SAMPLE
    openTo: '21:00', // SAMPLE
    maxPlayers: 10,
    imageKey: 'basketball',
    blurb: 'Full-size outdoor floodlit basketball court with tournament hoops.', // SAMPLE
    level: 'All levels', // SAMPLE
    hours: { open: 6, close: 21 }, // SAMPLE
    playerLabel: 'Players (both teams)', // SAMPLE
    rentalPrice: 50, // SAMPLE
    extraFields: [
      { id: 'court', label: 'Court format', type: 'select', required: true, options: ['Full court', 'Half court'] }, // SAMPLE
      { id: 'teamSize', label: 'Team size (per side)', type: 'number', required: true, min: 1, max: 5, placeholder: 'e.g. 5' }, // SAMPLE
    ],
    rules: ['Proper athletic basketball footwear required.', 'Balls issued at the sports reception against deposit.'], // SAMPLE
    cancellationNote: 'Free cancellation up to 6 hours before the slot.', // SAMPLE
  },
  {
    id: 'luxury-gym',
    name: 'Luxury Gym',
    category: 'fitness', // Client: category "fitness"
    priceFrom: 2000, // Client: priceFrom 2000
    priceTo: 3000, // Client: priceTo 3000
    pricePerSlot: 2000,
    slotMinutes: 60, // SAMPLE
    unit: 'month', // SAMPLE (confirm whether per month or session)
    pricingUnit: 'per-month', // SAMPLE
    tiers: [
      { id: 'standard', name: 'Standard', price: 2000, description: 'Cardio & strength equipment access' }, // SAMPLE tier
      { id: 'premium', name: 'Premium', price: 3000, description: 'Full gym, sauna, steam room & trainer consult' }, // SAMPLE tier
    ],
    openFrom: '06:00',
    openTo: '22:00',
    maxPlayers: 30,
    imageKey: 'facilityGym',
    blurb: 'State-of-the-art strength, cardio and functional training facilities with steam and sauna.',
    level: 'All fitness levels',
    hours: { open: 6, close: 22 },
    playerLabel: 'Members / Guests',
    rentalPrice: 0,
    extraFields: [
      {
        id: 'tier',
        label: 'Membership Tier',
        type: 'select',
        required: true,
        options: [
          { value: 'standard', label: 'Standard Tier (₹2,000 per month)', multiplier: 1 },
          { value: 'premium', label: 'Premium Tier (₹3,000 per month)', multiplier: 1.5 },
        ],
      },
    ],
    rules: ['Proper athletic gym attire and clean shoes required.', 'Carry your personal sweat towel.'],
    cancellationNote: 'Free cancellation up to 24 hours before the session.',
  },
];

export const GAMES = games;

export function getGameById(id) {
  return games.find((g) => g.id === id);
}

export function getGamesByCategory(category) {
  return games.filter((g) => g.category === category || g.subCategory === category);
}

export default {
  games,
  GAMES,
  getGameById,
  getGamesByCategory,
};
