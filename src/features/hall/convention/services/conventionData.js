// ---------------------------------------------------------------------------
// /src/features/hall/convention/services/conventionData.js
// Client-side dataset and fallback catalog for Convention Halls & Venues
// ---------------------------------------------------------------------------

const base = (import.meta.env?.BASE_URL || '/').replace(/\/$/, '');
const resolveImg = (path) => (path ? `${base}${path.startsWith('/') ? '' : '/'}${path}` : '');

const hallImages = (folder, count = 4) =>
  Array.from({ length: count }, (_, i) => resolveImg(`/images/halls/${folder}/${folder}-${i + 1}.jpg`));

export const CLUBS = [
  {
    city: { id: 'HYD', name: 'Hyderabad', state: 'TS' },
    area: { id: 'CC', name: 'City Centre', rating: 4.8 },
    venue: {
      id: 'VG13',
      name: 'Hyderabad Club',
      heroImage: resolveImg('/images/halls/hyderabad-club/hyderabad-club-hero.jpg'),
      address: 'Road No. 1, Banjara Hills, Hyderabad, Telangana – 500034',
      phone: '+91 73967 44556',
      email: 'hyderabad.club@frcc.club',
      rating: 4.9,
      parkingCapacity: 120,
      openingHours: '06:00 AM – 11:00 PM',
    },
    halls: [
      {
        id: 'VH33',
        name: 'Board Room',
        type: 'BOARD_ROOM',
        capacity: 30,
        pricePerHour: 2000,
        pricePerDay: 16000,
        amenities: ['AC', 'Video Conferencing', 'Whiteboard', 'Wi-Fi', 'Projector', 'Coffee Service'],
        images: hallImages('hyderabad-board-room'),
      },
      {
        id: 'VH34',
        name: 'Meeting Room',
        type: 'AC',
        capacity: 50,
        pricePerHour: 3000,
        pricePerDay: 24000,
        amenities: ['AC', 'Projector & Screen', 'Whiteboard', 'Wi-Fi', 'Conference Phone', 'Coffee Service'],
        images: hallImages('hyderabad-meeting-room'),
      },
      {
        id: 'VH35',
        name: 'Conference Room',
        type: 'AC',
        capacity: 150,
        pricePerHour: 6000,
        pricePerDay: 48000,
        amenities: ['AC', 'Theatre Seating', 'Podium & Mic', 'Projector & Screen', 'Sound System', 'Wi-Fi'],
        images: hallImages('hyderabad-conference-room'),
      },
      {
        id: 'VH36',
        name: 'Convention Room',
        type: 'AC',
        capacity: 1000,
        pricePerHour: 25000,
        pricePerDay: 200000,
        amenities: ['AC', 'Grand Stage', 'Professional Lighting', 'Sound System', 'Wi-Fi', 'Catering', 'Generator Backup', 'Parking'],
        images: hallImages('hyderabad-convention-room'),
      },
      {
        id: 'VH37',
        name: 'Banquet Hall',
        type: 'AC',
        capacity: 500,
        pricePerHour: 18000,
        pricePerDay: 144000,
        amenities: ['AC', 'Round-Table Seating', 'Chandeliers', 'Stage & Decor', 'Catering', 'Valet Parking'],
        images: hallImages('hyderabad-banquet-hall'),
      },
    ],
  },
  {
    city: { id: 'VJA', name: 'Vijayawada', state: 'AP' },
    area: { id: 'CC', name: 'City Centre', rating: 4.9 },
    venue: {
      id: 'VG14',
      name: 'Vijayawada Club',
      heroImage: resolveImg('/images/halls/vijayawada-club/vijayawada-club-hero.jpg'),
      address: 'D.No. 24-29-210A, Gulabithota Road, Vijayawada, Andhra Pradesh – 520003',
      phone: '+91 98663 33787',
      email: 'vijayawada.club@frcc.club',
      rating: 4.8,
      parkingCapacity: 150,
      openingHours: '06:00 AM – 11:00 PM',
    },
    halls: [
      {
        id: 'VH38',
        name: 'Board Room',
        type: 'BOARD_ROOM',
        capacity: 30,
        pricePerHour: 2000,
        pricePerDay: 16000,
        amenities: ['AC', 'Video Conferencing', 'Smart TV', 'Wi-Fi', 'Whiteboard', 'Coffee Service'],
        images: hallImages('vijayawada-board-room'),
      },
      {
        id: 'VH39',
        name: 'Meeting Room',
        type: 'AC',
        capacity: 50,
        pricePerHour: 3000,
        pricePerDay: 24000,
        amenities: ['AC', 'Projector & Screen', 'Video Bar', 'Wi-Fi', 'Whiteboard'],
        images: hallImages('vijayawada-meeting-room'),
      },
      {
        id: 'VH40',
        name: 'Conference Room',
        type: 'AC',
        capacity: 150,
        pricePerHour: 6000,
        pricePerDay: 48000,
        amenities: ['AC', 'Theatre Seating', 'Stage & Podium', 'LED Screen', 'Sound System', 'Wi-Fi', 'Catering'],
        images: hallImages('vijayawada-conference-room'),
      },
      {
        id: 'VH41',
        name: 'Convention Room',
        type: 'AC',
        capacity: 1000,
        pricePerHour: 25000,
        pricePerDay: 200000,
        amenities: ['AC', 'Grand Stage', 'LED Wall', 'Professional Lighting', 'Sound System', 'Wi-Fi', 'Catering', 'Parking'],
        images: hallImages('vijayawada-convention-room'),
      },
      {
        id: 'VH42',
        name: 'Banquet Hall',
        type: 'AC',
        capacity: 500,
        pricePerHour: 18000,
        pricePerDay: 144000,
        amenities: ['AC', 'Round-Table Seating', 'Buffet Counters', 'Stage & Decor', 'Catering', 'Valet Parking'],
        images: hallImages('vijayawada-banquet-hall'),
      },
    ],
  },
];

