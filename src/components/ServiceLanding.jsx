// ---------------------------------------------------------------------------
// /src/components/ServiceLanding.jsx — Unified Service Landing Engine
// Powering Stay, Halls, Parking, Activities, and Membership landing pages.
// ---------------------------------------------------------------------------

import { useState, useMemo, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useApp } from '../app/store/AppContext.jsx';
import { useAuthModal } from '../app/context/AuthModalContext.jsx';
import { ServiceHero } from './ServiceHero.jsx';
import { SmartImage } from './ui/media.jsx';
import { IMAGES, roomSlot, gameSlot } from '../config/images.js';
import { areas as hotelAreas, rooms as hotelRooms } from '../data/hotel.js';
import { areas as hallAreas, halls as hallItems } from '../data/halls.js';
import { areas as parkingAreas, zones as parkingZones } from '../data/parking.js';
import { games as activityGames } from '../data/activities.js';
import { formatInr } from '../utils/pricing.js';
import { HALL_BOOKING_URL, PARKING_BOOKING_URL } from '../config/redirects.js';
import { healthCardDiscountPercent } from '../config/site.js';
import {
  plans as membershipPlans,
  BENEFITS_DATA,
  HOW_IT_WORKS,
  FINAL_STRIP,
} from '../data/membership.js';
import {
  ArrowRightIcon,
  CheckIcon,
  GamepadIcon,
  UsersIcon,
  HotelIcon,
  CalendarIcon,
} from './ui/icons.jsx';
import { LocationTrigger } from './location/LocationTrigger.jsx';

const BENEFIT_ICONS = {
  GamepadIcon,
  UsersIcon,
  HotelIcon,
  CalendarIcon,
};

const ALL_EXPLORE_LINKS = [
  { key: 'stay', to: '/stay', label: 'Stay', detail: 'Rooms and suites across campus', image: IMAGES.exploreMoreHotel },
  { key: 'halls', to: '/halls', label: 'Halls', detail: 'Weddings, conventions and private dining', image: IMAGES.exploreMoreHall },
  { key: 'parking', to: '/parking', label: 'Parking', detail: 'Secure zoned parking with EV charging', image: IMAGES.exploreMoreParking },
  { key: 'activities', to: '/activities', label: 'Activities', detail: 'Eleven sports, courts, and pool sessions', image: IMAGES.exploreMoreActivities },
  { key: 'membership', to: '/membership', label: 'Membership', detail: 'Lifetime enrollment and club privileges', image: IMAGES.exploreMoreMembership },
];

