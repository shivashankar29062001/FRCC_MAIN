import { Link } from 'react-router-dom';
import { cx } from '../../utils/helpers.js';
import { SmartImage } from './media.jsx';
import { ArrowRightIcon } from './icons.jsx';
import { IMAGES } from '../../config/images.js';
import { getRedirect, isPlaceholder } from '../../config/redirects.js';

// ---------------------------------------------------------------------------
// Photo-led browsing primitives shared by the landing page (/) and the section
// landing pages. Everything here is deliberately static: hover feedback is a
// colour / border change only (150ms) and filters swap content instantly.
//
// Every photo, srcset and alt text still comes from /src/config/images.js —
// these components only position it.
// ---------------------------------------------------------------------------

/**
 * Internal paths render as a router link, anything else as a plain anchor, so
 * a service booking URL from /config/redirects.js can be swapped for an
 * off-site link later without touching any page.
 */
export function ExploreLink({ to, className, children, ...props }) {
  const internal = typeof to === 'string' && to.startsWith('/');
  if (internal) {
    return (
      <Link to={to} className={className} {...props}>
        {children}
      </Link>
    );
  }
  return (
    <a href={to} className={className} {...props}>
      {children}
    </a>
  );
}

const chipBase =
  'group block overflow-hidden rounded-2xl border border-navy-900/10 bg-white transition-colors duration-150 hover:border-navy-900/40 focus-visible:border-navy-900/40';
const tileBase =
  'group relative block overflow-hidden rounded-2xl border border-navy-900/10 transition-colors duration-150 hover:border-navy-900/40 focus-visible:border-navy-900/40';
const cardBase =
  'group flex h-full flex-col overflow-hidden rounded-2xl border border-navy-900/10 bg-white transition-colors duration-150 hover:border-navy-900/40 focus-visible:border-navy-900/40';

/** Small photo chip (photo + 1–3 word label) — the "Explore bar" row. */
export function PhotoChip({ to, image, label, sizes = '(min-width: 1024px) 15vw, 44vw', className }) {
  return (
    <ExploreLink to={to} className={cx(chipBase, className)}>
      <SmartImage image={image} aspect="4 / 3" sizes={sizes} />
      <span className="block px-3 py-2.5 text-center font-display text-base text-navy-900 transition-colors duration-150 group-hover:text-gold-600 sm:text-lg">
        {label}
      </span>
    </ExploreLink>
  );
}

/**
 * Photo tile with the label sitting over the photo (campus mosaic, games).
 * The whole tile is one link, so the label is read as the link name.
 */
export function PhotoTile({ to, image, label, detail, aspect = '4 / 3', sizes, className, children }) {
  return (
    <ExploreLink to={to} className={cx(tileBase, className)}>
      <SmartImage image={image} aspect={aspect} sizes={sizes} overlay>
        <span className="absolute inset-x-0 bottom-0 block p-4">
          <span className="block font-display text-lg text-white transition-colors duration-150 group-hover:text-gold-400 sm:text-xl">
            {label}
          </span>
          {detail && <span className="mt-0.5 block text-xs text-white/80">{detail}</span>}
        </span>
      </SmartImage>
      {children}
    </ExploreLink>
  );
}

/**
 * Section card: photo, name, one short detail (price / capacity that already
 * exists in the site data) and a "View" line. Whole card is one link.
 */
export function PhotoCard({ to, image, label, detail, aspect = '4 / 3', sizes, className, ...props }) {
  return (
    <ExploreLink to={to} className={cx(cardBase, className)} {...props}>
      <SmartImage image={image} aspect={aspect} sizes={sizes} />
      <span className="flex flex-1 flex-col p-4 sm:p-5">
        <span className="block font-display text-lg text-navy-900">{label}</span>
        {detail && <span className="mt-1 block text-sm text-slate-600">{detail}</span>}
        <span className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-navy-900 transition-colors duration-150 group-hover:text-gold-600">
          View <ArrowRightIcon className="h-4 w-4" />
        </span>
      </span>
    </ExploreLink>
  );
}

/**
 * Instant filter row. Switching tabs swaps the grid with no transition, so the
 * content changes the moment it is pressed.
 *
 * @param {{ options: Array<{ value: string, label: string }>, value: string,
 *   onChange: (value: string) => void, label: string, className?: string }} props
 */
