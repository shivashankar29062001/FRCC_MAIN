const express = require('express');
const { readDb, writeDb, uid } = require('../db');
const auth = require('../middleware/auth');
const notifications = require('../services/notifications');

const router = express.Router();
const toMins = (t) => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };
const overlaps = (aS, aE, bS, bE) => toMins(aS) < toMins(bE) && toMins(bS) < toMins(aE);

// Availability for a hall on a date: list booked intervals
router.get('/availability', (req, res) => {
  const { hallId, date } = req.query;
  const db = readDb();
  const booked = db.bookings
    .filter(b => b.hallId === hallId && b.date === date && ['CONFIRMED', 'PENDING_VERIFICATION'].includes(b.status))
    .map(b => ({ id: b.id, startTime: b.startTime, endTime: b.endTime }));
  res.json({ booked });
});

// Create booking - user comes from authenticated token
router.post('/', auth, (req, res) => {
  const { hallId, date, startTime, endTime, guests, eventType, eventDetails, organizerName, phone, email, specialRequests, upiIdMasked, transactionRef } = req.body || {};
  if (!hallId || !date || !startTime || !endTime || !guests || !eventType || !organizerName)
    return res.status(400).json({ error: 'Missing required booking fields.' });
  // Validate first (server-side gate). Only after a valid phone is confirmed
  // do we normalise and store it, so old bookings are never rewritten.
  let phoneDigits = String(phone || '').replace(/\\D/g, '');
  if (phoneDigits.length === 11 && phoneDigits.startsWith('0')) phoneDigits = phoneDigits.slice(1);
  if (phoneDigits.length === 12 && phoneDigits.startsWith('91')) phoneDigits = phoneDigits.slice(2);
  if (!/^[6-9][0-9]{9}$/.test(phoneDigits)) return res.status(400).json({ error: 'Enter a valid 10-digit mobile number.' });
  phone = phoneDigits;
  if (toMins(endTime) <= toMins(startTime)) return res.status(400).json({ error: 'End time must be after start time.' });

  const db = readDb();
  const hall = db.halls.find(h => h.id === hallId);
  if (!hall) return res.status(404).json({ error: 'Hall not found.' });
  const guestCount = Number(guests);
  if (!Number.isFinite(guestCount) || guestCount < 30) return res.status(400).json({ error: 'Guest count must be at least 30.' });
  if (guestCount > 10000) return res.status(400).json({ error: 'Guest count cannot exceed 10,000.' });
  if (guestCount > hall.capacity) return res.status(400).json({ error: `This hall holds up to ${hall.capacity.toLocaleString('en-IN')} guests. Choose a larger hall or reduce guests.` });

  // Re-check availability on the server to prevent double booking
  const blocking = ['CONFIRMED', 'PENDING_VERIFICATION'];
  const clash = db.bookings.find(b => b.hallId === hallId && b.date === date && blocking.includes(b.status) && overlaps(b.startTime, b.endTime, startTime, endTime));
  if (clash) return res.status(409).json({ error: 'Sorry, this hall/slot was just booked. Please choose another time.' });

  const hours = (toMins(endTime) - toMins(startTime)) / 60;
  const hallCharge = Math.round(hours * hall.pricePerHour);
  const gst = Math.round(hallCharge * 0.18);
  const convenienceFee = Math.max(0, Math.round(Number(req.body.convenienceFee) || 0));
  const amount = hallCharge + gst + convenienceFee;

  const paymentMethod = req.body.paymentMethod || 'UPI_ID';
  const isOfflinePending = paymentMethod === 'BANK_TRANSFER' || paymentMethod === 'CORPORATE_INVOICE';
  const clientStatus = req.body.paymentStatus;

  const booking = {
    id: uid('FRCC'), userId: req.user.id, hallId, hallName: hall.name, date, startTime, endTime,
    guests: Number(guests), eventType, eventDetails: eventDetails || '', organizerName, phone, email: email || '',
    specialRequests: specialRequests || '', amount, hallCharge, gst, convenienceFee,
    paymentMethod,
    amountPaid: isOfflinePending ? 0 : (req.body.amountPaid != null ? Math.max(0, Math.round(Number(req.body.amountPaid))) : amount),
    balanceDue: isOfflinePending ? amount : (req.body.balanceDue != null ? Math.max(0, Math.round(Number(req.body.balanceDue))) : 0),
    maskedInstrument: req.body.maskedInstrument || req.body.upiIdMasked || '',
    upiIdMasked: req.body.upiIdMasked || req.body.maskedInstrument || '',
    transactionRef: req.body.transactionRef || uid('TXN'),
    emiTenure: req.body.emiTenure || null,
    emiMonthlyAmount: req.body.emiMonthlyAmount || null,
    gstin: req.body.gstin || null,
    utrNumber: req.body.utrNumber || null,
    // Location fields
    cityId: hall.cityId,
    areaId: hall.areaId,
    venueId: hall.venueId,
    venueName: hall.venueName,
    hallName: hall.name,
    city: hall.city || hall.cityName,
    area: hall.area || hall.areaName,
    cityName: hall.cityName || hall.city,
    areaName: hall.areaName || hall.area,
    paymentStatus: isOfflinePending ? 'PENDING_VERIFICATION' : (clientStatus === 'PARTIAL' ? 'PARTIAL' : clientStatus === 'PENDING_VERIFICATION' ? 'PENDING_VERIFICATION' : 'PAID'),
    status: isOfflinePending ? 'PENDING_VERIFICATION' : 'CONFIRMED',
    createdAt: new Date().toISOString(), cancelledAt: null,
    refundPercent: 0, refundAmount: 0, refundMethod: null, refundRef: null,
    notifyUpdates: req.body.notifyUpdates !== false
  };
  db.bookings.push(booking);
  const bookingNotice = booking.status === 'PENDING_VERIFICATION'
    ? `Booking received — ${booking.id} for ${hall.name} on ${date} (${startTime}–${endTime}). Payment verification pending.`
    : `Booking confirmed — ${booking.id} for ${hall.name} on ${date} (${startTime}–${endTime}).`;
  db.notifications.push({ id: uid('N'), userId: req.user.id, message: bookingNotice, read: false, createdAt: new Date().toISOString() });
  writeDb(db);

  // Fire-and-forget: a messaging failure must never block or roll back the booking.
  if (booking.status === 'CONFIRMED') {
    notifications.sendBookingConfirmed(booking).catch((e) => console.error('[notify] confirmed dispatch failed:', e.message));
  } else {
    notifications.sendBookingPending(booking).catch((e) => console.error('[notify] pending dispatch failed:', e.message));
  }

  res.json({ booking });
});

