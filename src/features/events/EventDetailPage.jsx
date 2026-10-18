// ---------------------------------------------------------------------------
// /src/features/events/EventDetailPage.jsx — Public Event Details Page
// Image-only hero, date, time, venue, description, back link, and non-member CTA.
// ---------------------------------------------------------------------------

import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useApp } from '../../app/store/AppContext.jsx';
import { getEvent } from '../../api/events.js';
import { getCategoryLabel, getCategoryBadgeClass } from '../../data/events.js';
import { IMAGES, heroSrc } from '../../config/images.js';
import { SmartImage } from '../../components/ui/media.jsx';
import { formatDMY } from '../../utils/dates.js';
import {
  CalendarIcon,
  ClockIcon,
  MapPinIcon,
  ChevronLeftIcon,
  MembershipIcon,
  CheckIcon,
} from '../../components/ui/icons.jsx';

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

export function EventDetailPage() {
  const { id } = useParams();
  const { isMember } = useApp();
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function loadEvent() {
      setLoading(true);
      try {
        const item = await getEvent(id);
        if (!cancelled) setEvent(item);
      } catch (err) {
        console.warn('[EventDetailPage] Error loading event:', err);
        if (!cancelled) setEvent(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    loadEvent();
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center py-20">
        <div className="text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-gold-500 border-t-transparent" />
          <p className="mt-3 text-sm text-slate-500">Loading event details…</p>
        </div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center py-20">
        <div className="card text-center max-w-md mx-auto p-8">
          <h2 className="font-display text-xl font-bold text-navy-900">Event Not Found</h2>
          <p className="mt-2 text-sm text-slate-600">The event you are looking for may have concluded or is no longer active.</p>
          <div className="mt-6">
            <Link to="/events" className="btn-base bg-navy-900 text-white hover:bg-navy-800 px-5 py-2.5 text-sm font-semibold">
              Back to all events
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const slotKey = event.imageSlot || `event-${event.id}`;
  const imageObj = event.image_url
    ? { src: event.image_url, alt: event.title }
    : (IMAGES[slotKey] || { slot: slotKey, src: heroSrc(slotKey) || IMAGES.membershipEvents?.src, alt: event.title });

  const badgeClass = getCategoryBadgeClass(event.category);
  const timeFormatted = formatEventTimeRange(event.start_time, event.end_time);

  return (
    <div className="min-h-screen bg-slate-50">
      {/* 1 · Image-only Hero with Back Navigation */}
      <section className="relative h-72 sm:h-96 w-full overflow-hidden bg-navy-950">
        <SmartImage
          image={imageObj}
          aspect="16 / 9"
          className="h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-navy-950 via-navy-950/40 to-black/30" />

        {/* Back Link and Badges Floating Over Hero */}
        <div className="container-x absolute inset-0 z-10 flex flex-col justify-between py-6">
          <div>
            <Link
              to="/events"
              className="inline-flex items-center gap-1.5 rounded-full bg-black/40 px-3.5 py-1.5 text-xs font-semibold text-white backdrop-blur transition hover:bg-black/60"
            >
              <ChevronLeftIcon className="h-4 w-4" />
              Back to all events
            </Link>
          </div>

          <div>
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span className={`tag ${badgeClass} !text-xs !py-1 !px-3 font-semibold shadow`}>
                {getCategoryLabel(event.category)}
              </span>
              {event.isSample && (
                <span className="rounded-full bg-slate-900/80 px-2.5 py-0.5 text-[10px] font-semibold tracking-wider uppercase text-slate-200 backdrop-blur border border-white/20">
                  Sample Event
                </span>
              )}
            </div>
            <h1 className="font-display text-2xl sm:text-4xl font-bold text-white max-w-3xl leading-tight">
              {event.title}
            </h1>
          </div>
        </div>
      </section>

      {/* 2 · Event Info, Description & Sidebar */}
      <div className="container-x py-10 sm:py-14">
        <div className="grid gap-10 lg:grid-cols-[1fr_360px]">
          {/* Main Description Column */}
          <div>
            {/* Highlights Metadata Bar */}
            <div className="card grid grid-cols-1 sm:grid-cols-3 gap-4 border border-slate-200/90 !p-5 mb-8">
              <div className="flex items-center gap-3">
                <span aria-hidden className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gold-50 text-gold-600">
                  <CalendarIcon className="h-5 w-5" />
                </span>
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Date</p>
                  <p className="text-sm font-semibold text-navy-900 mt-0.5">{formatDMY(event.event_date)}</p>
                </div>
              </div>

              {timeFormatted && (
                <div className="flex items-center gap-3 border-t sm:border-t-0 sm:border-l border-slate-100 pt-3 sm:pt-0 sm:pl-4">
                  <span aria-hidden className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-navy-50 text-navy-800">
                    <ClockIcon className="h-5 w-5 text-gold-600" />
                  </span>
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Time</p>
                    <p className="text-sm font-semibold text-navy-900 mt-0.5">{timeFormatted}</p>
                  </div>
                </div>
              )}

              <div className="flex items-center gap-3 border-t sm:border-t-0 sm:border-l border-slate-100 pt-3 sm:pt-0 sm:pl-4">
                <span aria-hidden className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gold-50 text-gold-600">
                  <MapPinIcon className="h-5 w-5" />
                </span>
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Venue</p>
                  <p className="text-sm font-semibold text-navy-900 mt-0.5">{event.venue || 'FRCC'}</p>
                </div>
              </div>
            </div>

            {/* Description Section */}
            <div className="card !p-8 border border-slate-200/90">
              <h2 className="font-display text-xl font-bold text-navy-900 border-b border-slate-100 pb-4">
                About this event
              </h2>
              <div className="mt-6 text-sm text-slate-700 leading-relaxed whitespace-pre-line space-y-4">
                <p>{event.description}</p>
              </div>
            </div>
          </div>

          {/* Right Sidebar: "Become a member" box for non-members */}
          <div className="space-y-6">
            {!isMember && (
              <div className="card bg-gradient-to-b from-navy-900 to-navy-950 text-white !p-7 shadow-xl border border-gold-500/30">
                <div className="flex items-center gap-2.5 text-gold-400">
                  <MembershipIcon className="h-6 w-6" />
                  <span className="text-xs font-bold uppercase tracking-widest">FRCC Privileges</span>
                </div>
                <h3 className="font-display text-2xl font-bold mt-3 text-white">
                  Become a Member
                </h3>
                <p className="mt-2 text-xs text-slate-300 leading-relaxed">
                  Join the Film Recreation &amp; Cultural Centre for lifetime campus access, exclusive invitations, and preferred booking rates.
                </p>

                <ul className="mt-5 space-y-2.5 text-xs text-slate-200">
                  <li className="flex items-center gap-2">
                    <CheckIcon className="h-4 w-4 text-gold-400 shrink-0" />
                    <span>30% discount on rooms, halls and campus dining</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckIcon className="h-4 w-4 text-gold-400 shrink-0" />
                    <span>Free Health card with 30% diagnostic savings</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckIcon className="h-4 w-4 text-gold-400 shrink-0" />
                    <span>Connect with film lovers &amp; industry practitioners</span>
                  </li>
                </ul>

                <div className="mt-6 pt-5 border-t border-white/10">
                  <Link
                    to="/membership"
                    className="btn-base bg-gold-500 text-navy-950 hover:bg-gold-400 w-full justify-center py-3 text-sm font-semibold inline-flex items-center"
                  >
                    Join now
                  </Link>
                </div>
              </div>
            )}

            {/* Quick Details Card */}
            <div className="card !p-6 border border-slate-200/90 text-sm">
              <h4 className="font-semibold text-navy-900 mb-3">Event Inquiries</h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                For questions regarding schedule, venue accessibility, or attendance guidelines, contact our front desk at <span className="font-medium text-navy-900">+91 78936 16262</span>.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default EventDetailPage;
