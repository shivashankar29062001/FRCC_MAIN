// ---------------------------------------------------------------------------
// /src/config/navMenus.js — content of the four photo mega-menus in the main
// navigation (Stay · Halls · Activities · Parking).
//
// Each menu is 3–4 photo cards (image + a 1–3 word label + a link) plus a
// "View all" link. Labels come from the site's own data — src/data/demo/*.js for
// rooms, halls and parking zones, games.config.js for games — and the photos
// come from src/config/images.js, so nothing here is invented. Labels and links
// stay correct when the photos are swapped.
//
// TODO: swap the placeholder photos for the real property photography.
// ---------------------------------------------------------------------------

import { IMAGES, roomSlot } from './images.js';
import { HOTELS } from '../data/demo/hotels.js';
import { HALLS } from '../data/demo/halls.js';
import { PARKING_ZONES } from '../data/demo/parking.js';
import { getDefaultLocation } from '../data/demo/locations.js';
import { GAMES } from '../features/activities/games.config.js';
import { ROUTES } from './routes.js';

const area = getDefaultLocation();

/** "FRCC Grand Convention Hall Hyderabad" → "Grand Convention Hall". */
function shortName(name = '', place = '') {
  return name
    .replace(/^FRCC\s+/i, '')
    .replace(new RegExp(`\\s+${place}\\s*$`, 'i'), '')
    .replace(/\s*-\s*$/, '')
    .trim() || name;
}

// Four rooms, three halls, three parking zones from the default campus.
const rooms = HOTELS.filter((h) => h.locationId === area.id).flatMap((h) => h.rooms).slice(0, 4);
const halls = HALLS.filter((h) => h.locationId === area.id).slice(0, 3);
const zones = PARKING_ZONES.filter((z) => z.locationId === area.id).slice(0, 3);

// Four games — each card continues straight into that game's booking flow.
const games = ['badminton', 'tennis', 'swimming-pool', 'football']
  .map((id) => GAMES.find((g) => g.id === id))
  .filter(Boolean);

const gameHref = (id) => `/book/activities/process?game=${encodeURIComponent(id)}`;

export const NAV_MENUS = {
  stay: {
    label: 'Stay',
    cards: rooms.map((r) => ({
      to: `${ROUTES.stay}#booking`,
      label: r.type,
      image: { ...roomSlot(r.type), name: r.type },
    })),
    viewAll: { to: ROUTES.stay, label: 'View all rooms' },
  },
  hall: {
    label: 'Halls',
    cards: halls.map((h) => ({
      to: ROUTES.halls,
      label: shortName(h.name, area.name),
      image: { ...IMAGES[h.id], name: shortName(h.name, area.name) },
    })),
    viewAll: { to: ROUTES.halls, label: 'View all halls' },
  },
  activities: {
    label: 'Activities',
    cards: games.map((g) => ({
      to: gameHref(g.id),
      label: g.name,
      image: IMAGES[g.imageKey],
    })),
    viewAll: { to: ROUTES.activities, label: 'View all games' },
  },
  parking: {
    label: 'Parking',
    cards: zones.map((z) => ({
      to: ROUTES.parking,
      label: shortName(z.name, area.name),
      image: { ...IMAGES[z.id], name: shortName(z.name, area.name) },
    })),
    viewAll: { to: ROUTES.parking, label: 'View all zones' },
  },
};

export default NAV_MENUS;
