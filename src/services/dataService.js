// Data Service - Single entry point for all data access
// In demo mode (VITE_DEMO_MODE=true): reads from local demo files
// In production mode: reads from Supabase (stub for now)

import { LOCATIONS, getLocationById, getDefaultLocation } from '../data/demo/locations.js';
import { HOTELS, getHotelsByLocation, getHotelById } from '../data/demo/hotels.js';
import { HALLS, getHallsByLocation, getHallById } from '../data/demo/halls.js';
import { PARKING_ZONES, getParkingByLocation, getParkingZoneById } from '../data/demo/parking.js';
import { ACTIVITIES, getActivitiesByLocation, getActivityById, getAllActivities } from '../data/demo/activities.js';

// Demo mode flag
const IS_DEMO_MODE = import.meta.env.VITE_DEMO_MODE === 'true';

// Simulate network delay for realistic UX
const DEMO_DELAY = 300;
function delay(ms = DEMO_DELAY) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Error helper
function createError(message) {
  const err = new Error(message);
  err.isDemoError = true;
  return err;
}

/**
 * Get all locations
 */
export async function getLocations() {
  if (IS_DEMO_MODE) {
    await delay();
    return [...LOCATIONS];
  }
  // TODO: Replace with Supabase call
  throw createError('Production mode not implemented - Supabase adapter needed');
}

/**
 * Get location by ID
 */
export async function getLocation(id) {
  if (IS_DEMO_MODE) {
    await delay(100);
    return getLocationById(id);
  }
  throw createError('Production mode not implemented');
}

/**
 * Get default location
 */
export async function getDefaultLocationData() {
  if (IS_DEMO_MODE) {
    await delay(50);
    return getDefaultLocation();
  }
  throw createError('Production mode not implemented');
}

/**
 * Get hotels for a location
 */
export async function getHotels(locationId) {
  if (IS_DEMO_MODE) {
    await delay();
    return getHotelsByLocation(locationId);
  }
  throw createError('Production mode not implemented');
}

/**
 * Get single hotel by ID
 */
export async function getHotel(hotelId) {
  if (IS_DEMO_MODE) {
    await delay(100);
    return getHotelById(hotelId);
  }
  throw createError('Production mode not implemented');
}

/**
 * Get halls for a location
 */
export async function getHalls(locationId) {
  if (IS_DEMO_MODE) {
    await delay();
    return getHallsByLocation(locationId);
  }
  throw createError('Production mode not implemented');
}

/**
 * Get single hall by ID
 */
export async function getHall(hallId) {
  if (IS_DEMO_MODE) {
    await delay(100);
    return getHallById(hallId);
  }
  throw createError('Production mode not implemented');
}

/**
 * Get parking zones for a location
 */
export async function getParkingZones(locationId) {
  if (IS_DEMO_MODE) {
    await delay();
    return getParkingByLocation(locationId);
  }
  throw createError('Production mode not implemented');
}

/**
 * Get single parking zone by ID
 */
export async function getParkingZone(zoneId) {
  if (IS_DEMO_MODE) {
    await delay(100);
    return getParkingZoneById(zoneId);
  }
  throw createError('Production mode not implemented');
}

/**
 * Get activities/games for a location
 */
export async function getActivities(locationId) {
  if (IS_DEMO_MODE) {
    await delay();
    return getActivitiesByLocation(locationId);
  }
  throw createError('Production mode not implemented');
}

/**
 * Get single activity by ID
 */
export async function getActivity(locationId, activityId) {
  if (IS_DEMO_MODE) {
    await delay(100);
    return getActivityById(locationId, activityId);
  }
  throw createError('Production mode not implemented');
}

/**
 * Get all activities across all locations (for admin/search)
 */
export async function getAllActivitiesData() {
  if (IS_DEMO_MODE) {
    await delay();
    return getAllActivities();
  }
  throw createError('Production mode not implemented');
}

/**
 * Check if demo mode is enabled
 */
export function isDemoMode() {
  return IS_DEMO_MODE;
}

// Export demo data directly for components that need synchronous access
export const demoData = {
  LOCATIONS,
  HOTELS,
  HALLS,
  PARKING_ZONES,
  ACTIVITIES,
};

export default {
  getLocations,
  getLocation,
  getDefaultLocationData,
  getHotels,
  getHotel,
  getHalls,
  getHall,
  getParkingZones,
  getParkingZone,
  getActivities,
  getActivity,
  getAllActivitiesData,
  isDemoMode,
  demoData,
};