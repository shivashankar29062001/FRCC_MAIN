import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { getRedirect, isPlaceholder } from '../config/redirects.js';
import { HeroImage } from './HeroImage.jsx';
import { FilterRow, MoreToExplore, PhotoCard, PhotoTile } from './ui/explore.jsx';
import { IMAGES, roomSlot } from '../config/images.js';
import { HOTELS } from '../data/demo/hotels.js';
import { HALLS } from '../data/demo/halls.js';
import { PARKING_ZONES } from '../data/demo/parking.js';
import { GAMES, GAME_CATEGORIES, GAME_FILTERS, formatINR } from '../features/activities/games.config.js';
import { getDefaultLocation } from '../data/demo/locations.js';
import { ArrowRightIcon } from './ui/icons.jsx';

// ---------------------------------------------------------------------------
// Photo cards below use one slot per item (room type, hall id, zone id,
// game id, plan) from src/config/images.js — no shared pools.
// ---------------------------------------------------------------------------

// Membership plans from site data (one slot per plan)
const MEMBERSHIP_PLANS = [
  { label: 'Silver', detail: '₹25,000 lifetime', image: IMAGES['plan-silver'] },
  { label: 'Gold', detail: '₹50,000 lifetime', image: IMAGES['plan-gold'] },
  { label: 'Platinum', detail: '₹1,00,000 lifetime', image: IMAGES['plan-platinum'] },
];

// All sections for "More to explore"
const ALL_SECTIONS = [
  { key: 'hotel', to: '/book/hotel', label: 'Stay', detail: 'Rooms and suites', image: IMAGES.exploreMoreHotel },
  { key: 'hall', to: '/book/hall', label: 'Halls', detail: 'Weddings and events', image: IMAGES.exploreMoreHall },
  { key: 'parking', to: '/book/parking', label: 'Parking', detail: 'Zoned slots', image: IMAGES.exploreMoreParking },
  { key: 'activities', to: '/book/activities', label: 'Activities', detail: 'Eleven games', image: IMAGES.exploreMoreActivities },
  { key: 'membership', to: '/membership', label: 'Membership', detail: 'Lifetime plans', image: IMAGES.exploreMoreMembership },
];

// Filter options for rooms (by occupancy)
const ROOM_FILTERS = [
  { value: 'all', label: 'All' },
  { value: '2', label: 'Sleeps 2' },
  { value: '3', label: 'Sleeps 3' },
  { value: '4', label: 'Sleeps 4+' },
];

// Filter options for halls (by capacity)
const HALL_FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'small', label: 'Up to 100' },
  { value: 'medium', label: '100–400' },
  { value: 'large', label: '400+' },
];

// Filter options for parking (by vehicle type)
const PARKING_FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'car', label: 'Car' },
  { value: 'bike', label: 'Bike' },
  { value: 'suv', label: 'SUV' },
  { value: 'ev', label: 'EV' },
];

// Filter options for activities (from games config)
const ACTIVITY_FILTERS = GAME_FILTERS.map((f) => ({
  value: f,
  label: f === 'all' ? 'All' : GAME_CATEGORIES[f],
}));

function shortName(name = '', place = '') {
  return name
    .replace(/^FRCC\s+/i, '')
    .replace(new RegExp(`\\s+${place}\\s*$`, 'i'), '')
    .replace(/\s*-\s*$/, '')
    .trim() || name;
}

function buildItems(redirectKey, to) {
  const area = getDefaultLocation();
  const items = [];

  if (redirectKey === 'hotel') {
    const rooms = HOTELS.filter((h) => h.locationId === area.id).flatMap((h) => h.rooms);
    rooms.forEach((r) => {
      items.push({
        label: r.type,
        detail: `₹${r.pricePerNight.toLocaleString('en-IN')}/night · sleeps ${r.maxOccupancy}`,
        image: { ...roomSlot(r.type), name: r.type },
        to,
        facets: { occupancy: String(r.maxOccupancy) },
      });
    });
  }

  if (redirectKey === 'hall') {
    HALLS.filter((h) => h.locationId === area.id).forEach((h) => {
      const cap = h.capacity.theater;
      const label = shortName(h.name, area.name);
      items.push({
        label,
        detail: `Seats ${cap} theatre · ₹${h.pricePerDay.evening.toLocaleString('en-IN')} evening`,
        image: { ...IMAGES[h.id], name: label },
        to,
        facets: { size: cap > 400 ? 'large' : cap > 100 ? 'medium' : 'small' },
      });
    });
  }

  if (redirectKey === 'parking') {
    PARKING_ZONES.filter((z) => z.locationId === area.id).forEach((z) => {
      const car = z.vehicleTypes.car || Object.values(z.vehicleTypes)[0] || {};
      const label = shortName(z.name, area.name);
      items.push({
        label,
        detail: car.pricePerHour ? `₹${car.pricePerHour}/hr car` : z.operatingHours,
        image: { ...IMAGES[z.id], name: label },
        to,
        facets: { vehicle: Object.keys(z.vehicleTypes)[0] || 'car' },
      });
    });
  }

  if (redirectKey === 'activities') {
    GAMES.forEach((g) => {
      items.push({
        label: g.name,
        detail: `from ${formatINR(g.pricePerSlot)} · ${g.slotMinutes} min`,
        image: IMAGES[g.imageKey],
        to: isPlaceholder(getRedirect('activities')) ? '#' : `${getRedirect('activities')}?game=${encodeURIComponent(g.id)}`,
        facets: { category: g.category },
        onClick: isPlaceholder(getRedirect('activities'))
          ? (e) => { e.preventDefault(); window.dispatchEvent(new CustomEvent('toast', { detail: 'Online booking opens shortly — call the front desk to book a game.' })); }
          : undefined,
      });
    });
  }

  if (redirectKey === 'membership') {
    MEMBERSHIP_PLANS.forEach((p) => {
      items.push({ ...p, to, facets: {} });
    });
  }

  return items;
}

