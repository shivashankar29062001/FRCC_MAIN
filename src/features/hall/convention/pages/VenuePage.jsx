import { useEffect, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { inr } from '../utils/format';
import { SmartImage } from '../components/HallCard';
import ImageCarousel from '../components/ImageCarousel';
import VenueMap from '../components/VenueMap';

const TYPE_LABEL = { AC: 'AC', NON_AC: 'Non-AC', BOARD_ROOM: 'Board Room' };

function slugify(name) {
  return name.toLowerCase()
    .replace(/frcc /, 'frcc-')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

export default function VenuePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [venue, setVenue] = useState(null);
  const [halls, setHalls] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [near, setNear] = useState(null);

  useEffect(() => {
    setLoading(true);
    api(`/venues/${id}`, { auth: false })
      .then(d => { 
        setVenue(d?.venue || null); 
        setHalls(Array.isArray(d?.halls) ? d.halls : []); 
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [id]);

  // Reviews summary (mock aggregate until reviews carry venueId)
  const reviewSummary = [
    { stars: 5, count: 12 }, { stars: 4, count: 8 }, { stars: 3, count: 3 }, { stars: 2, count: 1 }, { stars: 1, count: 0 },
  ];

  const nearMe = () => {
    if (!navigator.geolocation) { setError('Geolocation is not supported by this browser.'); return; }
    if (!venue?.lat || !venue?.lng) { setError('This club\'s location is coming soon — you can still browse and book.'); return; }
    navigator.geolocation.getCurrentPosition(
      pos => {
        const { latitude, longitude } = pos.coords;
        const toRad = x => (x * Math.PI) / 180;
        const R = 6371;
        const dLat = toRad((venue?.lat || 0) - latitude), dLng = toRad((venue?.lng || 0) - longitude);
        const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(latitude)) * Math.cos(toRad(venue?.lat || 0)) * Math.sin(dLng / 2) ** 2;
        const km = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        setNear({ distanceKm: km });
        setError('');
      },
      err => setError(err.code === err.PERMISSION_DENIED
        ? 'Location permission denied — you can still browse and book.'
        : 'Could not determine your location.')
    );
  };

  if (loading) return <div className="max-w-7xl mx-auto px-4 py-16 text-center">Loading venue…</div>;
  if (error && !venue) return <div className="max-w-7xl mx-auto px-4 py-16 text-center text-red-600">{error}</div>;
  if (!venue) return null;

  // Generate image URLs for this venue (clubs carry an explicit hero image)
  const venueSlug = slugify(venue.name);
  const heroImage = venue.heroImage || `/images/venues/${venue.id}/frcc-${venueSlug}-hero.jpg`;
  const exteriorImage = venue.exteriorImage || null;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Hero */}
      <div className="relative rounded-xl overflow-hidden">
        <SmartImage src={heroImage}
          alt={`${venue.name} — hero view of the banquet and conference venue`}
          className="h-56 sm:h-80"
          sizes="100vw" />
        <div className="absolute inset-0 bg-gradient-to-t from-navy/90 to-transparent" />
        <div className="absolute bottom-0 left-0 p-6 text-white">
          <p className="text-gold text-sm uppercase tracking-wider">{venue.areaName} • {venue.cityName}</p>
          <h1 className="text-3xl sm:text-4xl font-bold text-gold">{venue.name}</h1>
          <p className="text-gray-200 text-sm mt-1">⭐ {venue.rating || 4.5} • {venue.hallCount} halls • from {inr(venue.startingPrice)}/hr</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-8 mt-8">
        <div className="lg:col-span-2 space-y-8">
          {/* Description */}
          <section>
            <h2 className="text-2xl mb-3">About this venue</h2>
            <p className="text-gray-700">
              {venue.description || `${venue.name} is a FRCC CONVENTIONS branch in ${venue.areaName}, ${venue.cityName}, hosting weddings, conferences, corporate meets and celebrations with full staging, lighting, seating and catering support.`}
            </p>
          </section>

          {/* Photos */}
          <section>
            <h2 className="text-2xl mb-3">Photos</h2>
            <ImageCarousel
              images={[
                heroImage,
                exteriorImage,
                ...halls.slice(0, 4).map(h => h.images[0]),
              ].filter(Boolean)}
              alt={`${venue.name} photos`} />
          </section>

          {/* Halls */}
          <section>
            <h2 className="text-2xl mb-3">Halls at {venue.name}</h2>
            <div className="space-y-4">
              {halls.map(h => (
                <div key={h.id} className="bg-white rounded-lg shadow p-4 flex flex-col sm:flex-row gap-4">
                  <SmartImage src={h.images[0]} alt={`${h.name} at ${venue.name}`} className="w-full sm:w-56 h-36 rounded" />
                  <div className="flex-1">
                    <div className="flex items-start justify-between gap-2 flex-wrap">
                      <h3 className="text-lg font-bold text-navy">{h.name}</h3>
                      <span className="bg-gold text-navy text-xs font-semibold rounded px-2 py-0.5">{TYPE_LABEL[h.type]}</span>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">Capacity: up to {h.capacity.toLocaleString('en-IN')} guests • {inr(h.pricePerHour)}/hr • {inr(h.pricePerDay)}/day</p>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {h.amenities.map(a => <span key={a} className="text-xs bg-navy-100 text-navy rounded-full px-2 py-0.5">{a}</span>)}
                    </div>
                    <div className="flex gap-2 mt-3">
                      <button onClick={() => {
                        navigate('/convention/book', { state: { preselectHall: h.id } });
                      }} className="bg-navy text-gold px-4 py-1.5 rounded font-semibold">Book this hall</button>
                      <Link to={`/gallery?venue=${venue.id}`} className="border border-navy text-navy px-4 py-1.5 rounded">See in gallery</Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* Sidebar */}
        <aside className="space-y-6">
          <div className="bg-white rounded-lg shadow p-5">
            <h3 className="text-xl mb-3">Book This Venue</h3>
            <button onClick={() => navigate('/convention/book', { state: { preselectVenue: venue.id } })}
              className="w-full bg-gold text-navy font-bold py-3 rounded hover:bg-gold-light">Book Now</button>
            <button onClick={nearMe} className="w-full mt-2 border border-navy text-navy py-2 rounded hover:bg-navy hover:text-gold">📍 Near me</button>
            {near && <p className="text-sm text-gray-600 mt-2">This venue is <strong>{near.distanceKm < 1 ? `${Math.round(near.distanceKm * 1000)} m` : `${near.distanceKm.toFixed(1)} km`}</strong> from your location.</p>}
            {error && <p className="text-sm text-amber-600 mt-2">{error}</p>}
          </div>

          <div className="bg-white rounded-lg shadow p-5">
            <h3 className="text-xl mb-3">Location</h3>
            {venue.address ? (
              <p className="text-sm text-gray-700">{venue.address}</p>
            ) : (
              <p className="text-sm text-amber-600">Address coming soon</p>
            )}
            {venue.openingHours && <p className="text-sm text-gray-600 mt-1">🕘 {venue.openingHours}</p>}
            {venue.parkingCapacity && <p className="text-sm text-gray-600">🅿️ Parking for {venue.parkingCapacity} vehicles</p>}
            <div className="mt-3">
              {venue.lat && venue.lng ? (
                <VenueMap lat={venue.lat} lng={venue.lng} name={venue.name} address={venue.address} />
              ) : (
                <p className="text-sm text-amber-600">Location map coming soon.</p>
              )}
            </div>
            {venue.googleMaps && (
              <a href={venue.googleMaps} target="_blank" rel="noreferrer" className="text-navy underline text-sm mt-2 inline-block">Open in Google Maps ↗</a>
            )}
          </div>

          <div className="bg-white rounded-lg shadow p-5">
            <h3 className="text-xl mb-3">Contact</h3>
            {venue.phone ? <p className="text-sm text-gray-700">📞 {venue.phone}</p> : <p className="text-sm text-amber-600">Phone not available</p>}
            {venue.email ? <p className="text-sm text-gray-700">✉️ {venue.email}</p> : <p className="text-sm text-amber-600">Email not available</p>}
          </div>

          <div className="bg-white rounded-lg shadow p-5">
            <h3 className="text-xl mb-3">Reviews</h3>
            <p className="text-sm text-gray-600 mb-2">⭐ {venue.rating || 4.5} average from 24 reviews</p>
            {reviewSummary.map(r => (
              <div key={r.stars} className="flex items-center gap-2 text-sm">
                <span className="w-6 text-right">{r.stars}★</span>
                <div className="flex-1 bg-stone-100 rounded-full h-2">
                  <div className="bg-gold h-2 rounded-full" style={{ width: `${(r.count / 24) * 100}%` }} />
                </div>
                <span className="w-6 text-gray-500 text-xs">{r.count}</span>
              </div>
            ))}
          </div>
        </aside>
      </div>
    </div>
  );
}