export function ServiceLanding({ service = 'stay', hero }) {
  const { user } = useApp();
  const navigate = useNavigate();
  const location = useLocation();
  const { openAuthPrompt } = useAuthModal();

  useEffect(() => {
    if (location.state?.authPrompt && location.state?.from && !user) {
      openAuthPrompt(location.state.from);
    }
  }, [location.state, user, openAuthPrompt]);

  function handleActionClick(e, to) {
    if (!user) {
      e.preventDefault();
      openAuthPrompt(to);
    }
  }

  // Normalize service key ('hotel' -> 'stay', 'hall' -> 'halls')
  const normService = service === 'hotel' ? 'stay' : service === 'hall' ? 'halls' : service;
  const heroService = normService === 'halls' ? 'hall' : normService;

  // 1. Determine Areas (Only if data has more than one area)
  const serviceAreas = useMemo(() => {
    if (normService === 'stay') return hotelAreas;
    if (normService === 'halls') return hallAreas;
    if (normService === 'parking') return parkingAreas;
    return [];
  }, [normService]);

  const hasAreas = serviceAreas && serviceAreas.length > 1;
  const [selectedArea, setSelectedArea] = useState(() => (hasAreas ? serviceAreas[0]?.id : ''));

  // 2. Filter Chips (for Halls and Activities)
  const [hallFilter, setHallFilter] = useState('all');
  const [activityFilter, setActivityFilter] = useState('all');

  // 3. Option Cards Data Builder
  const cardItems = useMemo(() => {
    if (normService === 'stay') {
      const filtered = hotelRooms.filter((r) => !selectedArea || r.areaId === selectedArea);
      return filtered.map((r) => ({
        id: r.id,
        name: r.name,
        image: r.image || roomSlot(r.name || r.type),
        facts: [
          r.bedType || 'King Bed',
          r.view || 'Serene Views',
          `${r.sizeSqft} sq ft · Max ${r.maxGuests} guests`,
        ],
        priceDisplay: formatInr(r.pricePerNight),
        priceUnit: ' / night',
        locationId: 'vja-hotel',
        locationName: 'Vijayawada Campus · NTR District',
        buttonLabel: 'Select room',
        to: `/book/hotel?item=${encodeURIComponent(r.id)}`,
      }));
    }

    if (normService === 'halls') {
      let filtered = hallItems.filter((h) => !selectedArea || h.areaId === selectedArea);
      if (hallFilter !== 'all') {
        filtered = filtered.filter((h) => h.type === hallFilter);
      }
      return filtered.map((h) => {
        const typeLabel =
          h.type === 'ac' ? 'Central AC' : h.type === 'boardroom' ? 'Executive Boardroom' : 'Non AC / Natural Air';
        const capacityLabel = h.pricingUnit === 'per-person'
          ? `Capacity: ${h.capacityMin} – ${h.capacityMax?.toLocaleString('en-IN')} guests`
          : `Seats ${h.capacity} guests`;
        return {
          id: h.id,
          name: h.name,
          image: IMAGES[h.id] || IMAGES.hallFunction,
          facts: [
            capacityLabel,
            `Type: ${typeLabel}`,
            h.priceNote ? `Dining: ${h.priceNote}` : (h.amenities?.[0] || 'AV Systems & Stage'),
          ],
          priceDisplay: formatInr(h.price || h.prices?.fullDay || 50000),
          priceUnit: h.pricingUnit === 'per-person' ? ' / person (with food)' : h.pricingUnit === 'per-hour' ? ' / hour' : ' / day',
          locationId: 'vja-halls',
          locationName: 'Vijayawada Campus · Convention Block',
          buttonLabel: 'Book Hall',
          to: HALL_BOOKING_URL,
        };
      });
    }

    if (normService === 'parking') {
      const filtered = parkingZones.filter((z) => !selectedArea || z.areaId === selectedArea);
      return filtered.map((z) => ({
        id: z.id,
        name: z.name,
        image: IMAGES[z.id] || IMAGES.parkingEntry,
        facts: [
          `${z.spots} parking slots`,
          `Vehicles: ${(z.vehicleTypes || []).join(', ').toUpperCase()}`,
          `Hours: ${z.operatingHours || '24x7'}`,
        ],
        priceDisplay: z.isFree || z.prices?.hour === 0 ? 'Free' : formatInr(z.prices?.hour || 0),
        priceUnit: z.isFree || z.prices?.hour === 0 ? '' : ' / hr',
        locationId: 'vja-parking',
        locationName: 'Vijayawada Campus · Automated Parking',
        buttonLabel: 'Book Parking',
        to: PARKING_BOOKING_URL,
      }));
    }

    if (normService === 'activities') {
      let filtered = activityGames;
      if (activityFilter !== 'all') {
        filtered = filtered.filter(
          (g) => g.category === activityFilter || g.subCategory === activityFilter
        );
      }
      return filtered.map((g) => {
        const priceDisplay = g.priceFrom
          ? `${formatInr(g.priceFrom)} – ${formatInr(g.priceTo)}`
          : formatInr(g.pricePerSlot || g.price);
        const priceUnit = g.pricingUnit === 'per-hour'
          ? ' / hour'
          : g.unit === 'month' || g.pricingUnit === 'per-month'
            ? ' / month'
            : g.pricingUnit === 'per-session'
              ? ' / session'
              : ' / slot';
        return {
          id: g.id,
          name: g.name,
          image: gameSlot(g.imageKey),
          facts: [
            `${g.slotMinutes} min session duration`,
            `Capacity: Up to ${g.maxPlayers} players`,
            `Operating hours: ${g.openFrom} – ${g.openTo}`,
          ],
          priceDisplay,
          priceUnit,
          locationId: 'vja-activities',
          locationName: 'Vijayawada Campus · Sports Complex',
          buttonLabel: 'Book game',
          to: `/book/activities/process?item=${encodeURIComponent(g.id)}&game=${encodeURIComponent(g.id)}`,
        };
      });
    }

    if (normService === 'membership') {
      return membershipPlans.map((p) => ({
        id: p.id,
        name: p.name,
        image: IMAGES[p.imageSlot] || IMAGES.serviceMembership,
        facts: p.benefits || [
          '30% discount on every booking',
          `Health card: ${healthCardDiscountPercent}% discount at collaborating diagnostic centres`,
          'Membership ID card and Health card',
        ],
        priceDisplay: formatInr(p.price || p.amount),
        priceUnit: ' (one-time)',
        healthCardNote: p.healthCardNote,
        locationId: 'vja-membership',
        locationName: 'Vijayawada Campus · Member Relations Desk',
        buttonLabel: 'Join now',
        to: `/membership/join?item=${encodeURIComponent(p.id)}&plan=${encodeURIComponent(p.id)}`,
      }));
    }

    return [];
  }, [normService, selectedArea, hallFilter, activityFilter]);

  // Section title & description
  const sectionMeta = useMemo(() => {
    switch (normService) {
      case 'stay':
        return {
          eyebrow: 'Accommodations',
          title: 'Select your room type',
          desc: 'Relax in well-appointed rooms and suites with complimentary breakfast, pool, and WiFi access.',
        };
      case 'halls':
        return {
          eyebrow: 'Event Spaces',
          title: 'Select convention or function hall',
          desc: 'Host grand weddings, summits, or executive board meetings with full AC and technical support.',
        };
      case 'parking':
        return {
          eyebrow: 'Campus Access',
          title: 'Select parking zone',
          desc: 'Reserve covered or open parking with EV charging and 24/7 attendant security.',
        };
      case 'activities':
        return {
          eyebrow: 'Sports & Recreation',
          title: 'Select activity or game',
          desc: 'Book coached batches, tennis courts, football grounds, indoor games, and pool slots.',
        };
      case 'membership':
        return {
          eyebrow: 'Membership Tiers',
          title: 'Choose your lifetime plan',
          desc: 'One lifetime membership. Member rates across all hotel rooms, halls, parking, and sports.',
        };
      default:
        return { eyebrow: 'Explore', title: 'Available Options', desc: 'Choose your preferred option below.' };
    }
  }, [normService]);

  // More to explore 3 links
  const moreExploreLinks = useMemo(() => {
    return ALL_EXPLORE_LINKS.filter((item) => item.key !== normService).slice(0, 3);
  }, [normService]);

  return (
    <div className="bg-cream/30 min-h-screen">
      {/* 1 · Service Hero (always kept at the top) */}
      {hero || <ServiceHero service={heroService} />}

      {/* 2 · Main Section */}
      <section className="band-white scroll-mt-24" aria-label={sectionMeta.title}>
        <div className="container-x section">
          {/* Header */}
          <div className="max-w-2xl">
            <p className="eyebrow">{sectionMeta.eyebrow}</p>
            <h1 className="h-section mt-2">{sectionMeta.title}</h1>
            <p className="mt-3 text-slate-600">{sectionMeta.desc}</p>
          </div>

          {/* Area tabs (ONLY if data has more than one area) */}
          {hasAreas && (
            <div className="mt-8 border-b border-slate-200 pb-4">
              <span className="text-xs uppercase tracking-wider text-slate-500 font-semibold block mb-2.5">
                Select Campus Location
              </span>
              <div className="flex flex-wrap items-center gap-2" role="tablist">
                {serviceAreas.map((area) => {
                  const isActive = selectedArea === area.id;
                  return (
                    <button
                      key={area.id}
                      type="button"
                      role="tab"
                      aria-selected={isActive}
                      onClick={() => setSelectedArea(area.id)}
                      className={`px-5 py-2.5 rounded-full text-sm font-semibold transition-colors duration-150 ${
                        isActive
                          ? 'bg-navy-900 text-white shadow-sm'
                          : 'bg-white text-slate-700 hover:text-navy-900 hover:bg-slate-50 border border-slate-300'
                      }`}
                    >
                      {area.name}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Filter Chips for Halls */}
          {normService === 'halls' && (
            <div className="mt-6 flex flex-wrap items-center gap-2">
              <span className="text-xs text-slate-500 font-medium mr-1">Type:</span>
              {[
                { id: 'all', label: 'All Venues' },
                { id: 'ac', label: 'AC' },
                { id: 'non-ac', label: 'Non AC' },
                { id: 'boardroom', label: 'Board room' },
              ].map((chip) => {
                const isActive = hallFilter === chip.id;
                return (
                  <button
                    key={chip.id}
                    type="button"
                    onClick={() => setHallFilter(chip.id)}
                    className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-colors duration-150 ${
                      isActive
                        ? 'bg-gold-500 text-navy-950 shadow-sm'
                        : 'bg-white text-slate-600 hover:text-navy-900 border border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    {chip.label}
                  </button>
                );
              })}
            </div>
          )}

          {/* Filter Chips for Activities */}
          {normService === 'activities' && (
            <div className="mt-6 flex flex-wrap items-center gap-2">
              <span className="text-xs text-slate-500 font-medium mr-1">Category:</span>
              {[
                { id: 'all', label: 'All' },
                { id: 'indoor', label: 'Indoor' },
                { id: 'outdoor', label: 'Outdoor' },
                { id: 'water', label: 'Water' },
                { id: 'fitness', label: 'Fitness' },
              ].map((chip) => {
                const isActive = activityFilter === chip.id;
                return (
                  <button
                    key={chip.id}
                    type="button"
                    onClick={() => setActivityFilter(chip.id)}
                    className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-colors duration-150 ${
                      isActive
                        ? 'bg-gold-500 text-navy-950 shadow-sm'
                        : 'bg-white text-slate-600 hover:text-navy-900 border border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    {chip.label}
                  </button>
                );
              })}
            </div>
          )}

          {/* 3 · Option Cards Grid */}
          <div className={cardItems.length === 1 ? "mt-8 flex justify-center" : "mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3"}>
            {cardItems.map((item) => (
              <article
                key={item.id}
                className={`group flex flex-col overflow-hidden rounded-2xl border border-navy-900/10 bg-white transition-colors duration-150 hover:border-gold-500 shadow-sm ${cardItems.length === 1 ? 'w-full max-w-md' : ''}`}
              >
                <div className="h-48 overflow-hidden bg-slate-100">
                  <SmartImage
                    image={item.image}
                    aspect="16 / 10"
                    sizes="(min-width: 1024px) 30vw, (min-width: 640px) 45vw, 92vw"
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                </div>
                <div className="flex flex-1 flex-col p-5 sm:p-6">
                  <h3 className="font-display text-xl font-bold text-navy-900">{item.name}</h3>

                  {item.locationName && (
                    <div className="mt-1">
                      <LocationTrigger
                        locationId={item.locationId}
                        className="text-xs text-slate-500 hover:text-navy-950 font-normal"
                        showIcon={true}
                        iconClassName="mt-0.5 h-3 w-3 shrink-0 text-gold-500"
                      >
                        {item.locationName}
                      </LocationTrigger>
                    </div>
                  )}

                  {/* 2 to 3 key facts */}
                  <ul className="mt-3.5 flex-1 space-y-2 border-t border-slate-100 pt-3 text-xs text-slate-600">
                    {item.facts.map((fact, idx) => (
                      <li key={idx} className="flex items-center gap-2">
                        <span className="h-1.5 w-1.5 rounded-full bg-gold-500 shrink-0" />
                        <span>{fact}</span>
                      </li>
                    ))}
                  </ul>

                  {item.healthCardNote && (
                    <p className="mt-3 rounded-lg bg-amber-50/80 border border-amber-200/60 p-2.5 text-[11px] text-amber-900 leading-tight">
                      {item.healthCardNote}
                    </p>
                  )}

                  {/* Price */}
                  <div className="mt-5 flex items-baseline justify-between border-t border-slate-100 pt-3">
                    <span className="text-xs text-slate-500 uppercase tracking-wider font-medium">Rate</span>
                    <div className="flex items-baseline gap-1">
                      <span className="font-display text-2xl font-bold text-navy-900">{item.priceDisplay}</span>
                      {item.priceUnit && <span className="text-xs text-slate-500">{item.priceUnit}</span>}
                    </div>
                  </div>

                  {/* Gold Button */}
                  <div className="mt-5 pt-1">
                    <Link
                      to={item.to}
                      onClick={(e) => handleActionClick(e, item.to)}
                      className="btn-base bg-gold-500 text-navy-950 hover:bg-gold-400 w-full justify-center py-2.5 text-sm font-semibold inline-flex items-center gap-1.5 transition-colors duration-150 shadow-sm"
                    >
                      {item.buttonLabel}
                      <ArrowRightIcon className="h-4 w-4" />
                    </Link>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* 4 · Membership Page Additional Sections */}
      {normService === 'membership' && (
        <>
          {/* Benefits tiles */}
          <section className="band-cream border-t border-slate-200/60" aria-label="Membership benefits">
            <div className="container-x section">
              <div className="text-center max-w-xl mx-auto">
                <p className="eyebrow">Exclusive privileges</p>
                <h2 className="h-section mt-2">Member benefits</h2>
                <p className="mt-3 text-slate-600">
                  Privileges created for active lifestyles, celebrations, and restful escapes.
                </p>
              </div>

              <div className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
                {BENEFITS_DATA.map((b) => {
                  const Icon = BENEFIT_ICONS[b.icon] || CheckIcon;
                  return (
                    <div
                      key={b.id}
                      className="flex items-center gap-4 rounded-2xl border border-navy-900/10 bg-white p-5 transition-colors duration-150 hover:border-gold-500"
                    >
                      <span
                        aria-hidden="true"
                        className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-navy-50 text-gold-600"
                      >
                        <Icon className="h-6 w-6" />
                      </span>
                      <p className="font-semibold text-navy-900 text-sm leading-snug">{b.title}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>

          {/* How it works (4 steps) */}
          <section className="band-white border-t border-slate-200/60" aria-label="How membership works">
            <div className="container-x section">
              <div className="text-center max-w-xl mx-auto">
                <p className="eyebrow">Seamless onboarding</p>
                <h2 className="h-section mt-2">How it works</h2>
                <p className="mt-3 text-slate-600">
                  Four simple steps to activate your lifetime privileges.
                </p>
              </div>

              <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
                {HOW_IT_WORKS.map((item) => (
                  <div
                    key={item.step}
                    className="relative flex flex-col rounded-2xl border border-navy-900/10 bg-cream/40 p-6"
                  >
                    <span
                      aria-hidden="true"
                      className="grid h-10 w-10 place-items-center rounded-xl bg-navy-900 font-display text-sm font-bold text-gold-400"
                    >
                      {item.step}
                    </span>
                    <h3 className="font-display mt-4 text-lg font-bold text-navy-900">{item.title}</h3>
                    <p className="mt-2 text-sm text-slate-600 leading-relaxed">{item.description}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Final Join now strip */}
          <section className="band-dark" aria-label="Join call to action">
            <div className="container-x py-14 sm:py-16 text-center">
              <p className="eyebrow-on-dark">{FINAL_STRIP.eyebrow}</p>
              <h2 className="font-display text-3xl sm:text-4xl font-bold text-white mt-2">
                {FINAL_STRIP.title}
              </h2>
              <p className="mt-3 max-w-xl mx-auto text-slate-300 leading-relaxed text-sm sm:text-base">
                {FINAL_STRIP.description}
              </p>
              <div className="mt-8 flex justify-center">
                <Link
                  to={FINAL_STRIP.buttonLink}
                  onClick={(e) => handleActionClick(e, FINAL_STRIP.buttonLink)}
                  className="btn-base bg-gold-500 text-navy-950 hover:bg-gold-400 px-8 py-3.5 text-base font-semibold inline-flex items-center gap-2"
                >
                  {FINAL_STRIP.buttonText}
                  <ArrowRightIcon className="h-4 w-4" />
                </Link>
              </div>
            </div>
          </section>
        </>
      )}

      {/* 5 · Below the cards: "More to explore" row of 3 photo links */}
      <section className="band-cream border-t border-slate-200/60" aria-label="More to explore">
        <div className="container-x section">
          <h2 className="h-section">More to explore</h2>
          <p className="mt-2 text-sm text-slate-600">Discover other privileges and spaces across FRCC.</p>
          <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-3">
            {moreExploreLinks.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className="group relative block overflow-hidden rounded-2xl border border-navy-900/10 bg-white transition-colors duration-150 hover:border-gold-500 shadow-sm"
              >
                <div className="h-44 overflow-hidden">
                  <SmartImage
                    image={item.image}
                    aspect="16 / 10"
                    sizes="(min-width: 640px) 31vw, 95vw"
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                </div>
                <div className="p-5">
                  <h3 className="font-display text-lg font-bold text-navy-900 group-hover:text-gold-600 transition-colors duration-150">
                    {item.label}
                  </h3>
                  <p className="mt-1 text-xs text-slate-500">{item.detail}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

export default ServiceLanding;
