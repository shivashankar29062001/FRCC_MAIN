import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { useBooking } from '../context/BookingContext';
import Stepper from '../components/Stepper';
import { inr } from '../utils/format';

const EVENT_TYPES = ['Wedding', 'Conference', 'Birthday', 'Corporate', 'Engagement', 'Workshop', 'Social Gathering', 'Other'];

export default function ConventionDetails() {
  const { booking, updateBooking } = useBooking();
  const navigate = useNavigate();
  const [hall, setHall] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api('/halls', { auth: false }).then(d => setHall(d.halls.find(h => h.id === booking.hallId) || null)).catch(() => {});
  }, [booking.hallId]);

  const hours = booking.startTime && booking.endTime
    ? (Number(booking.endTime.split(':')[0]) * 60 + Number(booking.endTime.split(':')[1]) - Number(booking.startTime.split(':')[0]) * 60 - Number(booking.startTime.split(':')[1])) / 60
    : 0;
  const hallCharge = hall && hours > 0 ? Math.round(hours * hall.pricePerHour) : 0;
  const gst = Math.round(hallCharge * 0.18);

  const next = () => {
    if (!booking.eventType) return setError('Please select an event type.');
    if (!booking.guests || Number(booking.guests) < 30) return setError('Enter a guest count of at least 30.');
    if (Number(booking.guests) > 100000) return setError('Guest count cannot exceed 1,00,000.');
    if (hall && Number(booking.guests) > hall.capacity) return setError(`This hall holds up to ${hall.capacity.toLocaleString('en-IN')} guests. Choose a larger hall or reduce guests.`);
    if (!booking.organizerName.trim()) return setError('Enter the organizer name.');
    if (!/^[6-9]\d{9}$/.test(booking.phone)) return setError('Enter a valid 10-digit phone number.');
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(booking.email)) return setError('Enter a valid email address.');
    setError(''); navigate('/convention/payment');
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
            <input type="number" min="30" max="100000" className={inputClass} value={booking.guests} onChange={e => updateBooking({ guests: e.target.value })} /></label>
          <p className="text-sm text-gray-600">Food: ₹1,500 – ₹3,000 per plate</p>
          <label className="block">Organizer Name
            <input className={inputClass} value={booking.organizerName} onChange={e => updateBooking({ organizerName: e.target.value })} /></label>
          <div className="grid sm:grid-cols-2 gap-4">
            <label className="block">Phone
              <input className={inputClass} value={booking.phone} onChange={e => updateBooking({ phone: e.target.value })} placeholder="98XXXXXXXX" /></label>
            <label className="block">Email
              <input className={inputClass} value={booking.email} onChange={e => updateBooking({ email: e.target.value })} /></label>
          </div>
          <label className="block">Event Details
            <input className={inputClass} value={booking.eventDetails} onChange={e => updateBooking({ eventDetails: e.target.value })} placeholder="e.g. Annual general meet" /></label>
          <label className="block">Special Requests
            <textarea className={inputClass} rows={3} value={booking.specialRequests} onChange={e => updateBooking({ specialRequests: e.target.value })} /></label>

          {error && <p className="text-red-600">{error}</p>}
          <div className="flex justify-between">
            <button onClick={() => navigate('/convention/date')} className="border border-navy text-navy px-6 py-2 rounded">← Back</button>
            <button onClick={next} className="bg-navy text-gold px-8 py-2 rounded font-semibold">Next →</button>
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
          </>
        ) : <p className="text-gray-500">Select a hall first.</p>}
      </aside>
    </div>
  );
}
