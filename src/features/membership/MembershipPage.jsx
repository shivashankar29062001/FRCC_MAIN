import { Link } from 'react-router-dom';
import { IMAGES } from '../../config/images.js';
import { SmartImage } from '../../components/ui/media.jsx';
import { ServiceHero } from '../../components/ServiceHero.jsx';

// ---------------------------------------------------------------------------
// /membership — Membership section landing page: photo header + plan cards + explore
// ---------------------------------------------------------------------------

const PLANS = [
  { to: '/membership', label: 'Silver', image: IMAGES['plan-silver'], detail: '₹25,000 · Club & pool access' },
  { to: '/membership', label: 'Gold', image: IMAGES['plan-gold'], detail: '₹50,000 · +Guest passes & hall discount' },
  { to: '/membership', label: 'Platinum', image: IMAGES['plan-platinum'], detail: '₹1,00,000 · +Priority booking & events' },
  { to: '/membership', label: 'Corporate', image: IMAGES['plan-corporate'], detail: 'Custom pricing · Team access' },
];

const MORE_EXPLORE = [
  { to: '/book/hotel', label: 'Stay', image: IMAGES.exploreMoreHotel },
  { to: '/book/hall', label: 'Halls', image: IMAGES.exploreMoreHall },
  { to: '/book/activities', label: 'Activities', image: IMAGES.exploreMoreActivities },
];

export function MembershipPage() {
  return (
    <div>
      <ServiceHero service="membership" />

      <section id="content" className="band-white scroll-mt-24" aria-label="Membership">
        <div className="container-x section">
          <h1 className="h-display max-w-2xl">Lifetime membership</h1>
          <p className="lead mt-3 max-w-lg">One fee, member rates across hotel, halls, parking & games</p>
          <div className="mt-6">
            <Link to="/signin" state={{ from: '/membership' }} className="btn-base bg-gold-500 text-navy-950 px-7 py-3.5 text-lg hover:bg-gold-400 inline-flex items-center gap-2">
              Get membership
            </Link>
          </div>
        </div>
      </section>

      {/* Plan cards */}
      <section className="band-white" aria-label="Plans">
        <div className="container-x section">
          <h2 className="h-section">Membership plans</h2>
          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {PLANS.map((plan) => (
              <Link key={plan.label} to={plan.to} className={TILE_CLASS} aria-label={plan.label}>
                <SmartImage
                  image={plan.image}
                  aspect="4 / 3"
                  overlay
                  sizes="(min-width: 1024px) 23vw, (min-width: 640px) 46vw, 92vw"
                />
                <span aria-hidden className="absolute inset-0 bg-navy-950/0 transition-colors duration-150 group-hover:bg-navy-950/25" />
                <div className="absolute inset-x-0 bottom-0 p-4 sm:p-5">
                  <span className="font-display text-xl text-white sm:text-2xl">{plan.label}</span>
                  <p className="mt-1 text-sm text-slate-300">{plan.detail}</p>
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