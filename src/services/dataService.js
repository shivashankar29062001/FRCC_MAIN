// Data Service - Single entry point for all data access
// In demo mode or production: provides locations, hotels, halls, parking, and activities.

import { LOCATIONS, getLocationById, getDefaultLocation } from '../data/demo/locations.js';
import { HOTELS, getHotelsByLocation, getHotelById } from '../data/demo/hotels.js';
import { HALLS, getHallsByLocation, getHallById } from '../data/demo/halls.js';
import { PARKING_ZONES, getParkingByLocation, getParkingZoneById } from '../data/demo/parking.js';
import { ACTIVITIES, getActivitiesByLocation, getActivityById, getAllActivities } from '../data/demo/activities.js';

// Demo mode flag
const IS_DEMO_MODE = import.meta.env.VITE_DEMO_MODE === 'true';

const DEMO_DELAY = 150;
function delay(ms = DEMO_DELAY) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Get all locations
 */
export async function getLocations() {
  await delay(50);
  return [...LOCATIONS];
}

/**
 * Get location by ID
 */
export async function getLocation(id) {
  await delay(50);
  return getLocationById(id);
}

/**
 * Get default location
 */
export async function getDefaultLocationData() {
  await delay(50);
  return getDefaultLocation();
}

/**
 * Get hotels for a location
 */
export async function getHotels(locationId) {
  await delay(50);
  return getHotelsByLocation(locationId);
}

/**
 * Get single hotel by ID
 */
export async function getHotel(hotelId) {
  await delay(50);
  return getHotelById(hotelId);
}

/**
 * Get halls for a location
 */
export async function getHalls(locationId) {
  await delay(50);
  return getHallsByLocation(locationId);
}

/**
 * Get single hall by ID
 */
export async function getHall(hallId) {
  await delay(50);
  return getHallById(hallId);
}

/**
 * Get parking zones for a location
 */
export async function getParkingZones(locationId) {
  await delay(50);
  return getParkingByLocation(locationId);
}

/**
 * Get single parking zone by ID
 */
export async function getParkingZone(zoneId) {
  await delay(50);
  return getParkingZoneById(zoneId);
}

/**
 * Get activities/games for a location
 */
export async function getActivities(locationId) {
  await delay(50);
  return getActivitiesByLocation(locationId);
}

/**
 * Get single activity by ID
 */
export async function getActivity(locationId, activityId) {
  await delay(50);
  return getActivityById(locationId, activityId);
}

/**
 * Get all activities across all locations (for admin/search)
 */
export async function getAllActivitiesData() {
  await delay(50);
  return getAllActivities();
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