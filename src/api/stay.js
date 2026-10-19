// ---------------------------------------------------------------------------
// /src/api/stay.js — Stay & Room Booking API Service
// Honours VITE_USE_MOCK (mock = local data & in-memory bookings)
// ---------------------------------------------------------------------------

import { supabase } from '../services/supabase.js';
import { rooms as LOCAL_ROOMS } from '../data/hotel.js';

const isMock = typeof import.meta !== 'undefined' && import.meta.env?.VITE_USE_MOCK === 'true';

// In-memory mock bookings store for local mock mode
const mockStayBookings = [];

/**
 * Fetch all active room types.
 */
export async function getRoomTypes() {
  if (isMock) {
    return LOCAL_ROOMS.map((r) => ({
      id: r.id,
      area_id: r.areaId || 'vijayawada',
      category: r.category,
      name: r.name,
      description: r.description,
      bed_type: r.bedType,
      view: r.view,
      size_sqft: r.sizeSqft,
      max_guests: r.maxGuests,
      rooms_total: r.roomsTotal,
      price_per_night: r.pricePerNight,
      amenities: r.amenities,
      active: true,
    }));
  }

  try {
    const { data, error } = await supabase
      .from('room_types')
      .select('*')
      .eq('active', true)
      .order('price_per_night', { ascending: true });

    if (!error && data && data.length > 0) {
      return data;
    }
  } catch (err) {
    console.warn('Error fetching room_types from database, falling back to local data:', err);
  }

  return LOCAL_ROOMS.map((r) => ({
    id: r.id,
    area_id: r.areaId || 'vijayawada',
    category: r.category,
    name: r.name,
    description: r.description,
    bed_type: r.bedType,
    view: r.view,
    size_sqft: r.sizeSqft,
    max_guests: r.maxGuests,
    rooms_total: r.roomsTotal,
    price_per_night: r.pricePerNight,
    amenities: r.amenities,
    active: true,
  }));
}

/**
 * Fetch real-time available rooms for a given check-in and check-out window.
 */
export async function getAvailability(checkIn, checkOut) {
  if (isMock) {
    return LOCAL_ROOMS.map((r) => {
      const bookedRooms = mockStayBookings
        .filter((b) => b.room_type_id === r.id && b.check_in < checkOut && b.check_out > checkIn && b.status !== 'cancelled')
        .reduce((sum, b) => sum + (b.rooms || 1), 0);

      const available = Math.max(0, (r.roomsTotal || 10) - bookedRooms);
      return {
        id: r.id,
        area_id: r.areaId || 'vijayawada',
        category: r.category,
        name: r.name,
        description: r.description,
        bed_type: r.bedType,
        view: r.view,
        size_sqft: r.sizeSqft,
        max_guests: r.maxGuests,
        rooms_total: r.roomsTotal,
        price_per_night: r.pricePerNight,
        amenities: r.amenities,
        active: true,
        available,
      };
    });
  }

  try {
    const { data, error } = await supabase.rpc('get_available_rooms', {
      p_check_in: checkIn,
      p_check_out: checkOut,
    });

    if (!error && data) {
      return data;
    }
  } catch (err) {
    console.warn('Error invoking get_available_rooms RPC, using fallback:', err);
  }

  // Fallback if RPC or database is unavailable
  return getRoomTypes().then((types) =>
    types.map((r) => ({
      ...r,
      available: r.rooms_total,
    }))
  );
}

/**
 * Create a stay booking atomically.
 */
