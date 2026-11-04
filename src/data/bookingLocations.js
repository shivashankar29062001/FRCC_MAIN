// ---------------------------------------------------------------------------
// /src/data/bookingLocations.js
// Location & venue datasets for Stay, Dining, and Activities booking flows.
// Follows the same City -> Venue hierarchy pattern used in Halls.
// ---------------------------------------------------------------------------

export const STAY_LOCATIONS = [
  {
    id: 'vja',
    name: 'Vijayawada',
    venues: [
      {
        id: 'vja-residency',
        name: 'FRCC Riverfront',
        areaName: 'Vijayawada Campus',
        cityName: 'Vijayawada',
        displayName: 'Vijayawada Campus — FRCC Riverfront',
        address: 'D.No. 24-29-210A, Gulabithota Road, Vijayawada',
      },
    ],
  },
  {
    id: 'hyd',
    name: 'Hyderabad',
    venues: [
      {
        id: 'hyd-residency',
        name: 'Hyderabad Club Residency',
        areaName: 'Hyderabad Campus',
        cityName: 'Hyderabad',
        displayName: 'Hyderabad Campus — Hyderabad Club Residency',
        address: 'Road No. 1, Banjara Hills, Hyderabad, Telangana – 500034',
      },
    ],
  },
];

export const DINING_LOCATIONS = [
  {
    id: 'vja',
    name: 'Vijayawada',
    venues: [
      {
        id: 'vja-dining',
        name: 'FRCC Clubhouse Dining',
        areaName: 'Vijayawada Campus',
        cityName: 'Vijayawada',
        displayName: 'Vijayawada Campus — Main Clubhouse',
        address: 'D.No. 24-29-210A, Gulabithota Road, Vijayawada',
      },
    ],
  },
  {
    id: 'hyd',
    name: 'Hyderabad',
    venues: [
      {
        id: 'hyd-dining',
        name: 'Hyderabad Club Dining',
        areaName: 'Hyderabad Campus',
        cityName: 'Hyderabad',
        displayName: 'Hyderabad Campus — Hyderabad Club Dining',
        address: 'Road No. 1, Banjara Hills, Hyderabad, Telangana – 500034',
      },
    ],
  },
];

export const ACTIVITY_LOCATIONS = [
  {
    id: 'vja',
    name: 'Vijayawada',
    venues: [
      {
        id: 'vja-activities',
        name: 'Sports Complex',
        areaName: 'Vijayawada Campus',
        cityName: 'Vijayawada',
        displayName: 'Vijayawada Campus — Sports Complex',
        address: 'D.No. 24-29-210A, Gulabithota Road, Vijayawada',
      },
    ],
  },
  {
    id: 'hyd',
    name: 'Hyderabad',
    venues: [
      {
        id: 'hyd-activities',
        name: 'Sports Complex',
        areaName: 'Hyderabad Campus',
        cityName: 'Hyderabad',
        displayName: 'Hyderabad Campus — Sports Complex',
        address: 'Road No. 1, Banjara Hills, Hyderabad, Telangana – 500034',
      },
    ],
  },
];
