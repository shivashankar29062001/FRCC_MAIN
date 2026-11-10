import { getAuthToken } from './auth';
import {
  getCities,
  getVenues,
  getVenueById,
  getAllHalls,
  getHallById,
} from './conventionData.js';

const BASE = '/api';

/**
 * Handles fallback to the static conventionData catalog and empty read defaults for
 * non-booking endpoints (locations, venues, halls, reviews, notifications, contact).
 * Hall bookings, availability, cancellations, refunds, and payments MUST use hallBookingService.js.
 */
async function handleCatalogAndMiscFallback(path) {
  const url = new URL('http://dummy' + path);
  const pathname = url.pathname;

  // Locations hierarchy: GET /api/locations
  if (pathname.includes('/locations')) {
    return { cities: getCities() };
  }

  // Venues: GET /api/venues, GET /api/venues/:id
  if (pathname.startsWith('/venues')) {
    const parts = pathname.split('/').filter(Boolean);
    if (parts.length === 2 && parts[1] && parts[1] !== 'venues') {
      const venueData = getVenueById(parts[1]);
      return venueData ? { venue: venueData, halls: venueData.halls || [] } : { venue: null, halls: [] };
    }
    const cityId = url.searchParams.get('cityId');
    const areaId = url.searchParams.get('areaId');
    return { venues: getVenues(cityId, areaId) };
  }

  // Halls: GET /api/halls, GET /api/halls/:id
  if (pathname.startsWith('/halls')) {
    const parts = pathname.split('/').filter(Boolean);
    if (parts.length === 2 && parts[1] && parts[1] !== 'halls') {
      const hall = getHallById(parts[1]);
      return { hall };
    }
    return { halls: getAllHalls() };
  }

  // Reviews / Notifications / Contact tickets fallback
  if (pathname.startsWith('/reviews')) return { ok: true, reviews: [] };
  if (pathname.startsWith('/notifications')) return { ok: true, notifications: [] };
  if (pathname.startsWith('/contact')) return { ok: true, tickets: [] };

  return {};
}

export async function api(path, { method = 'GET', body, auth = true } = {}) {
  const url = new URL('http://dummy' + path);
  if (url.pathname.startsWith('/bookings') || url.pathname.includes('/verify-upi')) {
    throw new Error('Hall booking, availability, cancellation, and payment verification must use Supabase via hallBookingService.');
  }

  const headers = { 'Content-Type': 'application/json' };
  const token = getAuthToken();
  if (auth && token) headers.Authorization = `Bearer ${token}`;

  let res;
  try {
    res = await fetch(BASE + path, { method, headers, body: body ? JSON.stringify(body) : undefined });
  } catch {
    return await handleCatalogAndMiscFallback(path);
  }

  const contentType = res.headers.get('content-type') || '';
  if (!res.ok || contentType.includes('text/html')) {
    return await handleCatalogAndMiscFallback(path);
  }

  const data = await res.json().catch(() => null);
  if (!data) {
    return await handleCatalogAndMiscFallback(path);
  }
  return data;
}
