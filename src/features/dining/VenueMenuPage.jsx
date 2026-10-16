// ---------------------------------------------------------------------------
// /src/features/dining/VenueMenuPage.jsx — Venue Details and Menu Page
// ---------------------------------------------------------------------------

import { useState } from 'react';
import { useParams, Link, Navigate } from 'react-router-dom';
import { venues, samplePrices } from '../../data/dining.js';
import { IMAGES } from '../../config/images.js';
import { SmartImage } from '../../components/ui/media.jsx';
import { formatInr } from '../../utils/pricing.js';
import { Breadcrumbs } from '../../components/ui/sections.jsx';
import { ArrowLeftIcon, ClockIcon } from '../../components/ui/icons.jsx';

function VegIndicator({ veg }) {
  if (veg === true) {
    return (
      <span
        title="Vegetarian"
        className="inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-sm border border-emerald-600 p-0.5"
      >
        <span className="h-2 w-2 rounded-full bg-emerald-600" />
      </span>
    );
  }
  if (veg === false) {
    return (
      <span
        title="Non-vegetarian"
        className="inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-sm border border-rose-600 p-0.5"
      >
        <span className="h-2 w-2 rounded-full bg-rose-600" />
      </span>
    );
  }
  return (
    <span
      title="Beverage"
      className="inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-sm border border-slate-300 p-0.5"
    >
      <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
    </span>
  );
}

export function VenueMenuPage() {
  const { venueId } = useParams();
  const venue = venues.find((v) => v.id === venueId);

  const [activeCategory, setActiveCategory] = useState(() => venue?.menu?.[0]?.category || '');

  if (!venue) {
    return <Navigate to="/dining" replace />;
  }

  const slotKey = `dining-${venue.id}`;
  const heroImage = IMAGES[slotKey] || { slot: slotKey, name: venue.name, alt: venue.name };
  const currentMenuSection = venue.menu.find((m) => m.category === activeCategory) || venue.menu[0];

  return (
    <div className="min-h-screen bg-cream/20 pb-28">
      {/* 1 · Image-only Hero */}
      <div className="relative w-full overflow-hidden bg-navy-950">
        <SmartImage
          image={heroImage}
          aspect="21 / 7"
          sizes="100vw"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-t from-navy-950/80 via-transparent to-black/30 pointer-events-none" />
        <div className="container-x absolute top-4 left-0 right-0 z-10">
          <Link
            to="/dining"
            className="inline-flex items-center gap-1.5 rounded-full bg-black/40 px-3.5 py-1.5 text-xs font-semibold text-white backdrop-blur-md hover:bg-black/60 transition"
          >
            <ArrowLeftIcon className="h-3.5 w-3.5" />
            <span>All venues</span>
          </Link>
        </div>
      </div>

      <div className="container-x pt-6">
        <Breadcrumbs
          items={[
            { label: 'Home', to: '/home' },
            { label: 'Dining', to: '/dining' },
            { label: venue.name },
          ]}
        />

        {/* 2 · Venue Header */}
        <div className="mt-4 border-b border-slate-200 pb-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-3">
                <h1 className="font-display text-3xl sm:text-4xl font-bold text-navy-900 tracking-tight">
                  {venue.name}
                </h1>
                {venue.minAge > 0 && (
                  <span className="rounded-md bg-amber-500 px-2.5 py-1 text-xs font-bold text-navy-950">
                    21+
                  </span>
                )}
              </div>
              <p className="mt-2 text-sm text-slate-600 max-w-2xl">{venue.tagline}</p>
              <div className="mt-3 flex items-center gap-2 text-xs text-slate-500">
                <ClockIcon className="h-4 w-4 text-gold-500" />
                <span><strong className="text-slate-700">Hours:</strong> {venue.hours}</span>
                <span className="text-slate-300">·</span>
                <span><strong className="text-slate-700">Cuisine:</strong> {venue.cuisine}</span>
              </div>
            </div>

            <Link
              to={`/dining/book?venue=${venue.id}`}
              className="btn-base bg-gold-500 text-navy-950 hover:bg-gold-400 px-6 py-2.5 font-semibold text-sm hidden sm:inline-flex"
            >
              Book a table
            </Link>
          </div>

          {/* Age requirement warning notice */}
          {venue.minAge > 0 && (
            <div className="mt-4 rounded-xl border border-amber-300 bg-amber-50 p-3.5 text-xs text-amber-900">
              <p className="font-semibold">Guests must be 21 or older. Valid photo ID required.</p>
            </div>
          )}
        </div>

        {/* 3 · MENU Section */}
        <section aria-label="Venue Menu" className="mt-8">
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <h2 className="font-display text-2xl font-bold text-navy-900">Menu</h2>
            {samplePrices && (
              <p className="text-xs text-slate-500 italic">Prices are indicative</p>
            )}
          </div>

          {/* Category Tabs */}
          <div className="mt-4 flex flex-wrap gap-2">
            {venue.menu.map((cat) => {
              const active = (activeCategory || venue.menu[0]?.category) === cat.category;
              return (
                <button
                  key={cat.category}
                  type="button"
                  onClick={() => setActiveCategory(cat.category)}
                  className={`rounded-xl px-4 py-2 text-xs sm:text-sm font-semibold transition cursor-pointer ${
                    active
                      ? 'bg-navy-900 text-white shadow-xs'
                      : 'border border-slate-200 bg-white text-slate-600 hover:border-navy-900/40 hover:text-navy-900'
                  }`}
                >
                  {cat.category} ({cat.items.length})
                </button>
              );
            })}
          </div>

          {/* Menu Items Table / Rows */}
          <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-4 sm:p-6 shadow-sm">
            <h3 className="font-display text-lg font-bold text-navy-900 mb-4 pb-2 border-b border-slate-100">
              {currentMenuSection?.category}
            </h3>

            <div className="divide-y divide-slate-100">
              {currentMenuSection?.items.map((item, idx) => (
                <div key={idx} className="py-4 first:pt-0 last:pb-0 flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className="pt-0.5">
                      <VegIndicator veg={item.veg} />
                    </div>
                    <div>
                      <h4 className="font-semibold text-sm text-navy-900">{item.name}</h4>
                      <p className="mt-0.5 text-xs text-slate-500 leading-relaxed max-w-xl">
                        {item.description}
                      </p>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="font-display text-sm font-bold text-navy-900">
                      {formatInr(item.price)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>

      {/* 4 · Sticky "Book a table" bottom bar */}
      <aside aria-label="Quick booking" className="fixed bottom-0 inset-x-0 z-30 border-t border-slate-200 bg-white/95 backdrop-blur-md py-3.5 shadow-lg">
        <div className="container-x flex items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="font-semibold text-sm text-navy-900 truncate">Reserve at {venue.name}</p>
            <p className="text-xs text-slate-500 truncate">Complimentary table booking · Instant confirmation</p>
          </div>
          <Link
            to={`/dining/book?venue=${venue.id}`}
            className="btn-base bg-gold-500 text-navy-950 hover:bg-gold-400 px-6 py-2.5 font-bold text-sm shrink-0 cursor-pointer"
          >
            Book a table
          </Link>
        </div>
      </aside>
    </div>
  );
}

export default VenueMenuPage;
