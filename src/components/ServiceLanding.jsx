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
import { ROUTES } from '../config/routes.js';
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
  { key: 'stay', to: ROUTES.stay, label: 'Stay', detail: 'Rooms and suites across campus', image: IMAGES.exploreMoreHotel },
  { key: 'halls', to: ROUTES.halls, label: 'Halls', detail: 'Weddings, conventions and private dining', image: IMAGES.exploreMoreHall },
  { key: 'parking', to: ROUTES.parking, label: 'Parking', detail: 'Secure zoned parking with EV charging', image: IMAGES.exploreMoreParking },
  { key: 'activities', to: ROUTES.activities, label: 'Activities', detail: 'Eleven sports, courts, and pool sessions', image: IMAGES.exploreMoreActivities },
  { key: 'membership', to: ROUTES.membership, label: 'Membership', detail: 'Lifetime enrollment and club privileges', image: IMAGES.exploreMoreMembership },
];

const ACTIVITY_FILTER_MAP = {
  pool: (g) => g.group === 'pool' || g.category === 'water' || g.id === 'swimming-pool' || g.id.includes('pool'),
  court: (g) => g.group === 'court' || ['badminton', 'tennis', 'table-tennis', 'squash'].includes(g.id),
  turf: (g) => g.group === 'turf' || ['cricket', 'football', 'volleyball', 'basketball', 'golf'].includes(g.id),
  wellness: (g) =>
    g.group === 'wellness' ||
    g.category === 'fitness' ||
    ['luxury-gym', 'kids-play-area', 'chess', 'carom', 'card-room'].includes(g.id),
};

