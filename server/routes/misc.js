const express = require('express');
const { readDb, writeDb, uid, cities } = require('../db');
const auth = require('../middleware/auth');
const { mockVerifyUPI } = require('../services/verifyUPI');

const router = express.Router();

// Helper: find city by id
function findCity(cityId) {
  return cities.find(c => c.id === cityId);
}

// Helper: find area by cityId and areaId
function findArea(cityId, areaId) {
  const city = findCity(cityId);
  if (!city) return null;
  return city.areas.find(a => a.id === areaId);
}

// Helper: find venue by id
function findVenue(venueId) {
  for (const city of cities) {
    for (const area of city.areas) {
      const venue = area.venues.find(v => v.id === venueId);
      if (venue) return { venue, city, area };
    }
  }
  return null;
}

// GET /halls - supports cityId and areaId (not city/area names)
// Query: ?cityId=HYD&areaId=HC (or "ALL" for no filter)
router.get('/halls', (req, res) => {
  const db = readDb();
  let results = db.halls;

  // Filter by cityId
  if (req.query.cityId) {
    const cityId = req.query.cityId;
    results = results.filter(h => String(h.cityId) === String(cityId));
  }

  // Filter by areaId - "ALL" means no area filter
  if (req.query.areaId && req.query.areaId !== 'ALL') {
    const areaId = req.query.areaId;
    results = results.filter(h => String(h.areaId) === String(areaId));
  }

  if (req.query.venue) results = results.filter(h => h.venueId === req.query.venue);
  res.json({ halls: results });
});

// Cities → Areas → Venues list (with hall counts and starting prices)
// Supports ?cityId=HYD&areaId=HC (or "ALL")
router.get('/locations', (req, res) => {
  // Return the full cities hierarchy from db.js
  res.json({ cities });
});

// Build venue list with full details from cities hierarchy
function buildVenueList(db) {
  const venueMap = new Map();
  // First pass: aggregate hall counts and starting prices from halls
  for (const hall of db.halls) {
    if (!venueMap.has(hall.venueId)) {
      venueMap.set(hall.venueId, {
        id: hall.venueId,
        name: hall.venueName,
        areaId: hall.areaId,
        areaName: hall.area,
        cityId: hall.cityId,
        cityName: hall.city,
        rating: 4.5,
        hallCount: 0,
        startingPrice: hall.pricePerHour,
        images: hall.images,
      });
    }
    const v = venueMap.get(hall.venueId);
    v.hallCount += 1;
    v.startingPrice = Math.min(v.startingPrice, hall.pricePerHour);
  }

  // Second pass: enrich with venue details from cities hierarchy
  for (const city of cities) {
    for (const area of city.areas) {
      for (const venue of area.venues) {
        if (venueMap.has(venue.id)) {
          const v = venueMap.get(venue.id);
          v.address = venue.address || '';
          v.phone = venue.phone || '';
          v.email = venue.email || '';
          v.googleMaps = venue.googleMaps || '';
          v.parkingCapacity = venue.parkingCapacity || 0;
          v.openingHours = venue.openingHours || '';
          v.rating = venue.rating || v.rating;
          v.lat = venue.lat || null;
          v.lng = venue.lng || null;
          v.heroImage = venue.heroImage || '';
        }
      }
    }
  }

  return Array.from(venueMap.values());
}

router.get('/venues', (req, res) => {
  const db = readDb();
  let venues = buildVenueList(db);

  // Filter by cityId
  if (req.query.cityId) {
    const cityId = req.query.cityId;
    venues = venues.filter(v => String(v.cityId) === String(cityId));
  }

  // Filter by areaId - "ALL" means no area filter
  if (req.query.areaId && req.query.areaId !== 'ALL') {
    const areaId = req.query.areaId;
    venues = venues.filter(v => String(v.areaId) === String(areaId));
  }

  // Search query
  if (req.query.q) {
    const q = String(req.query.q).toLowerCase();
    venues = venues.filter(v => 
      v.name.toLowerCase().includes(q) ||
      v.areaName.toLowerCase().includes(q) ||
      v.cityName.toLowerCase().includes(q)
    );
  }

  // Pagination
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.min(50, parseInt(req.query.limit) || 20);
  const start = (page - 1) * limit;
  const paginated = venues.slice(start, start + limit);

  res.json({ 
    venues: paginated, 
    total: venues.length, 
    page, 
    limit, 
    totalPages: Math.ceil(venues.length / limit) 
  });
});

router.get('/venues/:id', (req, res) => {
  const { venue, city, area } = findVenue(req.params.id) || {};
  if (!venue) return res.status(404).json({ error: 'Venue not found.' });

  const db = readDb();
  const vHalls = db.halls.filter(h => h.venueId === req.params.id);
  
  res.json({
    venue: {
      id: venue.id,
      name: venue.name,
      address: venue.address,
      phone: venue.phone,
      email: venue.email,
      googleMaps: venue.googleMaps,
      parkingCapacity: venue.parkingCapacity,
      openingHours: venue.openingHours,
      rating: venue.rating,
      heroImage: venue.heroImage || '',
      hallCount: vHalls.length,
      areaId: area.id,
      areaName: area.name,
      cityId: city.id,
      cityName: city.name,
    },
    halls: vHalls,
  });
});

router.post('/payments/verify-upi', async (req, res) => {
  const { upiId } = req.body || {};
  const result = await mockVerifyUPI(String(upiId || ''));
  res.json(result);
});

router.get('/notifications', auth, (req, res) => {
  const db = readDb();
  res.json({ notifications: db.notifications.filter(n => n.userId === req.user.id).sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1)) });
});
router.post('/notifications/read', auth, (req, res) => {
  const db = readDb();
  db.notifications.forEach(n => { if (n.userId === req.user.id) n.read = true; });
  writeDb(db); res.json({ ok: true });
});

router.post('/contact', auth, (req, res) => {
  const { subject, message } = req.body || {};
  if (!subject || !message) return res.status(400).json({ error: 'Subject and message are required.' });
  const db = readDb();
  const ticket = { id: uid('T'), userId: req.user.id, subject, message, status: 'OPEN', createdAt: new Date().toISOString() };
  db.tickets.push(ticket); writeDb(db);
  res.json({ ticket });
});
router.get('/contact/my', auth, (req, res) => {
  res.json({ tickets: readDb().tickets.filter(t => t.userId === req.user.id) });
});

router.get('/reviews', (req, res) => res.json({ reviews: readDb().reviews }));
router.post('/reviews', auth, (req, res) => {
  const { rating, comment, hallId } = req.body || {};
  if (!rating || !comment) return res.status(400).json({ error: 'Rating and comment required.' });
  const db = readDb();
  const user = db.users.find(u => u.id === req.user.id);
  const review = { id: uid('R'), userId: req.user.id, userName: user ? user.name : 'Guest', rating: Number(rating), comment, hallId: hallId || null, createdAt: new Date().toISOString() };
  db.reviews.push(review); writeDb(db);
  res.json({ review });
});

module.exports = router;