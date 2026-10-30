/**
 * PARKPULSE 360° - Smart Vehicle Slot Parking Allotment System
 * Core Application Engine & Interactive Controls
 */

// ========================================================
// 1. DATA MODELS & INITIAL STATE
// ========================================================

const STORAGE_KEY = 'parkpulse_facility_state_v3';
const HISTORY_KEY = 'parkpulse_history_log_v3';

// Base slot definitions across Zone A and Zone B
const DEFAULT_SLOTS = [
  // Zone A - North Row (10 slots)
  { id: 'EV-01', zone: 'A', row: 'top', type: 'ev', name: 'EV Supercharge 01', rate: 4.5, dimensions: '2.8m × 5.2m', walkDistance: '12m', evCapable: true },
  { id: 'EV-02', zone: 'A', row: 'top', type: 'ev', name: 'EV Supercharge 02', rate: 4.5, dimensions: '2.8m × 5.2m', walkDistance: '14m', evCapable: true },
  { id: 'EV-03', zone: 'A', row: 'top', type: 'ev', name: 'EV Supercharge 03', rate: 4.5, dimensions: '2.8m × 5.2m', walkDistance: '16m', evCapable: true },
  { id: 'EV-04', zone: 'A', row: 'top', type: 'ev', name: 'EV Supercharge 04', rate: 4.5, dimensions: '2.8m × 5.2m', walkDistance: '18m', evCapable: true },
  { id: 'EV-05', zone: 'A', row: 'top', type: 'ev', name: 'EV Supercharge 05', rate: 4.5, dimensions: '2.8m × 5.2m', walkDistance: '20m', evCapable: true },
  { id: 'VIP-01', zone: 'A', row: 'top', type: 'vip', name: 'Accessible / Executive', rate: 4.0, dimensions: '3.2m × 5.5m', walkDistance: '8m', evCapable: false },
  { id: 'VIP-02', zone: 'A', row: 'top', type: 'vip', name: 'Accessible / Executive', rate: 4.0, dimensions: '3.2m × 5.5m', walkDistance: '10m', evCapable: false },
  { id: 'VIP-03', zone: 'A', row: 'top', type: 'vip', name: 'Executive Priority', rate: 4.0, dimensions: '3.2m × 5.5m', walkDistance: '12m', evCapable: false },
  { id: 'A-01', zone: 'A', row: 'top', type: 'car', name: 'Sedan Standard A1', rate: 3.0, dimensions: '2.6m × 5.0m', walkDistance: '22m', evCapable: false },
  { id: 'A-02', zone: 'A', row: 'top', type: 'car', name: 'Sedan Standard A2', rate: 3.0, dimensions: '2.6m × 5.0m', walkDistance: '24m', evCapable: false },

  // Zone A - South Row (10 slots)
  { id: 'EV-06', zone: 'A', row: 'bottom', type: 'ev', name: 'EV Supercharge 06', rate: 4.5, dimensions: '2.8m × 5.2m', walkDistance: '15m', evCapable: true },
  { id: 'EV-07', zone: 'A', row: 'bottom', type: 'ev', name: 'EV Supercharge 07', rate: 4.5, dimensions: '2.8m × 5.2m', walkDistance: '17m', evCapable: true },
  { id: 'EV-08', zone: 'A', row: 'bottom', type: 'ev', name: 'EV Supercharge 08', rate: 4.5, dimensions: '2.8m × 5.2m', walkDistance: '19m', evCapable: true },
  { id: 'A-03', zone: 'A', row: 'bottom', type: 'car', name: 'Sedan Standard A3', rate: 3.0, dimensions: '2.6m × 5.0m', walkDistance: '21m', evCapable: false },
  { id: 'A-04', zone: 'A', row: 'bottom', type: 'car', name: 'Sedan Standard A4', rate: 3.0, dimensions: '2.6m × 5.0m', walkDistance: '23m', evCapable: false },
  { id: 'A-05', zone: 'A', row: 'bottom', type: 'car', name: 'Sedan Standard A5', rate: 3.0, dimensions: '2.6m × 5.0m', walkDistance: '25m', evCapable: false },
  { id: 'A-06', zone: 'A', row: 'bottom', type: 'car', name: 'Sedan Standard A6', rate: 3.0, dimensions: '2.6m × 5.0m', walkDistance: '27m', evCapable: false },
  { id: 'A-07', zone: 'A', row: 'bottom', type: 'car', name: 'Sedan Standard A7', rate: 3.0, dimensions: '2.6m × 5.0m', walkDistance: '29m', evCapable: false },
  { id: 'A-08', zone: 'A', row: 'bottom', type: 'car', name: 'Sedan Standard A8', rate: 3.0, dimensions: '2.6m × 5.0m', walkDistance: '31m', evCapable: false },
  { id: 'A-09', zone: 'A', row: 'bottom', type: 'car', name: 'Sedan Standard A9', rate: 3.0, dimensions: '2.6m × 5.0m', walkDistance: '33m', evCapable: false },

  // Zone B - North Row (10 slots: SUVs & Standard Sedans)
  { id: 'SUV-01', zone: 'B', row: 'top', type: 'suv', name: 'SUV Wide Bay 01', rate: 3.5, dimensions: '3.0m × 5.4m', walkDistance: '25m', evCapable: false },
  { id: 'SUV-02', zone: 'B', row: 'top', type: 'suv', name: 'SUV Wide Bay 02', rate: 3.5, dimensions: '3.0m × 5.4m', walkDistance: '27m', evCapable: false },
  { id: 'SUV-03', zone: 'B', row: 'top', type: 'suv', name: 'SUV Wide Bay 03', rate: 3.5, dimensions: '3.0m × 5.4m', walkDistance: '29m', evCapable: false },
  { id: 'SUV-04', zone: 'B', row: 'top', type: 'suv', name: 'SUV Wide Bay 04', rate: 3.5, dimensions: '3.0m × 5.4m', walkDistance: '31m', evCapable: false },
  { id: 'SUV-05', zone: 'B', row: 'top', type: 'suv', name: 'SUV Wide Bay 05', rate: 3.5, dimensions: '3.0m × 5.4m', walkDistance: '33m', evCapable: false },
  { id: 'SUV-06', zone: 'B', row: 'top', type: 'suv', name: 'SUV Wide Bay 06', rate: 3.5, dimensions: '3.0m × 5.4m', walkDistance: '35m', evCapable: false },
  { id: 'B-01', zone: 'B', row: 'top', type: 'car', name: 'Sedan Deck B1', rate: 3.0, dimensions: '2.6m × 5.0m', walkDistance: '37m', evCapable: false },
  { id: 'B-02', zone: 'B', row: 'top', type: 'car', name: 'Sedan Deck B2', rate: 3.0, dimensions: '2.6m × 5.0m', walkDistance: '39m', evCapable: false },
  { id: 'B-03', zone: 'B', row: 'top', type: 'car', name: 'Sedan Deck B3', rate: 3.0, dimensions: '2.6m × 5.0m', walkDistance: '41m', evCapable: false },
  { id: 'B-04', zone: 'B', row: 'top', type: 'car', name: 'Sedan Deck B4', rate: 3.0, dimensions: '2.6m × 5.0m', walkDistance: '43m', evCapable: false },

  // Zone B - South Row (10 slots: Sedans & Dedicated 2-Wheelers)
  { id: 'B-05', zone: 'B', row: 'bottom', type: 'car', name: 'Sedan Deck B5', rate: 3.0, dimensions: '2.6m × 5.0m', walkDistance: '28m', evCapable: false },
  { id: 'B-06', zone: 'B', row: 'bottom', type: 'car', name: 'Sedan Deck B6', rate: 3.0, dimensions: '2.6m × 5.0m', walkDistance: '30m', evCapable: false },
  { id: 'B-07', zone: 'B', row: 'bottom', type: 'car', name: 'Sedan Deck B7', rate: 3.0, dimensions: '2.6m × 5.0m', walkDistance: '32m', evCapable: false },
  { id: 'B-08', zone: 'B', row: 'bottom', type: 'car', name: 'Sedan Deck B8', rate: 3.0, dimensions: '2.6m × 5.0m', walkDistance: '34m', evCapable: false },
  { id: 'M-01', zone: 'B', row: 'bottom', type: 'bike', name: 'Motorcycle Bay 01', rate: 1.5, dimensions: '1.4m × 2.6m', walkDistance: '15m', evCapable: false },
  { id: 'M-02', zone: 'B', row: 'bottom', type: 'bike', name: 'Motorcycle Bay 02', rate: 1.5, dimensions: '1.4m × 2.6m', walkDistance: '17m', evCapable: false },
  { id: 'M-03', zone: 'B', row: 'bottom', type: 'bike', name: 'Motorcycle Bay 03', rate: 1.5, dimensions: '1.4m × 2.6m', walkDistance: '19m', evCapable: false },
  { id: 'M-04', zone: 'B', row: 'bottom', type: 'bike', name: 'Motorcycle Bay 04', rate: 1.5, dimensions: '1.4m × 2.6m', walkDistance: '21m', evCapable: false },
  { id: 'M-05', zone: 'B', row: 'bottom', type: 'bike', name: 'Motorcycle Bay 05', rate: 1.5, dimensions: '1.4m × 2.6m', walkDistance: '23m', evCapable: false },
  { id: 'M-06', zone: 'B', row: 'bottom', type: 'bike', name: 'Motorcycle Bay 06', rate: 1.5, dimensions: '1.4m × 2.6m', walkDistance: '25m', evCapable: false }
];

