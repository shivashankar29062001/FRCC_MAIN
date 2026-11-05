import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useBooking } from '../context/BookingContext';
import { api } from '../services/api';
import Stepper from '../components/Stepper';
import HallCard from '../components/HallCard';
import { GUEST_COUNT_CHIPS, HALL_TYPES, COOLING_OPTIONS } from '../config/halls.config.js';

export default function ConventionBook() {
  const { booking, updateBooking } = useBooking();
  const navigate = useNavigate();
  const [halls, setHalls] = useState([]);
  const [citiesData, setCitiesData] = useState([]);
  const [error, setError] = useState('');
  const [searchParams, setSearchParams] = useSearchParams();
  const roomType = searchParams.get('type') || 'ALL';
  const setRoomType = (val) => {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      if (!val || val === 'ALL') {
        next.delete('type');
      } else {
        next.set('type', val);
      }
      return next;
    }, { replace: true });
  };
  const [cooling, setCooling] = useState('ALL');
  const [cityId, setCityId] = useState(booking.cityId || '');
  const [areaId, setAreaId] = useState(booking.areaId || '');
  const [venueId, setVenueId] = useState(booking.venueId || '');
  const [sortBy, setSortBy] = useState('price-asc');
  const [loading, setLoading] = useState(true);

  // Load cities hierarchy and halls
  useEffect(() => {
    setLoading(true);
    Promise.all([
      api('/locations', { auth: false }).then(d => (Array.isArray(d?.cities) ? d.cities : [])).catch(() => []),
      api('/halls', { auth: false }).then(d => (Array.isArray(d?.halls) ? d.halls : [])).catch(() => []),
    ]).then(([cities, hallsData]) => {
      const validCities = Array.isArray(cities) ? cities : [];
      setCitiesData(validCities);
      setHalls(Array.isArray(hallsData) ? hallsData : []);
      if (!booking.cityId && validCities.length > 0) {
        setCityId(validCities[0].id);
      }
      setLoading(false);
    }).catch(e => {
      setError(e?.message || '');
      setCitiesData([]);
      setHalls([]);
      setLoading(false);
    });
  }, [booking.cityId]);

  // Areas for the chosen city (from cities hierarchy)
  const areas = useMemo(() => {
    if (!cityId || !Array.isArray(citiesData)) return [];
    const city = citiesData.find(c => c.id === cityId);
    if (!city || !Array.isArray(city.areas)) return [];
    return city.areas.map(a => ({ id: a.id, name: a.name, rating: a.rating }));
  }, [cityId, citiesData]);

  // Clubs (venues) for the chosen city, from the same hierarchy
  const venues = useMemo(() => {
    if (!cityId) return [];
    const city = citiesData.find(c => c.id === cityId);
    if (!city) return [];
    return city.areas.flatMap(a => a.venues.map(v => ({
      id: v.id, name: v.name, areaId: a.id, areaName: a.name, cityId: city.id, cityName: city.name,
    })));
  }, [cityId, citiesData]);

  // Single-area cities (one club per city): auto-select the only area
  useEffect(() => {
    if (!cityId || areas.length !== 1) return;
    const only = areas[0];
    if (areaId !== only.id) {
      setAreaId(only.id);
      updateBooking({ areaId: only.id, areaName: only.name });
    }
  }, [cityId, areas, areaId, updateBooking]);

  // One club per city: auto-select it so its halls show straight away
  useEffect(() => {
    if (loading || !cityId || venues.length !== 1) return;
    const only = venues[0];
    if (venueId !== only.id) {
      setVenueId(only.id);
      updateBooking({ venueId: only.id, venueName: only.name });
    }
  }, [loading, cityId, venues, venueId, updateBooking]);

  // Number of guests / capacity
  const guestsNum = Number(booking.guests) || 0;
  const selectedHall = useMemo(() => halls.find(h => h.id === booking.hallId) || null, [halls, booking.hallId]);
  const selectedVenue = useMemo(() => venues.find(v => v.id === venueId) || null, [venues, venueId]);
  const hallTooSmall = selectedHall && guestsNum > selectedHall.capacity;
  const setGuests = (val) => updateBooking({ guests: val === '' ? '' : String(val) });
  const stepGuests = (d) => setGuests(Math.min(10000, Math.max(30, (guestsNum || 30) + d)));

  // Room types list from config with fallback to data
  const roomTypes = useMemo(() => {
    const list = [...HALL_TYPES];
    for (const h of halls) {
      if (h.roomType && !list.includes(h.roomType)) list.push(h.roomType);
    }
    return list;
  }, [halls]);

  // Filtered + sorted hall list
  const sortedHalls = useMemo(() => {
    if (!cityId || !Array.isArray(halls)) return [];
    let list = halls.filter(h => String(h.cityId) === String(cityId));
    if (areaId && areaId !== 'ALL') list = list.filter(h => String(h.areaId) === String(areaId));
    if (venueId) list = list.filter(h => h.venueId === venueId);
    if (roomType !== 'ALL') {
      list = list.filter(h => (h.roomType === roomType || h.name.startsWith(roomType)));
    }
    if (cooling !== 'ALL') {
      list = list.filter(h => h.cooling === cooling);
    }
    list = [...list];
    if (sortBy === 'price-asc') list.sort((a, b) => a.pricePerHour - b.pricePerHour);
    if (sortBy === 'price-desc') list.sort((a, b) => b.pricePerHour - a.pricePerHour);
    if (sortBy === 'capacity-asc') list.sort((a, b) => a.capacity - b.capacity);
    if (sortBy === 'capacity-desc') list.sort((a, b) => b.capacity - a.capacity);
    return list;
  }, [cityId, areaId, venueId, roomType, cooling, sortBy, halls]);

  const next = () => {
    if (!booking.hallId) { setError('Please select a hall to continue.'); return; }
    const hall = halls.find(h => h.id === booking.hallId);
    if (!hall) { setError('Selected hall no longer exists. Please pick again.'); return; }
    const g = Number(booking.guests);
    if (!booking.guests || !Number.isFinite(g) || g < 30) { setError('Enter how many guests you expect (minimum 30).'); return; }
    if (g > 10000) { setError('Guest count cannot exceed 10,000.'); return; }
    if (g > hall.capacity) { setError(`This hall holds up to ${hall.capacity.toLocaleString('en-IN')} guests. Choose a larger hall or reduce guests.`); return; }
    setError('');
    updateBooking({
      cityId: hall.cityId, cityName: hall.cityName,
      areaId: hall.areaId, areaName: hall.areaName,
      venueId: hall.venueId, venueName: hall.venueName,
      hallId: hall.id, hallName: hall.name,
      cooling: hall.cooling,
      capacity: hall.capacity,
    });
    navigate('/convention/date');
  };

  // Clear stale booking state if the saved club/hall is gone
  useEffect(() => {
    if (loading) return;
    if (booking.venueId && venues.length && !venues.some(v => v.id === booking.venueId)) {
      updateBooking({ venueId: '', venueName: '', hallId: null, hallName: '' });
    }
    if (booking.hallId && !halls.some(h => h.id === booking.hallId)) {
      updateBooking({ hallId: null, hallName: '' });
    }
  }, [loading, venues, halls, booking.venueId, booking.hallId, updateBooking]);

  const cityName = useMemo(() => {
    const c = Array.isArray(citiesData) ? citiesData.find(c => c.id === cityId) : null;
    return c ? c.name : '';
  }, [cityId, citiesData]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <Stepper current={0} />
      <h1 className="text-3xl mb-6">Step 1: Select Location & Hall</h1>

      {/* Location, filters & sort */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <select className="border rounded p-2 w-full bg-white text-navy-900" value={cityId}
          aria-label="City"
          onChange={e => {
            const val = e.target.value;
            setCityId(val); setAreaId(''); setVenueId(''); setRoomType('ALL'); setCooling('ALL');
            updateBooking({ cityId: val, areaId: '', areaName: '', venueId: '', venueName: '', hallId: null });
          }}>
          <option value="">-- Select City --</option>
          {Array.isArray(citiesData) && citiesData.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>

        <select className="border rounded p-2 w-full bg-white text-navy-900" value={roomType}
          aria-label="Room type"
          onChange={e => { setRoomType(e.target.value); updateBooking({ hallId: null }); }}>
          <option value="ALL">All types</option>
          {roomTypes.map(rt => <option key={rt} value={rt}>{rt}</option>)}
        </select>

        <select className="border rounded p-2 w-full bg-white text-navy-900" value={cooling}
          aria-label="Cooling"
          onChange={e => { setCooling(e.target.value); updateBooking({ hallId: null }); }}>
          <option value="ALL">All cooling</option>
          <option value="AC">AC</option>
          <option value="NON_AC">Non-AC</option>
        </select>

        <select className="border rounded p-2 w-full bg-white text-navy-900" value={sortBy}
          aria-label="Sort by"
          onChange={e => setSortBy(e.target.value)}>
          <option value="price-asc">Price: Low to High</option>
          <option value="price-desc">Price: High to Low</option>
          <option value="capacity-asc">Capacity: Low to High</option>
          <option value="capacity-desc">Capacity: High to Low</option>
        </select>
      </div>

      {/* Number of guests / capacity */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <label htmlFor="guest-count" className="block text-sm font-bold text-navy mb-2">How many guests?</label>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center">
            <button type="button" aria-label="Decrease guests" onClick={() => stepGuests(-10)}
              className="border border-navy text-navy rounded-l px-3 py-2 font-bold hover:bg-navy hover:text-gold">−</button>
            <input id="guest-count" type="number" min="30" max="10000" step="10" inputMode="numeric"
              value={booking.guests} placeholder="e.g. 100"
              onChange={e => updateBooking({ guests: e.target.value })}
              className="border-y border-navy w-28 px-3 py-2 text-center" />
            <button type="button" aria-label="Increase guests" onClick={() => stepGuests(10)}
              className="border border-navy text-navy rounded-r px-3 py-2 font-bold hover:bg-navy hover:text-gold">+</button>
          </div>
          <div className="flex flex-wrap gap-2">
            {GUEST_COUNT_CHIPS.map(n => (
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

      {!cityId && <p className="text-gray-500 mb-6">Start by choosing a city to see its halls.</p>}

      {/* Hall list */}
      <h2 className="text-2xl mb-4">
        {cityId
          ? (selectedVenue ? `Halls in ${selectedVenue.name}, ${cityName}` : `Halls in ${cityName}`)
          : 'Halls'}
      </h2>
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {sortedHalls.map((h, i) => (
          <HallCard key={h.id} hall={h} selected={booking.hallId === h.id} guests={guestsNum} eager={i < 3}
            onSelect={(hall) => updateBooking({
            hallId: hall.id,
            hallName: hall.name,
            cooling: hall.cooling,
            capacity: hall.capacity,
            venueId: hall.venueId,
            venueName: hall.venueName,
            cityId: hall.cityId,
            cityName: hall.cityName,
            areaId: hall.areaId,
            areaName: hall.areaName,
          })} />
        ))}
      </div>

      {sortedHalls.length === 0 && cityId && (
        <p className="text-gray-500 mt-6 bg-white rounded shadow p-6 text-center">
          {roomType !== 'ALL' || cooling !== 'ALL'
            ? 'No halls match the selected filters. Try All types and All cooling.'
            : areaId && areaId !== 'ALL' ? 'No halls in this area. Try All areas.' : 'No halls in this city.'}
        </p>
      )}

      <div className="flex justify-end mt-8">
        <button onClick={next} className="bg-navy text-gold px-8 py-2 rounded font-semibold">Next →</button>
      </div>
    </div>
  );
}
