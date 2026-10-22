import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuthModal } from '../app/context/AuthModalContext.jsx';
import { BookingCard } from '../components/BookingPanel.jsx';
import { SmartImage } from '../components/ui/media.jsx';
import { HeroImage } from '../components/HeroImage.jsx';
import { HeroSlider } from '../components/HeroSlider.jsx';
import { PhotoTile, FilterRow, SectionLink, ExperienceSection } from '../components/ui/explore.jsx';
import { Lightbox } from '../components/ui/lightbox.jsx';
import { IMAGES, gameSlot } from '../config/images.js';
import { GAMES, GAME_CATEGORIES } from '../features/activities/games.config.js';
import { getRedirect, isPlaceholder } from '../config/redirects.js';
import { SITE_INFO, getAddressLines } from '../config/siteInfo.js';
import { ArrowRightIcon, MapPinIcon, ClockIcon, PhoneIcon } from '../components/ui/icons.jsx';
import { LocationTrigger } from '../components/location/LocationTrigger.jsx';
import { MEMBER_DISCOUNT_PERCENT } from '../config/pricing.js';
import { TypeWriter } from '../components/TypeWriter.jsx';
import { name as siteName, shortName as siteShortName, tagline as siteTagline } from '../config/site.js';
import { ROUTES } from '../config/routes.js';

// 3a · Stay feature section
const STAY_FEATURE = {
  to: ROUTES.stay,
  heading: 'Stay',
  line: '36 rooms across two wings — member rates every night.',
  image: IMAGES.staySuite,
};

// 3b · Halls and events feature section
const HALLS_FEATURE = {
  to: ROUTES.halls,
  heading: 'Halls and events',
  line: 'Seats 40 to 400 — weddings, conferences, celebrations.',
  image: IMAGES.hallFunction,
};

// 3c · Activities feature section — tabs filter instantly
const ACTIVITY_TABS = [
  { value: 'all', label: 'All' },
  { value: 'indoor', label: GAME_CATEGORIES.indoor },
  { value: 'outdoor', label: GAME_CATEGORIES.outdoor },
  { value: 'water', label: GAME_CATEGORIES.water },
];

function gameHref(gameId) {
  return `${ROUTES.activities}?game=${encodeURIComponent(gameId)}`;
}

// 3d · Campus life gallery — 8 photos
const GALLERY = [
  { label: 'Entrance', image: IMAGES['gallery-1'] },
  { label: 'Pool at night', image: IMAGES['gallery-2'] },
  { label: 'Gardens', image: IMAGES['gallery-3'] },
  { label: 'Restaurant', image: IMAGES['gallery-4'] },
  { label: 'Spa', image: IMAGES['gallery-5'] },
  { label: 'Gym', image: IMAGES['gallery-6'] },
  { label: 'Event nights', image: IMAGES['gallery-7'] },
  { label: 'Covered parking', image: IMAGES['gallery-8'] },
];

const GALLERY_IMAGES = GALLERY.map((g) => ({
  src: g.image.src,
  srcSet: g.image.srcSet,
  alt: g.image.alt,
  caption: g.label,
}));


// 5 · Visit us — from siteInfo.js
const addressLines = getAddressLines();
const phoneHref = SITE_INFO.phone ? `tel:${SITE_INFO.phone.replace(/\s/g, '')}` : null;