// Pre-seeded realistic demo allocations
const SEED_ALLOCATIONS = {
  'EV-02': {
    plate: 'KA 01 MJ 4021',
    driver: 'Alex Morgan',
    phone: '+1 555-0192',
    model: 'Tesla Model 3',
    type: 'ev',
    color: '#ffffff',
    entryTime: Date.now() - (68 * 60 * 1000), // 68 mins ago
    durationHours: 2,
    evAddon: true,
    valetAddon: false,
    ticketId: 'TKT-2026-9810',
    totalPaid: 15.40
  },
  'EV-05': {
    plate: 'DL 08 CA 1904',
    driver: 'Elena Rostova',
    phone: '+1 555-0321',
    model: 'Porsche Taycan',
    type: 'ev',
    color: '#06b6d4',
    entryTime: Date.now() - (42 * 60 * 1000),
    durationHours: 4,
    evAddon: true,
    valetAddon: true,
    ticketId: 'TKT-2026-9812',
    totalPaid: 27.50
  },
  'VIP-01': {
    plate: 'MH 02 DX 7700',
    driver: 'Vikram Singhania',
    phone: '+1 555-0789',
    model: 'Mercedes S-Class',
    type: 'car',
    color: '#1e293b',
    entryTime: Date.now() - (115 * 60 * 1000),
    durationHours: 8,
    evAddon: false,
    valetAddon: true,
    ticketId: 'TKT-2026-9799',
    totalPaid: 37.40
  },
  'A-03': {
    plate: 'NY 928-KLM',
    driver: 'Sarah Jenkins',
    phone: '+1 555-0911',
    model: 'Honda Civic',
    type: 'car',
    color: '#ef4444',
    entryTime: Date.now() - (30 * 60 * 1000),
    durationHours: 2,
    evAddon: false,
    valetAddon: false,
    ticketId: 'TKT-2026-9820',
    totalPaid: 6.60
  },
  'A-07': {
    plate: 'CA 7XYZ890',
    driver: 'David Chen',
    phone: '+1 555-0456',
    model: 'BMW 330i',
    type: 'car',
    color: '#3b82f6',
    entryTime: Date.now() - (95 * 60 * 1000),
    durationHours: 4,
    evAddon: false,
    valetAddon: false,
    ticketId: 'TKT-2026-9805',
    totalPaid: 13.20
  },
  'SUV-01': {
    plate: 'TX 483-BNQ',
    driver: 'Marcus Vance',
    phone: '+1 555-0812',
    model: 'Range Rover Sport',
    type: 'suv',
    color: '#1e293b',
    entryTime: Date.now() - (50 * 60 * 1000),
    durationHours: 4,
    evAddon: false,
    valetAddon: true,
    ticketId: 'TKT-2026-9815',
    totalPaid: 17.60
  },
  'SUV-04': {
    plate: 'MH 14 GL 2002',
    driver: 'Ananya Sharma',
    phone: '+1 555-0245',
    model: 'Toyota Fortuner',
    type: 'suv',
    color: '#ffffff',
    entryTime: Date.now() - (80 * 60 * 1000),
    durationHours: 2,
    evAddon: false,
    valetAddon: false,
    ticketId: 'TKT-2026-9808',
    totalPaid: 7.70
  },
  'B-02': {
    plate: 'FL 392-WXZ',
    driver: 'Liam O’Connor',
    phone: '+1 555-0967',
    model: 'Audi A4',
    type: 'car',
    color: '#94a3b8',
    entryTime: Date.now() - (15 * 60 * 1000),
    durationHours: 1,
    evAddon: false,
    valetAddon: false,
    ticketId: 'TKT-2026-9825',
    totalPaid: 3.30
  },
  'M-02': {
    plate: 'KA 05 ER 1122',
    driver: 'Kiran Rao',
    phone: '+1 555-0678',
    model: 'Ducati Scrambler',
    type: 'bike',
    color: '#f59e0b',
    entryTime: Date.now() - (120 * 60 * 1000),
    durationHours: 4,
    evAddon: false,
    valetAddon: false,
    ticketId: 'TKT-2026-9790',
    totalPaid: 6.60
  },
  'M-05': {
    plate: 'MH 12 QQ 8899',
    driver: 'Rohan Deshmukh',
    phone: '+1 555-0341',
    model: 'Ather 450X EV',
    type: 'bike',
    color: '#10b981',
    entryTime: Date.now() - (40 * 60 * 1000),
    durationHours: 2,
    evAddon: false,
    valetAddon: false,
    ticketId: 'TKT-2026-9818',
    totalPaid: 3.30
  }
};

// Initial history log
const INITIAL_HISTORY = [
  { time: '14:45', event: 'ALLOT', slotId: 'B-02', plate: 'FL 392-WXZ', driver: 'Liam O’Connor', amount: '$3.30' },
  { time: '14:20', event: 'ALLOT', slotId: 'M-05', plate: 'MH 12 QQ 8899', driver: 'Rohan Deshmukh', amount: '$3.30' },
  { time: '14:10', event: 'RELEASE', slotId: 'A-01', plate: 'WA 891-ZXY', driver: 'Emily Stone', amount: '$6.60' },
  { time: '13:52', event: 'ALLOT', slotId: 'EV-02', plate: 'KA 01 MJ 4021', driver: 'Alex Morgan', amount: '$15.40' },
  { time: '13:30', event: 'RELEASE', slotId: 'SUV-02', plate: 'TX 102-MMM', driver: 'Chris Martin', amount: '$14.00' }
];

// App State
let state = {
  slots: [],
  allocations: {},
  filter: {
    zone: 'all',
    vehicleType: 'all',
    status: 'all',
    search: ''
  },
  selectedSlotId: null,
  activeTicket: null,
  soundEnabled: true,
  history: []
};

// ========================================================
// 2. SOUND SYNTHESIS ENGINE (Web Audio API)
// ========================================================
class SoundFX {
  constructor() {
    this.ctx = null;
  }

  init() {
    if (!this.ctx && (window.AudioContext || window.webkitAudioContext)) {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    }
  }

  playBeep(freq = 440, type = 'sine', duration = 0.08, gainVal = 0.08) {
    if (!state.soundEnabled) return;
    try {
      this.init();
      if (!this.ctx) return;
      if (this.ctx.state === 'suspended') this.ctx.resume();

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
      gain.gain.setValueAtTime(gainVal, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + duration);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + duration);
    } catch (e) {
      // Audio autoplay policy fallback
    }
  }

  click() {
    this.playBeep(880, 'sine', 0.04, 0.04);
  }

  success() {
    if (!state.soundEnabled) return;
    this.playBeep(523.25, 'triangle', 0.1, 0.08); // C5
    setTimeout(() => this.playBeep(659.25, 'triangle', 0.12, 0.08), 80); // E5
    setTimeout(() => this.playBeep(783.99, 'sine', 0.22, 0.1), 160); // G5
  }

  release() {
    if (!state.soundEnabled) return;
    this.playBeep(659.25, 'sine', 0.1, 0.06);
    setTimeout(() => this.playBeep(440, 'triangle', 0.18, 0.07), 90);
  }

  warning() {
    this.playBeep(330, 'sawtooth', 0.15, 0.06);
  }
}
const sfx = new SoundFX();