export function FilterRow({ options = [], value, onChange, label, className }) {
  return (
    // Scrolls sideways on phones and wraps once there is room for the row.
    <div
      className={cx('flex flex-nowrap gap-2 overflow-x-auto pb-1 sm:flex-wrap sm:overflow-visible sm:pb-0', className)}
      role="group"
      aria-label={label}
    >
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            onClick={() => onChange(o.value)}
            aria-pressed={active}
            className={cx(
              'shrink-0 rounded-full border px-4 py-2 text-sm font-semibold transition-colors duration-150',
              active
                ? 'border-navy-900 bg-navy-900 text-white'
                : 'border-slate-300 bg-white text-slate-600 hover:border-navy-900/40 hover:text-navy-900',
            )}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

/**
 * Trailing "Explore" / "View all" link that closes a landing-page section.
 * `light` is for the navy bands.
 */
export function SectionLink({ to, children = 'Explore', light = false, className }) {
  return (
    <ExploreLink
      to={to}
      className={cx(
        'mt-6 inline-flex items-center gap-1.5 text-sm font-semibold transition-colors duration-150',
        light ? 'text-white hover:text-gold-400' : 'text-navy-900 hover:text-gold-600',
        className,
      )}
    >
      {children} <ArrowRightIcon className="h-4 w-4" />
    </ExploreLink>
  );
}

/** "More to explore" — three photo cards pointing at the other sections. */
export function MoreToExplore({ items = [], className }) {
  if (!items.length) return null;
  return (
    <div className={cx('grid gap-4 sm:grid-cols-2 lg:grid-cols-3', className)}>
      {items.map((it) => (
        <PhotoCard
          key={it.to + it.label}
          to={it.to}
          image={it.image}
          label={it.label}
          detail={it.detail}
          aspect="16 / 10"
          sizes="(min-width: 1024px) 30vw, (min-width: 640px) 45vw, 92vw"
        />
      ))}
    </div>
  );
}

// Five services, same destinations as the booking tabs (external booking URL
// when configured, otherwise the in-app showcase page).
const EXPERIENCE = [
  { key: 'hotel', label: 'Stay', line: '36 rooms, member rates nightly', imageKey: 'serviceHotel', showcase: '/book/hotel' },
  { key: 'hall', label: 'Halls', line: 'Venues for 40 to 600', imageKey: 'serviceHall', showcase: '/book/hall' },
  { key: 'parking', label: 'Parking', line: 'Zoned slots by the hour', imageKey: 'serviceParking', showcase: '/book/parking' },
  { key: 'activities', label: 'Activities', line: 'Courts, pool and play zones', imageKey: 'serviceActivities', showcase: '/book/activities' },
  { key: 'membership', label: 'Membership', line: 'One fee, lifetime access', imageKey: 'serviceMembership', showcase: '/membership' },
];

function experienceHref(key, showcase) {
  const url = getRedirect(key);
  return isPlaceholder(url) ? showcase : url;
}

/**
 * Five large portrait photo tiles in one row (3:4, radius 16, 20px gap),
 * 2 columns on tablet, 1 on mobile. Whole tile links to that service's
 * booking page. Hover is a gold border colour change only.
 */
export function ExperienceTiles({ className }) {
  return (
    <div className={cx('grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-5', className)}>
      {EXPERIENCE.map((t) => (
        <ExploreLink
          key={t.key}
          to={experienceHref(t.key, t.showcase)}
          aria-label={`${t.label} — Book now`}
          className="group relative block overflow-hidden rounded-2xl border border-navy-900/10 transition-colors duration-150 hover:border-gold-500 focus-visible:border-gold-500"
        >
          <SmartImage
            image={IMAGES[t.imageKey]}
            aspect="3 / 4"
            sizes="(min-width: 1024px) 18vw, (min-width: 640px) 44vw, 92vw"
            overlay
          >
            <span className="absolute inset-x-0 bottom-0 block p-5">
              <span className="block font-display text-[22px] leading-snug text-white">{t.label}</span>
              <span className="mt-1 block text-sm text-white/80">{t.line}</span>
              <span className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-gold-500 px-4 py-2 text-sm font-semibold text-navy-950">
                Book now <ArrowRightIcon className="h-4 w-4" />
              </span>
            </span>
          </SmartImage>
        </ExploreLink>
      ))}
    </div>
  );
}

/**
 * Image-led section directly below the hero on / and the home hub:
 * "Book your experience" on cream with 80px vertical padding.
 */
export function ExperienceSection({ id }) {
  return (
    <section id={id} className="bg-cream py-20" aria-label="Book your experience">
      <div className="container-x">
        <h2 className="h-section">Book your experience</h2>
        <p className="mt-3 max-w-2xl text-slate-600">Rooms, halls, parking, games and membership.</p>
        <ExperienceTiles className="mt-8" />
      </div>
    </section>
  );
}
