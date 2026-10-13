import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { BookingCard } from '../components/BookingPanel.jsx';
import { SmartImage } from '../components/ui/media.jsx';
import { HeroImage } from '../components/HeroImage.jsx';
import { PhotoTile, FilterRow, SectionLink, ExperienceSection } from '../components/ui/explore.jsx';
import { Lightbox } from '../components/ui/lightbox.jsx';
import { IMAGES } from '../config/images.js';
import { GAMES, GAME_CATEGORIES } from '../features/activities/games.config.js';
import { getRedirect, isPlaceholder } from '../config/redirects.js';
import { SITE_INFO, getAddressLines } from '../config/siteInfo.js';
import { ArrowRightIcon, MapPinIcon, ClockIcon, PhoneIcon } from '../components/ui/icons.jsx';

// 3a · Stay feature section
const STAY_FEATURE = {
  to: '/book/hotel',
  heading: 'Stay',
  line: '36 rooms across two wings — member rates every night.',
  image: IMAGES.staySuite,
};

// 3b · Halls and events feature section
const HALLS_FEATURE = {
  to: '/book/hall',
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

const GAMES_URL = getRedirect('activities');
function gameHref(gameId) {
  if (isPlaceholder(GAMES_URL)) return '/book/activities';
  return `${GAMES_URL}?game=${encodeURIComponent(gameId)}`;
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
  const { hash, state } = useLocation();
  const [activityCategory, setActivityCategory] = useState('all');
  const [photoIndex, setPhotoIndex] = useState(null);

  // ProtectedRoute lands logged-out visitors here with state.from
  const pendingFrom = typeof state?.from === 'string' ? state.from : null;
  // signinState forwarded via navbar; kept here only if a local sign-in link is added.

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
      {/* 1 · HERO — photo only, booking card docked on the right */}
      <div className="hero-wrap">
        <HeroImage slot="hero-home" size="large" />

        {/* 1b · BOOKING CARD — inside the hero, right side */}
        <div id="booking" className="hero-card-wrap scroll-mt-32">
          <BookingCard />
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
              <Link to={STAY_FEATURE.to} className="btn-base bg-gold-500 text-navy-950 px-6 py-3 hover:bg-gold-400 inline-flex items-center gap-2">
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
              <Link to={HALLS_FEATURE.to} className="btn-base bg-navy-900 text-white px-6 py-3 hover:bg-navy-800 inline-flex items-center gap-2">
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
                image={IMAGES[g.imageKey]}
                label={g.name}
                aspect="4 / 3"
                sizes="(min-width: 1024px) 23vw, (min-width: 640px) 46vw, 92vw"
              />
            ))}
          </div>
          <SectionLink to="/book/activities" light>View all activities</SectionLink>
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
                  <span aria-hidden className="absolute inset-x-0 bottom-0 p-3">
                    <span className="block text-xs font-semibold text-white transition-colors duration-150 group-hover:text-gold-400">
                      {photo.label}
                    </span>
                  </span>
                </SmartImage>
              </button>
            ))}
          </div>
          <SectionLink to="/book" light>View all booking options</SectionLink>
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
                to="/membership"
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
              {addressLines.length > 0 && (
                <li className="flex items-start gap-2.5">
                  <MapPinIcon className="mt-0.5 h-4 w-4 shrink-0 text-gold-600" />
                  <address className="not-italic">{addressLines.join(', ')}</address>
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