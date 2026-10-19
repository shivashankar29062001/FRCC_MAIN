import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useBooking } from '../context/BookingContext';
import { api } from '../services/api';
import Stepper from '../components/Stepper';
import HallCard from '../components/HallCard';

export default function ConventionBook() {
  const { booking, updateBooking } = useBooking();
  const navigate = useNavigate();
  const [halls, setHalls] = useState([]);
  const [venues, setVenues] = useState([]);
  const [citiesData, setCitiesData] = useState([]);
  const [error, setError] = useState('');
  const [type, setType] = useState('ALL');
  const [cityId, setCityId] = useState(booking.cityId || '');
  const [areaId, setAreaId] = useState(booking.areaId || '');
  const [venueId, setVenueId] = useState(booking.venueId || '');
  const [sortBy, setSortBy] = useState('price-asc');
  const [near, setNear] = useState(null);
  const [loading, setLoading] = useState(true);

  // Load cities hierarchy and initial halls
  useEffect(() => {
    setLoading(true);
    Promise.all([
      api('/locations', { auth: false }).then(d => (Array.isArray(d?.cities) ? d.cities : [])).catch(() => []),
      api('/halls', { auth: false }).then(d => (Array.isArray(d?.halls) ? d.halls : [])).catch(() => []),
    ]).then(([cities, hallsData]) => {
      setCitiesData(Array.isArray(cities) ? cities : []);
      setHalls(Array.isArray(hallsData) ? hallsData : []);
      setLoading(false);
    }).catch(e => {
      setError(e?.message || '');
      setCitiesData([]);
      setHalls([]);
      setLoading(false);
    });
  }, []);

  // Load venues when city or area changes
  useEffect(() => {
    if (!cityId) {
      setVenues([]);
      return;
    }
    const params = new URLSearchParams();
    params.append('cityId', cityId);
    if (areaId && areaId !== 'ALL') params.append('areaId', areaId);
    api(`/venues?${params.toString()}`, { auth: false })
      .then(d => setVenues(Array.isArray(d?.venues) ? d.venues : []))
      .catch(() => setVenues([]));
  }, [cityId, areaId]);

  // Areas for the chosen city (from cities hierarchy)
  const areas = useMemo(() => {
    if (!cityId || !Array.isArray(citiesData)) return [];
    const city = citiesData.find(c => c.id === cityId);
    if (!city || !Array.isArray(city.areas)) return [];
    return city.areas.map(a => ({ id: a.id, name: a.name, rating: a.rating }));
  }, [cityId, citiesData]);

  // Single-area cities (one club per city): auto-select the only area and hide the dropdown
  useEffect(() => {
    if (!cityId || areas.length !== 1) return;
    const only = areas[0];
    if (areaId !== only.id) {
      setAreaId(only.id);
      updateBooking({ areaId: only.id, areaName: only.name });
    }
  }, [cityId, areas, areaId, updateBooking]);

  // Number of guests / capacity — saved in booking.guests (the same field the Details step uses)
  const guestsNum = Number(booking.guests) || 0;
  const GUEST_CHIPS = [30, 50, 100, 250, 500, 1000];
  const selectedHall = useMemo(() => halls.find(h => h.id === booking.hallId) || null, [halls, booking.hallId]);
  const hallTooSmall = selectedHall && guestsNum > selectedHall.capacity;
  const setGuests = (val) => updateBooking({ guests: val === '' ? '' : String(val) });
  const stepGuests = (d) => setGuests(Math.min(100000, Math.max(30, (guestsNum || 30) + d)));

  // Filtered + sorted hall list (from already-loaded halls)
  const sortedHalls = useMemo(() => {
    if (!cityId || !Array.isArray(halls)) return [];
    let list = halls.filter(h => String(h.cityId) === String(cityId));
    if (areaId && areaId !== 'ALL') list = list.filter(h => String(h.areaId) === String(areaId));
    if (venueId) list = list.filter(h => h.venueId === venueId);
    if (type !== 'ALL') list = list.filter(h => h.type === type);
    list = [...list];
    if (sortBy === 'price-asc') list.sort((a, b) => a.pricePerHour - b.pricePerHour);
    if (sortBy === 'price-desc') list.sort((a, b) => b.pricePerHour - a.pricePerHour);
    if (sortBy === 'capacity-asc') list.sort((a, b) => a.capacity - b.capacity);
    if (sortBy === 'capacity-desc') list.sort((a, b) => b.capacity - a.capacity);
    return list;
  }, [cityId, areaId, venueId, type, sortBy, halls]);

  const next = () => {
    if (!booking.hallId) { setError('Please select a hall to continue.'); return; }
    const hall = halls.find(h => h.id === booking.hallId);
    if (!hall) { setError('Selected hall no longer exists. Please pick again.'); return; }
    const g = Number(booking.guests);
    if (!booking.guests || !Number.isFinite(g) || g < 30) { setError('Enter how many guests you expect (minimum 30).'); return; }
    if (g > 100000) { setError('Guest count cannot exceed 1,00,000.'); return; }
    if (g > hall.capacity) { setError(`This hall holds up to ${hall.capacity.toLocaleString('en-IN')} guests. Choose a larger hall or reduce guests.`); return; }
    setError('');
    updateBooking({
      cityId: hall.cityId, cityName: hall.cityName,
      areaId: hall.areaId, areaName: hall.areaName,
      venueId: hall.venueId, venueName: hall.venueName,
      hallId: hall.id, hallName: hall.name,
    });
    navigate('/convention/date');
  };

  const nearMe = () => {
    setError('');
    if (!navigator.geolocation) { setError('Geolocation is not supported by this browser.'); return; }
    navigator.geolocation.getCurrentPosition(
      pos => {
        const { latitude, longitude } = pos.coords;
        setNear({ coords: { latitude, longitude } });
        setError('');
      },
      err => setError(
        err.code === err.PERMISSION_DENIED
          ? 'Location permission denied. Choose a city and area to continue.'
          : 'Could not get your location. Please choose a city and area.'
      ),
      { timeout: 8000 }
    );
  };

  // Clear stale booking state if venue/hall no longer exists (after data has loaded,
  // so a refreshed draft is not wiped before the lists arrive)
  useEffect(() => {
    if (loading) return;
    if (booking.venueId && !venues.some(v => v.id === booking.venueId)) {
      updateBooking({ venueId: '', venueName: '', hallId: null, hallName: '' });
    }
    if (booking.hallId && !halls.some(h => h.id === booking.hallId)) {
      updateBooking({ hallId: null, hallName: '' });
    }
  }, [loading, venues, halls, booking.venueId, booking.hallId, updateBooking]);

  // City and area names for display
  const cityName = useMemo(() => {
    const c = Array.isArray(citiesData) ? citiesData.find(c => c.id === cityId) : null;
    return c ? c.name : '';
  }, [cityId, citiesData]);

  const areaName = useMemo(() => {
    const a = Array.isArray(areas) ? areas.find(a => a.id === areaId) : null;
    return a ? a.name : '';
  }, [areaId, areas]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <Stepper current={0} />
      <h1 className="text-3xl mb-6">Step 1: Select Location & Hall</h1>

      {/* Location selector */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <select className="border rounded p-2 w-full sm:flex-1" value={cityId}
          onChange={e => {
            const val = e.target.value;
            setCityId(val); setAreaId(''); setVenueId('');
            updateBooking({ cityId: val, areaId: '', areaName: '', venueId: '', venueName: '', hallId: null });
          }}>
          <option value="">-- Select City --</option>
          {Array.isArray(citiesData) && citiesData.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>

        {/* Hidden when the city has a single club area — auto-selected instead */}
        {areas.length > 1 && (
          <select className="border rounded p-2 w-full sm:flex-1" value={areaId} disabled={!cityId}
            onChange={e => {
              const val = e.target.value;
              setAreaId(val); setVenueId('');
              const found = Array.isArray(areas) ? areas.find(a => a.id === val) : null;
              updateBooking({ areaId: val, areaName: found ? found.name : '', venueId: '', venueName: '', hallId: null });
            }}>
            <option value="">-- Select Area --</option>
            <option value="ALL">All areas</option>
            {Array.isArray(areas) && areas.map(a => (
              <option key={a.id} value={a.id}>{a.name} {a.rating ? `⭐ ${a.rating}` : ''}</option>
            ))}
          </select>
        )}

        <select className="border rounded p-2 w-full sm:flex-1" value={venueId} disabled={!cityId}
          onChange={e => {
            const val = e.target.value;
            setVenueId(val);
            const v = Array.isArray(venues) ? venues.find(x => x.id === val) : null;
            updateBooking({ venueId: val, venueName: v ? v.name : '', hallId: null });
          }}>
          <option value="">-- Select Venue --</option>
          {Array.isArray(venues) && venues.map(v => (
            <option key={v.id} value={v.id}>{v.name} — {v.areaName}, {v.cityName}</option>
          ))}
        </select>
      </div>

      {/* Filters & sort */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <select className="border rounded p-2 w-full sm:w-56" value={type}
          onChange={e => { setType(e.target.value); updateBooking({ hallId: null }); }}>
          <option value="ALL">All types</option>
          <option value="AC">AC</option>
          <option value="NON_AC">Non-AC</option>
          <option value="BOARD_ROOM">Board Room</option>
        </select>
        <select className="border rounded p-2 w-full sm:w-56" value={sortBy} onChange={e => setSortBy(e.target.value)}>
          <option value="price-asc">Price: Low to High</option>
          <option value="price-desc">Price: High to Low</option>
          <option value="capacity-asc">Capacity: Low to High</option>
          <option value="capacity-desc">Capacity: High to Low</option>
        </select>
        <button onClick={nearMe} className="border border-navy text-navy rounded px-4 py-2 hover:bg-navy hover:text-gold">
          📍 Near me
        </button>
        {near && <span className="self-center text-sm text-gray-600">Sorted from your location ({near.coords.latitude.toFixed(2)}, {near.coords.longitude.toFixed(2)})</span>}
      </div>

      {/* Number of guests / capacity */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <label htmlFor="guest-count" className="block text-sm font-bold text-navy mb-2">How many guests?</label>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center">
            <button type="button" aria-label="Decrease guests" onClick={() => stepGuests(-10)}
              className="border border-navy text-navy rounded-l px-3 py-2 font-bold hover:bg-navy hover:text-gold">−</button>
            <input id="guest-count" type="number" min="30" max="100000" step="10" inputMode="numeric"
              value={booking.guests} placeholder="e.g. 100"
              onChange={e => updateBooking({ guests: e.target.value })}
              className="border-y border-navy w-28 px-3 py-2 text-center" />
            <button type="button" aria-label="Increase guests" onClick={() => stepGuests(10)}
              className="border border-navy text-navy rounded-r px-3 py-2 font-bold hover:bg-navy hover:text-gold">+</button>
          </div>
          <div className="flex flex-wrap gap-2">
            {GUEST_CHIPS.map(n => (
              <button key={n} type="button" onClick={() => setGuests(n)}
                className={`text-sm rounded-full px-3 py-1 border ${guestsNum === n ? 'bg-gold text-navy border-gold font-semibold' : 'border-navy text-navy hover:bg-navy hover:text-gold'}`}>
                {n.toLocaleString('en-IN')}
              </button>
            ))}
          </div>
        </div>
        <p className="text-xs text-gray-500 mt-2">Min 30. Max depends on the hall you choose.</p>
        {hallTooSmall && (
          <p className="text-sm text-red-600 mt-2">
            This hall holds up to {selectedHall.capacity.toLocaleString('en-IN')} guests. Choose a larger hall or reduce guests.
          </p>
        )}
      </div>

      {error && <p className="text-red-600 mb-4">{error}</p>}

      {!cityId && <p className="text-gray-500 mb-6">Start by choosing a city to see its areas, venues and halls.</p>}

      {/* Venue summary cards */}
      {cityId && (
        <>
          <h2 className="text-2xl mb-4">
            {venueId ? venues.find(v => v.id === venueId)?.name : areaId && areaId !== 'ALL' ? `Venues in ${areaName}, ${cityName}` : `Venues in ${cityName}`}
            {' '}— {venues.length}
          </h2>
          {venues.length === 0 ? (
            <div className="bg-white rounded shadow p-8 text-center mb-10">
              <p className="text-gray-500 mb-4">No venues found.</p>
              {areaId && areaId !== 'ALL' && (
                <button onClick={() => { setAreaId('ALL'); updateBooking({ areaId: 'ALL', areaName: '', venueId: '', venueName: '', hallId: null }); }}
                  className="text-navy underline hover:text-gold">Try All areas</button>
              )}
            </div>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 mb-10">
              {venues.map(v => (
                <div key={v.id} className="bg-white rounded-lg shadow p-4">
                  <h3 className="text-lg font-bold text-navy">{v.name}</h3>
                  <p className="text-sm text-gray-600">{v.areaName}, {v.cityName}</p>
                  <p className="text-sm text-gray-500 mt-1 truncate">{v.address || 'Address coming soon'}</p>
                  <p className="mt-1 text-sm text-gray-500">{v.hallCount} hall{v.hallCount > 1 ? 's' : ''} • ⭐ {v.rating} • from ₹{v.startingPrice.toLocaleString('en-IN')}/hr</p>
                  <button onClick={() => { setVenueId(v.id); updateBooking({ venueId: v.id, venueName: v.name, hallId: null }); }}
                    className={`mt-3 w-full rounded py-2 font-semibold ${venueId === v.id ? 'bg-gold text-navy' : 'bg-navy text-gold hover:bg-navy-800'}`}>
                    {venueId === v.id ? '✓ Selected' : 'View Halls'}
                  </button>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Hall list */}
      <h2 className="text-2xl mb-4">
        {cityId ? (venueId ? venues.find(v => v.id === venueId)?.name : `Halls in ${areaId && areaId !== 'ALL' ? areaName : cityName}`) : 'Halls'}
      </h2>
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {sortedHalls.map((h, i) => (
          <HallCard key={h.id} hall={h} selected={booking.hallId === h.id} guests={guestsNum} eager={i < 3}
            onSelect={(hall) => updateBooking({ hallId: hall.id, hallName: hall.name })} />
        ))}
      </div>

      {sortedHalls.length === 0 && cityId && (
        <p className="text-gray-500 mt-6 bg-white rounded shadow p-6 text-center">
          {venueId ? 'No halls in this venue.' : areaId && areaId !== 'ALL' ? 'No halls in this area. Try All areas.' : 'No halls in this city.'}
        </p>
      )}

      <div className="flex justify-end mt-8">
        <button onClick={next} className="bg-navy text-gold px-8 py-2 rounded font-semibold">Next →</button>
      </div>
    </div>
  );
}