// ========================================================
// 3. SVG VEHICLE GRAPHICS RENDERER
// ========================================================

function renderTopDownVehicleSvg(type, color = '#ffffff') {
  if (type === 'bike') {
    // Top-down motorcycle vector
    return `
      <svg class="vehicle-top-down bike-graphic" viewBox="0 0 32 65" fill="none" xmlns="http://www.w3.org/2000/svg">
        <!-- Front & Rear Wheels -->
        <rect x="13.5" y="2" width="5" height="15" rx="2.5" fill="#1e293b" stroke="#0f172a" />
        <rect x="13.5" y="47" width="5" height="16" rx="2.5" fill="#1e293b" stroke="#0f172a" />
        <!-- Handlebars -->
        <path d="M4 14C11 11 21 11 28 14" stroke="#94a3b8" stroke-width="2.5" stroke-linecap="round" />
        <circle cx="4" cy="14" r="2" fill="#ef4444" />
        <circle cx="28" cy="14" r="2" fill="#ef4444" />
        <!-- Bike Body & Tank -->
        <path d="M12 18C12 16 20 16 20 18L21 34C21 38 19 45 16 45C13 45 11 38 11 34L12 18Z" fill="${color}" stroke="#334155" stroke-width="1.5" />
        <!-- Headlight Beam -->
        <circle cx="16" cy="6" r="3" fill="#fef08a" />
        <!-- Seat / Helmet -->
        <ellipse cx="16" cy="32" rx="4" ry="7" fill="#0f172a" />
        <circle cx="16" cy="27" r="4" fill="#3b82f6" />
      </svg>
    `;
  }

  if (type === 'suv') {
    // Top-down SUV vector (wider stance, roof rails, dual sunroof)
    return `
      <svg class="vehicle-top-down" viewBox="0 0 46 86" fill="none" xmlns="http://www.w3.org/2000/svg">
        <!-- Tires -->
        <rect x="1" y="10" width="4.5" height="15" rx="2" fill="#090d16" />
        <rect x="40.5" y="10" width="4.5" height="15" rx="2" fill="#090d16" />
        <rect x="1" y="60" width="4.5" height="15" rx="2" fill="#090d16" />
        <rect x="40.5" y="60" width="4.5" height="15" rx="2" fill="#090d16" />

        <!-- SUV Outer Body -->
        <rect x="4" y="2" width="38" height="82" rx="10" fill="${color}" stroke="#334155" stroke-width="1.5" />
        
        <!-- Side Mirrors -->
        <path d="M1 20L4 23" stroke="#475569" stroke-width="3" stroke-linecap="round" />
        <path d="M45 20L42 23" stroke="#475569" stroke-width="3" stroke-linecap="round" />

        <!-- Front Hood & Headlights -->
        <path d="M6 10C12 4 34 4 40 10" stroke="#fef08a" stroke-width="2" stroke-linecap="round" opacity="0.8" />
        <circle cx="8" cy="6" r="2.5" fill="#fef08a" />
        <circle cx="38" cy="6" r="2.5" fill="#fef08a" />

        <!-- Front Windshield -->
        <path d="M8 24C10 18 36 18 38 24L36 34C28 35 18 35 10 34L8 24Z" fill="#0f172a" />

        <!-- Roof & Sunroof Rails -->
        <line x1="8" y1="32" x2="8" y2="64" stroke="#64748b" stroke-width="2" stroke-linecap="round" />
        <line x1="38" y1="32" x2="38" y2="64" stroke="#64748b" stroke-width="2" stroke-linecap="round" />
        <rect x="13" y="38" width="20" height="18" rx="3" fill="#1e293b" stroke="#475569" />

        <!-- Rear Glass -->
        <path d="M10 68L12 76C18 77 28 77 34 76L36 68C28 67 18 67 10 68Z" fill="#0f172a" />

        <!-- Taillights -->
        <line x1="8" y1="83" x2="16" y2="83" stroke="#ef4444" stroke-width="3" stroke-linecap="round" />
        <line x1="30" y1="83" x2="38" y2="83" stroke="#ef4444" stroke-width="3" stroke-linecap="round" />
      </svg>
    `;
  }

  // Standard Sedan / EV Car vector
  return `
    <svg class="vehicle-top-down" viewBox="0 0 44 84" fill="none" xmlns="http://www.w3.org/2000/svg">
      <!-- Tires -->
      <rect x="1" y="9" width="4" height="14" rx="2" fill="#090d16" />
      <rect x="39" y="9" width="4" height="14" rx="2" fill="#090d16" />
      <rect x="1" y="58" width="4" height="14" rx="2" fill="#090d16" />
      <rect x="39" y="58" width="4" height="14" rx="2" fill="#090d16" />

      <!-- Car Body -->
      <rect x="4" y="2" width="36" height="80" rx="9" fill="${color}" stroke="#334155" stroke-width="1.5" />
      
      <!-- Side Mirrors -->
      <path d="M1 18L4 21" stroke="#475569" stroke-width="3" stroke-linecap="round" />
      <path d="M43 18L40 21" stroke="#475569" stroke-width="3" stroke-linecap="round" />

      <!-- Front Headlights -->
      <circle cx="8" cy="5" r="2.5" fill="#fef08a" />
      <circle cx="36" cy="5" r="2.5" fill="#fef08a" />
      <path d="M10 8C16 4 28 4 34 8" stroke="#ffffff" stroke-width="1.5" stroke-linecap="round" opacity="0.6" />

      <!-- Front Windshield -->
      <path d="M8 22C11 16 33 16 36 22L34 32C26 33 18 33 10 32L8 22Z" fill="#0f172a" />

      <!-- Sunroof / Roof Panel -->
      <rect x="12" y="36" width="20" height="16" rx="3" fill="#1e293b" />

      <!-- Rear Glass -->
      <path d="M10 64L12 72C17 73 27 73 32 72L34 64C28 63 16 63 10 64Z" fill="#0f172a" />

      <!-- Rear Brake Lights -->
      <line x1="7" y1="81" x2="14" y2="81" stroke="#ef4444" stroke-width="2.5" stroke-linecap="round" />
      <line x1="30" y1="81" x2="37" y2="81" stroke="#ef4444" stroke-width="2.5" stroke-linecap="round" />
    </svg>
  `;
}

// ========================================================
// 4. QR CODE CANVAS GENERATOR (Zero external dependency)
// ========================================================

function generateQrCodeCanvas(canvasId, text) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const size = canvas.width;
  
  // Clear canvas
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, size, size);

  // Deterministic hash based on text
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    hash = ((hash << 5) - hash) + text.charCodeAt(i);
    hash |= 0;
  }

  const matrixSize = 25; // 25x25 grid
  const cellSize = size / matrixSize;

  ctx.fillStyle = '#0f172a';

  // Helper for QR Position Corner Patterns (7x7 squares)
  function drawCornerPattern(startX, startY) {
    for (let r = 0; r < 7; r++) {
      for (let c = 0; c < 7; c++) {
        const isBorder = (r === 0 || r === 6 || c === 0 || c === 6);
        const isCenter = (r >= 2 && r <= 4 && c >= 2 && c <= 4);
        if (isBorder || isCenter) {
          ctx.fillRect((startX + c) * cellSize, (startY + r) * cellSize, cellSize + 0.4, cellSize + 0.4);
        }
      }
    }
  }

  // Draw 3 standard locator squares
  drawCornerPattern(1, 1);
  drawCornerPattern(matrixSize - 8, 1);
  drawCornerPattern(1, matrixSize - 8);

  // Timing patterns
  for (let i = 8; i < matrixSize - 8; i += 2) {
    ctx.fillRect(i * cellSize, 3 * cellSize, cellSize, cellSize);
    ctx.fillRect(3 * cellSize, i * cellSize, cellSize, cellSize);
  }

  // Draw data modules
  let pseudoRandom = Math.abs(hash) + 12345;
  for (let r = 0; r < matrixSize; r++) {
    for (let c = 0; c < matrixSize; c++) {
      // Skip corner squares
      if ((r < 9 && c < 9) || (r < 9 && c >= matrixSize - 9) || (r >= matrixSize - 9 && c < 9)) {
        continue;
      }
      pseudoRandom = (pseudoRandom * 9301 + 49297) % 233280;
      if (pseudoRandom / 233280 > 0.55) {
        ctx.fillRect(c * cellSize, r * cellSize, cellSize + 0.2, cellSize + 0.2);
      }
    }
  }

  // Center accent dot
  ctx.fillStyle = '#06b6d4';
  ctx.fillRect((matrixSize / 2 - 1) * cellSize, (matrixSize / 2 - 1) * cellSize, cellSize * 2, cellSize * 2);
}

