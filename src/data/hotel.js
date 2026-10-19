// ---------------------------------------------------------------------------
// /src/data/hotel.js — FRCC Stay and Hotel Rooms Data
// Single Location: Vijayawada
// ---------------------------------------------------------------------------

import { roomImage, roomSlot } from '../config/images.js';

// The club has ONE location, Vijayawada. (Array kept so it can grow later)
export const areas = [
  { id: 'vijayawada', name: 'Vijayawada' },
];

export const checkInTime = '12:00 PM'; // SAMPLE
export const checkOutTime = '11:00 AM'; // SAMPLE
export const maxNights = 30; // Maximum duration for stay bookings
export const cancellationPolicy = 'Free cancellation up to 48 hours before check-in. Cancellations within 48 hours are subject to a 1-night retention fee.'; // SAMPLE

/**
 * Price per night.
 * Categories:
 *   - "normal" (client range ₹2,500 to ₹4,500)
 *   - "suite"  (client range ₹4,500 to ₹10,000)
 *
 * Specific room prices below are a SAMPLE split inside the client's ranges.
 * Other fields (amenities, sizes, counts) are SAMPLE values.
 */
export const rooms = [
  // --- Category: Normal (Range ₹2,500 – ₹4,500) ---
  {
    id: 'vja-standard-room',
    areaId: 'vijayawada',
    name: 'Standard Room',
    type: 'Standard Room',
    category: 'normal',
    pricePerNight: 2500, // SAMPLE split inside client range 2500–4500
    bedType: 'Queen Bed', // SAMPLE
    view: 'Courtyard View', // SAMPLE
    sizeSqft: 280, // SAMPLE
    maxGuests: 2, // SAMPLE
    maxOccupancy: 2, // SAMPLE
    roomsTotal: 10, // SAMPLE (10 for normal)
    amenities: ['Free WiFi', 'AC', 'Queen Bed', 'Breakfast Included', 'Room Service'], // SAMPLE
    // taxPercent omitted: GST not confirmed by client
    description: 'Comfortable and well-appointed standard room with modern amenities and courtyard view.', // SAMPLE
    image: roomImage('standard-room'),
  },
  {
    id: 'vja-deluxe-room',
    areaId: 'vijayawada',
    name: 'Deluxe Room',
    type: 'Deluxe Room',
    category: 'normal',
    pricePerNight: 3500, // SAMPLE split inside client range 2500–4500
    bedType: 'King Bed', // SAMPLE
    view: 'Krishna River View', // SAMPLE
    sizeSqft: 380, // SAMPLE
    maxGuests: 2, // SAMPLE
    maxOccupancy: 2, // SAMPLE
    roomsTotal: 10, // SAMPLE (10 for normal)
    amenities: ['Free WiFi', 'River View Balcony', 'King Bed', 'AC', 'Breakfast Included', 'Pool Access'], // SAMPLE
    // taxPercent omitted: GST not confirmed by client
    description: 'Spacious deluxe room with private balcony, scenic views, and club pool access.', // SAMPLE
    image: roomImage('deluxe-room'),
  },
  {
    id: 'vja-premium-room',
    areaId: 'vijayawada',
    name: 'Premium Room',
    type: 'Premium Room',
    category: 'normal',
    pricePerNight: 4500, // SAMPLE split inside client range 2500–4500
    bedType: 'King Bed', // SAMPLE
    view: 'Panoramic River & Lawn View', // SAMPLE
    sizeSqft: 450, // SAMPLE
    maxGuests: 3, // SAMPLE
    maxOccupancy: 3, // SAMPLE
    roomsTotal: 10, // SAMPLE (10 for normal)
    amenities: ['Free WiFi', 'Floor-to-Ceiling Windows', 'King Bed', 'AC', 'Breakfast Included', 'Pool & Gym Access'], // SAMPLE
    // taxPercent omitted: GST not confirmed by client
    description: 'Premium room with floor-to-ceiling windows, luxury bath fittings, and full campus privileges.', // SAMPLE
    image: roomImage('premium-room'),
  },

  // --- Category: Suite (Range ₹4,500 – ₹10,000) ---
  {
    id: 'vja-junior-suite',
    areaId: 'vijayawada',
    name: 'Junior Suite',
    type: 'Junior Suite',
    category: 'suite',
    pricePerNight: 6000, // SAMPLE split inside client range 4500–10000
    bedType: 'King Bed + Sofa Bed', // SAMPLE
    view: 'Riverfront View', // SAMPLE
    sizeSqft: 600, // SAMPLE
    maxGuests: 3, // SAMPLE
    maxOccupancy: 3, // SAMPLE
    roomsTotal: 4, // SAMPLE (4 for suites)
    amenities: ['Free WiFi', 'Living Area', 'King Bed', 'AC', 'Jacuzzi', 'Breakfast Included', 'Club Lounge Access'], // SAMPLE
    // taxPercent omitted: GST not confirmed by client
    description: 'Generously proportioned junior suite featuring a separate sitting lounge and riverfront vistas.', // SAMPLE
    image: roomImage('junior-suite'),
  },
  {
    id: 'vja-executive-suite',
    areaId: 'vijayawada',
    name: 'Executive Suite',
    type: 'Executive Suite',
    category: 'suite',
    pricePerNight: 8000, // SAMPLE split inside client range 4500–10000
    bedType: 'King Bed + Workstation', // SAMPLE
    view: 'Panoramic City & River View', // SAMPLE
    sizeSqft: 750, // SAMPLE
    maxGuests: 3, // SAMPLE
    maxOccupancy: 3, // SAMPLE
    roomsTotal: 4, // SAMPLE (4 for suites)
    amenities: ['Free WiFi', 'Separate Living Room', 'Ergonomic Desk', 'Jacuzzi', 'Breakfast Included', 'VIP Concierge'], // SAMPLE
    // taxPercent omitted: GST not confirmed by client
    description: 'Executive suite with private meeting lounge, ergonomic work alcove, and bespoke butler service.', // SAMPLE
    image: roomImage('executive-suite'),
  },
  {
    id: 'vja-royal-suite',
    areaId: 'vijayawada',
    name: 'Royal Suite',
    type: 'Royal Suite',
    category: 'suite',
    pricePerNight: 10000, // SAMPLE split inside client range 4500–10000
    bedType: 'Four-Poster King Bed', // SAMPLE
    view: 'Private Terrace & Riverfront', // SAMPLE
    sizeSqft: 1100, // SAMPLE
    maxGuests: 4, // SAMPLE
    maxOccupancy: 4, // SAMPLE
    roomsTotal: 4, // SAMPLE (4 for suites)
    amenities: ['Private Terrace', 'Dedicated Butler Service', 'Living & Dining Room', 'Jacuzzi', 'Breakfast Included', 'Valet Parking'], // SAMPLE
    // taxPercent omitted: GST not confirmed by client
    description: 'Palatial royal suite with expansive private terrace, dining room, jacuzzi, and 24-hour butler concierge.', // SAMPLE
    image: roomImage('royal-suite'),
  },
];

