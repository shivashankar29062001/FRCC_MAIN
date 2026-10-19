import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { useBooking } from '../context/BookingContext';
import Stepper from '../components/Stepper';

const HOURS = [];
for (let h = 8; h <= 22; h++) HOURS.push(`${String(h).padStart(2, '0')}:00`);

export default function ConventionDate() {
  const { booking, updateBooking } = useBooking();
  const navigate = useNavigate();
  const [booked, setBooked] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!booking.hallId || !booking.date) { setBooked([]); return; }
    api(`/bookings/availability?hallId=${booking.hallId}&date=${booking.date}`, { auth: false })
      .then(d => setBooked(d.booked)).catch(() => setBooked([]));
  }, [booking.hallId, booking.date]);

  const toMins = (t) => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };
  const conflict = booking.startTime && booking.endTime && booked.some(b => toMins(b.startTime) < toMins(booking.endTime) && toMins(booking.startTime) < toMins(b.endTime));
  const invalidRange = booking.startTime && booking.endTime && toMins(booking.endTime) <= toMins(booking.startTime);

  const inputClass = "border rounded p-2 w-full";
  const today = new Date().toISOString().slice(0, 10);

  const next = () => {
    if (!booking.date || !booking.startTime || !booking.endTime) return setError('Please pick a date, start time and end time.');
    if (invalidRange) return setError('End time must be after start time.');
    if (conflict) return setError('That slot is already booked for this hall. Please pick another time.');
    if (booking.date < today) return setError('Please choose a future date.');
    setError(''); navigate('/convention/details');
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <Stepper current={1} />
      <h1 className="text-3xl mb-2">Step 2: Date / Time & Availability</h1>
      {(booking.venueName || booking.hallName) && (
        <p className="text-sm text-gray-600 mb-6">{booking.venueName} • {booking.hallName}</p>
      )}

      <div className="grid sm:grid-cols-3 gap-4 mb-6">
        <label className="block">Date
          <input type="date" min={today} className={inputClass} value={booking.date} onChange={e => updateBooking({ date: e.target.value })} /></label>
        <label className="block">Start Time
          <select className={inputClass} value={booking.startTime} onChange={e => updateBooking({ startTime: e.target.value })}>
            <option value="">Select</option>
            {HOURS.map(h => <option key={h}>{h}</option>)}
          </select></label>
        <label className="block">End Time
          <select className={inputClass} value={booking.endTime} onChange={e => updateBooking({ endTime: e.target.value })}>
            <option value="">Select</option>
            {HOURS.map(h => <option key={h}>{h}</option>)}
          </select></label>
      </div>

      {booking.date && (
        <div className="bg-white rounded p-4 shadow mb-6">
          <h3 className="font-semibold mb-2">Booked slots for this hall on {booking.date}</h3>
          {booked.length === 0
            ? <p className="text-green-700">All slots are available.</p>
            : <ul className="space-y-1">{booked.map(b => <li key={b.id} className="text-red-600 bg-red-50 rounded px-3 py-1 inline-block mr-2 my-1">✕ {b.startTime}–{b.endTime}</li>)}</ul>}
          {conflict && <p className="text-red-600 mt-2 font-semibold">⚠ Your selected time overlaps a booked slot.</p>}
          {invalidRange && <p className="text-red-600 mt-2 font-semibold">⚠ End time must be after start time.</p>}
        </div>
      )}

      {error && <p className="text-red-600 mb-4">{error}</p>}
      <div className="flex justify-between">
        <button onClick={() => navigate('/convention/book')} className="border border-navy text-navy px-6 py-2 rounded">← Back</button>
        <button onClick={next} className="bg-navy text-gold px-8 py-2 rounded font-semibold">Next →</button>
      </div>
    </div>
  );
}
