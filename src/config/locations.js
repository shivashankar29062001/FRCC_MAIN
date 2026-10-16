// ---------------------------------------------------------------------------
// /src/config/locations.js — FRCC Facilities & Locations Single Source of Truth
//
// Every facility location, address, coordinate, opening hour, landmark and
// parking information is managed here.
// ---------------------------------------------------------------------------

export const FACILITY_LOCATIONS = [
  {
    id: 'vja-club',
    name: 'Film Recreation & Cultural Centre (Vijayawada Campus)',
    area: 'Vijayawada',
    address: 'D.No. 24-29-210A, Durgapuram, Gulabithota Road, Vijayawada, NTR District, Andhra Pradesh – 520003',
    lat: 16.5062, // TODO: replace with real coordinates
    lng: 80.6480, // TODO: replace with real coordinates
    phone: '+91 78936 16262',
    openingHours: '6:00 AM – 11:00 PM daily',
    landmark: 'Gulabithota Road, Near Riverfront Promenade',
    parkingInfo: 'Multi-level parking with 500+ bays, EV fast charging, and complimentary valet for members',
    isDefault: true,
  },
  {
    id: 'hyd-office',
    name: 'FRCC Hyderabad Administrative Office',
    area: 'Hyderabad',
    address: 'Second Floor, Samridhi Vasyam, D No 1/98/9/3/23, Capital Pk Rd, Above Axis bank Image gardens branch, Jaihind Enclave, Madhapur, Hyderabad, Telangana 500081',
    lat: 17.4483, // TODO: replace with real coordinates
    lng: 78.3915, // TODO: replace with real coordinates
    phone: '+91 78936 16262',
    openingHours: '9:00 AM – 7:00 PM (Monday – Saturday)',
    landmark: 'Above Axis Bank, Image Gardens Road, Jaihind Enclave, Madhapur',
    parkingInfo: 'Dedicated basement parking and reserved visitor parking slots',
    isDefault: false,
  },
  {
    id: 'amr-campus',
    name: 'FRCC Amaravati Centre (Future Campus)',
    area: 'Amaravati',
    address: 'Rayapudi, Capital City Region, Amaravati, Guntur District, Andhra Pradesh – 522237',
    lat: 16.5108, // TODO: replace with real coordinates
    lng: 80.5061, // TODO: replace with real coordinates
    phone: '+91 78936 16262',
    openingHours: 'Upcoming facility · Preview desk 10:00 AM – 5:00 PM',
    landmark: 'Near Government Secretariat Complex, Rayapudi',
    parkingInfo: 'Surface parking available on site',
    isDefault: false,
  },
  {
    id: 'vja-hotel',
    name: 'FRCC Riverfront Hotel & Guest Suites',
    area: 'Vijayawada',
    address: 'D.No. 24-29-210A, Durgapuram, Gulabithota Road, Vijayawada, NTR District, Andhra Pradesh – 520003',
    lat: 16.5062, // TODO: replace with real coordinates
    lng: 80.6480, // TODO: replace with real coordinates
    phone: '+91 78936 16262',
    openingHours: '24 Hours Front Desk & Check-in',
    landmark: 'FRCC Campus, North Wing overlooking Krishna River',
    parkingInfo: 'Dedicated hotel guest porch, luggage valet, and covered basement parking',
    isDefault: false,
  },
  {
    id: 'vja-halls',
    name: 'FRCC Convention & Function Halls',
    area: 'Vijayawada',
    address: 'D.No. 24-29-210A, Durgapuram, Gulabithota Road, Vijayawada, NTR District, Andhra Pradesh – 520003',
    lat: 16.5062, // TODO: replace with real coordinates
    lng: 80.6480, // TODO: replace with real coordinates
    phone: '+91 78936 16262',
    openingHours: '6:00 AM – 11:30 PM (Event dependent)',
    landmark: 'FRCC Grand Convention Block, Main Portico Entry',
    parkingInfo: 'Large capacity banquet parking, direct VIP drop-off ramp, and valet reception',
    isDefault: false,
  },
  {
    id: 'vja-parking',
    name: 'FRCC Multi-Level Automated Parking Facility',
    area: 'Vijayawada',
    address: 'D.No. 24-29-210A, Durgapuram, Gulabithota Road, Vijayawada, NTR District, Andhra Pradesh – 520003',
    lat: 16.5062, // TODO: replace with real coordinates
    lng: 80.6480, // TODO: replace with real coordinates
    phone: '+91 78936 16262',
    openingHours: 'Open 24x7 for all club members and guests',
    landmark: 'Gate 2 Entrance, Gulabithota Road',
    parkingInfo: '4-level automated parking with 340 bays, 20 EV charging stations, CCTV, and ANPR fast access',
    isDefault: false,
  },
  {
    id: 'vja-activities',
    name: 'FRCC Sports Complex & Arena',
    area: 'Vijayawada',
    address: 'D.No. 24-29-210A, Durgapuram, Gulabithota Road, Vijayawada, NTR District, Andhra Pradesh – 520003',
    lat: 16.5062, // TODO: replace with real coordinates
    lng: 80.6480, // TODO: replace with real coordinates
    phone: '+91 78936 16262',
    openingHours: '6:00 AM – 10:00 PM daily (Courts lit till late)',
    landmark: 'Sports Pavilion & Poolside, FRCC Campus',
    parkingInfo: 'Direct sports pavilion parking and bike bays',
    isDefault: false,
  },
  {
    id: 'vja-membership',
    name: 'FRCC Member Relations & Desk',
    area: 'Vijayawada',
    address: 'D.No. 24-29-210A, Durgapuram, Gulabithota Road, Vijayawada, NTR District, Andhra Pradesh – 520003',
    lat: 16.5062, // TODO: replace with real coordinates
    lng: 80.6480, // TODO: replace with real coordinates
    phone: '+91 78936 16262',
    openingHours: '9:00 AM – 8:00 PM daily',
    landmark: 'Central Clubhouse Lobby, Ground Floor',
    parkingInfo: 'Complimentary member valet and priority club portico parking',
    isDefault: false,
  },
];