function getFilters(redirectKey) {
  switch (redirectKey) {
    case 'hotel': return ROOM_FILTERS;
    case 'hall': return HALL_FILTERS;
    case 'parking': return PARKING_FILTERS;
    case 'activities': return ACTIVITY_FILTERS;
    default: return null;
  }
}

function getFilterKey(redirectKey) {
  switch (redirectKey) {
    case 'hotel': return 'occupancy';
    case 'hall': return 'size';
    case 'parking': return 'vehicle';
    case 'activities': return 'category';
    default: return null;
  }
}

function getItemsTitle(redirectKey) {
  switch (redirectKey) {
    case 'hotel': return 'Rooms and suites';
    case 'hall': return 'Event spaces';
    case 'parking': return 'Parking zones';
    case 'activities': return 'Games';
    case 'membership': return 'Membership plans';
    default: return 'Items';
  }
}

function getSectionTitle(redirectKey) {
  switch (redirectKey) {
    case 'hotel': return 'Stay';
    case 'hall': return 'Halls and events';
    case 'parking': return 'Parking';
    case 'activities': return 'Activities & Games';
    case 'membership': return 'Lifetime Membership';
    default: return 'Booking';
  }
}

function getDescription(redirectKey) {
  const area = getDefaultLocation();
  switch (redirectKey) {
    case 'hotel':
      return `${HOTELS.filter(h => h.locationId === area.id).reduce((sum, h) => sum + h.rooms.length, 0)} rooms across ${HOTELS.filter(h => h.locationId === area.id).length} hotels — member rates every night.`;
    case 'hall':
      return `${HALLS.filter(h => h.locationId === area.id).length} venues seating 40 to 600 — weddings, conferences, celebrations.`;
    case 'parking':
      return `${PARKING_ZONES.filter(z => z.locationId === area.id).length} zoned areas — reserve by the hour before you arrive.`;
    case 'activities':
      return 'Eleven games across courts, grounds, pool and play zones — filter instantly.';
    case 'membership':
      return 'One lifetime fee, member rates across the whole campus.';
    default:
      return '';
  }
}

/**
 * Unified section landing page component.
 * Props:
 *   redirectKey: 'hotel' | 'hall' | 'parking' | 'activities' | 'membership'
 *   bannerImage: image slot from IMAGES
 */
export function RedirectIntro({ redirectKey, bannerImage }) {
  const [filter, setFilter] = useState('all');
  const { hash } = useLocation();

  // Anchor links jump straight to booking bar — instant, no smooth scroll
  useEffect(() => {
    if (!hash) return undefined;
    const el = document.getElementById(hash.replace('#', ''));
    if (!el) return undefined;
    el.scrollIntoView({ block: 'start' });
    return undefined;
  }, [hash]);

  // While the service's booking URL is a placeholder, cards link to #booking on this page
  const serviceUrl = getRedirect(redirectKey);
  const to = isPlaceholder(serviceUrl) ? '#booking' : serviceUrl;

  const items = buildItems(redirectKey, to);
  const filters = getFilters(redirectKey);
  const filterKey = getFilterKey(redirectKey);
  const itemsTitle = getItemsTitle(redirectKey);
  const sectionTitle = getSectionTitle(redirectKey);
  const description = getDescription(redirectKey);

  const shown = filters && filter !== 'all' && filterKey
    ? items.filter((it) => it.facets?.[filterKey] === filter)
    : items;

  const more = ALL_SECTIONS.filter((s) => s.key !== redirectKey).slice(0, 3);

  return (
    <div>
      {/* 1 · HERO — full-bleed photo only, no booking card */}
      <HeroImage slot={bannerImage?.slot} size="compact" />

      <div className="container-x section-top">
        {/* Page title as a plain heading below the hero */}
        <h1 className="h-section">{sectionTitle}</h1>
        <p className="mt-3 max-w-2xl text-slate-600">{description}</p>

        {/* 3 · Photo cards grid + instant filter row (where useful) */}
        {items.length > 0 && (
          <section aria-label={itemsTitle}>
            <h2 className="h-section">{itemsTitle}</h2>

            {filters && (
              <FilterRow
                className="mt-6"
                label={`Filter ${itemsTitle.toLowerCase()}`}
                options={filters}
                value={filter}
                onChange={setFilter}
              />
            )}

            <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {shown.map((item, idx) => (
                <PhotoCard
                  key={`${item.label}-${item.image?.photoId || idx}`}
                  to={item.to}
                  onClick={item.onClick}
                  image={item.image}
                  label={item.label}
                  detail={item.detail}
                  aspect="4 / 3"
                  sizes="(min-width: 1024px) 30vw, (min-width: 640px) 45vw, 92vw"
                />
              ))}
            </div>

            {isPlaceholder(serviceUrl) && (
              <Link
                to="/support"
                className="mt-6 inline-flex items-center gap-1.5 text-sm font-semibold text-navy-900 transition-colors duration-150 hover:text-gold-600"
              >
                Need help? Contact support
              </Link>
            )}
          </section>
        )}

        {/* 4 · More to explore — 3 photo cards linking to other sections */}
        {more.length > 0 && (
          <section className="mt-12" aria-label="More to explore">
            <h2 className="h-section">More to explore</h2>
            <MoreToExplore items={more} className="mt-6" />
          </section>
        )}
      </div>
    </div>
  );
}

export default RedirectIntro;