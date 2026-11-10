import { supabase } from './supabase.js';
import { isValidIndianMobile } from '../utils/mobile.js';

let paySeqCounter = 5000;

export function generatePaymentId() {
  paySeqCounter += 1;
  return `PAY-${paySeqCounter}`;
}

export function generateBookingId(prefix = 'ACT') {
  const year = new Date().getFullYear();
  const random6 = String(Math.floor(100000 + Math.random() * 900000));
  return `FRCC-${prefix}-${year}-${random6}`;
}

/**
 * Persist any booking (Activities, Stay, Hall, Parking) to Supabase.
 */
export async function createBooking(bookingRecord, paymentRecord = null) {
  if (bookingRecord?.mobile && !isValidIndianMobile(bookingRecord.mobile)) {
    throw new Error('Please enter a valid 10-digit Indian mobile number.');
  }
  const { data: sessionData } = await supabase.auth.getSession();
  const currentUserId = sessionData?.session?.user?.id || bookingRecord.userId || bookingRecord.user_id || null;

  const arrivalTime =
    bookingRecord.arrival_time ||
    bookingRecord.arrivalTime ||
    bookingRecord.time ||
    bookingRecord.details?.arrivalTime ||
    null;
  const bookingTime =
    bookingRecord.bookingTime ||
    bookingRecord.details?.bookingTime ||
    null;
  const mergedDetails = {
    ...(bookingRecord.details || bookingRecord.extras || {}),
    ...(arrivalTime ? { arrivalTime: String(arrivalTime).replace(/^(\d{2}:\d{2}):\d{2}$/, '$1') } : {}),
    ...(bookingTime ? { bookingTime } : {}),
  };

  const payload = {
    booking_id: bookingRecord.bookingRef || bookingRecord.bookingId || bookingRecord.id,
    user_id: currentUserId,
    category: bookingRecord.category || 'activity',
    title: bookingRecord.title || bookingRecord.gameName || bookingRecord.roomName || bookingRecord.hallName || bookingRecord.zoneName || 'Booking',
    date: bookingRecord.date || bookingRecord.checkin || null,
    slot: bookingRecord.slot || bookingRecord.slotLabel || null,
    checkin: bookingRecord.checkin || null,
    checkout: bookingRecord.checkout || null,
    area_name: bookingRecord.areaName || null,
    guests: bookingRecord.guests || null,
    players: Number(bookingRecord.players || 1),
    details: mergedDetails,
    subtotal: Number(bookingRecord.subtotal ?? bookingRecord.total ?? bookingRecord.amount ?? 0),
    discount: Number(bookingRecord.discount || 0),
    amount: Number(bookingRecord.amount ?? bookingRecord.total ?? 0),
    payment_method: bookingRecord.paymentMethod || (paymentRecord ? paymentRecord.method : null),
    is_member: Boolean(bookingRecord.isMember),
    status: bookingRecord.status || 'Confirmed',
    user_name: bookingRecord.userName || bookingRecord.guestName || bookingRecord.organizerName || bookingRecord.ownerName || null,
    mobile: bookingRecord.mobile || null,
    email: bookingRecord.email || null,
  };

  const { data: booking, error: bookingErr } = await supabase
    .from('bookings')
    .insert([payload])
    .select()
    .maybeSingle();

  if (bookingErr) {
    console.error('Error inserting booking:', bookingErr);
    throw bookingErr;
  }

  let payment = null;
  if (paymentRecord && paymentRecord.amount !== undefined) {
    const payPayload = {
      payment_id: paymentRecord.id || generatePaymentId(),
      booking_id: payload.booking_id,
      user_id: currentUserId,
      method: paymentRecord.method || payload.payment_method || 'upi',
      amount: Number(paymentRecord.amount || payload.amount || 0),
      status: paymentRecord.status || (payload.payment_method === 'pay_at_venue' ? 'Pending' : 'Success'),
    };

    const { data: payData, error: payErr } = await supabase
      .from('payments')
      .insert([payPayload])
      .select()
      .maybeSingle();

    if (!payErr) {
      payment = payData;
    } else {
      console.warn('Error recording payment:', payErr);
    }
  }

  return { booking, payment };
}