export function LandingPage() {
  const { hash, state, pathname, search } = useLocation();
  const navigate = useNavigate();
  const [activityCategory, setActivityCategory] = useState('all');
  const [photoIndex, setPhotoIndex] = useState(null);
  const [headlineDone, setHeadlineDone] = useState(false);

  // ProtectedRoute lands logged-out visitors here with state.from
  const pendingFrom = typeof state?.from === 'string' ? state.from : null;
  const { openAuthPrompt } = useAuthModal();

  useEffect(() => {
    if (state?.authPrompt && pendingFrom) {
      openAuthPrompt(pendingFrom);
      navigate(pathname + search, { replace: true, state: {} });
    }
  }, [state?.authPrompt, pendingFrom, openAuthPrompt, navigate, pathname, search]);

  // Deep links jump straight to section — instant, no smooth scroll
  useEffect(() => {
    if (!hash) return undefined;
    const el = document.getElementById(hash.replace('#', ''));
    if (!el) return undefined;
    el.scrollIntoView({ block: 'start' });
    return undefined;
  }, [hash]);

  const visibleGames = activityCategory === 'all'
    ? GAMES
    : GAMES.filter((g) => g.category === activityCategory);

  function stepPhoto(step) {
    setPhotoIndex((i) => (i === null ? i : (i + step + GALLERY.length) % GALLERY.length));
  }

  return (
    <div>
      {/* 1 · HERO */}
      <div className="landing-hero-wrap">
        <HeroSlider slotsKey="home">
          <div className="landing-hero-overlay" aria-hidden="true" />
          <div className="container-x relative z-10 h-full flex items-center">
            <div className="landing-hero-text max-w-[520px] text-white">
              {/* 2a · Small gold label */}
              <p className="landing-hero-eyebrow">{siteShortName}</p>

              {/* 2b · Serif headline */}
              <h1 className="landing-hero-headline">
                <TypeWriter
                  text={siteName}
                  speed={55}
                  caretFadeDelay={1500}
                  onComplete={() => setHeadlineDone(true)}
                />
              </h1>

              {/* 2c · Second line typing loop */}
              <p className="landing-hero-subline">
                <TypeWriter
                  phrases={[
                    siteTagline,
                    'Stay in comfort.',
                    'Play every game.',
                    'Celebrate every occasion.',
                    'Belong for life.',
                  ]}
                  speed={55}
                  holdTime={1600}
                  loop
                />
              </p>

              {/* 5, 6, 7 · Stat row and link with fade-in after headline */}
              <div
                className={`landing-hero-fade-group ${
                  headlineDone ? 'opacity-100' : 'opacity-0 pointer-events-none'
                }`}
              >
                {/* 5 · Stat row */}
                <div className="landing-hero-stat-row">
                  <span className="landing-hero-stat-number">{MEMBER_DISCOUNT_PERCENT}%</span>
                  <div className="landing-hero-stat-divider" aria-hidden="true" />
                  <div className="flex flex-col justify-center">
                    <span className="landing-hero-stat-title">Member savings</span>
                    <span className="landing-hero-stat-subtitle">on every booking</span>
                  </div>
                </div>

                {/* 6 · Plain text link */}
                <div className="mt-[18px]">
                  <Link
<<<<<<< HEAD
                    to={ROUTES.signup}
=======
                    to="/membership"
>>>>>>> 6bab811354f3a499b848cd3910653c8e234dc2ab
                    className="landing-hero-member-link inline-flex items-center gap-1.5"
                  >
                    <span>Become a member</span>
                    <ArrowRightIcon className="h-4 w-4" />
                  </Link>
                </div>
              </div>


            </div>
          </div>
        </HeroSlider>

        {/* 1b · BOOKING CARD */}
        <div id="booking" className="landing-hero-card-wrap scroll-mt-24">
          <BookingCard compact />
        </div>
      </div>

      {/* 2 · BOOK YOUR EXPERIENCE — five portrait service tiles */}
      <ExperienceSection id="explore" />

      {/* 3 · FEATURE SECTIONS — cream · white · navy */}
      {/* 3a · Stay — cream */}
      <section
        id="stay"
        className="band-cream scroll-mt-28"
        aria-label="Stay"
      >
        <div className="container-x section grid lg:grid-cols-2 lg:gap-12 items-center">
          <div>
            <h2 className="h-section">{STAY_FEATURE.heading}</h2>
            <span className="mt-3 block text-slate-600">{STAY_FEATURE.line}</span>
            <div className="mt-6">
              <Link
                to={STAY_FEATURE.to}
                onClick={() => { if (import.meta.env.DEV) console.info("[tile]", "Stay", STAY_FEATURE.to); }}
                className="btn-base bg-gold-500 text-navy-950 px-6 py-3 hover:bg-gold-400 inline-flex items-center gap-2"
              >
                Explore stays <ArrowRightIcon className="h-4 w-4" />
              </Link>
            </div>
          </div>
          <SmartImage
            image={STAY_FEATURE.image}
            aspect="16 / 10"
            sizes="(min-width: 1024px) 46vw, 92vw"
            className="rounded-2xl"
          />
        </div>
      </section>

      {/* 3b · Halls and events — white */}
      <section
        id="halls"
        className="band-white scroll-mt-28"
        aria-label="Halls and events"
      >
        <div className="container-x section grid lg:grid-cols-2 lg:gap-12 items-center">
          <SmartImage
            image={HALLS_FEATURE.image}
            aspect="16 / 10"
            sizes="(min-width: 1024px) 46vw, 92vw"
            className="rounded-2xl order-last lg:order-first"
          />
          <div>
            <h2 className="h-section">{HALLS_FEATURE.heading}</h2>
            <span className="mt-3 block text-slate-600">{HALLS_FEATURE.line}</span>
            <div className="mt-6">
              <Link
                to={HALLS_FEATURE.to}
                onClick={() => { if (import.meta.env.DEV) console.info("[tile]", "Halls and events", HALLS_FEATURE.to); }}
                className="btn-base bg-navy-900 text-white px-6 py-3 hover:bg-navy-800 inline-flex items-center gap-2"
              >
                View halls <ArrowRightIcon className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* 3c · Activities — navy, tabs filter photo cards instantly */}
      <section
        id="activities"
        className="band-dark scroll-mt-28"
        aria-label="Activities and games"
      >
        <div className="container-x section">
          <h2 className="h-section text-white">Activities</h2>
          <span className="mt-2 block text-slate-300">Eleven games — indoor, outdoor and water.</span>
          <FilterRow
            className="mt-6"
            label="Filter games by setting"
            options={ACTIVITY_TABS}
            value={activityCategory}
            onChange={setActivityCategory}
          />
          <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 lg:gap-4">
            {visibleGames.map((g) => (
              <PhotoTile
                key={g.id}
                to={gameHref(g.id)}
                image={gameSlot(g.imageKey)}
                label={g.name}
                aspect="4 / 3"
                sizes="(min-width: 1024px) 23vw, (min-width: 640px) 46vw, 92vw"
              />
            ))}
          </div>
          <SectionLink to={ROUTES.activities} light>View all activities</SectionLink>
        </div>
      </section>

      {/* 3d · Campus life gallery — static mosaic of 8 photos, lightbox */}
      <section
        id="gallery"
        className="band-dark scroll-mt-28"
        aria-label="Campus life gallery"
      >
        <div className="container-x section">
          <h2 className="h-section text-white">Campus life</h2>
          <div className="mt-7 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
            {GALLERY.map((photo, i) => (
              <button
                key={photo.label}
                type="button"
                onClick={() => setPhotoIndex(i)}
                aria-label={`View photo: ${photo.image.alt}`}
                className="group relative block overflow-hidden rounded-2xl border border-white/15 transition-colors duration-150 hover:border-gold-500/60 focus-visible:border-gold-500/60"
              >
                <SmartImage
                  image={photo.image}
                  aspect="4 / 3"
                  sizes="(min-width: 1024px) 23vw, 46vw"
                  overlay
                >
                  <span aria-hidden className="absolute inset-x-0 bottom-0 p-3 pointer-events-none">
                    <span className="block text-xs font-semibold text-white transition-colors duration-150 group-hover:text-gold-400">
                      {photo.label}
                    </span>
                  </span>
                </SmartImage>
              </button>
            ))}
          </div>
          <SectionLink to={ROUTES.book} light>View all booking options</SectionLink>
        </div>
      </section>

      {/* 4 · MEMBERSHIP BAND — wide photo, one line, CTA */}
      <section
        id="membership"
        className="band-dark scroll-mt-28"
        aria-label="Membership"
      >
        <div className="container-x section grid lg:grid-cols-2 lg:gap-12 items-center">
          <SmartImage
            image={IMAGES.membershipWide}
            aspect="21 / 9"
            sizes="(min-width: 1024px) 46vw, 92vw"
            className="rounded-2xl"
          />
          <div>
            <h2 className="h-section text-white">Belong for life</h2>
            <span className="mt-3 block text-slate-300">One lifetime fee — member rates across the whole campus.</span>
            <div className="mt-8">
              <Link
                to={ROUTES.membership}
                onClick={() => { if (import.meta.env.DEV) console.info("[tile]", "Membership", ROUTES.membership); }}
                className="btn-base bg-gold-500 text-navy-950 px-7 py-3.5 text-lg hover:bg-gold-400 inline-flex items-center gap-2"
              >
                Become a member
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* 5 · VISIT US — entrance photo, address, hours, phone, Contact */}
      <section
        id="visit"
        className="band-white scroll-mt-28"
        aria-label="Visit us"
      >
        <div className="container-x section grid lg:grid-cols-2 lg:gap-12 items-center">
          <SmartImage
            image={IMAGES.visitEntrance}
            aspect="16 / 10"
            sizes="(min-width: 1024px) 46vw, 92vw"
            className="rounded-2xl"
          />
          <div>
            <h2 className="h-section">Visit us</h2>
            <ul className="mt-5 space-y-4 text-sm text-slate-700">
              {SITE_INFO.locations && SITE_INFO.locations.length > 0 ? (
                SITE_INFO.locations.map((loc) => (
                  <li key={loc.id} className="flex items-start gap-2.5">
                    <LocationTrigger
                      locationId={loc.id === 'vja' ? 'vja-club' : 'hyd-office'}
                      address={loc.fullAddress}
                      className="text-slate-600 hover:text-gold-600"
                      showIcon={true}
                      iconClassName="mt-0.5 h-4 w-4 shrink-0 text-gold-600"
                    >
                      <div>
                        <span className="block font-semibold text-navy-900">{loc.title}</span>
                        <address className="not-italic text-slate-600 text-xs sm:text-sm">{loc.fullAddress}</address>
                        {loc.phone && (
                          <div className="flex items-center gap-1.5 text-xs text-slate-600 mt-1">
                            <PhoneIcon className="h-3.5 w-3.5 shrink-0 text-gold-600" />
                            <a href={`tel:${loc.phone.replace(/\s/g, '')}`} className="transition-colors hover:text-gold-600 font-medium">
                              {loc.phone}
                            </a>
                          </div>
                        )}
                      </div>
                    </LocationTrigger>
                  </li>
                ))
              ) : addressLines.length > 0 && (
                <li className="flex items-start gap-2.5">
                  <LocationTrigger
                    locationId="vja-club"
                    address={addressLines.join(', ')}
                    className="text-slate-600 hover:text-gold-600"
                    showIcon={true}
                    iconClassName="mt-0.5 h-4 w-4 shrink-0 text-gold-600"
                  >
                    <address className="not-italic">{addressLines.join(', ')}</address>
                  </LocationTrigger>
                </li>
              )}
              {SITE_INFO.hours && (
                <li className="flex items-start gap-2.5">
                  <ClockIcon className="mt-0.5 h-4 w-4 shrink-0 text-gold-600" />
                  <span>{SITE_INFO.hours}</span>
                </li>
              )}
              {SITE_INFO.phone && phoneHref && (
                <li className="flex items-start gap-2.5">
                  <PhoneIcon className="mt-0.5 h-4 w-4 shrink-0 text-gold-600" />
                  <a href={phoneHref} className="transition-colors duration-150 hover:text-gold-600">{SITE_INFO.phone}</a>
                </li>
              )}
            </ul>
            {phoneHref && (
              <a href={phoneHref} className="mt-6 inline-block">
                <button type="button" className="btn-base bg-gold-500 text-navy-950 px-6 py-3 hover:bg-gold-400">
                  Contact
                </button>
              </a>
            )}
          </div>
        </div>
      </section>

      {/* 6 · FOOTER — unchanged (imported in layout) */}

      {/* Lightbox for gallery */}
      <Lightbox
        images={GALLERY_IMAGES}
        index={photoIndex}
        onClose={() => setPhotoIndex(null)}
        onNavigate={stepPhoto}
      />
    </div>
  );
}

export default LandingPage;