// ---------------------------------------------------------------------------
// /src/features/dining/DiningLandingPage.jsx — Public Dining Landing Page
// ---------------------------------------------------------------------------

import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ServiceHero } from '../../components/ServiceHero.jsx';
import { SmartImage } from '../../components/ui/media.jsx';
import { IMAGES } from '../../config/images.js';
import { venues } from '../../data/dining.js';
import { todayISO } from '../../utils/helpers.js';
import { formatDMY, parseDMY } from '../../utils/dates.js';
import { ArrowRightIcon, CalendarIcon, UsersIcon } from '../../components/ui/icons.jsx';

const FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'restaurants', label: 'Restaurants' },
  { id: 'coffee', label: 'Coffee' },
  { id: 'bars', label: 'Bars' },
];

export function DiningLandingPage() {
  const navigate = useNavigate();
  const [filter, setFilter] = useState('all');

  // Book a table bar state
  const [barVenue, setBarVenue] = useState('restaurant');
  const [barDate, setBarDate] = useState(() => formatDMY(todayISO()));
  const [barGuests, setBarGuests] = useState('2');

  function handleFindTable(e) {
    e.preventDefault();
    const params = new URLSearchParams();
    if (barVenue) params.set('venue', barVenue);
    if (barDate) params.set('date', barDate);
    if (barGuests) params.set('guests', barGuests);
    navigate(`/dining/book?${params.toString()}`);
  }

  const filteredVenues = venues.filter((v) => {
    if (filter === 'all') return true;
    if (filter === 'restaurants') return v.id === 'restaurant' || v.id === 'rooftop-restaurant';
    if (filter === 'coffee') return v.id === 'coffee-shop';
    if (filter === 'bars') return v.id === 'pub' || v.id === 'lounge-bar';
    return true;
  });

  return (
    <div className="bg-cream/20">
      {/* 1 · Service Hero */}
      <ServiceHero service="dining" />

      <div id="content" className="container-x py-10 sm:py-14 space-y-10">
        {/* 2 · Compact "Book a table" search bar */}
        <section
          aria-label="Book a table search"
          className="rounded-2xl border border-slate-200/80 bg-white p-4 sm:p-5 shadow-lift"
        >
          <div className="mb-3">
            <h2 className="font-display text-lg font-bold text-navy-900">Book a table</h2>
            <p className="text-xs text-slate-500">Reserve a table at any of our campus dining venues</p>
          </div>

          <form onSubmit={handleFindTable} className="grid grid-cols-1 gap-3 sm:grid-cols-4 items-end">
            <div>
              <label htmlFor="bar-venue" className="label">Venue</label>
              <select
                id="bar-venue"
                value={barVenue}
                onChange={(e) => setBarVenue(e.target.value)}
                className="field h-11 w-full text-sm"
              >
                {venues.map((v) => (
                  <option key={v.id} value={v.id}>{v.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="bar-date" className="label">Date (DD/MM/YYYY)</label>
              <div className="relative">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                  <CalendarIcon className="h-4 w-4" />
                </span>
                <input
                  id="bar-date"
                  type="text"
                  placeholder="DD/MM/YYYY"
                  value={barDate}
                  onChange={(e) => setBarDate(e.target.value)}
                  className="field h-11 w-full !pl-10 text-sm"
                />
              </div>
            </div>

            <div>
              <label htmlFor="bar-guests" className="label">Guests</label>
              <div className="relative">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                  <UsersIcon className="h-4 w-4" />
                </span>
                <select
                  id="bar-guests"
                  value={barGuests}
                  onChange={(e) => setBarGuests(e.target.value)}
                  className="field h-11 w-full !pl-10 text-sm"
                >
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((n) => (
                    <option key={n} value={n}>{n} {n === 1 ? 'Guest' : 'Guests'}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <button
                type="submit"
                className="btn-base bg-gold-500 text-navy-950 hover:bg-gold-400 h-11 w-full font-semibold text-sm justify-center cursor-pointer"
              >
                Find a table
              </button>
            </div>
          </form>
        </section>

        {/* 3 · Filter chips */}
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-4">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider mr-2">Filter:</span>
          {FILTERS.map((f) => {
            const active = filter === f.id;
            return (
              <button
                key={f.id}
                type="button"
                onClick={() => setFilter(f.id)}
                className={`rounded-xl px-4 py-2 text-xs font-semibold transition cursor-pointer ${
                  active
                    ? 'bg-navy-900 text-white shadow-xs'
                    : 'bg-white border border-slate-200 text-slate-600 hover:border-navy-900/40 hover:text-navy-900'
                }`}
              >
                {f.label}
              </button>
            );
          })}
        </div>

        {/* 4 · Venue cards */}
        <section aria-label="Dining Venues" className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredVenues.map((v) => {
            const slotKey = `dining-${v.id}`;
            const img = IMAGES[slotKey] || { slot: slotKey, name: v.name, alt: v.name };

            return (
              <article
                key={v.id}
                className="card flex flex-col justify-between overflow-hidden !p-0 shadow-sm border border-slate-200/80 bg-white"
              >
                <div>
                  <div className="relative">
                    <SmartImage
                      image={img}
                      aspect="16 / 10"
                      sizes="(min-width: 1024px) 30vw, (min-width: 640px) 45vw, 100vw"
                    />
                    {v.minAge > 0 && (
                      <span className="absolute top-3 right-3 rounded-md bg-amber-500 px-2 py-0.5 text-[11px] font-bold text-navy-950 shadow-xs">
                        21+
                      </span>
                    )}
                  </div>

                  <div className="p-5">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-display text-xl font-bold text-navy-900">{v.name}</h3>
                      <span className="text-[11px] font-medium text-slate-500 bg-slate-100 rounded-md px-2 py-0.5 shrink-0">
                        {v.cuisine}
                      </span>
                    </div>

                    <p className="mt-2 text-xs leading-relaxed text-slate-600">
                      {v.tagline}
                    </p>

                    <div className="mt-4 border-t border-slate-100 pt-3 text-xs text-slate-500">
                      <span className="font-semibold text-slate-700">Hours: </span>
                      {v.hours}
                    </div>
                  </div>
                </div>

                <div className="p-5 pt-0 border-t border-slate-100 mt-4 flex items-center gap-3">
                  <Link
                    to={`/dining/${v.id}`}
                    className="btn-base flex-1 justify-center py-2 text-xs font-semibold border border-navy-900/20 text-navy-900 hover:bg-slate-50 cursor-pointer"
                  >
                    View menu
                  </Link>
                  <Link
                    to={`/dining/book?venue=${v.id}`}
                    className="btn-base flex-1 justify-center py-2 text-xs font-semibold bg-gold-500 text-navy-950 hover:bg-gold-400 cursor-pointer"
                  >
                    Book a table
                  </Link>
                </div>
              </article>
            );
          })}
        </section>
      </div>
    </div>
  );
}

export default DiningLandingPage;
