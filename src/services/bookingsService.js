import { supabase } from './supabase.js';

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
  const { data: sessionData } = await supabase.auth.getSession();
  const currentUserId = sessionData?.session?.user?.id || bookingRecord.userId || null;

  const payload = {
    booking_id: bookingRecord.bookingId || bookingRecord.id,
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
    details: bookingRecord.details || bookingRecord.extras || {},
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
  let query = supabase
    .from('bookings')
    .select('*')
    .order('created_at', { ascending: false });

  if (userId) {
    query = query.eq('user_id', userId);
  }

  const { data, error } = await query;
  if (error) {
    console.warn('Error fetching bookings:', error);
    return [];
  }

  return (data || []).map((b) => ({
    ...b,
    id: b?.booking_id,
    bookingId: b?.booking_id,
    gameName: b?.title || 'Booking',
    game: b?.category === 'activity' ? (b?.title || '').toLowerCase().replace(/\s+/g, '-') : (b?.title || 'Booking'),
    date: b?.date || b?.checkin,
    slot: b?.slot,
    players: b?.players,
    amount: Number(b?.amount || 0),
    subtotal: Number(b?.subtotal || 0),
    discount: Number(b?.discount || 0),
    status: b?.status,
    createdAt: b?.created_at,
  }));
}

/**
 * Fetch all payments for a user.
 */
export async function getUserPayments(userId = null) {
  let query = supabase
    .from('payments')
    .select('*')
    .order('created_at', { ascending: false });

  if (userId) {
    query = query.eq('user_id', userId);
  }

  const { data, error } = await query;
  if (error) {
    console.warn('Error fetching payments:', error);
    return [];
  }

  return (data || []).map((p) => ({
    id: p?.payment_id,
    bookingId: p?.booking_id,
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