export function ServiceLanding({ service = 'stay', hero }) {
  const { user, isMember, membership, pushToast } = useApp();
  const navigate = useNavigate();
  const location = useLocation();
  const { openAuthPrompt } = useAuthModal();

  const activeMemberCode = membership?.memberCode || membership?.memberId || user?.memberId || user?.memberCode || '';
  const hasActiveMembership = Boolean(
    (membership && (membership.memberId || membership.memberCode) && membership.status !== 'Cancelled') ||
    (user && user.isMember && (!user.isDemo || (membership && (membership.memberId || membership.memberCode)))) ||
    (isMember && Boolean(activeMemberCode))
  );

  useEffect(() => {
    if (location.state?.authPrompt && location.state?.from && !user) {
      openAuthPrompt(location.state.from);
      // Immediately clear authPrompt from history state so closing/re-rendering never loops
      navigate(location.pathname + location.search, { replace: true, state: {} });
    }
  }, [location.state, user, openAuthPrompt, navigate, location.pathname, location.search]);

  function handleActionClick(e, to) {
    if (!user) {
      e.preventDefault();
      openAuthPrompt(to);
      return;
    }
    if (normService === 'membership' && hasActiveMembership) {
      e.preventDefault();
      pushToast('You already have an active FRCC Membership!', 'info');
      navigate('/membership/dashboard');
      return;
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
        filtered = filtered.filter(
          (h) => h.roomType === hallFilter || h.name === hallFilter || h.type === hallFilter || h.name.includes(hallFilter)
        );
      }
      return filtered.map((h) => {
        const typeLabel =
          h.type === 'boardroom' ? 'Executive Boardroom' : h.type === 'ac' ? 'Central AC' : 'Non AC / Natural Air';
        const capacityLabel = `Capacity: ${h.capacity?.toLocaleString('en-IN')} guests`;
        return {
          id: h.id,
          name: h.name,
          image: (h.image ? { src: h.image, alt: h.name, name: h.name } : IMAGES[h.id]) || IMAGES.hallFunction,
          facts: [
            capacityLabel,
            `Type: ${typeLabel}`,
            h.priceNote ? `Dining: ${h.priceNote}` : (h.amenities?.[0] || 'AV Systems & Stage'),
          ],
          priceDisplay: formatInr(h.price || h.prices?.fullDay || 50000),
          priceUnit: (h.pricingUnit === 'per-plate' || h.pricingUnit === 'per-person') ? ' / plate' : h.pricingUnit === 'per-hour' ? ' / hour' : ' / day',


          buttonLabel: 'Book Hall',
          to: `${HALL_BOOKING_URL}?type=${encodeURIComponent(h.roomType || h.name)}`,
        };
      });
    }

    if (normService === 'parking') {
      return parkingZones.map((z) => {
        const campusKey = z.campus || (z.areaId === 'hyd' ? 'hyderabad' : 'vijayawada');
        const cityName = campusKey === 'hyderabad' ? 'Hyderabad' : 'Vijayawada';
        const campusId = z.areaId || (campusKey === 'hyderabad' ? 'hyd' : 'vja');
        const zoneId = z.id;
        const campusLabel = z.subtitle || z.campusName || (campusId === 'hyd' ? 'Hyderabad Campus' : 'Vijayawada Campus');

        return {
          id: z.id,
          name: z.name,
          subtitle: campusLabel,
          image: IMAGES[z.id] || (campusId === 'hyd' ? IMAGES['hyd-basement'] || IMAGES.parkingSecurity : IMAGES['vja-multi-level'] || IMAGES.parkingEntry),
          facts: [
            `Total parking slots: ${z.spots || 150}`,
            `Supported vehicles: ${(z.vehicleTypes || ['Car', 'Bike']).join(', ')}`,
          ],
          priceDisplay: 'Free',
          priceUnit: '',
          locationId: z.locationId || (campusId === 'hyd' ? 'hyd-parking' : 'vja-parking'),
          locationName: campusLabel,
          buttonLabel: 'Book Parking',
          to: `/parking/book?campus_id=${campusId}&zone_id=${zoneId}&campus=${campusKey}&city=${encodeURIComponent(cityName)}`,
        };
      });
    }

    if (normService === 'activities') {
      let filtered = activityGames;
      if (activityFilter !== 'all') {
        const matcher = ACTIVITY_FILTER_MAP[activityFilter];
        if (matcher) {
          filtered = filtered.filter(matcher);
        } else {
          filtered = filtered.filter(
            (g) => g.category === activityFilter || g.group === activityFilter || g.id === activityFilter
          );
        }
      }
      return filtered.map((g) => {
        const gamePrice = g.price ?? g.pricePerSlot ?? g.priceFrom ?? 1500;
        const isFreeGame = Boolean(g.isFree || gamePrice === 0);
        const gameUnit = g.unit === 'per-session' ? 'session' : g.unit === 'per-hour' ? 'hour' : (g.unit || 'session');
        return {
          id: g.id,
          name: g.name,
          image: g.image || gameSlot(g.imageKey || g.id || g.name),
          facts: [
            `Category: ${g.category.toUpperCase()}`,
            g.tag || (g.id === 'luxury-gym' ? 'Cardio, strength, steam & sauna' : 'Indoor & Outdoor courts'),
            isFreeGame ? 'Pricing: Free (Complimentary)' : `Pricing: ₹${gamePrice.toLocaleString('en-IN')} / ${gameUnit}`,
          ],
          priceDisplay: isFreeGame ? 'Free' : formatInr(gamePrice),
          priceUnit: isFreeGame ? '' : ` / ${gameUnit}`,
          healthCardNote: !isFreeGame && healthCardDiscountPercent
            ? `Health card holders get ${healthCardDiscountPercent}% discount on games.`
            : null,
          buttonLabel: 'Book session',
          to: `/book/activity?item=${encodeURIComponent(g.id)}`,
          bookable: g.id != 'kids-play-area' && g.id != 'carom'
        };
      });
    }

    if (normService === 'membership') {
      return membershipPlans.map((p) => ({
        id: p.id,
        name: p.name,
        subtitle: p.subtitle,
        image: IMAGES[p.id] || IMAGES.heroMembership,
        facts: [
          p.duration || 'Lifetime Enrollment',
          p.badge || 'Executive Access',
          'Access to Stay, Sports, Dining & Events',
        ],
        priceDisplay: formatInr(p.price),
        priceUnit: ' / lifetime',
        locationId: 'vja-club',
        locationName: 'FRCC Main Campus',
        buttonLabel: hasActiveMembership ? 'Active Member · View Dashboard' : 'Apply for membership',
        to: hasActiveMembership ? '/membership/dashboard' : `/membership/join?plan=${encodeURIComponent(p.id)}`,
      }));
    }

    return [];
  }, [normService, selectedArea, hallFilter, activityFilter, hasActiveMembership]);

  // 4. Determine Filter Chips
  const filterChips = useMemo(() => {
    if (normService === 'halls') {
      return [
        { id: 'all', label: 'All Spaces' },
        { id: 'Convention Hall', label: 'Convention Hall' },
        { id: 'Banquet Hall', label: 'Banquet Hall' },
        { id: 'Board Room', label: 'Board Rooms' },
      ];
    }
    if (normService === 'activities') {
      return [
        { id: 'all', label: 'All Activities' },
        { id: 'pool', label: 'Pool & Aquatic' },
        { id: 'court', label: 'Racket Courts' },
        { id: 'turf', label: 'Turf & Team' },
        { id: 'wellness', label: 'Wellness & Gym' },
      ];
    }
    return [];
  }, [normService]);

  // 5. Build dynamic "More to explore" links
  const moreExploreLinks = useMemo(() => {
    return ALL_EXPLORE_LINKS.filter((link) => link.key !== normService).slice(0, 3);
  }, [normService]);

  return (
    <div className="bg-sand-50 min-h-screen">
      {/* 1 · Hero */}
      <ServiceHero service={heroService} overrides={hero} />

      {/* 2 · Main Options Section */}
      <section id="content" className="band-sand scroll-mt-24" aria-label="Available options">
        <div className="container-x section">
          {/* Section Heading & Subheading */}
          <div className="text-center max-w-xl mx-auto">
            <p className="eyebrow">Explore collection</p>
            <h2 className="h-section mt-2">
              {normService === 'stay' && 'Rooms & suites'}
              {normService === 'halls' && 'Celebration spaces'}
              {normService === 'parking' && 'Designated parking zones'}
              {normService === 'activities' && 'Sports & recreation'}
              {normService === 'membership' && 'Membership tiers'}
            </h2>
            <p className="mt-3 text-slate-600">
              {normService === 'stay' && 'Spacious suites and executive rooms with river views and private balconies.'}
              {normService === 'halls' && 'Centrally air-conditioned convention halls, banquets and boardrooms.'}
              {normService === 'parking' && 'Secure parking zones across campuses with automated entry and EV support.'}
              {normService === 'activities' && 'International standard courts, temperature-regulated pool, and open turfs.'}
              {normService === 'membership' && 'Select your tier to unlock access across sports, stay, and grand events.'}
            </p>
          </div>

          {/* Area Switcher Pills (If service has multiple areas) */}
          {hasAreas && (
            <div className="mt-8 flex flex-wrap items-center justify-center gap-2">
              {serviceAreas.map((area) => (
                <button
                  key={area.id}
                  type="button"
                  onClick={() => setSelectedArea(area.id)}
                  className={`rounded-full px-5 py-2 text-sm font-semibold transition-colors duration-150 ${
                    selectedArea === area.id
                      ? 'bg-navy-900 text-white shadow-sm'
                      : 'bg-white text-slate-700 hover:text-navy-900 border border-slate-200 hover:border-slate-300'
                  }`}
                >
                  {area.name}
                </button>
              ))}
            </div>
          )}

          {/* Filter Chips (Halls or Activities) */}
          {filterChips.length > 0 && (
            <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
              {filterChips.map((chip) => {
                const isActive =
                  normService === 'halls' ? hallFilter === chip.id : activityFilter === chip.id;
                return (
                  <button
                    key={chip.id}
                    type="button"
                    onClick={() => {
                      if (normService === 'halls') {
                        setHallFilter(chip.id);
                      } else {
                        setActivityFilter(chip.id);
                      }
                    }}
                    className={`rounded-full px-4 py-1.5 text-xs font-semibold transition-colors duration-150 ${
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
          <div
            className={
              cardItems.length === 1
                ? 'mt-6 flex justify-center'
                : cardItems.length === 2
                  ? 'mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 max-w-4xl mx-auto'
                  : normService === 'halls'
                    ? 'mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3'
                    : 'mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3'
            }
          >
            {cardItems.map((item) => {
              const isCompact = normService === 'halls';
              return (
                <article
                  key={item.id}
                  className={`group flex flex-col overflow-hidden rounded-2xl border border-navy-900/10 bg-white transition-colors duration-150 hover:border-gold-500 shadow-sm ${
                    cardItems.length === 1 ? 'w-full max-w-md' : ''
                  }`}
                >
                  <div className={`${isCompact ? 'h-36 sm:h-40' : 'h-48'} overflow-hidden bg-slate-100`}>
                    <SmartImage
                      image={item.image}
                      aspect={isCompact ? '16 / 9' : '16 / 10'}
                      sizes="(min-width: 1024px) 30vw, (min-width: 640px) 45vw, 92vw"
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                  </div>
                  <div className={`flex flex-1 flex-col ${isCompact ? 'p-4 sm:p-5' : 'p-5 sm:p-6'}`}>
                    <h3 className={`font-display ${isCompact ? 'text-lg' : 'text-xl'} font-bold text-navy-900`}>
                      {item.name}
                    </h3>

                    {item.subtitle && (
                      <p className="mt-0.5 text-xs font-medium text-slate-500">{item.subtitle}</p>
                    )}

                    {item.locationName && (
                      <div className="mt-1">
                        {item.googleMapsUrl ? (
                          <a
                            href={item.googleMapsUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-slate-500 hover:text-navy-950 font-normal"
                          >
                            {item.locationName}
                          </a>
                        ) : (
                          <LocationTrigger
                            locationId={item.locationId}
                            className="text-xs text-slate-500 hover:text-navy-950 font-normal"
                            showIcon={true}
                            iconClassName="mt-0.5 h-3 w-3 shrink-0 text-gold-500"
                          >
                            {item.locationName}
                          </LocationTrigger>
                        )}
                      </div>
                    )}

                    {/* 2 to 3 key facts */}
                    <ul
                      className={`${
                        isCompact ? 'mt-2.5 space-y-1.5 pt-2' : 'mt-3.5 space-y-2 pt-3'
                      } flex-1 border-t border-slate-100 text-xs text-slate-600`}
                    >
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
                    <div
                      className={`${
                        isCompact ? 'mt-3 pt-2' : 'mt-5 pt-3'
                      } flex items-baseline justify-between border-t border-slate-100`}
                    >
                      <span className="text-xs text-slate-500 uppercase tracking-wider font-medium">Rate</span>
                      <div className="flex items-baseline gap-1">
                        <span
                          className={`font-display ${
                            isCompact ? 'text-xl' : 'text-2xl'
                          } font-bold text-navy-900`}
                        >
                          {item.priceDisplay}
                        </span>
                        {item.priceUnit && <span className="text-xs text-slate-500">{item.priceUnit}</span>}
                      </div>
                    </div>

                    {/* Gold Button */}
                    {item.bookable ? (
                      <div className={`${isCompact ? 'mt-3 pt-0.5' : 'mt-5 pt-1'}`}>
                        <Link
                          to={item.to}
                          onClick={(e) => handleActionClick(e, item.to)}
                          className={`btn-base bg-gold-500 text-navy-950 hover:bg-gold-400 w-full justify-center ${
                            isCompact ? 'py-2 text-xs sm:text-sm' : 'py-2.5 text-sm'
                          } font-semibold inline-flex items-center gap-1.5 transition-colors duration-150 shadow-sm`}
                        >
                          {item.buttonLabel}
                          <ArrowRightIcon className="h-4 w-4" />
                        </Link>
                      </div>
                    ) : (
                      <div className="h-0" />
                    )}
                  </div>
                </article>
              );
            })}
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
                {hasActiveMembership ? 'Your Club Privileges are Active' : FINAL_STRIP.title}
              </h2>
              <p className="mt-3 max-w-xl mx-auto text-slate-300 leading-relaxed text-sm sm:text-base">
                {hasActiveMembership
                  ? `You already have an active FRCC Lifetime Membership${activeMemberCode ? ` (#${activeMemberCode})` : ''}. View your digital cards or book facilities with 30% member savings.`
                  : FINAL_STRIP.description}
              </p>
              <div className="mt-8 flex justify-center">
                <Link
                  to={hasActiveMembership ? '/membership/dashboard' : FINAL_STRIP.buttonLink}
                  onClick={(e) => handleActionClick(e, hasActiveMembership ? '/membership/dashboard' : FINAL_STRIP.buttonLink)}
                  className="btn-base bg-gold-500 text-navy-950 hover:bg-gold-400 px-8 py-3.5 text-base font-semibold inline-flex items-center gap-2"
                >
                  {hasActiveMembership ? 'View Member Dashboard' : FINAL_STRIP.buttonText}
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
                onClick={() => { if (import.meta.env.DEV) console.info("[tile]", item.label, item.to); }}
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
