// ---------------------------------------------------------------------------
// /src/data/parking.js — FRCC Parking Areas & Zones Data
// Locations: Vijayawada and Hyderabad (150 slots each)
// ---------------------------------------------------------------------------

export const areas = [
  { id: 'vja', name: 'Vijayawada', campus: 'vijayawada' },
  { id: 'hyd', name: 'Hyderabad', campus: 'hyderabad' },
];

export const zones = [
  // --- Vijayawada Campus ---
  {
    id: 'vja-multi-level',
    areaId: 'vja',
    locationId: 'vja',
    campus: 'vijayawada',
    campusName: 'Vijayawada Campus',
    name: 'Multi-Level Parking - Vijayawada',
    vehicleTypes: ['car', 'bike'],
    isFree: true,
    price: 0,
    spots: 150,
    prices: { hour: 0, day: 0, month: 0 },
    description: '4-level automated parking facility with EV charging and complimentary club parking',
    features: ['Complimentary Parking', 'EV Charging (20 points)', 'Car Wash', 'CCTV', 'ANPR Entry', 'App Booking'],
    operatingHours: '24x7',
    paymentMethods: ['Complimentary Pass'],
    monthlyPass: { car: 0, bike: 0 },
    vehicleTypeDetails: {
      car: { pricePerHour: 0, pricePerDay: 0, totalSlots: 150, available: 150 },
      bike: { pricePerHour: 0, pricePerDay: 0, totalSlots: 150, available: 150 },
    },
  },

  // --- Hyderabad Campus ---
  {
    id: 'hyd-multi-level',
    areaId: 'hyd',
    locationId: 'hyd',
    campus: 'hyderabad',
    campusName: 'Hyderabad Campus',
    name: 'Multi-Level Parking - Hyderabad',
    vehicleTypes: ['car', 'bike'],
    isFree: true,
    price: 0,
    spots: 150,
    prices: { hour: 0, day: 0, month: 0 },
    description: '4-level automated parking facility with EV charging and complimentary club parking',
    features: ['Complimentary Parking', 'EV Charging (20 points)', 'Car Wash', 'CCTV', 'ANPR Entry', 'App Booking'],
    operatingHours: '24x7',
    paymentMethods: ['Complimentary Pass'],
    monthlyPass: { car: 0, bike: 0 },
    vehicleTypeDetails: {
      car: { pricePerHour: 0, pricePerDay: 0, totalSlots: 150, available: 150 },
      bike: { pricePerHour: 0, pricePerDay: 0, totalSlots: 150, available: 150 },
    },
  },
];

export const PARKING_ZONES = zones;

export function getParkingByArea(areaId) {
  return zones.filter((z) => z.areaId === areaId || z.locationId === areaId || z.campus === areaId);
}

export function getParkingByLocation(locationId) {
  return zones.filter((z) => z.locationId === locationId || z.areaId === locationId || z.campus === locationId);
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
