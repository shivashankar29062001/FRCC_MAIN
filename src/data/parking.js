// ---------------------------------------------------------------------------
// /src/data/parking.js — FRCC Parking Areas & Zones Data
// Independent Campuses & Locations: Vijayawada and Hyderabad (150 slots each)
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
    campus_id: 'vja',
    campusName: 'Vijayawada Campus',
    zone_id: 'vja-multi-level',
    name: 'Multi-Level Parking - Vijayawada',
    subtitle: 'Vijayawada Campus',
    spots: 150,
    vehicleTypes: ['CAR', 'BIKE'],
    isFree: true,
    price: 0,
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
    campus_id: 'hyd',
    campusName: 'Hyderabad Campus',
    zone_id: 'hyd-multi-level',
    name: 'Multi-Level Parking - Hyderabad',
    subtitle: 'Hyderabad Campus',
    spots: 150,
    vehicleTypes: ['CAR', 'BIKE'],
    isFree: true,
    price: 0,
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
  return zones.filter(
    (z) => z.areaId === areaId || z.campus_id === areaId || z.locationId === areaId || z.campus === areaId
  );
}

export function getParkingByLocation(locationId) {
  return zones.filter(
    (z) =>
      z.locationId === locationId ||
      z.areaId === locationId ||
      z.campus_id === locationId ||
      z.campus === locationId ||
      (locationId === 'vja-parking' && (z.id === 'vja-multi-level' || z.areaId === 'vja')) ||
      (locationId === 'hyd-parking' && (z.id === 'hyd-multi-level' || z.areaId === 'hyd'))
  );
}

export function getParkingZoneById(id) {
  return zones.find((z) => z.id === id || z.zone_id === id);
}

export default {
  areas,
  zones,
  PARKING_ZONES,
  getParkingByArea,
  getParkingByLocation,
  getParkingZoneById,
};