export async function createBooking(payload) {
  const clientRequestId = payload.clientRequestId || payload.client_request_id || `req_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

  if (isMock) {
    const year = new Date().getFullYear();
    const random6 = String(Math.floor(100000 + Math.random() * 900000));
    const bookingRef = `FRCC-S-${year}-${random6}`;

    const nights = Math.max(1, Math.round((new Date(payload.checkOut || payload.check_out) - new Date(payload.checkIn || payload.check_in)) / (1000 * 60 * 60 * 24)));
    const rooms = Number(payload.rooms || 1);
    const roomType = LOCAL_ROOMS.find((r) => r.id === (payload.roomTypeId || payload.room_type_id)) || LOCAL_ROOMS[0];
    const pricePerNight = roomType.pricePerNight;
    const subtotal = nights * pricePerNight * rooms;
    const memberDiscount = payload.isMember ? Math.round(subtotal * 0.3) : 0;
    const couponDiscount = Number(payload.couponDiscount || payload.coupon_discount || 0);
    const total = Math.max(0, subtotal - memberDiscount - couponDiscount);

    const mockRecord = {
      id: `mock-stay-${Date.now()}`,
      client_request_id: clientRequestId,
      booking_ref: bookingRef,
      user_id: payload.userId || payload.user_id || null,
      room_type_id: roomType.id,
      check_in: payload.checkIn || payload.check_in,
      check_out: payload.checkOut || payload.check_out,
      nights,
      rooms,
      adults: Number(payload.adults || 1),
      children: Number(payload.children || 0),
      guest_name: payload.guestName || payload.guest_name || 'Guest',
      guest_mobile: payload.guestMobile || payload.guest_mobile || '',
      guest_email: payload.guestEmail || payload.guest_email || '',
      special_request: payload.specialRequest || payload.special_request || null,
      price_per_night: pricePerNight,
      subtotal,
      member_discount: memberDiscount,
      coupon_code: payload.couponCode || payload.coupon_code || null,
      coupon_discount: couponDiscount,
      total,
      payment_method: payload.paymentMethod || payload.payment_method || 'upi',
      status: total === 0 || payload.isMockPaid ? 'confirmed' : 'pending',
      hold_expires_at: total === 0 ? null : new Date(Date.now() + 15 * 60 * 1000).toISOString(),
      is_test: Boolean(couponDiscount > 0 || payload.isTest),
      created_at: new Date().toISOString(),
    };

    mockStayBookings.push(mockRecord);
    return mockRecord;
  }

  // Real Database Execution via create_stay_booking RPC
  const { data, error } = await supabase.rpc('create_stay_booking', {
    p_adults: Number(payload.adults || 1),
    p_check_in: payload.checkIn || payload.check_in,
    p_check_out: payload.checkOut || payload.check_out,
    p_children: Number(payload.children || 0),
    p_client_request_id: clientRequestId,
    p_coupon_code: payload.couponCode || payload.coupon_code || null,
    p_guest_email: payload.guestEmail || payload.guest_email || '',
    p_guest_mobile: payload.guestMobile || payload.guest_mobile || '',
    p_guest_name: payload.guestName || payload.guest_name || '',
    p_is_mock_paid: Boolean(payload.isMockPaid || payload.total === 0),
    p_payment_method: payload.paymentMethod || payload.payment_method || 'upi',
    p_room_type_id: payload.roomTypeId || payload.room_type_id,
    p_rooms: Number(payload.rooms || 1),
    p_special_request: payload.specialRequest || payload.special_request || null,
  });

  if (error) {
    console.error('Error in create_stay_booking RPC:', error);
    throw error;
  }

  return data;
}

/**
 * Fetch stay bookings for the current or specified user.
 */
export async function getMyStayBookings(userId = null) {
  if (isMock) {
    return [...mockStayBookings].reverse();
  }

  const { data: sessionData } = await supabase.auth.getSession();
  const currentUserId = userId || sessionData?.session?.user?.id;

  if (!currentUserId) return [];

  const { data, error } = await supabase
    .from('stay_bookings')
    .select('*, room_types(*)')
    .eq('user_id', currentUserId)
    .order('created_at', { ascending: false });

  if (error) {
    console.warn('Error fetching stay bookings from database:', error);
    return [];
  }

  return data || [];
}

export default {
  getRoomTypes,
  getAvailability,
  createBooking,
  getMyStayBookings,
};