// Only the logged-in user's bookings
router.get('/my', auth, (req, res) => {
  const db = readDb();
  const halls = db.halls;
  const bookings = db.bookings
    .filter(b => b.userId === req.user.id)
    .map(b => ({ ...b, hall: halls.find(h => h.id === b.hallId) || null }))
    .sort((a, b) => (a.date < b.date ? 1 : -1));
  res.json({ bookings });
});

router.post('/:id/cancel', auth, async (req, res) => {
  const db = readDb();
  const b = db.bookings.find(x => x.id === req.params.id);
  if (!b || b.userId !== req.user.id) return res.status(404).json({ error: 'Booking not found.' });
  if (b.status === 'CANCELLED') return res.status(400).json({ error: 'Booking is already CANCELLED.' });

  // Server clock + hall local time (IST). Any refund amount in req.body is ignored.
  const { getRefundPolicy } = await import('../../shared/refundPolicy.js');
  const policy = getRefundPolicy(b, new Date());
  if (!policy.allowed) return res.status(400).json({ error: policy.reason });

  b.status = 'CANCELLED';
  b.cancelledAt = new Date().toISOString();
  b.refundPercent = policy.refundPercent;
  b.refundAmount = policy.refundAmount;
  b.refundMethod = policy.refundMethod;
  b.paymentStatus = 'REFUNDED';
  b.balanceDue = 0; // balance is cancelled, nothing left to pay
  b.refundRef = 'RFD_' + Date.now();

  const refundText = `₹${Number(b.refundAmount).toLocaleString('en-IN', { maximumFractionDigits: 2 })} (${b.refundPercent}%)`;
  db.notifications.push({ id: uid('N'), userId: req.user.id, message: `Booking cancelled, refund initiated — ${b.id}. Refund of ${refundText} to your original payment method. ${policy.refundMethod}`, read: false, createdAt: new Date().toISOString() });
  writeDb(db);

  // Fire-and-forget: booking/cancellation is already saved and must not depend on messaging.
  notifications.sendBookingCancelled(b).catch((e) => console.error('[notify] cancelled dispatch failed:', e.message));

  res.json({ booking: b, message: `Cancellation successful. Refund of ${refundText} has been initiated. ${policy.refundMethod}` });
});

// Mock admin toggle: mark a PENDING_VERIFICATION booking as paid
router.post('/:id/mark-paid', auth, (req, res) => {
  const db = readDb();
  const b = db.bookings.find(x => x.id === req.params.id);
  if (!b || b.userId !== req.user.id) return res.status(404).json({ error: 'Booking not found.' });
  if (b.status !== 'PENDING_VERIFICATION') return res.status(400).json({ error: 'Only pending bookings can be marked paid.' });
  b.status = 'CONFIRMED';
  b.paymentStatus = 'PAID';
  b.amountPaid = b.amount;
  b.balanceDue = 0;
  db.notifications.push({ id: uid('N'), userId: req.user.id, message: `Booking ${b.id} payment confirmed by admin.`, read: false, createdAt: new Date().toISOString() });
  writeDb(db);
  notifications.sendBookingConfirmed(b).catch((e) => console.error('[notify] confirmed dispatch failed:', e.message));
  res.json({ booking: b });
});

module.exports = router;
module.exports.utils = { overlaps, toMins };
