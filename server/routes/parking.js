// ---------------------------------------------------------------------------
// server/routes/parking.js — FRCC Parking Booking & Availability API
// Source of truth for parking slots, persistent across refreshes and restarts.
// ---------------------------------------------------------------------------

const express = require('express');
const crypto = require('crypto');
const { readDb, writeDb, uid } = require('../db');

const router = express.Router();

const VEHICLE_NUMBER_REGEX = /^[A-Z]{2}[0-9]{2}[A-Z]{2}[0-9]{4}$/;

function normalizeCampus(campus) {
  if (!campus) return 'vijayawada';
  return String(campus).toLowerCase().includes('hyd') ? 'hyderabad' : 'vijayawada';
}

function parseTimeRange(dateStr, timeStr, durationDays = 1) {
  const t = timeStr && timeStr.length === 5 ? `${timeStr}:00` : (timeStr || '09:00:00');
  const start = new Date(`${dateStr}T${t}+05:30`).getTime();
  const end = start + (Number(durationDays) || 1) * 24 * 60 * 60 * 1000;
  return { start, end };
}

function isOverlapping(startA, endA, startB, endB) {
  return startA < endB && startB < endA;
}

/**
 * GET /api/parking/availability
 * Returns list of booked slot IDs for a given campus and date/time range.
 */
router.get('/availability', (req, res) => {
  const { campus, date, time, duration } = req.query;
  const db = readDb();
  db.parking_bookings = db.parking_bookings || [];

  const targetCampus = normalizeCampus(campus);
  const hasSpecificDate = Boolean(date && String(date).trim());
  const targetDate = hasSpecificDate ? String(date).trim() : new Date().toISOString().split('T')[0];
  const targetTime = time && String(time).trim() ? String(time).trim() : '09:00';
  const targetDuration = Number(duration) || 1;

  const { start: reqStart, end: reqEnd } = parseTimeRange(targetDate, targetTime, targetDuration);
  const now = Date.now();

  const bookedSlots = new Set();

  for (const b of db.parking_bookings) {
    const bCampus = normalizeCampus(b.campus || b.city);
    if (bCampus !== targetCampus) continue;

    const bStatus = (b.booking_status || b.bookingStatus || '').toUpperCase();
    if (bStatus !== 'CONFIRMED') continue;

    const bDate = b.booking_date || b.bookingDateISO || b.bookingDate;
    if (!bDate) continue;

    const bTime = b.arrival_time || b.arrivalTime || '09:00';
    const bDays = Number(b.duration_days || b.durationDays || b.numberOfDays) || 1;

    const { start: bStart, end: bEnd } = parseTimeRange(bDate, bTime, bDays);

    // Skip expired bookings
    if (bEnd <= now) continue;

    if (!hasSpecificDate) {
      // If no specific date was selected (e.g. freshly opened/refreshed page),
      // mark all active unexpired bookings for this campus as booked (red)
      const slotId = b.slot_id || b.parkingSlot;
      if (slotId) bookedSlots.add(slotId);
    } else {
      // Check interval overlap with requested date/time/duration
      if (isOverlapping(reqStart, reqEnd, bStart, bEnd)) {
        const slotId = b.slot_id || b.parkingSlot;
        if (slotId) bookedSlots.add(slotId);
      }
    }
  }

  res.json({
    ok: true,
    campus: targetCampus,
    date: hasSpecificDate ? targetDate : '',
    time: time || '',
    duration: duration || '',
    bookedSlots: Array.from(bookedSlots)
  });
});

/**
 * GET /api/parking/bookings
 * Returns all parking bookings, optionally filtered by campus or userId.
 */
router.get('/bookings', (req, res) => {
  const { campus, userId } = req.query;
  const db = readDb();
  let list = db.parking_bookings || [];

  if (campus) {
    const c = normalizeCampus(campus);
    list = list.filter(b => normalizeCampus(b.campus || b.city) === c);
  }
  if (userId) {
    list = list.filter(b => b.userId === userId || b.user_id === userId);
  }

  res.json({ ok: true, bookings: list });
});

/**
 * POST /api/parking/bookings
 * Validates availability, vehicle number format, prevents collision, saves to database.
 */
