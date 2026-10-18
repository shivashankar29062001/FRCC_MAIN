// ---------------------------------------------------------------------------
// /src/features/events/EventsPage.jsx — Public Events Showcase
// Displays ServiceHero, category chips, upcoming events photo cards, and empty state.
// ---------------------------------------------------------------------------

import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ServiceHero } from '../../components/ServiceHero.jsx';
import { SmartImage } from '../../components/ui/media.jsx';
import { IMAGES, heroSrc } from '../../config/images.js';
import { getUpcomingEvents } from '../../api/events.js';
import { EVENT_CATEGORIES, getCategoryLabel, getCategoryBadgeClass } from '../../data/events.js';
import { formatDMY } from '../../utils/dates.js';
import { CalendarIcon, ClockIcon, MapPinIcon } from '../../components/ui/icons.jsx';
import { Reveal } from '../../components/ui/motion.jsx';

/** Formats time string 'HH:MM:SS' or 'HH:MM' into 12-hour AM/PM format. */
function formatTime(t) {
  if (!t) return '';
  const [hStr, mStr] = String(t).split(':');
  const h = parseInt(hStr, 10);
  if (isNaN(h)) return t;
  const ampm = h >= 12 ? 'PM' : 'AM';
  const hour12 = h % 12 || 12;
  return `${hour12}:${mStr || '00'} ${ampm}`;
}

function formatEventTimeRange(start, end) {
  if (!start) return '';
  const s = formatTime(start);
  if (!end) return s;
  return `${s} – ${formatTime(end)}`;
}

/** Formats event date into month abbreviation and day for date badge. */
function getDateParts(dateStr) {
  if (!dateStr) return { month: '—', day: '—' };
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return { month: '—', day: '—' };
  const month = d.toLocaleString('en-US', { month: 'short' }).toUpperCase();
  const day = String(d.getDate()).padStart(2, '0');
  return { month, day };
}

