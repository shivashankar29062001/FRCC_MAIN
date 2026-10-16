// JSON-file backed store. Kept behind this module so it can be swapped for SQLite later.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DB_PATH = path.join(__dirname, 'data.json');

// ── Clubhouse seed data — edit names, capacities, prices and amenities here ──
// Exactly two clubs (one per city), 5 halls each:
// Board Room, Meeting Room, Conference Room, Convention Room, Banquet Hall.
// Photos live in public/images/halls/<club>-<hall>/ and are downloaded by
// server/scripts/download-images.js (Unsplash, free for commercial use).
// Addresses are intentionally empty — the UI shows "Address coming soon".
const hallImages = (folder, count = 4) =>
  Array.from({ length: count }, (_, i) => `/images/halls/${folder}/${folder}-${i + 1}.jpg`);

const CLUBS = [
  {
    city: { id: 'HYD', name: 'Hyderabad', state: 'TS' },
    area: { id: 'CC', name: 'City Centre' },
    venue: {
      id: 'VG13',
      name: 'Hyderabad Club',
      heroImage: '/images/halls/hyderabad-club/hyderabad-club-hero.jpg',
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
        imageAlts: [
          'Hyderabad Club Board Room, long executive table with panoramic windows',
          'Hyderabad Club Board Room, meeting table with executive chairs',
          'Hyderabad Club Board Room, board meeting with laptops and wall screens',
          'Hyderabad Club Board Room, discussion around the table',
        ],
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
        imageAlts: [
          'Hyderabad Club Meeting Room, modern round-table meeting room',
          'Hyderabad Club Meeting Room, whiteboard planning session',
          'Hyderabad Club Meeting Room, small glass meeting room',
          'Hyderabad Club Meeting Room, laptops and notes on the meeting table',
        ],
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
        imageAlts: [
          'Hyderabad Club Conference Room, presentation screen with classroom seating',
          'Hyderabad Club Conference Room, audience seated in the conference hall',
          'Hyderabad Club Conference Room, delegates taking notes during a session',
          'Hyderabad Club Conference Room, long tables in workshop layout',
        ],
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
        imageAlts: [
          'Hyderabad Club Convention Room, grand hall with stage and lighting',
          'Hyderabad Club Convention Room, stage lighting over the crowd',
          'Hyderabad Club Convention Room, light beams over seated guests',
          'Hyderabad Club Convention Room, packed hall during an event',
        ],
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
        imageAlts: [
          'Hyderabad Club Banquet Hall, round tables and chandeliers',
          'Hyderabad Club Banquet Hall, tables laid for a banquet dinner',
          'Hyderabad Club Banquet Hall, table setting with floral decor',
          'Hyderabad Club Banquet Hall, banquet tables prepared for guests',
        ],
      },
    ],
  },
  {
    city: { id: 'VJA', name: 'Vijayawada', state: 'AP' },
    area: { id: 'CC', name: 'City Centre' },
    venue: {
      id: 'VG14',
      name: 'Vijayawada Club',
      heroImage: '/images/halls/vijayawada-club/vijayawada-club-hero.jpg',
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
        imageAlts: [
          'Vijayawada Club Board Room, glass-walled room with a long table',
          'Vijayawada Club Board Room, team around the board table',
          'Vijayawada Club Board Room, working session at the table',
          'Vijayawada Club Board Room, spacious table for board meetings',
        ],
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
        imageAlts: [
          'Vijayawada Club Meeting Room, oval table with armchairs',
          'Vijayawada Club Meeting Room, meeting tables and screen',
          'Vijayawada Club Meeting Room, small meeting by the window',
          'Vijayawada Club Meeting Room, presentation to the team',
        ],
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
        imageAlts: [
          'Vijayawada Club Conference Room, hall with projection screens',
          'Vijayawada Club Conference Room, speaker presenting to delegates',
          'Vijayawada Club Conference Room, theatre-style seating rows',
          'Vijayawada Club Conference Room, summit seating with screens',
        ],
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
        imageAlts: [
          'Vijayawada Club Convention Room, large hall with round tables and screens',
          'Vijayawada Club Convention Room, stage show with lighting',
          'Vijayawada Club Convention Room, big screen with seated audience',
          'Vijayawada Club Convention Room, convention hall with an audience',
        ],
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
        imageAlts: [
          'Vijayawada Club Banquet Hall, round tables across the hall',
          'Vijayawada Club Banquet Hall, long tables with floral settings',
          'Vijayawada Club Banquet Hall, banquet setup with warm lighting',
          'Vijayawada Club Banquet Hall, guests dining under string lights',
        ],
      },
    ],
  },
];

// ── City > Area > Venue > Hall hierarchy (derived from CLUBS) ───────────
const cities = CLUBS.map(club => ({
  id: club.city.id,
  name: club.city.name,
  state: club.city.state,
  areas: [
    {
      id: club.area.id,
      name: club.area.name,
      venues: [
        {
          id: club.venue.id,
          name: club.venue.name,
          heroImage: club.venue.heroImage,
          halls: club.halls.map(h => h.id),
        },
      ],
    },
  ],
  rating: 4.5,
}));

// ── Build the full hall list from the clubs ─────────────────────────────
function buildHalls() {
  const halls = [];
  for (const club of CLUBS) {
    const { city, area, venue } = club;
    for (const hallDef of club.halls) {
      halls.push({
        id: hallDef.id,
        name: hallDef.name,
        type: hallDef.type,
        capacity: hallDef.capacity,
        pricePerHour: hallDef.pricePerHour,
        pricePerDay: hallDef.pricePerDay,
        venueId: venue.id,
        venueName: venue.name,
        areaId: area.id,
        areaName: area.name,
        cityId: city.id,
        cityName: city.name,
        area: area.name,
        city: city.name,
        amenities: hallDef.amenities,
        images: hallDef.images,
        imageAlts: hallDef.imageAlts,
        displayPricePerHour: `Rs. ${hallDef.pricePerHour.toLocaleString('en-IN')}/hr`,
        displayPricePerDay: `Rs. ${hallDef.pricePerDay.toLocaleString('en-IN')}/day`,
      });
    }
  }
  return halls;
}

function buildData() {
  return {
    halls: buildHalls(),
    cities,
    // Reactive-ish convenience for API consumers
    venues: cities.flatMap(c =>
      c.areas.flatMap(a =>
        a.venues.map(v => ({ ...v, cityId: c.id, cityName: c.name, areaId: a.id, areaName: a.name }))
      )
    ),
  };
}

// ── Read / write ────────────────────────────────────────────────────────
function readDb() {
  if (!fs.existsSync(DB_PATH)) {
    const initial = { users: [], halls: buildHalls(), bookings: [], notifications: [], tickets: [], reviews: [] };
    fs.writeFileSync(DB_PATH, JSON.stringify(initial, null, 2));
    return initial;
  }
  return JSON.parse(fs.readFileSync(DB_PATH, 'utf-8'));
}

function writeDb(db) {
  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
}

const uid = (prefix) => `${prefix}_${crypto.randomBytes(4).toString('hex').toUpperCase()}`;

module.exports = { readDb, writeDb, uid, buildHalls, buildData, cities };