// ========================================================
// 5. INITIALIZATION & LOCAL STORAGE SYNC
// ========================================================

function loadState() {
  state.slots = [...DEFAULT_SLOTS];

  const savedAllocations = localStorage.getItem(STORAGE_KEY);
  if (savedAllocations) {
    try {
      state.allocations = JSON.parse(savedAllocations);
    } catch (e) {
      state.allocations = { ...SEED_ALLOCATIONS };
    }
  } else {
    state.allocations = { ...SEED_ALLOCATIONS };
    saveState();
  }

  const savedHistory = localStorage.getItem(HISTORY_KEY);
  if (savedHistory) {
    try {
      state.history = JSON.parse(savedHistory);
    } catch (e) {
      state.history = [...INITIAL_HISTORY];
    }
  } else {
    state.history = [...INITIAL_HISTORY];
    saveHistory();
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.allocations));
}

function saveHistory() {
  localStorage.setItem(HISTORY_KEY, JSON.stringify(state.history));
}

// ========================================================
// 6. DYNAMIC UI RENDERING & SLOTS MATRIX
// ========================================================

function renderParkingGrid() {
  const containerZoneA_Top = document.getElementById('zoneA_RowTop');
  const containerZoneA_Bottom = document.getElementById('zoneA_RowBottom');
  const containerZoneB_Top = document.getElementById('zoneB_RowTop');
  const containerZoneB_Bottom = document.getElementById('zoneB_RowBottom');

  if (!containerZoneA_Top) return;

  // Clear current containers
  containerZoneA_Top.innerHTML = '';
  containerZoneA_Bottom.innerHTML = '';
  containerZoneB_Top.innerHTML = '';
  containerZoneB_Bottom.innerHTML = '';

  let visibleCount = 0;

  state.slots.forEach(slot => {
    const allocation = state.allocations[slot.id];
    const isOccupied = !!allocation;
    const status = isOccupied ? 'occupied' : 'available';

    // Apply Filter Criteria
    if (state.filter.zone !== 'all' && slot.zone !== state.filter.zone) return;

    if (state.filter.vehicleType !== 'all') {
      const targetType = state.filter.vehicleType;
      if (targetType === 'ev' && !slot.evCapable) return;
      if (targetType === 'suv' && slot.type !== 'suv') return;
      if (targetType === 'bike' && slot.type !== 'bike') return;
      if (targetType === 'car' && (slot.type !== 'car' && slot.type !== 'vip')) return;
    }

    if (state.filter.status !== 'all' && status !== state.filter.status) return;

    if (state.filter.search) {
      const q = state.filter.search.toLowerCase();
      const matchSlot = slot.id.toLowerCase().includes(q);
      const matchPlate = allocation && allocation.plate.toLowerCase().includes(q);
      const matchDriver = allocation && allocation.driver.toLowerCase().includes(q);
      const matchModel = allocation && allocation.model && allocation.model.toLowerCase().includes(q);
      if (!matchSlot && !matchPlate && !matchDriver && !matchModel) return;
    }

    visibleCount++;

    // Generate Slot HTML Card
    const card = document.createElement('div');
    card.id = `slot-card-${slot.id}`;
    card.className = `parking-slot-card slot-${status} slot-${slot.type} ${slot.evCapable ? 'slot-ev' : ''}`;
    card.setAttribute('role', 'button');
    card.setAttribute('tabindex', '0');
    card.setAttribute('aria-label', `Parking Slot ${slot.id}, ${status}, Rate $${slot.rate.toFixed(2)}/hr`);

    // Icon helper
    let typeIcon = '🚗';
    if (slot.type === 'ev') typeIcon = '⚡';
    else if (slot.type === 'suv') typeIcon = '🚙';
    else if (slot.type === 'bike') typeIcon = '🏍️';
    else if (slot.type === 'vip') typeIcon = '♿';

    let centerHtml = '';
    let bottomHtml = '';

    if (isOccupied) {
      const vehicleColor = allocation.color || '#ffffff';
      const vehicleType = allocation.type || slot.type;
      const elapsedFormatted = getElapsedDurationString(allocation.entryTime);

      centerHtml = `
        <div class="slot-bay-center">
          ${renderTopDownVehicleSvg(vehicleType, vehicleColor)}
          ${slot.evCapable && allocation.evAddon ? `
            <div class="ev-charger-beam" title="Supercharging in Progress">
              <div class="ev-charger-pedestal">⚡</div>
              <div class="ev-cable-line"></div>
            </div>
          ` : ''}
          <div class="slot-plate-tag" title="${allocation.plate}">${allocation.plate}</div>
        </div>
      `;

      bottomHtml = `
        <div class="slot-bottom-bar">
          <span class="slot-rate-tag">${allocation.driver.split(' ')[0]}</span>
          <span class="slot-elapsed-timer" id="timer-${slot.id}">${elapsedFormatted}</span>
        </div>
      `;
    } else {
      centerHtml = `
        <div class="slot-bay-center">
          <div class="available-bay-prompt">
            <div class="available-silhouette">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="icon">
                <line x1="12" y1="5" x2="12" y2="19"></line>
                <line x1="5" y1="12" x2="19" y2="12"></line>
              </svg>
            </div>
            <span class="available-prompt-text">+ ALLOT</span>
          </div>
        </div>
      `;

      bottomHtml = `
        <div class="slot-bottom-bar">
          <span class="slot-rate-tag">$${slot.rate.toFixed(2)}/hr</span>
          <span class="text-emerald" style="font-size: 0.72rem; font-weight: 700;">VACANT</span>
        </div>
      `;
    }

    card.innerHTML = `
      <div class="slot-top-bar">
        <span class="slot-code-badge">${slot.id}</span>
        <span class="slot-type-icon" title="${slot.name}">${typeIcon}</span>
        <span class="slot-status-indicator"></span>
      </div>
      ${centerHtml}
      ${bottomHtml}
    `;

    // Click handler: Allot or Release
    card.addEventListener('click', () => {
      sfx.click();
      if (isOccupied) {
        openReleaseModal(slot.id);
      } else {
        openAllotmentModal(slot.id);
      }
    });

    // Append to corresponding lane
    if (slot.zone === 'A') {
      if (slot.row === 'top') containerZoneA_Top.appendChild(card);
      else containerZoneA_Bottom.appendChild(card);
    } else {
      if (slot.row === 'top') containerZoneB_Top.appendChild(card);
      else containerZoneB_Bottom.appendChild(card);
    }
  });

  // Handle Empty State
  const emptyFilterState = document.getElementById('emptyFilterState');
  if (emptyFilterState) {
    if (visibleCount === 0) {
      emptyFilterState.classList.remove('d-none');
    } else {
      emptyFilterState.classList.add('d-none');
    }
  }

  // Update telemetry counters
  updateMetricsAndTelemetry();
}