export function EventsPage() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('all');

  useEffect(() => {
    let cancelled = false;
    async function loadEvents() {
      setLoading(true);
      try {
        const data = await getUpcomingEvents();
        if (!cancelled) setEvents(data || []);
      } catch (err) {
        console.warn('[EventsPage] Failed to load events:', err);
        if (!cancelled) setEvents([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    loadEvents();
    return () => {
      cancelled = true;
    };
  }, []);

  const filteredEvents = useMemo(() => {
    if (selectedCategory === 'all') return events;
    return events.filter((e) => e.category === selectedCategory);
  }, [events, selectedCategory]);

  return (
    <div className="min-h-screen bg-slate-50">
      {/* 1 · Service Hero */}
      <ServiceHero service="events" />

      {/* 2 · Main Content Area */}
      <div id="content" className="container-x py-10 sm:py-14 scroll-mt-20">
        {/* Section Heading & Category Filter Chips */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-slate-200/80 pb-6">
          <div>
            <p className="eyebrow">Upcoming Schedule</p>
            <h2 className="h-section mt-1">Cultural &amp; Cinema Events</h2>
            <p className="mt-2 text-sm text-slate-600 max-w-xl">
              Immerse yourself in screenings, interactive workshops, and creative discussions across the FRCC campus.
            </p>
          </div>

          {/* Category Chips */}
          <div className="flex flex-wrap items-center gap-2" role="tablist" aria-label="Event categories">
            {EVENT_CATEGORIES.map((cat) => {
              const active = selectedCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`btn-base px-4 py-1.5 text-xs font-semibold rounded-full transition duration-150 ${
                    active
                      ? 'bg-navy-900 text-white shadow-sm'
                      : 'border border-slate-300 bg-white text-slate-700 hover:border-gold-500 hover:text-navy-900'
                  }`}
                >
                  {cat.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* 3 · Events Grid / Loading / Empty State */}
        {loading ? (
          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map((n) => (
              <div key={n} className="card animate-pulse overflow-hidden rounded-2xl border border-slate-200 bg-white !p-0">
                <div className="h-48 w-full bg-slate-200" />
                <div className="p-5 space-y-3">
                  <div className="h-4 w-24 bg-slate-200 rounded" />
                  <div className="h-6 w-3/4 bg-slate-200 rounded" />
                  <div className="h-4 w-full bg-slate-200 rounded" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredEvents.length === 0 ? (
          <div className="mt-12 text-center py-16 card max-w-md mx-auto">
            <span aria-hidden className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-navy-50 text-navy-800">
              <CalendarIcon className="h-7 w-7 text-gold-500" />
            </span>
            <h3 className="font-display text-xl font-bold text-navy-900 mt-4">No upcoming events</h3>
            <p className="mt-2 text-sm text-slate-600">
              {selectedCategory === 'all'
                ? 'There are currently no scheduled events in this period. Please check back soon.'
                : `No upcoming events found under "${getCategoryLabel(selectedCategory)}". Try selecting another category.`}
            </p>
            {selectedCategory !== 'all' && (
              <button
                type="button"
                onClick={() => setSelectedCategory('all')}
                className="mt-5 btn-base border border-slate-300 bg-white text-navy-900 hover:bg-slate-50 px-4 py-2 text-xs font-semibold"
              >
                View all events
              </button>
            )}
          </div>
        ) : (
          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {filteredEvents.map((evt, idx) => {
              const { month, day } = getDateParts(evt.event_date);
              const badgeClass = getCategoryBadgeClass(evt.category);
              const timeRange = formatEventTimeRange(evt.start_time, evt.end_time);

              // Image resolution: image_url or imageSlot in IMAGES or heroSrc
              const slotKey = evt.imageSlot || `event-${evt.id}`;
              const imageObj = evt.image_url
                ? { src: evt.image_url, alt: evt.title }
                : (IMAGES[slotKey] || { slot: slotKey, src: heroSrc(slotKey) || IMAGES.membershipEvents?.src, alt: evt.title });

              return (
                <Reveal key={evt.id} delay={idx * 50}>
                  <Link
                    to={`/events/${evt.id}`}
                    className="group card flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200/90 bg-white !p-0 transition-all duration-200 hover:border-gold-500 hover:shadow-card"
                  >
                    {/* Image with Overlays */}
                    <div className="relative aspect-[16/10] w-full overflow-hidden bg-navy-950">
                      <SmartImage
                        image={imageObj}
                        aspect="16 / 10"
                        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-navy-950/70 via-transparent to-transparent pointer-events-none" />

                      {/* Date Badge */}
                      <div className="absolute left-3 top-3 flex flex-col items-center justify-center rounded-xl bg-white/95 px-2.5 py-1.5 text-center shadow-md backdrop-blur">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-gold-600 leading-none">
                          {month}
                        </span>
                        <span className="font-display text-lg font-bold text-navy-900 leading-tight">
                          {day}
                        </span>
                      </div>

                      {/* Sample Badge if applicable */}
                      {evt.isSample && (
                        <div className="absolute right-3 top-3 rounded-full bg-slate-900/80 px-2.5 py-0.5 text-[10px] font-semibold tracking-wider uppercase text-slate-200 backdrop-blur border border-white/20">
                          Sample
                        </div>
                      )}

                      {/* Category Chip */}
                      <div className="absolute bottom-3 left-3">
                        <span className={`tag ${badgeClass} !text-[11px] !py-0.5 !px-2.5 shadow-sm`}>
                          {getCategoryLabel(evt.category)}
                        </span>
                      </div>
                    </div>

                    {/* Card Body */}
                    <div className="flex flex-1 flex-col justify-between p-5">
                      <div>
                        <h3 className="font-display text-lg font-bold text-navy-900 group-hover:text-gold-600 transition-colors line-clamp-2">
                          {evt.title}
                        </h3>
                        <p className="mt-2 text-xs text-slate-600 line-clamp-2 leading-relaxed">
                          {evt.description}
                        </p>
                      </div>

                      {/* Time & Venue Footer */}
                      <div className="mt-5 pt-3.5 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                        {timeRange ? (
                          <span className="inline-flex items-center gap-1.5">
                            <ClockIcon className="h-3.5 w-3.5 text-gold-500" />
                            {timeRange}
                          </span>
                        ) : (
                          <span />
                        )}
                        <span className="inline-flex items-center gap-1 font-medium text-navy-800">
                          <MapPinIcon className="h-3.5 w-3.5 text-slate-400" />
                          {evt.venue || 'FRCC'}
                        </span>
                      </div>
                    </div>
                  </Link>
                </Reveal>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export default EventsPage;
