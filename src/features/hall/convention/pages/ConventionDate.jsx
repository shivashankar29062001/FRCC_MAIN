import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import {
  doIntervalsOverlap,
  findOverlappingInterval,
  getHallAvailability,
  timeToMinutes,
} from '../services/hallBookingService.js';
import { useBooking } from '../context/BookingContext';
import Stepper from '../components/Stepper';

const HOURS = [];
for (let h = 8; h <= 22; h++) HOURS.push(`${String(h).padStart(2, '0')}:00`);

export default function ConventionDate() {
  const { booking, updateBooking, clearSlotError } = useBooking();
  const navigate = useNavigate();
  const [halls, setHalls] = useState([]);
  const [booked, setBooked] = useState([]);
  const [loadingAvail, setLoadingAvail] = useState(false);
  const [availError, setAvailError] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    api('/halls', { auth: false })
      .then((d) => setHalls(Array.isArray(d?.halls) ? d.halls : []))
      .catch(() => setHalls([]));
  }, []);

  const venueHalls = useMemo(() => {
    if (!booking.venueId) return halls;
    const filtered = halls.filter((h) => h.venueId === booking.venueId);
    return filtered.length > 0 ? filtered : halls;
  }, [halls, booking.venueId]);

  const currentHall = useMemo(
    () => halls.find((h) => h.id === booking.hallId) || null,
    [halls, booking.hallId],
  );

  // Recheck availability through SECURITY DEFINER RPC whenever hall, date, or time range changes.
  useEffect(() => {
    let active = true;
    if (!booking.hallId || !booking.date) {
      setBooked([]);
      setAvailError('');
      setLoadingAvail(false);
      return () => { active = false; };
    }

    setLoadingAvail(true);
    setAvailError('');
    getHallAvailability(booking.hallId, booking.date)
      .then((intervals) => {
        if (!active) return;
        setBooked(intervals);
        setAvailError('');
      })
      .catch((err) => {
        if (!active) return;
        setBooked([]);
        setAvailError(err?.message || 'Unable to load hall availability from the database.');
      })
      .finally(() => {
        if (active) setLoadingAvail(false);
      });

    return () => { active = false; };
  }, [booking.hallId, booking.date, booking.startTime, booking.endTime]);

  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });

  const invalidRange = Boolean(
    booking.startTime &&
    booking.endTime &&
    timeToMinutes(booking.endTime) <= timeToMinutes(booking.startTime),
  );

  const overlapping = useMemo(() => {
    if (!booking.startTime || !booking.endTime || invalidRange) return null;
    return findOverlappingInterval(booked, booking.startTime, booking.endTime);
  }, [booked, booking.startTime, booking.endTime, invalidRange]);

  const guestCapacityError = useMemo(() => {
    if (!currentHall || !booking.guests) return '';
    const g = Number(booking.guests);
    if (Number.isFinite(g) && g > currentHall.capacity) {
      return `${currentHall.name} holds up to ${currentHall.capacity.toLocaleString('en-IN')} guests.`;
    }
    return '';
  }, [currentHall, booking.guests]);

  const isStartHourBooked = useCallback((hourStr) => {
    const mins = timeToMinutes(hourStr);
    return booked.some((b) => {
      const startM = timeToMinutes(b.startTime);
      const endM = timeToMinutes(b.endTime);
      return mins >= startM && mins < endM;
    });
  }, [booked]);

  const isEndHourBooked = useCallback((hourStr) => {
    const endM = timeToMinutes(hourStr);
    if (booking.startTime && timeToMinutes(booking.startTime) < endM) {
      return booked.some((b) => doIntervalsOverlap(booking.startTime, hourStr, b.startTime, b.endTime));
    }
    return booked.some((b) => {
      const startM = timeToMinutes(b.startTime);
      const bEndM = timeToMinutes(b.endTime);
      return endM > startM && endM <= bEndM;
    });
  }, [booked, booking.startTime]);

  const handleHallChange = (nextHallId) => {
    clearSlotError();
    setError('');
    const matched = halls.find((h) => h.id === nextHallId);
    if (!matched) {
      updateBooking({ hallId: nextHallId || null });
      return;
    }
    updateBooking({
      hallId: matched.id,
      hallName: matched.name,
      cooling: matched.cooling,
      capacity: matched.capacity,
      venueId: matched.venueId,
      venueName: matched.venueName,
      cityId: matched.cityId,
      cityName: matched.cityName,
      areaId: matched.areaId,
      areaName: matched.areaName,
    });
  };

  const canContinue = Boolean(
    booking.hallId &&
    booking.date &&
    booking.date >= today &&
    booking.startTime &&
    booking.endTime &&
    !invalidRange &&
    !overlapping &&
    !loadingAvail &&
    !availError &&
    !guestCapacityError,
  );

  const next = () => {
    if (!booking.hallId) return setError('Please select a hall.');
    if (!booking.date || !booking.startTime || !booking.endTime) {
      return setError('Please pick a date, start time and end time.');
    }
    if (booking.date < today) return setError('Please choose a future date.');
    if (invalidRange) return setError('End time must be after start time.');
    if (availError) return setError(availError);
    if (overlapping) {
      return setError(
        overlapping.isMine
          ? 'You already have a booking for this hall at this date and time'
          : 'This hall is already booked for this date and time. Please choose another time or hall.',
      );
    }
    if (guestCapacityError) return setError(guestCapacityError);
    clearSlotError();
    setError('');
    navigate('/convention/details');
  };

  const inputClass = 'border rounded p-2 w-full bg-white text-navy-900';

  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <Stepper current={1} />
      <h1 className="text-3xl mb-2">Step 2: Date / Time & Availability</h1>
      {(booking.venueName || booking.hallName) && (
        <p className="text-sm text-gray-600 mb-6">{booking.venueName} • {booking.hallName}</p>
      )}

      {booking.slotError && (
        <div role="alert" className="bg-red-50 border border-red-300 text-red-800 rounded p-3 mb-6 text-sm">
          <p className="font-semibold">{booking.slotError}</p>
        </div>
      )}

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <label className="block">
          <span className="text-sm font-medium text-navy block mb-1">Hall</span>
          <select
            aria-label="Hall"
            className={inputClass}
            value={booking.hallId || ''}
            onChange={(e) => handleHallChange(e.target.value)}
          >
            <option value="">Select hall</option>
            {venueHalls.map((h) => (
              <option key={h.id} value={h.id}>
                {h.name} (up to {h.capacity})
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="text-sm font-medium text-navy block mb-1">Date</span>
          <input
            type="date"
            min={today}
            className={`${inputClass} date-picker-field`}
            value={booking.date}
            onChange={(e) => {
              clearSlotError();
              setError('');
              updateBooking({ date: e.target.value });
            }}
          />
        </label>

        <label className="block">
          <span className="text-sm font-medium text-navy block mb-1">Start Time</span>
          <select
            aria-label="Start Time"
            className={inputClass}
            value={booking.startTime}
            onChange={(e) => {
              clearSlotError();
              setError('');
              updateBooking({ startTime: e.target.value });
            }}
          >
            <option value="">Select</option>
            {HOURS.map((h) => {
              const disabled = isStartHourBooked(h);
              return (
                <option key={h} value={h} disabled={disabled}>
                  {disabled ? `${h} — Already booked` : h}
                </option>
              );
            })}
          </select>
        </label>

        <label className="block">
          <span className="text-sm font-medium text-navy block mb-1">End Time</span>
          <select
            aria-label="End Time"
            className={inputClass}
            value={booking.endTime}
            onChange={(e) => {
              clearSlotError();
              setError('');
              updateBooking({ endTime: e.target.value });
            }}
          >
            <option value="">Select</option>
            {HOURS.map((h) => {
              const disabled = isEndHourBooked(h);
              return (
                <option key={h} value={h} disabled={disabled}>
                  {disabled ? `${h} — Already booked` : h}
                </option>
              );
            })}
          </select>
        </label>
      </div>

      {booking.date && booking.hallId && (
        <div className="bg-white rounded p-4 shadow mb-6">
          <h3 className="font-semibold mb-2">
            Availability for {booking.hallName || booking.hallId} on {booking.date}
          </h3>

          {loadingAvail ? (
            <p className="text-sm text-gray-500">Checking live availability…</p>
          ) : availError ? (
            <p role="alert" className="text-red-700 bg-red-50 border border-red-200 rounded p-3 text-sm font-medium">
              {availError}
            </p>
          ) : booked.length === 0 ? (
            <p className="text-green-700">All slots are available.</p>
          ) : (
            <ul className="flex flex-wrap gap-2">
              {booked.map((b, idx) => (
                <li
                  key={`${b.startTime}-${b.endTime}-${idx}`}
                  className="text-red-700 bg-red-50 border border-red-200 rounded px-3 py-1 text-sm"
                >
                  ✕ {b.startTime}–{b.endTime} · Already booked{b.isMine ? ' (Your booking)' : ''}
                </li>
              ))}
            </ul>
          )}

          {overlapping && (
            <div role="alert" className="mt-3 bg-red-50 border border-red-300 text-red-700 rounded p-3 text-sm font-semibold">
              {overlapping.isMine ? (
                <>
                  You already have a booking for this hall at this date and time.{' '}
                  <Link to="/my-bookings" className="underline text-navy ml-1">
                    View My Bookings →
                  </Link>
                </>
              ) : (
                'This hall is already booked for this date and time. Please choose another time or hall.'
              )}
            </div>
          )}

          {invalidRange && (
            <p className="text-red-600 mt-2 font-semibold">⚠ End time must be after start time.</p>
          )}
          {guestCapacityError && (
            <p className="text-red-600 mt-2 font-semibold">⚠ {guestCapacityError}</p>
          )}
        </div>
      )}

      {error && <p className="text-red-600 mb-4 text-sm font-medium">{error}</p>}
      <div className="flex justify-between">
        <button
          type="button"
          onClick={() => navigate('/convention/book')}
          className="border border-navy text-navy px-6 py-2 rounded"
        >
          ← Back
        </button>
        <button
          type="button"
          onClick={next}
          disabled={!canContinue}
          className="bg-navy text-gold px-8 py-2 rounded font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Continue →
        </button>
      </div>
    </div>
  );
}
