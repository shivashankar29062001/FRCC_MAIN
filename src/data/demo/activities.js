// Demo activities/games for FRCC Vijayawada
// Single Location: Vijayawada

import { GAMES as BASE_GAMES } from '../../features/activities/games.config.js';

// Vijayawada activities using official client pricing
const vjaGames = BASE_GAMES.map((game) => ({
  ...game,
  locationId: 'vja',
}));

export const ACTIVITIES = vjaGames;

export function getActivitiesByLocation(locationId) {
  return ACTIVITIES.filter((a) => !locationId || a.locationId === locationId || a.locationId === 'vja');
}

export function getActivityById(locationId, activityId) {
  return ACTIVITIES.find((a) => a.id === activityId);
}

export function getAllActivities() {
  return ACTIVITIES;
}

export default {
  ACTIVITIES,
  getActivitiesByLocation,
  getActivityById,
  getAllActivities,
};