// Elapsed time formatter: calculates hours & minutes
function getElapsedDurationString(entryTimeMs) {
  const diffSec = Math.max(0, Math.floor((Date.now() - entryTimeMs) / 1000));
  const hrs = Math.floor(diffSec / 3600);
  const mins = Math.floor((diffSec % 3600) / 60);
  const secs = diffSec % 60;
  if (hrs > 0) {
    return `${hrs}h ${mins.toString().padStart(2, '0')}m`;
  }
  return `${mins}m ${secs.toString().padStart(2, '0')}s`;
}

// Real-time ticking for live timers
function startLiveTimers() {
  setInterval(() => {
    Object.keys(state.allocations).forEach(slotId => {
      const allocation = state.allocations[slotId];
      const timerEl = document.getElementById(`timer-${slotId}`);
      if (timerEl && allocation) {
        timerEl.textContent = getElapsedDurationString(allocation.entryTime);
      }
    });
  }, 1000);
}

// ========================================================
// 7. STATS & TELEMETRY ENGINE
// ========================================================

function updateMetricsAndTelemetry() {
  const total = state.slots.length;
  const occupied = Object.keys(state.allocations).length;
  const available = total - occupied;
  const evTotal = state.slots.filter(s => s.evCapable).length;
  const evActive = state.slots.filter(s => s.evCapable && state.allocations[s.id]).length;
  const occupancyPercent = Math.round((occupied / total) * 100);

  // Update DOM values
  const valTotalSlots = document.getElementById('valTotalSlots');
  const valAvailableSlots = document.getElementById('valAvailableSlots');
  const valOccupiedSlots = document.getElementById('valOccupiedSlots');
  const valEVSlots = document.getElementById('valEVSlots');
  const valOccupancyPercent = document.getElementById('valOccupancyPercent');
  const gaugeRateNumber = document.getElementById('gaugeRateNumber');
  const gaugeBarOccupied = document.getElementById('gaugeBarOccupied');
  const headerParkedCount = document.getElementById('headerParkedCount');

  if (valTotalSlots) valTotalSlots.innerHTML = `${total} <span class="stat-unit">Bays</span>`;
  if (valAvailableSlots) valAvailableSlots.textContent = available;
  if (valOccupiedSlots) valOccupiedSlots.textContent = occupied;
  if (valEVSlots) valEVSlots.textContent = `${evActive} / ${evTotal}`;
  if (valOccupancyPercent) valOccupancyPercent.textContent = `${occupancyPercent}% Occupancy`;
  if (gaugeRateNumber) gaugeRateNumber.textContent = `${occupancyPercent}%`;
  if (gaugeBarOccupied) gaugeBarOccupied.style.width = `${occupancyPercent}%`;
  if (headerParkedCount) headerParkedCount.textContent = occupied;

  // Zone specific badges
  const occupiedZoneA = state.slots.filter(s => s.zone === 'A' && state.allocations[s.id]).length;
  const occupiedZoneB = state.slots.filter(s => s.zone === 'B' && state.allocations[s.id]).length;
  
  const zoneStatsA = document.getElementById('zoneStatsA');
  const zoneStatsB = document.getElementById('zoneStatsB');
  if (zoneStatsA) zoneStatsA.textContent = `20 BAYS • ${20 - occupiedZoneA} VACANT • ${occupiedZoneA} OCCUPIED`;
  if (zoneStatsB) zoneStatsB.textContent = `20 BAYS • ${20 - occupiedZoneB} VACANT • ${occupiedZoneB} OCCUPIED`;
}

// Live Clock
function startClock() {
  const clockEl = document.getElementById('liveClockDisplay');
  function tick() {
    if (!clockEl) return;
    const now = new Date();
    clockEl.textContent = now.toLocaleTimeString('en-US', { hour12: false });
  }
  tick();
  setInterval(tick, 1000);
}

// ========================================================
// 8. TOAST NOTIFICATION SYSTEM
// ========================================================

function showToast(message, type = 'info') {
  const container = document.getElementById('toastContainer');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast-msg toast-${type}`;

  let icon = 'ℹ️';
  if (type === 'success') icon = '✅';
  else if (type === 'warning') icon = '⚠️';

  toast.innerHTML = `
    <span>${icon}</span>
    <span>${message}</span>
  `;

  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

// ========================================================
// 9. SLOT ALLOTMENT MODAL WORKFLOW
// ========================================================

function openAllotmentModal(slotId) {
  const slot = state.slots.find(s => s.id === slotId);
  if (!slot) return;

  state.selectedSlotId = slotId;

  const modal = document.getElementById('allotmentModal');
  const modalSlotIdBadge = document.getElementById('modalSlotIdBadge');
  const modalSlotSubtitle = document.getElementById('modalSlotSubtitle');
  const modalBaseRateDisplay = document.getElementById('modalBaseRateDisplay');
  const modalDimensionsDisplay = document.getElementById('modalDimensionsDisplay');
  const modalDistanceDisplay = document.getElementById('modalDistanceDisplay');
  const modalEVAvailableDisplay = document.getElementById('modalEVAvailableDisplay');
  const evChargingToggleCard = document.getElementById('evChargingToggleCard');
  const selectVehicleType = document.getElementById('selectVehicleType');

  modalSlotIdBadge.textContent = slot.id;
  modalSlotSubtitle.textContent = `Zone ${slot.zone} • ${slot.zone === 'A' ? 'Ground Level' : 'Upper Deck'} • ${slot.name}`;
  modalBaseRateDisplay.textContent = `$${slot.rate.toFixed(2)}/hr`;
  modalDimensionsDisplay.textContent = slot.dimensions;
  modalDistanceDisplay.textContent = slot.walkDistance;
  modalEVAvailableDisplay.textContent = slot.evCapable ? 'Supercharge Ready (50kW)' : 'Not Equipped';

  // Toggle EV addon visibility if slot is not EV capable
  if (slot.evCapable) {
    evChargingToggleCard.classList.remove('d-none');
    document.getElementById('checkEVChargingAddon').checked = true;
  } else {
    evChargingToggleCard.classList.add('d-none');
    document.getElementById('checkEVChargingAddon').checked = false;
  }

  // Pre-select vehicle type based on slot
  if (slot.type === 'bike') {
    selectVehicleType.value = 'bike';
  } else if (slot.type === 'suv') {
    selectVehicleType.value = 'suv';
  } else if (slot.type === 'ev') {
    selectVehicleType.value = 'ev';
  } else {
    selectVehicleType.value = 'car';
  }

  // Recalculate bill
  recalculateFareEstimate();

  modal.classList.remove('d-none');
  document.getElementById('inputPlateNumber').focus();
}

function closeAllotmentModal() {
  const modal = document.getElementById('allotmentModal');
  if (modal) modal.classList.add('d-none');
  state.selectedSlotId = null;
}

function recalculateFareEstimate() {
  const slot = state.slots.find(s => s.id === state.selectedSlotId);
  if (!slot) return;

  const durationHours = parseInt(document.getElementById('selectedDurationHours').value, 10) || 2;
  const isEV = document.getElementById('checkEVChargingAddon').checked && slot.evCapable;
  const isValet = document.getElementById('checkValetPriority').checked;

  const baseRate = slot.rate;
  const baseCost = baseRate * durationHours;
  const evCost = isEV ? 5.00 : 0.00;
  const valetCost = isValet ? 2.00 : 0.00;
  const subtotal = baseCost + evCost + valetCost;
  const tax = subtotal * 0.10;
  const total = subtotal + tax;

  // Update UI Elements
  document.getElementById('calcDurationText').textContent = `${durationHours} hour${durationHours > 1 ? 's' : ''}`;
  document.getElementById('calcRateText').textContent = `$${baseRate.toFixed(2)}`;
  document.getElementById('calcBaseFare').textContent = `$${baseCost.toFixed(2)}`;

  const rowFareEV = document.getElementById('rowFareEV');
  if (isEV) rowFareEV.classList.remove('d-none');
  else rowFareEV.classList.add('d-none');

  const rowFareValet = document.getElementById('rowFareValet');
  if (isValet) rowFareValet.classList.remove('d-none');
  else rowFareValet.classList.add('d-none');

  document.getElementById('calcTaxFare').textContent = `$${tax.toFixed(2)}`;
  document.getElementById('calcTotalFare').textContent = `$${total.toFixed(2)}`;
}

// Allotment Form Submit Handler
function handleAllotmentSubmit(e) {
  e.preventDefault();
  const slotId = state.selectedSlotId;
  const slot = state.slots.find(s => s.id === slotId);
  if (!slot) return;

  const plate = document.getElementById('inputPlateNumber').value.trim().toUpperCase();
  const driver = document.getElementById('inputDriverName').value.trim();
  const phone = document.getElementById('inputDriverPhone').value.trim() || '+1 555-0100';
  const model = document.getElementById('inputVehicleModel').value.trim() || 'Standard Vehicle';
  const vehicleType = document.getElementById('selectVehicleType').value;
  const durationHours = parseInt(document.getElementById('selectedDurationHours').value, 10) || 2;
  const evAddon = document.getElementById('checkEVChargingAddon').checked && slot.evCapable;
  const valetAddon = document.getElementById('checkValetPriority').checked;

  if (!plate) {
    sfx.warning();
    alert('Please enter a valid License Plate Number.');
    return;
  }
  if (!driver) {
    sfx.warning();
    alert('Please enter Driver Name.');
    return;
  }

  // Active vehicle color swatch
  const activeColorSwatch = document.querySelector('#vehicleColorPicker .color-swatch.active');
  const vehicleColor = activeColorSwatch ? activeColorSwatch.getAttribute('data-color') : '#ffffff';

  // Calculate Final Amount
  const baseRate = slot.rate;
  const baseCost = baseRate * durationHours;
  const evCost = evAddon ? 5.00 : 0.00;
  const valetCost = valetAddon ? 2.00 : 0.00;
  const subtotal = baseCost + evCost + valetCost;
  const total = subtotal + (subtotal * 0.10);

  const ticketId = `TKT-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

  // Store allocation
  const newAllocation = {
    plate,
    driver,
    phone,
    model,
    type: vehicleType,
    color: vehicleColor,
    entryTime: Date.now(),
    durationHours,
    evAddon,
    valetAddon,
    ticketId,
    totalPaid: parseFloat(total.toFixed(2))
  };

  state.allocations[slotId] = newAllocation;
  saveState();

  // Add to Audit History
  const historyEntry = {
    time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    event: 'ALLOT',
    slotId,
    plate,
    driver,
    amount: `$${total.toFixed(2)}`
  };
  state.history.unshift(historyEntry);
  saveHistory();

  // Close form modal & play chime
  closeAllotmentModal();
  sfx.success();
  showToast(`Slot ${slotId} successfully allotted to ${plate}!`, 'success');

  // Re-render UI
  renderParkingGrid();

  // Open Digital Ticket Pass
  openTicketModal(slotId, newAllocation);
}