router.post('/bookings', (req, res) => {
  const body = req.body || {};
  const db = readDb();
  db.parking_bookings = db.parking_bookings || [];

  const slot = (body.parkingSlot || body.slot_id || '').trim().toUpperCase();
  const campus = normalizeCampus(body.campus || body.city || body.campus_id);
  const date = body.bookingDateISO || body.bookingDate || body.booking_date || new Date().toISOString().split('T')[0];
  const time = body.arrivalTime || body.arrival_time || '09:00';
  const duration = Number(body.durationDays || body.duration_days || body.numberOfDays) || 1;
  const vehicleNumber = String(body.vehicleNumber || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10);

  if (!slot) {
    return res.status(400).json({ error: 'Parking slot ID is required.' });
  }

  if (!VEHICLE_NUMBER_REGEX.test(vehicleNumber)) {
    return res.status(400).json({
      error: 'Invalid vehicle registration number. Expected format: AP74HU7654'
    });
  }

  const { start: reqStart, end: reqEnd } = parseTimeRange(date, time, duration);
  const now = Date.now();

  // Concurrency & collision check: verify slot is not already booked for an overlapping time
  const conflict = db.parking_bookings.find((b) => {
    const bCampus = normalizeCampus(b.campus || b.city);
    if (bCampus !== campus) return false;

    const bSlot = (b.slot_id || b.parkingSlot || '').trim().toUpperCase();
    if (bSlot !== slot) return false;

    const bStatus = (b.booking_status || b.bookingStatus || '').toUpperCase();
    if (bStatus !== 'CONFIRMED') return false;

    const bDate = b.booking_date || b.bookingDateISO || b.bookingDate;
    if (!bDate) return false;

    const bTime = b.arrival_time || b.arrivalTime || '09:00';
    const bDays = Number(b.duration_days || b.durationDays || b.numberOfDays) || 1;
    const { start: bStart, end: bEnd } = parseTimeRange(bDate, bTime, bDays);

    if (bEnd <= now) return false; // Expired
    return isOverlapping(reqStart, reqEnd, bStart, bEnd);
  });

  if (conflict) {
    return res.status(409).json({
      error: 'SLOT_TAKEN',
      message: `Parking slot ${slot} in ${campus === 'hyderabad' ? 'Hyderabad' : 'Vijayawada'} was just booked. Please choose another slot.`
    });
  }

  const ref = body.bookingReference || body.bookingId || `FRCC-PARK-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
  const cityName = campus === 'hyderabad' ? 'Hyderabad' : 'Vijayawada';
  const campusId = campus === 'hyderabad' ? 'hyd' : 'vja';

  const newBooking = {
    id: uid('PARK'),
    bookingReference: ref,
    bookingId: ref,
    userId: body.userId || body.user_id || null,
    user_id: body.userId || body.user_id || null,
    campus,
    campus_id: campusId,
    zone_id: body.zone_id || (campus === 'hyderabad' ? 'hyd-multi-level' : 'vja-multi-level'),
    campusName: campus === 'hyderabad' ? 'Hyderabad Campus' : 'Vijayawada Campus',
    city: cityName,
    parkingSlot: slot,
    slot_id: slot,
    bookingDate: date,
    booking_date: date,
    bookingDateISO: date,
    arrivalTime: time,
    arrival_time: time,
    durationDays: duration,
    duration_days: duration,
    numberOfDays: duration,
    vehicleType: body.vehicleType || 'Four Wheeler',
    vehicleNumber,
    vehicleModel: body.vehicleModel || '',
    pricePerDay: body.pricePerDay || 40,
    totalAmount: body.totalAmount || (Number(body.pricePerDay || 40) * duration),
    paymentMethod: body.paymentMethod || 'UPI',
    paymentStatus: body.paymentStatus || 'Paid',
    bookingStatus: 'CONFIRMED',
    booking_status: 'CONFIRMED',
    createdAt: new Date().toISOString()
  };

  db.parking_bookings.push(newBooking);
  writeDb(db);

  res.status(200).json({
    ok: true,
    data: newBooking
  });
});

/**
 * POST /api/parking/cancel
 * or POST /api/parking/bookings/:ref/cancel
 */
router.post(['/cancel', '/bookings/:ref/cancel'], (req, res) => {
  const ref = req.params.ref || req.body.bookingReference || req.body.bookingId;
  if (!ref) {
    return res.status(400).json({ error: 'Booking reference is required.' });
  }

  const db = readDb();
  db.parking_bookings = db.parking_bookings || [];

  const booking = db.parking_bookings.find(
    (b) => b.bookingReference === ref || b.bookingId === ref || b.id === ref
  );

  if (!booking) {
    return res.status(404).json({ error: 'Parking booking not found.' });
  }

  booking.bookingStatus = 'CANCELLED';
  booking.booking_status = 'CANCELLED';
  booking.cancelledAt = new Date().toISOString();
  writeDb(db);

  res.json({
    ok: true,
    message: 'Booking cancelled successfully.',
    booking
  });
});

module.exports = router;

