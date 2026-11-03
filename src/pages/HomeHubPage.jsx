import { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useApp } from '../app/store/AppContext.jsx';
import { useMockQuery } from '../app/hooks/useMockQuery.js';
import { useLocationContext } from '../app/context/LocationContext.jsx';
import { Button } from '../components/ui/controls.jsx';
import {
  Card,
  SectionHeading,
  EmptyState,
  LoadingState,
  ErrorState,
  StatusTag,
} from '../components/ui/feedback.jsx';
import { Reveal } from '../components/ui/motion.jsx';
import { BookingCard } from '../components/BookingPanel.jsx';
import { SmartImage, ImageCaption } from '../components/ui/media.jsx';
import { ExperienceSection } from '../components/ui/explore.jsx';
import { HeroImage } from '../components/HeroImage.jsx';
import { ServiceHero } from '../components/ServiceHero.jsx';
import { IMAGES } from '../config/images.js';
import { SITE_INFO } from '../config/siteInfo.js';
import { healthCardDiscountPercent } from '../config/site.js';
import { LocationTrigger } from '../components/location/LocationTrigger.jsx';
import { firstNameOf, greetingFor } from '../utils/helpers.js';
import {
  ArrowRightIcon,
  BellIcon,
  CalendarIcon,
  ClockIcon,
  MapPinIcon,
  PhoneIcon,
  MailIcon,
  QrIcon,
  CheckIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from '../components/ui/icons.jsx';

// ---------------------------------------------------------------------------
// Member home — a personal dashboard-style homepage (NOT the public landing).
// Booking entry lives in <BookingBar /> (shared with the landing page, /book and
// the section landing pages).
// ---------------------------------------------------------------------------

// Eleven games → booking flow with the game pre-selected (?game=<id>).
const GAMES = [
  { id: 'badminton', name: 'Badminton', tag: 'Indoor', image: IMAGES.badminton },
  { id: 'tennis', name: 'Tennis', tag: 'Outdoor', image: IMAGES.tennis },
  { id: 'cricket', name: 'Cricket', tag: 'Outdoor', image: IMAGES.cricket },
  { id: 'table-tennis', name: 'Table Tennis', tag: 'Indoor', image: IMAGES['table-tennis'] },
  { id: 'volleyball', name: 'Volleyball', tag: 'Outdoor', image: IMAGES.volleyball },
  { id: 'chess', name: 'Chess', tag: 'Indoor', image: IMAGES.chess },
  { id: 'carom', name: 'Carom', tag: 'Indoor', image: IMAGES.carom },
  { id: 'golf', name: 'Golf', tag: 'Outdoor', image: IMAGES.golf },
  { id: 'swimming-pool', name: 'Swimming Pool', tag: 'Outdoor', image: IMAGES['swimming-pool'] },
  { id: 'kids-play-area', name: 'Kids Play Area', tag: 'Indoor', image: IMAGES['kids-play-area'] },
  { id: 'football', name: 'Football', tag: 'Outdoor', image: IMAGES.football },
];

const FACILITY_GRID = [
  { title: 'Infinity Pool', line: 'Heated · 6 AM – 9 PM', image: IMAGES.facilityPool },
  { title: 'Fitness Floor', line: 'Strength & cardio · 5 AM – 11 PM', image: IMAGES.facilityGym },
  { title: 'Restaurant', line: 'Table d’hôte & à la carte', image: IMAGES.facilityRestaurant },
  { title: 'Gardens', line: 'Lawns, gazebos & decks', image: IMAGES.facilityGarden },
  { title: 'Spa Suite', line: 'Massage & sauna · by appointment', image: IMAGES.facilitySpa },
  { title: 'Members Lounge', line: 'Quiet corners · open till midnight', image: IMAGES.galleryLounge },
];

const OFFERS = [
  { date: 'SAT 14', title: 'Lakeside Food Fest', line: 'Forty stalls and sundown music on the garden lawns.', when: 'Sat · 5–10 PM', where: 'Garden lawns', tag: 'Open to all', tone: 'tag-green', image: IMAGES.eventFestival },
  { date: 'FRI 20', title: 'Open Badminton Night', line: 'Round-robin across four courts — rackets provided.', when: 'Fri · 7–10 PM', where: 'Courts 1–4', tag: 'Members only', tone: 'tag-gold', image: IMAGES.eventSports },
  { date: 'Ends 31', title: 'FRCC Member Privileges', line: `Enjoy 30% discount on every booking and ${healthCardDiscountPercent}% health card savings.`, when: 'All year', where: 'Membership desk', tag: 'Member offer', tone: 'tag-navy', image: IMAGES.membershipLounge },
];

export function HomeHubPage() {
  const { user, bookings, notifications, membership, isMember, pushToast } = useApp();
  const { locationId, setLocation, location: locationData } = useLocationContext();
  const { hash } = useLocation();
  const railRef = useRef(null);
  const [showAreaSelector, setShowAreaSelector] = useState(false);

  // Scroll to #facilities / #notices when navbar links navigate here.
  useEffect(() => {
    if (!hash) return;
    const el = document.getElementById(hash.replace('#', ''));
    if (el) {
      const t = setTimeout(() => el.scrollIntoView({ behavior: 'smooth', block: 'start' }), 60);
      return () => clearTimeout(t);
    }
  }, [hash]);

  // Overview data (upcoming bookings) with loading / error / empty states.
  const overview = useMockQuery(() => ({ upcoming: (bookings || []).slice(0, 3) }), { deps: [bookings.length] });

  function scrollRail(dir) {
    railRef.current?.scrollBy({ left: dir * 320, behavior: 'smooth' });
  }

  function viewAllNotices() {
    pushToast('Full notifications archive coming soon', 'error');
  }

  function handleAreaSelect(areaId) {
    setLocation(areaId);
    setShowAreaSelector(false);
    // Scroll to facilities section
    const el = document.getElementById('facilities');
    if (el) {
      setTimeout(() => el.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
    }
  }

  function handleChangeArea() {
    setShowAreaSelector(true);
    // Scroll to top to show area selector
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  const firstName = firstNameOf(user?.name);
  const greeting = greetingFor(new Date());
  const upcoming = overview.data?.upcoming || [];
  const latestNotices = (notifications || []).slice(0, 3);

  // Area cards data (Vijayawada & Hyderabad)
  const AREA_CARDS = [
    {
      id: 'vja',
      name: 'Vijayawada',
      state: 'Andhra Pradesh',
      image: IMAGES.facilityGym,
      tagline: 'Riverfront club and cultural centre',
      address: 'D.No. 24-29-210A, Durgapuram, Gulabithota Road, Vijayawada, NTR District, Andhra Pradesh – 520003',
      hotels: 2,
      halls: 2,
      activities: 12,
    },
    {
      id: 'hyd',
      name: 'Hyderabad',
      state: 'Telangana',
      image: IMAGES.facilityPool,
      tagline: 'Madhapur branch office',
      address: 'Second Floor, Samridhi Vasyam, D No 1/98/9/3/23, Capital Pk Rd, Above Axis bank Image gardens branch, Jaihind Enclave, Madhapur, Hyderabad, Telangana 500081',
      hotels: 0,
      halls: 0,
      activities: 12,
    },
  ];

  return (
    <div>
      {/* 1 · HERO — landing-style hero with slot hero-hub, full tabbed booking card, stat row */}
      <ServiceHero service="hub" />

      {/* 2a · BOOK YOUR EXPERIENCE — five portrait service tiles */}
      <ExperienceSection id="explore" />

      {/* 2b · WELCOME — plain heading below the hero */}
      <section className="band-white" aria-label="Welcome home">
        <div className="container-x section">
          <Reveal className="max-w-2xl">
            <p className="eyebrow">Member Home</p>
            <h1 className="h-display mt-3">{greeting}, {firstName}.</h1>
            <p className="lead mt-4 max-w-xl">
              Courts are lit till late, the pool is warm and your bookings are one tap away — here is your evening at a glance.
            </p>
            <div className="mt-5">
              {isMember ? (
                <span className="tag tag-gold">Member · {membership?.planName || 'Lifetime'}</span>
              ) : (
                <Link to="/membership" className="tag tag-gold transition hover:bg-gold-400 hover:text-navy-950">Become a Member</Link>
              )}
            </div>
            <div className="mt-7 flex flex-wrap items-center gap-3">
              <Link to="/profile/bookings">
                <Button variant="light" size="lg">View My Bookings</Button>
              </Link>
            </div>
          </Reveal>
        </div>
      </section>

      {/* Area Selector — hidden when single area, expandable when multiple areas */}
      {showAreaSelector && AREA_CARDS.length > 1 && (
        <section className="band-white" aria-label="Choose your area">
          <div className="container-x section">
            <Reveal>
              <SectionHeading
                eyebrow="Choose your area"
                title="Where would you like to visit?"
                sub="Select a city to explore facilities, book activities, and plan your visit."
                align="center"
              />
            </Reveal>
            <div className="mt-8 grid gap-6 sm:grid-cols-3">
              {AREA_CARDS.map((area, i) => (
                <Reveal key={area.id} delay={i * 100}>
                  <button
                    type="button"
                    onClick={() => handleAreaSelect(area.id)}
                    className="card card-hover h-full group relative overflow-hidden flex flex-col"
                    aria-label={`Select ${area.name}, ${area.state}`}
                  >
                    <div className="relative aspect-[4/3] overflow-hidden">
                      <SmartImage image={area.image} aspect="4 / 3" sizes="(min-width: 1024px) 30vw, 92vw" />
                      <div className="absolute inset-0 bg-gradient-to-t from-navy-950/70 via-navy-950/20 to-transparent" />
                      <div className="absolute inset-x-0 bottom-0 p-4">
                        <span className="tag tag-gold">{area.name}</span>
                        <span className="ml-2 tag tag-on-dark">{area.state}</span>
                      </div>
                    </div>
                    <div className="flex-1 flex flex-col p-6">
                      <h3 className="h-card group-hover:text-gold-600 transition">{area.name}</h3>
                      <p className="mt-1 text-sm text-slate-600 line-clamp-2">{area.tagline}</p>
                      <div className="mt-2">
                        <LocationTrigger
                          locationId={area.id === 'vja' ? 'vja-club' : 'hyd-office'}
                          address={area.address}
                          className="text-xs text-slate-500 hover:text-navy-950"
                        >
                          <span className="line-clamp-1">{area.address}</span>
                        </LocationTrigger>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-500">
                        <span className="flex items-center gap-1"><MapPinIcon className="h-3.5 w-3.5" /> {area.hotels} hotels</span>
                        <span className="flex items-center gap-1"><CalendarIcon className="h-3.5 w-3.5" /> {area.halls} halls</span>
                        <span className="flex items-center gap-1"><CalendarIcon className="h-3.5 w-3.5" /> {area.activities} activities</span>
                      </div>
                    </div>
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-navy-950/10 to-transparent p-4">
                      <span className="inline-flex items-center gap-1.5 font-semibold text-navy-900 group-hover:text-gold-600 transition">
                        Explore {area.name} <ArrowRightIcon className="h-4 w-4" />
                      </span>
                    </div>
                  </button>
                </Reveal>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* 3 · MY OVERVIEW */}
      <section className="band-cream" aria-label="My overview">
        <div className="container-x section grid gap-5 lg:grid-cols-2">
          {/* Upcoming bookings */}
          <Reveal>
            <div className="card h-full p-5 sm:p-6">
              <div className="flex items-center justify-between gap-3">
                <h2 className="h-card">Upcoming bookings</h2>
                <Link to="/profile/bookings" className="text-sm font-semibold text-gold-600 hover:underline">View all</Link>
              </div>
              <div className="mt-4">
                {overview.loading && <LoadingState label="Loading upcoming bookings…" rows={2} />}
                {!overview.loading && overview.error && <ErrorState message={overview.error} onRetry={overview.retry} />}
                {!overview.loading && !overview.error && upcoming.length === 0 && (
                  <EmptyState
                    title="Nothing booked yet"
                    body="Your next court, room or hall will appear here. Evenings fill fast — grab a slot tonight."
                    icon={CalendarIcon}
                    action={
                      <Link to="/book/activities">
                        <Button size="sm">Book a game <ArrowRightIcon className="h-4 w-4" /></Button>
                      </Link>
                    }
                  />
                )}
                {!overview.loading && !overview.error && upcoming.length > 0 && (
                  <ul className="space-y-3">
                    {upcoming.map((b) => (
                      <li key={b.id} className="flex items-start justify-between gap-3 rounded-xl border border-slate-200/80 p-3.5 transition hover:shadow-card">
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-semibold text-navy-900">{b.title}</span>
                          <span className="mt-0.5 flex items-center gap-1.5 text-xs text-slate-500">
                            <CalendarIcon className="h-3.5 w-3.5" /> {b.date}
                          </span>
                          <span className="mt-0.5 block font-mono text-[11px] text-slate-400">{b.id}</span>
                        </span>
                        <StatusTag status={b.status} />
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            
            </div>
          </Reveal>

          {/* Membership card */}
          <Reveal delay={110}>
            {isMember && membership ? (
              <div className="card h-full overflow-hidden !p-0">
                <div className="relative bg-gradient-to-br from-navy-800 via-navy-900 to-navy-950 p-5 text-white sm:p-6">
                  <div className="flex items-center justify-between gap-3">
                    <p className="eyebrow-on-dark">Membership</p>
                    <span className="tag tag-gold">Active</span>
                  </div>
                  <p className="mt-2 font-display text-xl">{membership.planName}</p>
                  <div className="mt-4 flex items-end justify-between gap-4">
                    <div>
                      <p className="text-xs font-semibold text-slate-400">Member ID</p>
                      <p className="font-mono text-sm text-gold-400">{membership.memberId}</p>
                      <p className="mt-1 text-xs text-slate-400">{membership.validity || 'Lifetime · Active'}</p>
                    </div>
                    <span aria-hidden className="grid h-16 w-16 place-items-center rounded-xl border-2 border-dashed border-gold-500/50 bg-white/5 text-gold-400">
                      <span className="flex flex-col items-center gap-0.5 text-[9px] font-semibold">
                        <QrIcon className="h-5 w-5" /> QR
                      </span>
                    </span>
                  </div>
                </div>
                <div className="p-5 sm:p-6">
                  <Link to="/membership/dashboard" className="font-semibold text-navy-900 underline underline-offset-4 hover:text-gold-600">
                    Open Membership Dashboard
                  </Link>
                  <p className="mt-1 text-xs text-slate-500">Plan, QR, guest passes and renewals live there.</p>
                </div>
              </div>
            ) : (
              <div className="card h-full p-5 sm:p-6">
                <p className="eyebrow">Membership</p>
                <h2 className="h-card mt-1.5">Unlock member rates everywhere</h2>
                <ul className="mt-4 space-y-2.5">
                  {[
                    'Discounted rooms, halls, parking and games',
                    'Monthly guest passes for family & friends',
                    'Priority booking on weekends and festivals',
                  ].map((b) => (
                    <li key={b} className="flex items-start gap-2.5 text-sm text-slate-700">
                      <span aria-hidden className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-gold-50 text-[11px] font-bold text-gold-600">
                        <CheckIcon className="h-3 w-3" />
                      </span>
                      {b}
                    </li>
                  ))}
                </ul>
                <Link to="/membership" className="mt-5 inline-block">
                  <Button variant="gold">Get Membership <ArrowRightIcon className="h-4 w-4" /></Button>
                </Link>
              </div>
            )}
          </Reveal>
        </div>
      </section>

      {/* 4 · EXPLORE ACTIVITIES */}
      <section className="band-white" aria-label="Explore activities and games">
        <div className="container-x section">
          <Reveal>
            <div className="flex flex-wrap items-end justify-between gap-4">
              <SectionHeading
                eyebrow="Activities & Games"
                title="Book tonight’s game"
                sub="Eleven games across courts, grounds, pool and play zones — pick one to continue."
              />
              <div className="hidden gap-2 md:flex">
                <button type="button" onClick={() => scrollRail(-1)} aria-label="Scroll games left" className="grid h-11 w-11 place-items-center rounded-full border border-navy-900/15 bg-white text-navy-900 transition hover:border-navy-900/40">
                  <ChevronLeftIcon className="h-5 w-5" />
                </button>
                <button type="button" onClick={() => scrollRail(1)} aria-label="Scroll games right" className="grid h-11 w-11 place-items-center rounded-full border border-navy-900/15 bg-white text-navy-900 transition hover:border-navy-900/40">
                  <ChevronRightIcon className="h-5 w-5" />
                </button>
              </div>
            </div>
          </Reveal>
          <Reveal delay={100}>
            <div
              ref={railRef}
              role="region"
              aria-label="Games carousel"
              tabIndex={0}
              className="-mx-4 mt-7 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-2 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8"
            >
              {GAMES.map((g) => (
                <article key={g.id} className="card w-[240px] shrink-0 snap-start overflow-hidden !p-0 sm:w-[280px]">
                  <SmartImage image={g.image} aspect="4 / 3" sizes="280px" />
                  <div className="p-4">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="font-display text-base text-navy-900">{g.name}</h3>
                      <span className={`tag ${g.tag === 'Indoor' ? 'tag-navy' : 'tag-green'}`}>{g.tag}</span>
                    </div>
                    <Link
                      to={`/book/activities/process?game=${g.id}`}
                      className="btn-base mt-3 w-full bg-navy-900 px-4 py-2 text-sm text-white hover:bg-navy-800"
                      aria-label={`Book ${g.name} now`}
                    >
                      Book Now
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      {/* 5 · FACILITIES HIGHLIGHTS */}
      <section id="facilities" className="band-tint scroll-mt-28" aria-label="Facilities highlights">
        <div className="container-x section">
          <Reveal>
            <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-6">
              <SectionHeading
                eyebrow="Facilities"
                title="Corners you'll keep returning to"
                sub="Six highlights — the full campus map lives with the front desk."
              />
              {locationData && (
                <div className="flex items-center gap-2 shrink-0">
                  <span className="tag tag-gold flex items-center gap-1.5">
                    <MapPinIcon className="h-3.5 w-3.5" /> {locationData.name}
                  </span>
                </div>
              )}
            </div>
          </Reveal>
          <div className="mt-7 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FACILITY_GRID.map((f, i) => (
              <Reveal key={f.title} delay={(i % 3) * 80}>
                <article className="card-flat group relative block h-full overflow-hidden">
                  <SmartImage image={f.image} aspect="16 / 10" overlay sizes="(min-width: 1024px) 30vw, (min-width: 640px) 45vw, 92vw" />
                  <ImageCaption>
                    <span className="block font-display text-lg leading-snug text-white">{f.title}</span>
                    <span className="mt-0.5 block text-xs text-white/80">{f.line}</span>
                  </ImageCaption>
                </article>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* 6 · OFFERS & EVENTS */}
      <section className="band-cream" aria-label="Offers and events">
        <div className="container-x section">
          <Reveal>
            <SectionHeading
              eyebrow="Offers & Events"
              title="This fortnight at the club"
              sub="Festivals, open nights and a member-only upgrade window."
            />
          </Reveal>
          <div className="mt-7 grid gap-5 md:grid-cols-3">
            {OFFERS.map((e, i) => (
              <Reveal key={e.title} delay={i * 80}>
                <Card className="card-hover h-full overflow-hidden !p-0">
                  <div className="relative">
                    <SmartImage image={e.image} aspect="16 / 9" sizes="(min-width: 768px) 30vw, 92vw" />
                    <span className="tag tag-gold absolute left-3 top-3 shadow-card">{e.date}</span>
                  </div>
                  <div className="p-5">
                    <span className={`tag ${e.tone}`}>{e.tag}</span>
                    <h3 className="h-card mt-3">{e.title}</h3>
                    <p className="mt-1.5 text-sm text-slate-600">{e.line}</p>
                    <p className="mt-3 flex items-center gap-2 text-sm text-slate-500">
                      <ClockIcon className="h-4 w-4 text-gold-600" /> {e.when}
                    </p>
                    <p className="mt-1.5 flex items-center gap-2 text-sm text-slate-500">
                      <MapPinIcon className="h-4 w-4 text-gold-600" /> {e.where}
                    </p>
                  </div>
                </Card>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* 7 · ANNOUNCEMENTS / NOTIFICATIONS PREVIEW */}
      <section id="notices" className="band-white scroll-mt-28" aria-label="Announcements">
        <div className="container-x section">
          <Reveal>
            <div className="flex flex-wrap items-end justify-between gap-3">
              <SectionHeading
                eyebrow="Announcements"
                title="Latest notices"
                sub="Booking updates, events and member notices appear here first."
              />
              <button type="button" onClick={viewAllNotices} className="text-sm font-semibold text-gold-600 hover:underline">
                View all
              </button>
            </div>
          </Reveal>
          {latestNotices.length === 0 ? (
            <div className="mt-5">
              <EmptyState
                title="No notices right now"
                body="You're all caught up — new club updates will show up here."
                icon={BellIcon}
              />
            </div>
          ) : (
            <ul className="mt-5 grid gap-3 md:grid-cols-3">
              {latestNotices.map((n, i) => (
                <Reveal key={n.id} delay={i * 80}>
                  <li className="card-flat flex h-full items-start gap-3 p-4 transition hover:shadow-card">
                    <span aria-hidden className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-gold-50 text-gold-600">
                      <BellIcon className="h-4 w-4" />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-sm font-semibold text-navy-900">{n.title}</span>
                      <span className="mt-0.5 block text-sm text-slate-500">{n.body}</span>
                      <span className="mt-1 block text-xs text-slate-400">{n.date}</span>
                    </span>
                  </li>
                </Reveal>
              ))}
            </ul>
          )}
          {/* TODO(Phase 2): GET /api/notifications with timestamps + archive */}
        </div>
      </section>

      {/* 8 · HELP STRIP */}
      <section className="band-dark" aria-label="Need help">
        <div className="container-x section-sm">
          <Reveal>
            <div className="flex flex-col items-start justify-between gap-5 sm:flex-row sm:items-center">
              <div>
                <p className="eyebrow-on-dark">Support</p>
                <h2 className="mt-2 font-display text-2xl tracking-tight text-white sm:text-3xl">Need help?</h2>
                {/* Contact details come from src/config/siteInfo.js. */}
                <p className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-300">
                  {SITE_INFO.phone && (
                    <span className="inline-flex items-center gap-1.5">
                      <PhoneIcon className="h-4 w-4 text-gold-400" /> {SITE_INFO.phone}
                    </span>
                  )}
                  {SITE_INFO.email && (
                    <span className="inline-flex items-center gap-1.5">
                      <MailIcon className="h-4 w-4 text-gold-400" /> {SITE_INFO.email}
                    </span>
                  )}
                </p>
              </div>
              <Link to="/support">
                <Button variant="gold">Contact Support <ArrowRightIcon className="h-4 w-4" /></Button>
              </Link>
            </div>
          </Reveal>
        </div>
      </section>
    </div>
  );
}