// ========================================================
// 10. DIGITAL PASS / BOARDING TICKET MODAL
// ========================================================

function openTicketModal(slotId, allocation) {
  const slot = state.slots.find(s => s.id === slotId);
  if (!slot || !allocation) return;

  state.activeTicket = { slot, allocation };

  document.getElementById('passTicketId').textContent = `#${allocation.ticketId}`;
  document.getElementById('passSlotId').textContent = slot.id;
  document.getElementById('passZoneBadge').textContent = `ZONE ${slot.zone} • ${slot.zone === 'A' ? 'GROUND LEVEL' : 'UPPER DECK'} • ${slot.name.toUpperCase()}`;
  document.getElementById('passVehiclePlate').textContent = allocation.plate;
  document.getElementById('passVehicleType').textContent = `${allocation.model} (${allocation.type.toUpperCase()})`;
  document.getElementById('passDriverName').textContent = allocation.driver;

  const entryDate = new Date(allocation.entryTime);
  const exitDate = new Date(allocation.entryTime + (allocation.durationHours * 3600 * 1000));

  document.getElementById('passEntryTime').textContent = entryDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  document.getElementById('passValidUntil').textContent = exitDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  document.getElementById('passTotalAmount').textContent = `$${allocation.totalPaid.toFixed(2)} (PAID)`;

  // Generate dynamic QR Code on canvas
  const qrPayload = `PARKPULSE:${allocation.ticketId}:${slot.id}:${allocation.plate}:${allocation.totalPaid}`;
  generateQrCodeCanvas('ticketQrCanvas', qrPayload);

  document.getElementById('ticketModal').classList.remove('d-none');
}

function closeTicketModal() {
  document.getElementById('ticketModal').classList.add('d-none');
  state.activeTicket = null;
}

// ========================================================
// 11. SLOT RELEASE & CHECK-OUT WORKFLOW
// ========================================================

function openReleaseModal(slotId) {
  const slot = state.slots.find(s => s.id === slotId);
  const allocation = state.allocations[slotId];
  if (!slot || !allocation) return;

  state.selectedSlotId = slotId;

  document.getElementById('releaseSlotBadge').textContent = slot.id;
  document.getElementById('releaseSlotTarget').textContent = slot.id;
  document.getElementById('releasePlate').textContent = allocation.plate;
  document.getElementById('releaseModelDriver').textContent = `${allocation.model} • ${allocation.driver}`;
  document.getElementById('releaseDurationElapsed').textContent = getElapsedDurationString(allocation.entryTime);

  const entryDate = new Date(allocation.entryTime);
  document.getElementById('releaseEntryTime').textContent = entryDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  document.getElementById('releaseExitTime').textContent = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  document.getElementById('releaseHourlyRate').textContent = `$${slot.rate.toFixed(2)}/hr`;
  document.getElementById('releaseDurationFormatted').textContent = getElapsedDurationString(allocation.entryTime);

  // Icon update
  let icon = '🚗';
  if (allocation.type === 'bike') icon = '🏍️';
  else if (allocation.type === 'suv') icon = '🚙';
  else if (allocation.type === 'ev') icon = '⚡';
  document.getElementById('releaseVehicleIcon').textContent = icon;

  document.getElementById('releaseModal').classList.remove('d-none');
}

function closeReleaseModal() {
  document.getElementById('releaseModal').classList.add('d-none');
  state.selectedSlotId = null;
}

function confirmReleaseSlot() {
  const slotId = state.selectedSlotId;
  const allocation = state.allocations[slotId];
  if (!slotId || !allocation) return;

  // Add Release Entry to Audit History
  const historyEntry = {
    time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    event: 'RELEASE',
    slotId,
    plate: allocation.plate,
    driver: allocation.driver,
    amount: `$${allocation.totalPaid.toFixed(2)}`
  };
  state.history.unshift(historyEntry);
  saveHistory();

  // Delete allocation & persist
  delete state.allocations[slotId];
  saveState();

  closeReleaseModal();
  sfx.release();
  showToast(`Bay ${slotId} is now cleared and open for allotment!`, 'success');

  renderParkingGrid();
  renderParkedDrawerList();
}

// ========================================================
// 12. SMART AUTO-ALLOCATION ENGINE
// ========================================================

function openAutoAllotModal() {
  document.getElementById('autoAllotModal').classList.remove('d-none');
  document.getElementById('autoPlateInput').focus();
}

function closeAutoAllotModal() {
  document.getElementById('autoAllotModal').classList.add('d-none');
}

