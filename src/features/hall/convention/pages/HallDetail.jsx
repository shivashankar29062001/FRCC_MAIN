import { useEffect, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { inr } from '../utils/format';
import { useBooking } from '../context/BookingContext';
import ImageCarousel from '../components/ImageCarousel';

const TYPE_LABEL = { AC: 'AC', NON_AC: 'Non-AC', BOARD_ROOM: 'Board Room' };

export default function HallDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { updateBooking } = useBooking();
  const [hall, setHall] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api('/halls', { auth: false })
      .then(d => setHall(Array.isArray(d?.halls) ? (d.halls.find(h => h.id === id) || null) : null))
      .catch(e => setError(e.message));
  }, [id]);

  if (error) return <div className="max-w-5xl mx-auto px-4 py-16 text-center text-red-600">{error}</div>;
  if (!hall) return <div className="max-w-5xl mx-auto px-4 py-16 text-center">Loading hall…</div>;

  const startBooking = () => {
    updateBooking({
      hallId: hall.id, hallName: hall.name,
      cityId: hall.cityId, cityName: hall.cityName,
      areaId: hall.areaId, areaName: hall.areaName,
      venueId: hall.venueId, venueName: hall.venueName,
    });
    navigate('/convention/date');
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <Link to={`/venue/${hall.venueId}`} className="text-navy underline text-sm">← Back to {hall.venueName}</Link>

      <div className="mt-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-gold text-sm uppercase tracking-wider">{hall.areaName} • {hall.cityName}</p>
          <h1 className="text-3xl font-bold text-navy">{hall.name}</h1>
          <p className="text-sm text-gray-600 mt-1">
            <Link to={`/venue/${hall.venueId}`} className="underline">{hall.venueName}</Link> • {TYPE_LABEL[hall.type]} • Capacity {hall.capacity} guests
          </p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold text-navy">{inr(hall.pricePerHour)}<span className="text-sm font-normal text-gray-500">/hr</span></p>
          <p className="text-sm text-gray-500">{inr(hall.pricePerDay)}/day</p>
        </div>
      </div>

      {/* 16:9 carousel with lightbox */}
      <div className="mt-6">
        <ImageCarousel images={hall.images} alts={hall.imageAlts} alt={hall.name} />
      </div>

      <div className="mt-6 grid sm:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow p-5">
          <h2 className="text-xl mb-3">Amenities</h2>
          <ul className="grid grid-cols-1 gap-2">
            {hall.amenities.map(a => (
              <li key={a} className="text-sm text-gray-700 flex items-center gap-2">
                <span className="text-gold">✓</span>{a}
              </li>
            ))}
          </ul>
        </div>
        <div className="bg-white rounded-lg shadow p-5">
          <h2 className="text-xl mb-3">Good to know</h2>
          <p className="text-sm text-gray-600">Food: ₹1,500 – ₹3,000 per plate</p>
          <p className="text-sm text-gray-600">Prices shown exclude 18% GST applied at checkout. Cancellations more than 48 hours before the event are refunded 100%.</p>
          <button onClick={startBooking} className="mt-4 w-full bg-gold text-navy font-bold py-3 rounded hover:bg-gold-light">Book This Hall</button>
        </div>
      </div>
    </div>
  );
}
