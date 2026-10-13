// Demo activities/games for FRCC locations
// Based on the GAMES structure from games.config.js but with location-specific pricing and availability

import { GAMES as BASE_GAMES } from '../../features/activities/games.config.js';

// Create location-specific variations of the base games
function createLocationGames(locationId, priceMultiplier = 1, slotAdjustments = {}) {
  return BASE_GAMES.map((game) => {
    const adjusted = { ...game, locationId };
    adjusted.pricePerSlot = Math.round(game.pricePerSlot * priceMultiplier);
    adjusted.rentalPrice = Math.round(game.rentalPrice * priceMultiplier);
    
    // Apply location-specific slot adjustments
    if (slotAdjustments[game.id]) {
      Object.assign(adjusted, slotAdjustments[game.id]);
    }
    
    return adjusted;
  });
}

// Hyderabad - base prices
const hydGames = createLocationGames('hyd', 1.0, {
  golf: { pricePerSlot: 1200, hours: { open: 6, close: 18 } },
  swimmingPool: { hours: { open: 6, close: 20 } },
});

// Vijayawada - slightly lower prices
const vjaGames = createLocationGames('vja', 0.85, {
  cricket: { pricePerSlot: 1100, hours: { open: 6, close: 19 } },
  tennis: { pricePerSlot: 400, hours: { open: 6, close: 20 } },
  badminton: { pricePerSlot: 250, hours: { open: 6, close: 21 } },
  golf: { pricePerSlot: 800, hours: { open: 6, close: 17 } },
});

// Amaravati - premium capital pricing
const amrGames = createLocationGames('amr', 1.15, {
  swimmingPool: { pricePerSlot: 350, hours: { open: 6, close: 21 } },
  golf: { pricePerSlot: 1400, hours: { open: 6, close: 18 } },
  tennis: { pricePerSlot: 600, hours: { open: 6, close: 20 } },
  badminton: { pricePerSlot: 350, hours: { open: 6, close: 22 } },
  squash: { pricePerSlot: 400, hours: { open: 7, close: 21 } }, // Extra game for Amaravati
});

export const ACTIVITIES = [
  ...hydGames,
  ...vjaGames,
  ...amrGames,
];

export function getActivitiesByLocation(locationId) {
  return ACTIVITIES.filter((a) => a.locationId === locationId);
}

export function getActivityById(locationId, activityId) {
  return ACTIVITIES.find((a) => a.locationId === locationId && a.id === activityId);
}

export function getAllActivities() {
  return ACTIVITIES;
}