// Alias map for quick lookup by service or keyword
const ALIASES = {
  vja: 'vja-club',
  vijayawada: 'vja-club',
  campus: 'vja-club',
  club: 'vja-club',
  'vja-campus': 'vja-club',
  hotel: 'vja-hotel',
  stay: 'vja-hotel',
  'vja-residency': 'vja-hotel',
  'vja-stay': 'vja-hotel',
  hall: 'vja-halls',
  halls: 'vja-halls',
  'vja-function-hall': 'vja-halls',
  'vja-convention-center': 'vja-halls',
  'vja-mini-hall': 'vja-halls',
  parking: 'vja-parking',
  'vja-multi-level': 'vja-parking',
  'vja-riverfront': 'vja-parking',
  'vja-city-center': 'vja-parking',
  activities: 'vja-activities',
  games: 'vja-activities',
  badminton: 'vja-activities',
  tennis: 'vja-activities',
  'swimming-pool': 'vja-activities',
  football: 'vja-activities',
  membership: 'vja-membership',
  hyd: 'hyd-office',
  hyderabad: 'hyd-office',
  madhapur: 'hyd-office',
  amr: 'amr-campus',
  amaravati: 'amr-campus',
};

/**
 * Get facility location by ID or alias
 * @param {string} idOrAlias
 * @returns {object}
 */
export function getLocationById(idOrAlias) {
  if (!idOrAlias) return FACILITY_LOCATIONS[0];
  const normalized = String(idOrAlias).toLowerCase().trim();
  const directMatch = FACILITY_LOCATIONS.find((l) => l.id.toLowerCase() === normalized);
  if (directMatch) return directMatch;

  const targetId = ALIASES[normalized];
  if (targetId) {
    const aliasMatch = FACILITY_LOCATIONS.find((l) => l.id === targetId);
    if (aliasMatch) return aliasMatch;
  }

  // Address or area substring match
  const areaMatch = FACILITY_LOCATIONS.find(
    (l) =>
      l.area.toLowerCase().includes(normalized) ||
      l.address.toLowerCase().includes(normalized) ||
      l.name.toLowerCase().includes(normalized)
  );
  if (areaMatch) return areaMatch;

  return FACILITY_LOCATIONS[0];
}

/**
 * Get all locations in a specific area
 * @param {'Vijayawada'|'Hyderabad'|'Amaravati'} area
 */
export function getLocationsByArea(area) {
  if (!area) return FACILITY_LOCATIONS;
  const q = String(area).toLowerCase();
  return FACILITY_LOCATIONS.filter((l) => l.area.toLowerCase() === q);
}

/**
 * Get the default flagship campus location
 */
export function getDefaultLocation() {
  return FACILITY_LOCATIONS.find((l) => l.isDefault) || FACILITY_LOCATIONS[0];
}

export function getAllLocations() {
  return FACILITY_LOCATIONS;
}

export default FACILITY_LOCATIONS;