// Cities hierarchy
export const CITIES = CLUBS.map((club) => ({
  id: club.city.id,
  name: club.city.name,
  state: club.city.state,
  areas: [
    {
      id: club.area.id,
      name: club.area.name,
      rating: club.area.rating || 4.8,
      venues: [
        {
          id: club.venue.id,
          name: club.venue.name,
          heroImage: club.venue.heroImage,
          halls: club.halls.map((h) => h.id),
        },
      ],
    },
  ],
}));

// Flattened venues
export const VENUES = CLUBS.map((club) => ({
  ...club.venue,
  cityId: club.city.id,
  cityName: club.city.name,
  areaId: club.area.id,
  areaName: club.area.name,
  hallCount: club.halls.length,
  startingPrice: Math.min(...club.halls.map((h) => h.pricePerHour)),
  images: club.halls[0]?.images || [],
}));

// Flattened halls
export const HALLS = CLUBS.flatMap((club) =>
  club.halls.map((hall) => ({
    ...hall,
    cityId: club.city.id,
    cityName: club.city.name,
    areaId: club.area.id,
    areaName: club.area.name,
    venueId: club.venue.id,
    venueName: club.venue.name,
    venueHeroImage: club.venue.heroImage,
  }))
);

export function getCities() {
  return CITIES;
}

export function getVenues(cityId, areaId) {
  let list = VENUES;
  if (cityId) list = list.filter((v) => v.cityId === cityId);
  if (areaId && areaId !== 'ALL') list = list.filter((v) => v.areaId === areaId);
  return list;
}

export function getVenueById(id) {
  const venue = VENUES.find((v) => v.id === id);
  if (!venue) return null;
  const halls = HALLS.filter((h) => h.venueId === id);
  return { ...venue, halls };
}

export function getAllHalls() {
  return HALLS;
}

export function getHallById(id) {
  return HALLS.find((h) => h.id === id) || null;
}