function handleAutoAllotSubmit(e) {
  e.preventDefault();

  const plate = document.getElementById('autoPlateInput').value.trim().toUpperCase();
  const driver = document.getElementById('autoDriverNameInput').value.trim() || 'Valued Visitor';
  const vehicleType = document.getElementById('autoVehicleTypeSelect').value;
  const durationHours = parseInt(document.getElementById('autoDurationSelect').value, 10) || 2;
  const zonePref = document.getElementById('autoZonePreference').value;

  if (!plate) {
    sfx.warning();
    alert('Please enter license plate number.');
    return;
  }

  // Find candidate slots that are not occupied
  const availableSlots = state.slots.filter(s => !state.allocations[s.id]);

  if (availableSlots.length === 0) {
    sfx.warning();
    alert('The parking facility is currently at 100% capacity. No available bays!');
    return;
  }

  // Smart Sorting Algorithm:
  // 1. Matches Vehicle Category (EV -> EV bay, Bike -> Bike bay, SUV -> SUV bay)
  // 2. Matches Zone Preference
  // 3. Lowest Walk Distance
  let candidates = availableSlots;

  if (zonePref !== 'any') {
    const zoneCandidates = candidates.filter(s => s.zone === zonePref);
    if (zoneCandidates.length > 0) candidates = zoneCandidates;
  }

  // Filter or score by vehicle type
  let bestSlot = null;

  if (vehicleType === 'ev') {
    const evSlots = candidates.filter(s => s.evCapable);
    bestSlot = evSlots.length > 0 ? evSlots[0] : candidates[0];
  } else if (vehicleType === 'bike') {
    const bikeSlots = candidates.filter(s => s.type === 'bike');
    bestSlot = bikeSlots.length > 0 ? bikeSlots[0] : candidates[0];
  } else if (vehicleType === 'suv') {
    const suvSlots = candidates.filter(s => s.type === 'suv');
    bestSlot = suvSlots.length > 0 ? suvSlots[0] : candidates[0];
  } else {
    // Standard car: prioritize non-EV, non-bike standard bays
    const standardSlots = candidates.filter(s => s.type === 'car' || s.type === 'vip');
    bestSlot = standardSlots.length > 0 ? standardSlots[0] : candidates[0];
  }

  if (!bestSlot) {
    bestSlot = candidates[0];
  }

  // Allot best slot
  const baseRate = bestSlot.rate;
  const baseCost = baseRate * durationHours;
  const evCost = (vehicleType === 'ev' && bestSlot.evCapable) ? 5.00 : 0.00;
  const subtotal = baseCost + evCost;
  const total = subtotal + (subtotal * 0.10);

  const ticketId = `TKT-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

  const newAllocation = {
    plate,
    driver,
    phone: '+1 555-0188',
    model: vehicleType === 'ev' ? 'Electric Vehicle' : (vehicleType === 'bike' ? 'Motorcycle' : 'Compact Vehicle'),
    type: vehicleType,
    color: '#3b82f6',
    entryTime: Date.now(),
    durationHours,
    evAddon: vehicleType === 'ev',
    valetAddon: false,
    ticketId,
    totalPaid: parseFloat(total.toFixed(2))
  };

  state.allocations[bestSlot.id] = newAllocation;
  saveState();

  // Audit history
  state.history.unshift({
    time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    event: 'ALLOT',
    slotId: bestSlot.id,
    plate,
    driver,
    amount: `$${total.toFixed(2)}`
  });
  saveHistory();

  closeAutoAllotModal();
  sfx.success();
  showToast(`Optimal bay ${bestSlot.id} automatically assigned to ${plate}!`, 'success');

  renderParkingGrid();

  // Scroll into view & highlight
  const targetCard = document.getElementById(`slot-card-${bestSlot.id}`);
  if (targetCard) {
    targetCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
    targetCard.style.animation = 'pulse-dot 1s 3';
  }

  openTicketModal(bestSlot.id, newAllocation);
}

// ========================================================
// 13. PARKED VEHICLES SLIDE-OVER DRAWER
// ========================================================

function openParkedDrawer() {
  renderParkedDrawerList();
  document.getElementById('parkedDrawer').classList.add('open');
  document.getElementById('parkedDrawerOverlay').classList.remove('d-none');
}

function closeParkedDrawer() {
  document.getElementById('parkedDrawer').classList.remove('open');
  document.getElementById('parkedDrawerOverlay').classList.add('d-none');
}

function renderParkedDrawerList(searchQuery = '') {
  const container = document.getElementById('parkedVehiclesList');
  const subtitle = document.getElementById('parkedDrawerSubtitle');
  if (!container) return;

  container.innerHTML = '';
  const entries = Object.entries(state.allocations);
  if (subtitle) subtitle.textContent = `${entries.length} Vehicles Currently Parked`;

  if (entries.length === 0) {
    container.innerHTML = `
      <div style="text-align: center; padding: 3rem 1rem; color: #64748b;">
        <p>No vehicles are currently parked in the facility.</p>
      </div>
    `;
    return;
  }

  const query = searchQuery.toLowerCase().trim();

  entries.forEach(([slotId, alloc]) => {
    if (query) {
      const match = slotId.toLowerCase().includes(query) ||
                    alloc.plate.toLowerCase().includes(query) ||
                    alloc.driver.toLowerCase().includes(query) ||
                    (alloc.model && alloc.model.toLowerCase().includes(query));
      if (!match) return;
    }

    const card = document.createElement('div');
    card.className = 'parked-item-card';
    card.innerHTML = `
      <div class="parked-card-top">
        <span class="parked-slot-pill">BAY ${slotId}</span>
        <span class="parked-plate-text">${alloc.plate}</span>
      </div>
      <div class="parked-card-mid">
        <span>${alloc.driver} • ${alloc.model || 'Car'}</span>
        <span class="text-amber" id="drawer-timer-${slotId}">${getElapsedDurationString(alloc.entryTime)}</span>
      </div>
      <div class="parked-card-actions">
        <button type="button" class="btn btn-secondary btn-sm btn-print-pass" data-slot="${slotId}">
          View Ticket
        </button>
        <button type="button" class="btn btn-danger btn-sm btn-release-bay" data-slot="${slotId}">
          Check-Out
        </button>
      </div>
    `;

    card.querySelector('.btn-print-pass').addEventListener('click', () => {
      closeParkedDrawer();
      openTicketModal(slotId, alloc);
    });

    card.querySelector('.btn-release-bay').addEventListener('click', () => {
      closeParkedDrawer();
      openReleaseModal(slotId);
    });

    container.appendChild(card);
  });
}

// ========================================================
// 14. AUDIT & TRANSACTION LOG MODAL
// ========================================================

function openHistoryModal() {
  const tableBody = document.getElementById('historyTableBody');
  if (!tableBody) return;

  tableBody.innerHTML = '';

  let totalRev = 0;
  state.history.forEach(item => {
    const row = document.createElement('tr');
    const isAllot = item.event === 'ALLOT';
    row.innerHTML = `
      <td class="font-mono">${item.time}</td>
      <td>
        <span class="event-badge ${isAllot ? 'event-allot' : 'event-release'}">
          ${item.event}
        </span>
      </td>
      <td class="font-mono font-bold">${item.slotId}</td>
      <td class="font-mono text-amber">${item.plate}</td>
      <td>${item.driver}</td>
      <td class="font-mono text-emerald">${item.amount}</td>
    `;
    tableBody.appendChild(row);

    const val = parseFloat(item.amount.replace('$', '')) || 0;
    totalRev += val;
  });

  const historyTotalSessions = document.getElementById('historyTotalSessions');
  const historyTotalRevenue = document.getElementById('historyTotalRevenue');

  if (historyTotalSessions) historyTotalSessions.textContent = state.history.length;
  if (historyTotalRevenue) historyTotalRevenue.textContent = `$${totalRev.toFixed(2)}`;

  document.getElementById('historyModal').classList.remove('d-none');
}

function closeHistoryModal() {
  document.getElementById('historyModal').classList.add('d-none');
}

function exportHistoryCSV() {
  if (state.history.length === 0) {
    alert('No transaction records available to export.');
    return;
  }
  let csvContent = 'data:text/csv;charset=utf-8,Time,Event,Bay,Plate,Driver,Amount\n';
  state.history.forEach(h => {
    csvContent += `"${h.time}","${h.event}","${h.slotId}","${h.plate}","${h.driver}","${h.amount}"\n`;
  });
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement('a');
  link.setAttribute('href', encodedUri);
  link.setAttribute('download', `ParkPulse_Audit_Log_${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// ========================================================
// 15. EVENT LISTENERS SETUP
// ========================================================

function setupEventListeners() {
  // Brand click resets filters
  document.getElementById('brandLogo')?.addEventListener('click', () => {
    resetAllFilters();
  });

  // Sound toggle
  document.getElementById('btnToggleSound')?.addEventListener('click', () => {
    state.soundEnabled = !state.soundEnabled;
    const svgOn = document.querySelector('.svg-sound-on');
    const svgOff = document.querySelector('.svg-sound-off');
    if (state.soundEnabled) {
      svgOn.classList.remove('d-none');
      svgOff.classList.add('d-none');
      sfx.playBeep(600, 'sine', 0.1);
      showToast('Sound feedback enabled', 'info');
    } else {
      svgOn.classList.add('d-none');
      svgOff.classList.remove('d-none');
      showToast('Sound feedback muted', 'info');
    }
  });

  // Search input & Clear button
  const searchInput = document.getElementById('slotSearchInput');
  const btnClearSearch = document.getElementById('btnClearSearch');

  searchInput?.addEventListener('input', (e) => {
    state.filter.search = e.target.value;
    if (e.target.value) btnClearSearch.classList.remove('d-none');
    else btnClearSearch.classList.add('d-none');
    renderParkingGrid();
  });

  btnClearSearch?.addEventListener('click', () => {
    searchInput.value = '';
    state.filter.search = '';
    btnClearSearch.classList.add('d-none');
    renderParkingGrid();
  });

  // Zone Tabs
  document.querySelectorAll('.zone-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      sfx.click();
      document.querySelectorAll('.zone-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      state.filter.zone = tab.getAttribute('data-zone');
      renderParkingGrid();
    });
  });

  // Vehicle Type Filter Chips
  document.querySelectorAll('#vehicleTypeChips .filter-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      sfx.click();
      document.querySelectorAll('#vehicleTypeChips .filter-chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      state.filter.vehicleType = chip.getAttribute('data-vehicle-type');
      renderParkingGrid();
    });
  });

  // Status Filter Chips
  document.querySelectorAll('#statusChips .filter-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      sfx.click();
      document.querySelectorAll('#statusChips .filter-chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      state.filter.status = chip.getAttribute('data-status');
      renderParkingGrid();
    });
  });

  // Reset demo data
  document.getElementById('btnResetDemoData')?.addEventListener('click', () => {
    if (confirm('Reset parking facility to default sample data? All custom bookings will be re-initialized.')) {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(HISTORY_KEY);
      loadState();
      renderParkingGrid();
      sfx.success();
      showToast('Facility state reset to default demo layout', 'info');
    }
  });

  document.getElementById('btnResetFilters')?.addEventListener('click', resetAllFilters);

  // Allotment Modal Controls
  document.getElementById('btnCloseAllotModal')?.addEventListener('click', closeAllotmentModal);
  document.getElementById('btnCancelAllotment')?.addEventListener('click', closeAllotmentModal);
  document.getElementById('allotmentForm')?.addEventListener('submit', handleAllotmentSubmit);

  // Real-time license plate visualizer typing
  const inputPlate = document.getElementById('inputPlateNumber');
  const plateDisplay = document.getElementById('plateNumberDisplay');
  inputPlate?.addEventListener('input', (e) => {
    const val = e.target.value.toUpperCase();
    plateDisplay.textContent = val || 'ABC • 1234';
  });

  // Vehicle color selector
  document.querySelectorAll('#vehicleColorPicker .color-swatch').forEach(swatch => {
    swatch.addEventListener('click', () => {
      document.querySelectorAll('#vehicleColorPicker .color-swatch').forEach(s => s.classList.remove('active'));
      swatch.classList.add('active');
    });
  });

  // Duration Pills in Allotment Form
  document.querySelectorAll('#durationPills .duration-pill').forEach(pill => {
    pill.addEventListener('click', () => {
      sfx.click();
      document.querySelectorAll('#durationPills .duration-pill').forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      document.getElementById('selectedDurationHours').value = pill.getAttribute('data-hours');
      recalculateFareEstimate();
    });
  });

  // Addon Checkbox changes
  document.getElementById('checkEVChargingAddon')?.addEventListener('change', recalculateFareEstimate);
  document.getElementById('checkValetPriority')?.addEventListener('change', recalculateFareEstimate);

  // Ticket Modal Controls
  document.getElementById('btnCloseTicketModal')?.addEventListener('click', closeTicketModal);
  document.getElementById('btnDoneTicket')?.addEventListener('click', closeTicketModal);
  document.getElementById('btnPrintTicket')?.addEventListener('click', () => {
    window.print();
  });
  document.getElementById('btnDownloadTicket')?.addEventListener('click', () => {
    if (!state.activeTicket) return;
    const { slot, allocation } = state.activeTicket;
    const textContent = `
========================================
       PARKPULSE 360° GATE PASS
========================================
Ticket ID : ${allocation.ticketId}
Assigned  : Bay ${slot.id} (Zone ${slot.zone})
Plate     : ${allocation.plate}
Vehicle   : ${allocation.model} (${allocation.type})
Driver    : ${allocation.driver}
Entry     : ${new Date(allocation.entryTime).toLocaleString()}
Duration  : ${allocation.durationHours} Hours
Amount    : $${allocation.totalPaid.toFixed(2)} (PAID)
========================================
Please present this pass at Barrier 02
========================================
    `.trim();

    const blob = new Blob([textContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Parking_Pass_${allocation.ticketId}_${slot.id}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Parking Pass downloaded successfully', 'info');
  });

  // Release Modal Controls
  document.getElementById('btnCloseReleaseModal')?.addEventListener('click', closeReleaseModal);
  document.getElementById('btnCancelRelease')?.addEventListener('click', closeReleaseModal);
  document.getElementById('btnConfirmRelease')?.addEventListener('click', confirmReleaseSlot);

  // Quick Auto-Allot Header Button
  document.getElementById('btnQuickAutoAllot')?.addEventListener('click', () => {
    sfx.click();
    openAutoAllotModal();
  });
  document.getElementById('btnCloseAutoAllotModal')?.addEventListener('click', closeAutoAllotModal);
  document.getElementById('btnCancelAutoAllot')?.addEventListener('click', closeAutoAllotModal);
  document.getElementById('autoAllotForm')?.addEventListener('submit', handleAutoAllotSubmit);

  // Active Parked Vehicles Drawer
  document.getElementById('btnViewParked')?.addEventListener('click', () => {
    sfx.click();
    openParkedDrawer();
  });
  document.getElementById('btnCloseParkedDrawer')?.addEventListener('click', closeParkedDrawer);
  document.getElementById('parkedDrawerOverlay')?.addEventListener('click', closeParkedDrawer);

  document.getElementById('parkedSearchInput')?.addEventListener('input', (e) => {
    renderParkedDrawerList(e.target.value);
  });

  // Audit History Modal
  document.getElementById('btnOpenHistory')?.addEventListener('click', () => {
    sfx.click();
    openHistoryModal();
  });
  document.getElementById('btnCloseHistoryModal')?.addEventListener('click', closeHistoryModal);
  document.getElementById('btnCloseHistoryModalBtn')?.addEventListener('click', closeHistoryModal);
  document.getElementById('btnExportCSV')?.addEventListener('click', exportHistoryCSV);

  // Global ESC key to close any active modal
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeAllotmentModal();
      closeTicketModal();
      closeReleaseModal();
      closeAutoAllotModal();
      closeParkedDrawer();
      closeHistoryModal();
    }
  });
}

function resetAllFilters() {
  state.filter.zone = 'all';
  state.filter.vehicleType = 'all';
  state.filter.status = 'all';
  state.filter.search = '';

  const searchInput = document.getElementById('slotSearchInput');
  const btnClearSearch = document.getElementById('btnClearSearch');
  if (searchInput) searchInput.value = '';
  if (btnClearSearch) btnClearSearch.classList.add('d-none');

  document.querySelectorAll('.zone-tab').forEach(t => t.classList.toggle('active', t.getAttribute('data-zone') === 'all'));
  document.querySelectorAll('#vehicleTypeChips .filter-chip').forEach(c => c.classList.toggle('active', c.getAttribute('data-vehicle-type') === 'all'));
  document.querySelectorAll('#statusChips .filter-chip').forEach(c => c.classList.toggle('active', c.getAttribute('data-status') === 'all'));

  renderParkingGrid();
  showToast('Filters reset to show all 40 parking bays', 'info');
}

// ========================================================
// 16. APPLICATION BOOTSTRAP
// ========================================================

document.addEventListener('DOMContentLoaded', () => {
  loadState();
  setupEventListeners();
  renderParkingGrid();
  startClock();
  startLiveTimers();
});
