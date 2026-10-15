// ---------------------------------------------------------------------------
// /src/data/parking.js — FRCC Parking Areas & Zones Data
// Single Location: Vijayawada
// ---------------------------------------------------------------------------

// The club has ONE location, Vijayawada. (Array kept so it can grow later)
export const areas = [
  { id: 'vja', name: 'Vijayawada' },
];

export const zones = [
  {
    id: 'vja-multi-level',
    areaId: 'vja',
    locationId: 'vja',
    name: 'Multi-Level Parking - Vijayawada',
    vehicleTypes: ['car', 'bike'],
    isFree: true, // Client: every zone price 0, isFree true
    price: 0,
    spots: 340, // SAMPLE
    prices: { hour: 0, day: 0, month: 0 },
    description: '4-level automated parking facility with EV charging and complimentary club parking',
    features: ['Complimentary Parking', 'EV Charging (20 points)', 'Car Wash', 'CCTV', 'ANPR Entry', 'App Booking'],
    operatingHours: '24x7',
    paymentMethods: ['Complimentary Pass'],
    monthlyPass: { car: 0, bike: 0 },
    vehicleTypeDetails: {
      car: { pricePerHour: 0, pricePerDay: 0, totalSlots: 200, available: 150 },
      bike: { pricePerHour: 0, pricePerDay: 0, totalSlots: 140, available: 110 },
    },
  },
  {
    id: 'vja-riverfront',
    areaId: 'vja',
    locationId: 'vja',
    name: 'Riverfront Parking - Vijayawada',
    vehicleTypes: ['car', 'bike'],
    isFree: true, // Client: every zone price 0, isFree true
    price: 0,
    spots: 180, // SAMPLE
    prices: { hour: 0, day: 0, month: 0 },
    description: 'Open surface parking with Krishna River views and direct walkway to campus',
    features: ['Complimentary Parking', 'River View', 'Solar Canopy (50%)', 'CCTV', 'Walking Trail'],
    operatingHours: '6 AM - 10 PM',
    paymentMethods: ['Complimentary Pass'],
    monthlyPass: { car: 0, bike: 0 },
    vehicleTypeDetails: {
      car: { pricePerHour: 0, pricePerDay: 0, totalSlots: 100, available: 70 },
      bike: { pricePerHour: 0, pricePerDay: 0, totalSlots: 80, available: 55 },
    },
  },
  {
    id: 'vja-city-center',
    areaId: 'vja',
    locationId: 'vja',
    name: 'City Center Basement - Vijayawada',
    vehicleTypes: ['car', 'bike'],
    isFree: true, // Client: every zone price 0, isFree true
    price: 0,
    spots: 130, // SAMPLE
    prices: { hour: 0, day: 0, month: 0 },
    description: 'Convenient basement parking with EV points and 24/7 security',
    features: ['Complimentary Parking', 'Direct Campus Access', 'CCTV', 'EV Charging (8 points)', '24/7 Security'],
    operatingHours: '24x7',
    paymentMethods: ['Complimentary Pass'],
    monthlyPass: { car: 0, bike: 0 },
    vehicleTypeDetails: {
      car: { pricePerHour: 0, pricePerDay: 0, totalSlots: 80, available: 45 },
      bike: { pricePerHour: 0, pricePerDay: 0, totalSlots: 50, available: 35 },
    },
  },
];

export const PARKING_ZONES = zones;

export function getParkingByArea(areaId) {
  return zones.filter((z) => z.areaId === areaId || z.locationId === areaId);
}

export function getParkingByLocation(locationId) {
  return zones.filter((z) => z.locationId === locationId || z.areaId === locationId);
}

export function getParkingZoneById(id) {
  return zones.find((z) => z.id === id);
}

export default {
  areas,
  zones,
  PARKING_ZONES,
  getParkingByArea,
  getParkingByLocation,
  getParkingZoneById,
};
