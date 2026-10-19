// Seed script — safe to run repeatedly (idempotent).
// - Rebuilds the hall list from the City > Area > Venue hierarchy in db.js
// - Backfills city/area/venue fields onto existing bookings (migrates legacy bookings
//   that pointed at the old H1-H6 hall ids to a default FRCC Convention Hall venue)
// - Ensures the test user exists for mock mode
// - Migrates existing bookings without userId to the test user
// - Never creates duplicate users, bookings or notifications
//
// Usage:  npm run seed    (from the server/ folder)

const fs = require('fs');
const path = require('path');
const { buildData } = require('./db');

const DB_PATH = path.join(__dirname, 'data.json');

// Test user for mock mode (must match client/src/services/auth.js MOCK_USER)
const TEST_USER = {
  id: 'test-user-1',
  name: 'Test User',
  email: 'test@frcc.example',
  mobile: '9999999999',
};

function ensureCollections(db) {
  db.users = db.users || [];
  db.bookings = db.bookings || [];
  db.notifications = db.notifications || [];
  db.tickets = db.tickets || [];
  db.reviews = db.reviews || [];
  db.halls = db.halls || [];
}

// Legacy hall ids (H1..H6) from the original single-venue build map to the first
// venue/city in the new structure so existing bookings stay valid.
const LEGACY_HALL_MAP = {
  H1: { cityId: 'HYD', areaId: 'HC', venueId: 'VG1', venueName: 'FRCC Grand Hitech', hallId: 'VH1', hallName: 'Grand Ballroom' },
  H2: { cityId: 'HYD', areaId: 'HC', venueId: 'VG1', venueName: 'FRCC Grand Hitech', hallId: 'VH2', hallName: 'Conference Hall' },
  H3: { cityId: 'HYD', areaId: 'HC', venueId: 'VG1', venueName: 'FRCC Grand Hitech', hallId: 'VH3', hallName: 'Banquet Hall' },
  H4: { cityId: 'HYD', areaId: 'HC', venueId: 'VG1', venueName: 'FRCC Grand Hitech', hallId: 'VH4', hallName: 'Board Room' },
  H5: { cityId: 'HYD', areaId: 'HC', venueId: 'VG1', venueName: 'FRCC Grand Hitech', hallId: 'VH3', hallName: 'Banquet Hall' },
  H6: { cityId: 'HYD', areaId: 'HC', venueId: 'VG1', venueName: 'FRCC Grand Hitech', hallId: 'VH4', hallName: 'Board Room' },
};

function seed(verbose = true) {
  const db = fs.existsSync(DB_PATH)
    ? JSON.parse(fs.readFileSync(DB_PATH, 'utf-8'))
    : { users: [], halls: [], bookings: [], notifications: [], tickets: [], reviews: [] };

  ensureCollections(db);

  // 1. Ensure test user exists (for mock mode)
  let testUser = db.users.find(u => u.id === TEST_USER.id);
  if (!testUser) {
    testUser = { ...TEST_USER, createdAt: new Date().toISOString() };
    db.users.push(testUser);
    if (verbose) console.log('Created test user:', TEST_USER.id);
  } else {
    // Update fields in case they changed
    Object.assign(testUser, TEST_USER);
  }

  // 2. Rebuild halls from the hierarchy (replace legacy hall set entirely)
  const fresh = buildData();
  const before = db.halls.length;
  db.halls = fresh.halls;
  // Also update venues with full details (including lat/lng, address, etc.)
  db.venues = fresh.venues;

  // 3. Backfill location fields on bookings (migrate legacy bookings; keep all fields)
  let migrated = 0;
  for (const b of db.bookings) {
    if (LEGACY_HALL_MAP[b.hallId]) {
      const m = LEGACY_HALL_MAP[b.hallId];
      b.hallId = m.hallId;
      b.hallName = b.hallName && !['Grand Ballroom', 'Pearl Palace AC Hall', 'Lotus Garden Hall', 'Executive Board Room', 'Sapphire Banquet Hall', 'Board Room – Misty'].includes(b.hallName)
        ? b.hallName : m.hallName;
      b.cityId = b.cityId || m.cityId;
      b.areaId = b.areaId || m.areaId;
      b.venueId = b.venueId || m.venueId;
      b.venueName = b.venueName || m.venueName;
      migrated++;
    } else if (!b.venueId) {
      // New-style hall id but location fields missing — look it up
      const hall = db.halls.find(h => h.id === b.hallId);
      if (hall) {
        b.cityId = hall.cityId; b.areaId = hall.areaId;
        b.venueId = hall.venueId; b.venueName = hall.venueName;
        migrated++;
      }
    }

    // 4. Migrate bookings without userId to test user
    if (!b.userId) {
      b.userId = TEST_USER.id;
      migrated++;
    }
  }

  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));

  if (verbose) {
    console.log(`Seed complete: ${db.halls.length} halls across ${new Set(db.halls.map(h => h.venueId)).size} venues in ${new Set(db.halls.map(h => h.cityId)).size} cities`);
    console.log(`Venues: ${[...new Set(db.halls.map(h => h.venueId))].length}`);
    console.log(`Bookings migrated: ${migrated} of ${db.bookings.length}`);
    console.log(`Users: ${db.users.length} (test user: ${TEST_USER.id})`);
  }
  return db;
}

if (require.main === module) {
  seed();
}

module.exports = { seed };