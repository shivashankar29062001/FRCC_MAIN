// FRCC Locations — Vijayawada & Hyderabad
export const LOCATIONS = [
  {
    id: 'vja',
    name: 'Vijayawada',
    state: 'Andhra Pradesh',
    address: 'D.No. 24-29-210A, Durgapuram, Gulabithota Road, Vijayawada, NTR District, Andhra Pradesh – 520003',
    lat: 16.5062,
    lng: 80.6480,
    isDefault: true,
  },
  {
    id: 'hyd',
    name: 'Hyderabad',
    state: 'Telangana',
    address: 'Second Floor, Samridhi Vasyam, D No 1/98/9/3/23, Capital Pk Rd, Above Axis bank Image gardens branch, Jaihind Enclave, Madhapur, Hyderabad, Telangana 500081',
    lat: 17.4483,
    lng: 78.3915,
    isDefault: false,
  },
];

export function getLocationById(id) {
  return LOCATIONS.find((l) => l.id === id) || LOCATIONS[0];
}

export function getDefaultLocation() {
  return LOCATIONS.find((l) => l.isDefault) || LOCATIONS[0];
}