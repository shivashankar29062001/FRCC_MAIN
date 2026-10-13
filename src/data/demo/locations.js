// Demo locations for FRCC
export const LOCATIONS = [
  {
    id: 'hyd',
    name: 'Hyderabad',
    state: 'Telangana',
    lat: 17.3850,
    lng: 78.4867,
    isDefault: true,
  },
  {
    id: 'vja',
    name: 'Vijayawada',
    state: 'Andhra Pradesh',
    lat: 16.5062,
    lng: 80.6480,
    isDefault: false,
  },
  {
    id: 'amr',
    name: 'Amaravati',
    state: 'Andhra Pradesh',
    lat: 16.5108,
    lng: 80.5061,
    isDefault: false,
  },
];

export function getLocationById(id) {
  return LOCATIONS.find((l) => l.id === id) || LOCATIONS[0];
}

export function getDefaultLocation() {
  return LOCATIONS.find((l) => l.isDefault) || LOCATIONS[0];
}