/**
 * Fetch all bookings for a user.
 */
export async function getUserBookings(userId = null) {
  let targetUserId = userId;
  if (!targetUserId) {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      targetUserId = sessionData?.session?.user?.id || null;
    } catch (_) {}
  }

  if (!targetUserId) {
    return [];
  }

  const { data, error } = await supabase
    .from('bookings')
    .select('*')
    .eq('user_id', targetUserId)
    .order('created_at', { ascending: false });

  if (error) {
    console.warn('Error fetching bookings:', error);
    return [];
  }

  return (data || []).map((b) => {
    const amount = Number(b?.amount || 0);
    let subtotal = Number(b?.subtotal || 0);
    let discount = Number(b?.discount || 0);

    // If subtotal was 0 in DB or less than amount, recover the true pre-discount price
    if ((subtotal <= 0 || subtotal < amount) && amount > 0) {
      if (b?.is_member || discount > 0) {
        subtotal = Math.round(amount / 0.7);
        discount = subtotal - amount;
      } else {
        subtotal = amount;
        discount = 0;
      }
    } else if (subtotal > amount && discount <= 0) {
      discount = subtotal - amount;
    }

    return {
      ...b,
      id: b?.id || b?.booking_id,
      uuid: b?.id,
      rawId: b?.id,
      booking_id: b?.booking_id,
      bookingId: b?.booking_id,
      bookingRef: b?.booking_id,
      booking_ref: b?.booking_id,
      user_id: b?.user_id || targetUserId,
      userId: b?.user_id || targetUserId,
      gameId: b?.game_id || b?.details?.gameId || null,
      gameName: b?.title || 'Booking',
      game: b?.category === 'activity' ? (b?.details?.gameId || (b?.title || '').toLowerCase().replace(/\s+/g, '-')) : (b?.title || 'Booking'),
      cityId: b?.details?.cityId || null,
      cityName: b?.details?.cityName || b?.details?.city || null,
      areaName:
        b?.area_name ||
        b?.details?.areaName ||
        (String(b?.details?.city || '').toLowerCase().includes('hyd')
          ? 'Hyderabad Campus'
          : b?.details?.city
          ? 'Vijayawada Campus'
          : null),
      location: b?.details?.location || b?.area_name || b?.details?.areaName || null,
      date: b?.date || b?.checkin,
      slot: b?.slot,
      time: b?.details?.arrivalTime || b?.details?.bookingTime || b?.details?.time || null,
      arrival_time: b?.details?.arrivalTime || b?.details?.time || null,
      arrivalTime: b?.details?.arrivalTime || b?.details?.time || null,
      bookingTime: b?.details?.bookingTime || null,
      players: b?.players,
      amount,
      total: amount,
      subtotal,
      discount,
      status: b?.status,
      createdAt: b?.created_at,
    };
  });
}

/**
 * Fetch all payments for a user.
 */
export async function getUserPayments(userId = null) {
  let targetUserId = userId;
  if (!targetUserId) {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      targetUserId = sessionData?.session?.user?.id || null;
    } catch (_) {}
  }

  if (!targetUserId) {
    return [];
  }

  const { data, error } = await supabase
    .from('payments')
    .select('*')
    .eq('user_id', targetUserId)
    .order('created_at', { ascending: false });

  if (error) {
    console.warn('Error fetching payments:', error);
    return [];
  }

  return (data || []).map((p) => ({
    id: p?.payment_id,
    payment_id: p?.payment_id,
    bookingId: p?.booking_id,
    user_id: p?.user_id || targetUserId,
    userId: p?.user_id || targetUserId,
    method: p?.method,
    amount: Number(p?.amount || 0),
    status: p?.status,
    date: p?.created_at,
  }));
}

/**
 * Cancel a booking by booking ID.
 */
export async function cancelBooking(bookingId) {
  const { data, error } = await supabase
    .from('bookings')
    .update({ status: 'Cancelled', updated_at: new Date().toISOString() })
    .eq('booking_id', bookingId)
    .select()
    .maybeSingle();

  if (error) throw error;
  return data;
}
