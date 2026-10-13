import { Link } from 'react-router-dom';
import { IMAGES } from '../../config/images.js';
import { SmartImage } from '../../components/ui/media.jsx';
import { HeroImage } from '../../components/HeroImage.jsx';

// ---------------------------------------------------------------------------
// /book/parking — Parking section landing page: photo header + zone cards + explore
// ---------------------------------------------------------------------------

const ZONES = [
  { to: '/book/parking', label: 'Lakeside Premium', image: IMAGES.parkingEntry, detail: 'Covered · EV charging · Valet' },
  { to: '/book/parking', label: 'Terrace Zone', image: IMAGES.parkingEV, detail: 'Open · Near halls & courts' },
  { to: '/book/parking', label: 'Basement Secure', image: IMAGES.parkingSecurity, detail: 'CCTV · 24/7 attended' },
  { to: '/book/parking', label: 'Valet Drop', image: IMAGES.parkingValet, detail: 'Hotel & restaurant entrance' },
];

const MORE_EXPLORE = [
  { to: '/book/hotel', label: 'Stay', image: IMAGES.exploreMoreHotel },
  { to: '/book/hall', label: 'Halls', image: IMAGES.exploreMoreHall },
  { to: '/book/activities', label: 'Activities', image: IMAGES.exploreMoreActivities },
];

export function ParkingPage() {
  return (
    <div>
      {/* Photo hero — full-bleed photo only */}
      <HeroImage slot="hero-parking" size="compact" />

      <section className="band-white" aria-label="Parking">
        <div className="container-x section">
          <h1 className="h-display max-w-2xl">Parking zones</h1>
          <p className="lead mt-3 max-w-lg">Reserve a zoned slot by the hour before you arrive</p>
          <div className="mt-6">
            <Link to="/signin" state={{ from: '/book/parking' }} className="btn-base bg-gold-500 text-navy-950 px-7 py-3.5 text-lg hover:bg-gold-400 inline-flex items-center gap-2">
              Reserve a slot
            </Link>
          </div>
        </div>
      </section>

      {/* Zone cards */}
      <section className="band-white" aria-label="Zones">
        <div className="container-x section">
          <h2 className="h-section">All zones</h2>
          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {ZONES.map((zone) => (
              <Link key={zone.label} to={zone.to} className={TILE_CLASS} aria-label={zone.label}>
                <SmartImage
                  image={zone.image}
                  aspect="4 / 3"
                  overlay
                  sizes="(min-width: 1024px) 23vw, (min-width: 640px) 46vw, 92vw"
                />
                <span aria-hidden className="absolute inset-0 bg-navy-950/0 transition-colors duration-150 group-hover:bg-navy-950/25" />
                <div className="absolute inset-x-0 bottom-0 p-4 sm:p-5">
                  <span className="font-display text-xl text-white sm:text-2xl">{zone.label}</span>
                  <p className="mt-1 text-sm text-slate-300">{zone.detail}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* More to explore */}
      <section className="band-cream" aria-label="More to explore">
        <div className="container-x section">
          <h2 className="h-section">More to explore</h2>
          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
            {MORE_EXPLORE.map((item) => (
              <Link key={item.to} to={item.to} className={TILE_CLASS} aria-label={item.label}>
                <SmartImage
                  image={item.image}
                  aspect="4 / 3"
                  overlay
                  sizes="(min-width: 640px) 31vw, 95vw"
                />
                <span aria-hidden className="absolute inset-0 bg-navy-950/0 transition-colors duration-150 group-hover:bg-navy-950/25" />
                <span className="absolute inset-x-0 bottom-0 p-4 font-display text-xl text-white transition-colors duration-150 group-hover:text-gold-400 sm:p-5 sm:text-2xl">
                  {item.label}
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

const TILE_CLASS = 'group relative block overflow-hidden rounded-2xl border border-navy-900/10';