// Grouped hotel properties matching legacy HOTELS data structure for seamless backwards compatibility
export const HOTELS = [
  {
    id: 'vja-residency',
    locationId: 'vja',
    name: 'FRCC Riverfront Vijayawada',
    tagline: 'Luxury stay on the Krishna River',
    imageKey: 'facilityPool',
    rating: 4.8,
    address: 'D.No. 24-29-210A, Durgapuram, Gulabithota Road, Vijayawada, NTR District, Andhra Pradesh – 520003',
    amenities: ['Free WiFi', 'River View', 'Pool Access', 'Fitness Center', 'Ayurvedic Spa', 'Parking', 'Multi-cuisine Restaurant'],
    rooms,
  },
];

export function getRoomsByArea(areaId) {
  return rooms.filter((r) => r.areaId === areaId);
}

export function getRoomById(id) {
  return rooms.find((r) => r.id === id || r.type === id || r.name === id);
}

export function getHotelsByLocation(locationId) {
  return HOTELS.filter((h) => h.locationId === locationId);
}

export function getHotelById(id) {
  return HOTELS.find((h) => h.id === id);
}

export default {
  areas,
  rooms,
  HOTELS,
  getRoomsByArea,
  getRoomById,
  getHotelsByLocation,
  getHotelById,
};
