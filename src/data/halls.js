// ---------------------------------------------------------------------------
// /src/data/halls.js — FRCC Convention & Function Halls Data
// Single Location: Vijayawada
// ---------------------------------------------------------------------------

// The club has ONE location, Vijayawada. (Array kept so it can grow later)
export const areas = [
  { id: 'vja', name: 'Vijayawada' },
];

export const halls = [
  {
    id: 'vja-function-hall',
    areaId: 'vja',
    locationId: 'vja',
    name: 'Function Hall',
    tagline: 'Grand celebrations with food included', // SAMPLE
    type: 'ac', // AC/Non-AC SAMPLE (confirm AC / Non-AC with client)
    pricingUnit: 'per-person',
    price: 1500,
    pricePerPerson: 1500,
    includesFood: true, // Client: includesFood true (wording "with food")
    priceNote: 'with food',
    capacityMin: 30,
    capacityMax: 100000,
    capacity: 100000, // Maximum capacity
    capacityBreakdown: { theater: 50000, banquet: 35000, classroom: 15000, reception: 100000 }, // SAMPLE
    prices: { hour: 1500, halfDay: 1500, fullDay: 1500, perPerson: 1500 }, // Backwards compatibility
    pricePerDay: { morning: 1500, afternoon: 1500, evening: 1500, fullDay: 1500 },
    timeSlots: ['08:00 - 13:00 (Morning)', '13:00 - 18:00 (Afternoon)', '18:00 - 23:00 (Evening)', '08:00 - 23:00 (Full Day)'],
    amenities: ['Central AC', 'Food & Buffet Setup Included', 'Stage & Lighting', 'Green Rooms', 'VIP Lounge', 'Valet Parking', 'High-speed WiFi'], // SAMPLE
    features: ['Central AC', 'Food & Buffet Setup Included', 'Stage & Lighting', 'Green Rooms', 'VIP Lounge', 'Valet Parking', 'High-speed WiFi'], // SAMPLE
    imageKey: 'galleryHall',
    images: ['hallWedding', 'hallConference', 'hallStage', 'hallCatering'],
    description: 'Column-free celebration hall welcoming intimate gatherings of 30 up to mega gatherings of 1,00,000 guests, inclusive of catering and food service.', // SAMPLE
    floor: 'Ground Floor',
    powerBackup: true,
    acoustics: 'Acoustic-treated walls',
  },
  {
    id: 'vja-meeting-hall',
    areaId: 'vja',
    locationId: 'vja',
    name: 'Meeting Hall',
    tagline: 'Intimate gatherings, executive decisions', // SAMPLE
    type: 'boardroom', // Category: boardroom (AC/Non-AC SAMPLE)
    pricingUnit: 'per-hour',
    price: 1600,
    includesFood: false,
    capacityMin: 5, // SAMPLE
    capacityMax: 50, // SAMPLE
    capacity: 50, // SAMPLE
    capacityBreakdown: { theater: 50, banquet: 40, classroom: 30, reception: 50 }, // SAMPLE
    prices: { hour: 1600, halfDay: 8000, fullDay: 16000 },
    pricePerDay: { morning: 8000, afternoon: 8000, evening: 8000, fullDay: 16000 },
    timeSlots: ['08:00 - 13:00 (Morning)', '13:00 - 18:00 (Afternoon)', '18:00 - 23:00 (Evening)', '08:00 - 23:00 (Full Day)'],
    amenities: ['Central AC', 'Video Conferencing', 'Interactive 4K Display', 'Premium Audio', 'Leather Seating', 'Catering On-demand', 'Dedicated WiFi'], // SAMPLE
    features: ['Central AC', 'Video Conferencing', 'Interactive 4K Display', 'Premium Audio', 'Leather Seating', 'Catering On-demand', 'Dedicated WiFi'], // SAMPLE
    imageKey: 'hallConference',
    images: ['hallConference', 'hallCatering'],
    description: 'Executive boardroom equipped with advanced collaboration and presentation technology. Ideal for board meetings and strategy discussions.', // SAMPLE
    floor: 'Level 2',
    powerBackup: true,
    acoustics: 'Soundproofed',
  },
];

export const HALLS = halls;

export function getHallsByArea(areaId) {
  return halls.filter((h) => h.areaId === areaId || h.locationId === areaId);
}

export function getHallsByLocation(locationId) {
  return halls.filter((h) => h.locationId === locationId || h.areaId === locationId);
}

export function getHallById(id) {
  return halls.find((h) => h.id === id || h.name === id);
}

export default {
  areas,
  halls,
  HALLS,
  getHallsByArea,
  getHallsByLocation,
  getHallById,
};
