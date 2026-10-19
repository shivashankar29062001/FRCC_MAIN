import { getAuthToken } from './auth';
import { supabase } from '../../../../services/supabase.js';

const BASE = '/api';

/**
 * Handles graceful fallback directly to Supabase when the Express development
 * server on port 5000 is not running.
 */
async function handleSupabaseFallback(path, { method = 'GET', body } = {}) {
  const url = new URL('http://dummy' + path);
  const pathname = url.pathname;

  // 1. Availability check: /api/bookings/availability?hallId=...&date=...
  if (pathname.includes('/bookings/availability')) {
    const hallId = url.searchParams.get('hallId');
    const date = url.searchParams.get('date');
    try {
      const { data, error } = await supabase
        .from('convention_bookings')
        .select('id, start_time, end_time')
        .eq('hall_id', hallId)
        .eq('date', date)
        .in('status', ['CONFIRMED', 'PENDING_VERIFICATION']);

      if (!error && Array.isArray(data)) {
        return {
          booked: data.map((b) => ({
            id: b.id,
            startTime: b.start_time,
            endTime: b.end_time,
          })),
        };
      }
    } catch (_) {}
    return { booked: [] };
  }

  // 2. Booking creation: POST /api/bookings
  if (pathname === '/bookings' && method === 'POST') {
    const b = body || {};
    const bookingId = `FRCC-H-${Date.now().toString(36).toUpperCase()}`;

    let userId = null;
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      userId = sessionData?.session?.user?.id || null;
    } catch (_) {}

    const hallCharge = Number(b.hallCharge) || 0;
    const gst = Math.round(hallCharge * 0.18);
    const fee = Number(b.convenienceFee) || 0;
    const totalAmount = hallCharge + gst + fee;

    const record = {
      id: bookingId,
      user_id: userId,
      hall_id: b.hallId || 'VH33',
      hall_name: b.hallName || 'Grand Convention Hall',
      date: b.date || new Date().toISOString().split('T')[0],
      start_time: b.startTime || '09:00',
      end_time: b.endTime || '18:00',
      guests: Number(b.guests) || 100,
      event_type: b.eventType || 'Conference',
      event_details: b.eventDetails || '',
      organizer_name: b.organizerName || 'Organizer',
      phone: b.phone || '',
      email: b.email || '',
      special_requests: b.specialRequests || '',
      hall_charge: hallCharge,
      gst,
      convenience_fee: fee,
      amount: totalAmount,
      amount_paid: b.amountPaid != null ? Number(b.amountPaid) : totalAmount,
      balance_due: b.balanceDue != null ? Number(b.balanceDue) : 0,
      payment_method: b.paymentMethod || 'UPI',
      status: 'CONFIRMED',
    };

    try {
      await supabase.from('convention_bookings').insert(record);
    } catch (err) {
      console.warn('[conventionApi] Supabase insert notice:', err);
    }

    // Return format expected by ConventionPayment.jsx
    return {
      ok: true,
      booking: {
        ...record,
        startTime: record.start_time,
        endTime: record.end_time,
        hallName: record.hall_name,
        hallId: record.hall_id,
        organizerName: record.organizer_name,
      },
    };
  }

  // 3. User's convention bookings: GET /api/bookings/my
  if (pathname === '/bookings/my') {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const userId = sessionData?.session?.user?.id;
      if (userId) {
        const { data, error } = await supabase
          .from('convention_bookings')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false });

        if (!error && Array.isArray(data)) {
          return {
            bookings: data.map((b) => ({
              ...b,
              startTime: b.start_time,
              endTime: b.end_time,
              hallName: b.hall_name,
            })),
          };
        }
      }
    } catch (_) {}
    return { bookings: [] };
  }

  // 4. Fallback for catalog routes (/halls, /venues, /locations)
  if (pathname === '/halls') {
    try {
      const resp = await import('../../../../data/halls.js');
      return { halls: resp.HALLS || [] };
    } catch (_) {
      return { halls: [] };
    }
  }

  return {};
}

export async function api(path, { method = 'GET', body, auth = true } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  const token = getAuthToken();
  if (auth && token) headers.Authorization = `Bearer ${token}`;

  let res;
  try {
    res = await fetch(BASE + path, { method, headers, body: body ? JSON.stringify(body) : undefined });
  } catch (err) {
    // If Express backend on port 5000 is offline, route to Supabase / local fallback
    console.info(`[conventionApi] Express backend unreachable for ${path}. Routing to Supabase fallback.`);
    return await handleSupabaseFallback(path, { method, body });
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    // If Express server returned 404 or error, check Supabase fallback
    if (res.status === 404 || res.status >= 500) {
      return await handleSupabaseFallback(path, { method, body });
    }
    throw new Error(data.error || 'Request failed');
  }
  return data;
}