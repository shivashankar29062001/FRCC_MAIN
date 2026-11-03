// ---------------------------------------------------------------------------
// /src/api/events.js — FRCC Events API Service
// Handles fetching upcoming events, event details, admin CRUD, and image upload.
// Honours VITE_USE_MOCK and falls back to sample events when no active events exist.
// ---------------------------------------------------------------------------

import { supabase } from '../services/supabase.js';
import { getSampleEvents } from '../data/sampleEvents.js';

const IS_MOCK =
  typeof import.meta !== 'undefined' && import.meta.env?.VITE_USE_MOCK === 'true';

const SHOW_SAMPLE_EVENTS =
  typeof import.meta !== 'undefined' && import.meta.env?.VITE_SHOW_SAMPLE_EVENTS === 'true';

const MOCK_STORAGE_KEY = 'frcc.mock.events.v1';

// In-memory / localStorage mock store for mock mode
function getMockEventsStore() {
  if (typeof window === 'undefined') return getSampleEvents();
  try {
    const raw = window.localStorage.getItem(MOCK_STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    /* ignore */
  }
  const samples = getSampleEvents();
  try {
    window.localStorage.setItem(MOCK_STORAGE_KEY, JSON.stringify(samples));
  } catch {
    /* ignore */
  }
  return samples;
}

function saveMockEventsStore(events) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(MOCK_STORAGE_KEY, JSON.stringify(events));
  } catch {
    /* ignore */
  }
}

/**
 * Checks whether the current user is an administrator.
 *
 * @returns {Promise<boolean>}
 */
export async function isAdmin() {
  if (IS_MOCK) {
    // In mock mode, admin can be controlled via env or defaults to true for testing
    return typeof import.meta !== 'undefined' && import.meta.env?.VITE_MOCK_IS_ADMIN !== 'false';
  }

  try {
    const { data, error } = await supabase.rpc('is_admin');
    if (!error && typeof data === 'boolean') {
      return data;
    }
  } catch {
    /* fallback to direct admins table check */
  }

  try {
    const { data: sessionData } = await supabase.auth.getSession();
    const currentUserId = sessionData?.session?.user?.id;
    if (!currentUserId) return false;

    const { data, error } = await supabase
      .from('admins')
      .select('user_id')
      .eq('user_id', currentUserId)
      .maybeSingle();

    return Boolean(!error && data?.user_id);
  } catch (err) {
    console.warn('[eventsApi] isAdmin check error:', err);
    return false;
  }
}

/**
 * Fetches upcoming active events ordered by event_date ascending.
 * Past events are hidden.
 * Shows sample events when there are no real active events or when VITE_SHOW_SAMPLE_EVENTS is true.
 *
 * @returns {Promise<Array>}
 */
export async function getUpcomingEvents() {
  const today = new Date().toISOString().slice(0, 10);

  if (IS_MOCK) {
    const store = getMockEventsStore();
    const upcoming = store.filter((e) => e.active && e.event_date >= today);
    upcoming.sort((a, b) => a.event_date.localeCompare(b.event_date));
    return upcoming.length > 0 ? upcoming : getSampleEvents();
  }

  try {
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .eq('active', true)
      .gte('event_date', today)
      .order('event_date', { ascending: true });

    if (error) {
      console.warn('[eventsApi] getUpcomingEvents query error:', error);
      return getSampleEvents();
    }

    const realEvents = (data || []).map((e) => ({ ...e, isSample: false }));

    if (SHOW_SAMPLE_EVENTS) {
      const sampleEvents = getSampleEvents();
      return [...realEvents, ...sampleEvents].sort((a, b) => a.event_date.localeCompare(b.event_date));
    }

    if (realEvents.length === 0) {
      // Fallback to sample events when no active events exist in database
      return getSampleEvents();
    }

    return realEvents;
  } catch (err) {
    console.warn('[eventsApi] getUpcomingEvents error:', err);
    return getSampleEvents();
  }
}

/**
 * Fetches single event details by id (from real DB or sample events).
 *
 * @param {string} id
 * @returns {Promise<object|null>}
 */
export async function getEvent(id) {
  if (!id) return null;

  if (IS_MOCK) {
    const store = getMockEventsStore();
    const match = store.find((e) => String(e.id) === String(id));
    if (match) return match;
    return getSampleEvents().find((e) => String(e.id) === String(id)) || null;
  }

  try {
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (!error && data) {
      return { ...data, isSample: false };
    }
  } catch (err) {
    console.warn('[eventsApi] getEvent query error:', err);
  }

  // Fallback to sample events if not found in DB (e.g. sample clicked)
  return getSampleEvents().find((e) => String(e.id) === String(id)) || null;
}

