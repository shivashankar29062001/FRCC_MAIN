import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { createHallBooking, getHallAvailability } from '../services/hallBookingService.js';
import { useBooking } from '../context/BookingContext';
import Stepper from '../components/Stepper';
import { inr } from '../utils/format';
import { HALL_CANCELLATION_POLICY_TEXT } from '../config/halls.config.js';
import {
  INDIAN_MOBILE_MESSAGE,
  isValidIndianMobile,
  sanitizeMobileInput,
} from '../../../../utils/mobile.js';

const EVENT_TYPES = ['Wedding', 'Conference', 'Birthday', 'Corporate', 'Engagement', 'Workshop', 'Social Gathering', 'Other'];

export default function ConventionDetails() {
  const { booking, updateBooking, clearHold, clearSlotError } = useBooking();
  const navigate = useNavigate();
  const [hall, setHall] = useState(null);
  const [error, setError] = useState('');
  const [holding, setHolding] = useState(false);

  useEffect(() => {
    if (!booking.hallId || !booking.date || !booking.startTime || !booking.endTime) {
      navigate('/convention/book');
      return;
    }
    api('/halls', { auth: false })
      .then(d => setHall(Array.isArray(d?.halls) ? (d.halls.find(h => h.id === booking.hallId) || null) : null))
      .catch(() => {});
  }, [booking.hallId, booking.date, booking.startTime, booking.endTime, navigate]);

  const hours = booking.startTime && booking.endTime
    ? (Number(booking.endTime.split(':')[0]) * 60 + Number(booking.endTime.split(':')[1]) - Number(booking.startTime.split(':')[0]) * 60 - Number(booking.startTime.split(':')[1])) / 60
    : 0;
  const hallCharge = hall
    ? (hall.pricingUnit === 'per-plate' || hall.pricePerPlate)
      ? Math.round(Number(booking.guests || 30) * (hall.pricePerPlate || hall.price || 1500))
      : (hours > 0 ? Math.round(hours * hall.pricePerHour) : 0)
    : 0;
  const gst = Math.round(hallCharge * 0.18);

  const next = async () => {
    if (holding) return;
    if (!booking.eventType) return setError('Please select an event type.');
    if (!booking.guests || Number(booking.guests) < 30) return setError('Enter a guest count of at least 30.');
    if (Number(booking.guests) > 10000) return setError('Guest count cannot exceed 10,000.');
    if (hall && Number(booking.guests) > hall.capacity) {
      return setError(`This hall holds up to ${hall.capacity.toLocaleString('en-IN')} guests. Choose a larger hall or reduce guests.`);
    }
    if (!booking.organizerName.trim()) return setError('Enter the organizer name.');
    if (!isValidIndianMobile(booking.phone)) return setError(INDIAN_MOBILE_MESSAGE);
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(booking.email)) return setError('Enter a valid email address.');

    setError('');
    clearSlotError();
    setHolding(true);

    try {
      // Reserve slot in Supabase with status = 'held' and hold_expires_at = now() + 10 minutes before opening payment.
      const held = await createHallBooking({
        hallId: booking.hallId,
        date: booking.date,
        startTime: booking.startTime,
        endTime: booking.endTime,
        guests: Number(booking.guests),
        eventType: booking.eventType,
        organizerName: booking.organizerName.trim(),
        phone: booking.phone,
        email: booking.email.trim(),
        eventDetails: booking.eventDetails || '',
        specialRequests: booking.specialRequests || '',
        venueName: booking.venueName || hall?.venueName || '',
        cityName: booking.cityName || hall?.cityName || '',
        areaName: booking.areaName || hall?.areaName || '',
        cooling: booking.cooling || hall?.cooling || '',
        heldBookingId: booking.heldBookingId || null,
      });

      updateBooking({
        heldBookingId: held.id,
        holdExpiresAt: held.holdExpiresAt,
        serverHallCharge: held.hallCharge,
        serverGst: held.gst,
        serverAmount: held.amount,
        slotError: '',
        slotErrorCode: '',
      });
      navigate('/convention/payment');
    } catch (err) {
      if (err?.code === 'SLOT_TAKEN' || err?.code === 'ALREADY_BOOKED_BY_YOU') {
        await getHallAvailability(booking.hallId, booking.date).catch(() => []);
        clearHold();
        updateBooking({
          heldBookingId: null,
          holdExpiresAt: null,
          serverHallCharge: null,
          serverGst: null,
          serverAmount: null,
          slotError: err.code === 'SLOT_TAKEN'
            ? 'This time was just booked by someone else'
            : 'You already have a booking for this hall at this date and time',
          slotErrorCode: err.code,
        });
        navigate('/convention/book');
        return;
      }
      setError(err?.message || 'Could not hold the hall slot. Please try again.');
    } finally {
      setHolding(false);
    }
  };

  const inputClass = "border rounded p-2 w-full";
  return (
    <div className="max-w-4xl mx-auto px-4 py-10 grid md:grid-cols-3 gap-8">
      <div className="md:col-span-2">
        <Stepper current={2} />
        <h1 className="text-3xl mb-6">Step 3: Event Details</h1>
        <div className="space-y-4">
          <label className="block">Event Type
            <select className={inputClass} value={booking.eventType} onChange={e => updateBooking({ eventType: e.target.value })}>
              <option value="">Select event type</option>
              {EVENT_TYPES.map(t => <option key={t}>{t}</option>)}
            </select></label>
          <label className="block">Guest Count {hall && <span className="text-gray-500 text-sm">(min 30, up to this hall's max of {hall.capacity.toLocaleString('en-IN')})</span>}
            <input type="number" min="30" max="10000" className={inputClass} value={booking.guests} onChange={e => updateBooking({ guests: e.target.value })} /></label>
          <p className="text-sm text-gray-600">Food: ₹1,500 – ₹3,000 per plate</p>
          <label className="block">Organizer Name
            <input className={inputClass} value={booking.organizerName} onChange={e => updateBooking({ organizerName: e.target.value })} /></label>
          <div className="grid sm:grid-cols-2 gap-4">
            <label className="block">Phone
              <input
                className={inputClass}
                value={booking.phone || ''}
                onChange={e => {
                  const cleaned = sanitizeMobileInput(e.target.value);
                  updateBooking({ phone: cleaned });
                  if (error && isValidIndianMobile(cleaned)) setError('');
                }}
                onBlur={() => {
                  if (booking.phone && !isValidIndianMobile(booking.phone)) {
                    setError(INDIAN_MOBILE_MESSAGE);
                  }
                }}
                placeholder="98XXXXXXXX"
                type="tel"
                inputMode="numeric"
                maxLength={10}
                autoComplete="tel-national"
              />
            </label>
            <label className="block">Email
              <input className={inputClass} value={booking.email} onChange={e => updateBooking({ email: e.target.value })} /></label>
          </div>
          <label className="block">Event Details
            <input className={inputClass} value={booking.eventDetails} onChange={e => updateBooking({ eventDetails: e.target.value })} placeholder="e.g. Annual general meet" /></label>
          <label className="block">Special Requests
            <textarea className={inputClass} rows={3} value={booking.specialRequests} onChange={e => updateBooking({ specialRequests: e.target.value })} /></label>
          <label className="flex items-start gap-2 text-sm text-gray-700">
            <input type="checkbox" className="mt-1" checked={booking.notifyUpdates !== false}
              onChange={e => updateBooking({ notifyUpdates: e.target.checked })} />
            <span>Send my booking updates by SMS, WhatsApp and email.</span>
          </label>

          {error && <p className="text-red-600">{error}</p>}
          <div className="flex justify-between">
            <button type="button" onClick={() => navigate('/convention/date')} className="border border-navy text-navy px-6 py-2 rounded">← Back</button>
            <button type="button" onClick={next} disabled={holding} className="bg-navy text-gold px-8 py-2 rounded font-semibold disabled:opacity-50">
              {holding ? 'Holding slot…' : 'Continue to Payment →'}
            </button>
          </div>
        </div>
      </div>

      <aside className="bg-white rounded shadow p-5 h-fit mt-14">
        <h3 className="text-xl mb-3">Price Summary</h3>
        {hall ? (
          <>
            <p className="text-sm text-gray-600 mb-3">{booking.venueName || hall.venueName} • {hall.name} • {booking.date || '—'} • {booking.startTime || '—'}–{booking.endTime || '—'}</p>
            <div className="flex justify-between"><span>Hall charge ({hours > 0 ? `${hours} hr × ${inr(hall.pricePerHour)}` : '—'})</span><span>{inr(hallCharge)}</span></div>
            <div className="flex justify-between text-gray-600"><span>GST (18%)</span><span>{inr(gst)}</span></div>
            <hr className="my-2" />
            <div className="flex justify-between font-bold text-navy"><span>Total</span><span>{inr(hallCharge + gst)}</span></div>
            <div className="mt-6 pt-4 border-t text-xs text-gray-500">
              <p className="font-semibold text-gray-700 mb-1">Cancellation Policy:</p>
              <p>{HALL_CANCELLATION_POLICY_TEXT}</p>
            </div>
          </>
        ) : <p className="text-gray-500">Select a hall first.</p>}
      </aside>
    </div>
  );
}