/**
 * Admin: List all events (active & inactive, past & upcoming) ordered by event_date desc.
 *
 * @returns {Promise<Array>}
 */
export async function adminListEvents() {
  if (IS_MOCK) {
    const store = getMockEventsStore();
    return [...store].sort((a, b) => b.event_date.localeCompare(a.event_date));
  }

  const { data, error } = await supabase
    .from('events')
    .select('*')
    .order('event_date', { ascending: false });

  if (error) {
    console.warn('[eventsApi] adminListEvents error:', error);
    throw error;
  }

  return (data || []).map((e) => ({ ...e, isSample: false }));
}

/**
 * Admin: Save (create or update) an event.
 *
 * @param {object} event
 * @returns {Promise<object>}
 */
export async function adminSaveEvent(event) {
  if (IS_MOCK) {
    const store = getMockEventsStore();
    const isNew = !event.id || String(event.id).startsWith('sample-') || String(event.id).includes('-');
    const eventId = isNew ? `mock-evt-${Date.now()}` : event.id;
    const record = {
      ...event,
      id: eventId,
      isSample: false,
      updated_at: new Date().toISOString(),
      created_at: event.created_at || new Date().toISOString(),
    };

    const existingIdx = store.findIndex((e) => String(e.id) === String(eventId));
    if (existingIdx >= 0) {
      store[existingIdx] = record;
    } else {
      store.unshift(record);
    }
    saveMockEventsStore(store);
    return record;
  }

  const { data: sessionData } = await supabase.auth.getSession();
  const currentUserId = sessionData?.session?.user?.id || null;

  const payload = {
    title: (event.title || '').trim(),
    category: event.category || 'screening',
    event_date: event.event_date,
    start_time: event.start_time || null,
    end_time: event.end_time || null,
    venue: (event.venue || 'FRCC').trim(),
    description: (event.description || '').trim(),
    image_url: event.image_url || null,
    featured: Boolean(event.featured),
    active: event.active !== undefined ? Boolean(event.active) : true,
    created_by: currentUserId,
  };

  if (event.id && !String(event.id).startsWith('mock-') && !String(event.id).includes('-')) {
    // Update existing database event
    const { data, error } = await supabase
      .from('events')
      .update(payload)
      .eq('id', event.id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  // Insert new event
  const { data, error } = await supabase
    .from('events')
    .insert([payload])
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Admin: Delete an event by id.
 *
 * @param {string} id
 * @returns {Promise<void>}
 */
export async function adminDeleteEvent(id) {
  if (!id) return;

  if (IS_MOCK) {
    const store = getMockEventsStore();
    const updated = store.filter((e) => String(e.id) !== String(id));
    saveMockEventsStore(updated);
    return;
  }

  const { error } = await supabase
    .from('events')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

/**
 * Admin: Upload an event image to the "event-images" Supabase storage bucket.
 * If storage client is not available or upload fails, skips upload and returns null so UI keeps image URL field.
 *
 * @param {File} file
 * @returns {Promise<string|null>}
 */
export async function uploadEventImage(file) {
  if (!file) return null;

  if (IS_MOCK) {
    return URL.createObjectURL(file);
  }

  try {
    if (!supabase?.storage) {
      console.warn('[eventsApi] Storage client not available, skipping upload');
      return null;
    }

    const ext = file.name.split('.').pop() || 'jpg';
    const cleanExt = ext.replace(/[^a-zA-Z0-9]/g, '');
    const filename = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${cleanExt}`;

    const { error: uploadError } = await supabase.storage
      .from('event-images')
      .upload(filename, file, { cacheControl: '3600', upsert: true });

    if (uploadError) {
      console.warn('[eventsApi] Storage bucket upload failed:', uploadError.message);
      return null;
    }

    const { data: urlData } = supabase.storage
      .from('event-images')
      .getPublicUrl(filename);

    return urlData?.publicUrl || null;
  } catch (err) {
    console.warn('[eventsApi] uploadEventImage exception, keeping URL field:', err);
    return null;
  }
}

export default {
  getUpcomingEvents,
  getEvent,
  isAdmin,
  adminListEvents,
  adminSaveEvent,
  adminDeleteEvent,
  uploadEventImage,
};
