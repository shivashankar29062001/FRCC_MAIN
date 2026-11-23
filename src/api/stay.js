// ---------------------------------------------------------------------------
// /src/api/stay.js — Stay & Room Booking API Service
// Honours VITE_USE_MOCK (mock = local data & in-memory bookings)
// ---------------------------------------------------------------------------

import { supabase } from '../services/supabase.js';
import { isValidIndianMobile } from '../utils/mobile.js';
import { isValidName, nameError } from '../utils/fullName.js';
import { rooms as LOCAL_ROOMS } from '../data/hotel.js';
import { isBookingCancelledLocally, CANCELLATION_CHANGED_EVENT } from '../services/cancellationService.js';

const isMock = typeof import.meta !== 'undefined' && import.meta.env?.VITE_USE_MOCK === 'true';

// In-memory mock bookings store for local mock mode
const mockStayBookings = [];

function getMockBookings() {
  const list = [...mockStayBookings];
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      const stored = JSON.parse(window.localStorage.getItem('frcc_stay_bookings') || '[]');
      if (Array.isArray(stored)) {
        for (const s of stored) {
          const matchRef = s.bookingRef || s.booking_ref || s.id;
          if (!list.some((b) => (b.booking_ref && b.booking_ref === matchRef) || (b.id && b.id === matchRef))) {
            list.push({
              id: s.id || matchRef,
              booking_ref: matchRef,
              user_id: s.userId || s.user_id,
              userId: s.userId || s.user_id,
              room_type_id: s.roomId || s.roomTypeId || s.room_type_id,
              check_in: s.checkin || s.check_in,
              check_out: s.checkout || s.check_out,
              rooms: Number(s.roomsCount || s.rooms || 1),
              guest_name: s.guestName || s.userName,
              guest_mobile: s.mobile || s.guestMobile || '',
              status: s.status || 'confirmed',
            });
          }
        }
      }
    } catch (_) {}
  }
  return list;
}

if (typeof window !== 'undefined') {
  window.addEventListener(CANCELLATION_CHANGED_EVENT, (e) => {
    const cid = e?.detail?.bookingId;
    if (cid) {
      for (const b of mockStayBookings) {
        if (b.id === cid || b.booking_ref === cid || b.bookingId === cid) {
          b.status = 'cancelled';
        }
      }
      try {
        if (window.localStorage) {
          const stored = JSON.parse(window.localStorage.getItem('frcc_stay_bookings') || '[]');
          let changed = false;
          for (const s of stored) {
            if (s.id === cid || s.bookingRef === cid || s.booking_ref === cid) {
              s.status = 'cancelled';
              changed = true;
            }
          }
          if (changed) {
            window.localStorage.setItem('frcc_stay_bookings', JSON.stringify(stored));
          }
        }
      } catch (_) {}
    }
  });
}

/**
 * Deduplicate room types so that aliases (e.g. 'standard-room' and 'vja-standard-room')
 * or repeated records never show double cards to users.
 */
export function deduplicateRoomTypes(list) {
  if (!Array.isArray(list)) return [];
  const map = new Map();
  for (const item of list) {
    if (!item) continue;
    const nameKey = String(item.name || '').trim().toLowerCase();
    const areaKey = String(item.area_id || item.areaId || 'vijayawada').trim().toLowerCase();
    const key = `${areaKey}:${nameKey}`;

    const existing = map.get(key);
    if (!existing) {
      map.set(key, item);
    } else {
      // If one of them has the canonical 'vja-' ID, prefer it over the unprefixed alias
      const existingId = String(existing.id || '');
      const currentId = String(item.id || '');
      if (!existingId.startsWith('vja-') && currentId.startsWith('vja-')) {
        map.set(key, item);
      }
    }
  }
  return Array.from(map.values());
}

/**
 * Fetch all active room types.
 */
export async function getRoomTypes() {
  if (isMock) {
    const raw = LOCAL_ROOMS.map((r) => ({
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
    return deduplicateRoomTypes(raw);
  }

  try {
    const { data, error } = await supabase
      .from('room_types')
      .select('*')
      .eq('active', true)
      .order('price_per_night', { ascending: true });

    if (!error && data && data.length > 0) {
      return deduplicateRoomTypes(data);
    }
  } catch (err) {
    console.warn('Error fetching room_types from database, falling back to local data:', err);
  }

  const fallback = LOCAL_ROOMS.map((r) => ({
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
  return deduplicateRoomTypes(fallback);
}

/**
 * Fetch real-time available rooms for a given check-in and check-out window.
 * Excludes cancelled bookings and bookings marked cancelled locally.
 */
export async function getAvailability(checkIn, checkOut) {
  if (isMock) {
    const allBookings = getMockBookings();
    return LOCAL_ROOMS.map((r) => {
<<<<<<< HEAD
      const bookedRooms = allBookings
        .filter((b) => {
          if (b.room_type_id !== r.id) return false;
          if (b.check_in >= checkOut || b.check_out <= checkIn) return false;
          if (b.status === 'cancelled') return false;
          if (isBookingCancelledLocally(b.id) || isBookingCancelledLocally(b.booking_ref) || isBookingCancelledLocally(b.bookingId)) {
            b.status = 'cancelled';
            return false;
          }
          return true;
        })
=======
      const bookedRooms = mockStayBookings
        .filter((b) => (
          b.room_type_id === r.id ||
          b.room_type_id === r.id.replace('vja-', '') ||
          `vja-${b.room_type_id}` === r.id
        ) && b.check_in < checkOut && b.check_out > checkIn && b.status !== 'cancelled')
>>>>>>> eb2e74ea3d58db10f578c98699eece993639cb2f
        .reduce((sum, b) => sum + (b.rooms || 1), 0);

      const available = Math.max(0, (r.roomsTotal || 1) - bookedRooms);
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

    if (!error && data && data.length > 0) {
      return deduplicateRoomTypes(data);
    }
  } catch (err) {
    console.warn('Error invoking get_available_rooms RPC, using fallback:', err);
  }

  // Fallback: query stay_bookings directly if possible, else return room types
  try {
    const types = await getRoomTypes();
    const { data: bookings } = await supabase
      .from('stay_bookings')
      .select('room_type_id, rooms, status, hold_expires_at, check_in, check_out')
      .lt('check_in', checkOut)
      .gt('check_out', checkIn);

    if (bookings) {
      const now = new Date();
      const activeBookings = bookings.filter((b) =>
        b.status === 'confirmed' || (b.status === 'pending' && (!b.hold_expires_at || new Date(b.hold_expires_at) > now))
      );

      return deduplicateRoomTypes(types).map((r) => {
        const booked = activeBookings
          .filter((b) =>
            b.room_type_id === r.id ||
            b.room_type_id === r.id.replace('vja-', '') ||
            `vja-${b.room_type_id}` === r.id
          )
          .reduce((sum, b) => sum + (Number(b.rooms) || 1), 0);
        return {
          ...r,
          available: Math.max(0, (r.rooms_total || r.roomsTotal || 0) - booked),
        };
      });
    }
  } catch (fallbackErr) {
    console.warn('Fallback availability query failed:', fallbackErr);
  }

  // Fallback if RPC or database is unavailable
  const allBookings = getMockBookings();
  const types = await getRoomTypes();
  return types.map((r) => {
    const bookedRooms = allBookings
      .filter((b) => {
        if (b.room_type_id !== r.id) return false;
        if (b.check_in >= checkOut || b.check_out <= checkIn) return false;
        if (b.status === 'cancelled') return false;
        if (isBookingCancelledLocally(b.id) || isBookingCancelledLocally(b.booking_ref) || isBookingCancelledLocally(b.bookingId)) {
          b.status = 'cancelled';
          return false;
        }
        return true;
      })
      .reduce((sum, b) => sum + (b.rooms || 1), 0);

    const available = Math.max(0, (r.rooms_total || r.roomsTotal || 1) - bookedRooms);
    return {
      ...r,
      available,
    };
  });
}

/**
 * Create a stay booking atomically.
 */
export async function createBooking(payload) {
  const guestMobile = payload.guestMobile || payload.guest_mobile;
  if (guestMobile && !isValidIndianMobile(guestMobile)) {
    throw new Error('Please enter a valid 10-digit Indian mobile number.');
  }
  const guestName = payload.guestName || payload.guest_name;
  if (guestName && !isValidName(guestName)) {
    throw new Error(nameError('Full name'));
  }
  const clientRequestId = payload.clientRequestId || payload.client_request_id || `req_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

  let sessionUserId = null;
  try {
    const { data: sessionData } = await supabase.auth.getSession();
    sessionUserId = sessionData?.session?.user?.id || null;
  } catch (_) {}
  const currentUserId = payload.userId || payload.user_id || sessionUserId;

  const checkIn = payload.checkIn || payload.check_in;
  const checkOut = payload.checkOut || payload.check_out;
  const roomTypeId = payload.roomTypeId || payload.room_type_id;
  const requestedRooms = Number(payload.rooms || 1);

  if (isMock) {
    const roomType = LOCAL_ROOMS.find((r) => r.id === roomTypeId) || LOCAL_ROOMS[0];
    const totalRooms = roomType.roomsTotal || 1;

    // Check availability against active overlapping bookings
    const allBookings = getMockBookings();
    const overlappingBookings = allBookings.filter((b) => {
      if (b.room_type_id !== roomType.id) return false;
      if (b.check_in >= checkOut || b.check_out <= checkIn) return false;
      if (b.status === 'cancelled') return false;
      if (isBookingCancelledLocally(b.id) || isBookingCancelledLocally(b.booking_ref) || isBookingCancelledLocally(b.bookingId)) {
        b.status = 'cancelled';
        return false;
      }
      return true;
    });

    const bookedRooms = overlappingBookings.reduce((sum, b) => sum + (b.rooms || 1), 0);
    if (bookedRooms + requestedRooms > totalRooms) {
      // Overlapping booking exists
      const userExisting = overlappingBookings.find(
        (b) =>
          (currentUserId && (b.user_id === currentUserId || b.userId === currentUserId)) ||
          (guestMobile && (b.guest_mobile === guestMobile || b.mobile === guestMobile))
      );

      const isOwn = Boolean(userExisting);
      const conflictRef = userExisting ? (userExisting.booking_ref || userExisting.id) : null;
      const err = new Error(
        isOwn
          ? 'This room is already booked for these dates. If this is your existing booking, you can cancel it below to free up the room.'
          : 'This room is already booked for these dates. Please choose another room or different dates.'
      );
      err.code = isOwn ? 'ROOM_ALREADY_BOOKED_BY_YOU' : 'ROOM_ALREADY_BOOKED';
      err.existingBookingRef = conflictRef;
      err.isOwnBooking = isOwn;
      throw err;
    }

    const year = new Date().getFullYear();
    const random6 = String(Math.floor(100000 + Math.random() * 900000));
    const bookingRef = `FRCC-S-${year}-${random6}`;

    const nights = Math.max(1, Math.round((new Date(checkOut) - new Date(checkIn)) / (1000 * 60 * 60 * 24)));
    const pricePerNight = roomType.pricePerNight;
    const subtotal = nights * pricePerNight * requestedRooms;
    const memberDiscount = payload.isMember ? Math.round(subtotal * 0.3) : 0;
    const couponDiscount = Number(payload.couponDiscount || payload.coupon_discount || 0);
    const total = Math.max(0, subtotal - memberDiscount - couponDiscount);

    const mockRecord = {
      id: `mock-stay-${Date.now()}`,
      client_request_id: clientRequestId,
      booking_ref: bookingRef,
      user_id: currentUserId,
      userId: currentUserId,
      room_type_id: roomType.id,
      check_in: checkIn,
      check_out: checkOut,
      nights,
      rooms: requestedRooms,
      adults: Number(payload.adults || 1),
      children: Number(payload.children || 0),
      guest_name: guestName || 'Guest',
      guest_mobile: guestMobile || '',
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
      is_test: false,
      created_at: new Date().toISOString(),
    };

    mockStayBookings.push(mockRecord);
    return mockRecord;
  }

  // Real Database Execution via create_stay_booking RPC
  const { data, error } = await supabase.rpc('create_stay_booking', {
    p_adults: Number(payload.adults || 1),
    p_check_in: checkIn,
    p_check_out: checkOut,
    p_children: Number(payload.children || 0),
    p_client_request_id: clientRequestId,
    p_coupon_code: payload.couponCode || payload.coupon_code || null,
    p_guest_email: payload.guestEmail || payload.guest_email || '',
    p_guest_mobile: guestMobile || '',
    p_guest_name: guestName || '',
    p_is_mock_paid: Boolean(payload.isMockPaid || payload.total === 0),
    p_payment_method: payload.paymentMethod || payload.payment_method || 'upi',
    p_room_type_id: roomTypeId,
    p_rooms: requestedRooms,
    p_special_request: payload.specialRequest || payload.special_request || null,
  });

  if (error) {
    console.error('Error in create_stay_booking RPC:', error);
    const msg = error.message || '';
    if (msg.includes('ROOM_ALREADY_BOOKED') || msg.includes('Insufficient room availability')) {
      let isOwn = false;
      let existingBookingRef = null;
      if (msg.includes('ROOM_ALREADY_BOOKED_BY_YOU:')) {
        existingBookingRef = msg.split('ROOM_ALREADY_BOOKED_BY_YOU:')[1]?.trim()?.split(/[\s,]+/)[0];
        isOwn = true;
      } else {
        try {
          const myBookings = await getMyStayBookings(currentUserId);
          const match = myBookings.find(
            (b) =>
              (b.room_type_id === roomTypeId || b.roomId === roomTypeId) &&
              b.check_in < checkOut &&
              b.check_out > checkIn &&
              b.status !== 'cancelled' &&
              !isBookingCancelledLocally(b.id || b.booking_ref)
          );
          if (match) {
            existingBookingRef = match.booking_ref || match.bookingRef || match.id;
            isOwn = true;
          }
        } catch (_) {}
      }

      const customErr = new Error(
        isOwn
          ? 'This room is already booked for these dates. If this is your existing booking, you can cancel it below to free up the room.'
          : 'This room is already booked for these dates. Please choose another room or different dates.'
      );
      customErr.code = isOwn ? 'ROOM_ALREADY_BOOKED_BY_YOU' : 'ROOM_ALREADY_BOOKED';
      customErr.existingBookingRef = existingBookingRef;
      customErr.isOwnBooking = isOwn;
      throw customErr;
    }
    throw error;
  }

  return data;
}

/**
 * Fetch stay bookings for the current or specified user.
 */
export async function getMyStayBookings(userId = null) {
  let currentUserId = userId;
  if (!currentUserId) {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      currentUserId = sessionData?.session?.user?.id || null;
    } catch (_) {}
  }

  if (isMock || !supabase) {
    const list = getMockBookings();
    return list
      .filter((b) => !currentUserId || b.user_id === currentUserId || b.userId === currentUserId)
      .map((b) => ({
        ...b,
        status: isBookingCancelledLocally(b.id || b.booking_ref || b.bookingId) ? 'cancelled' : (b.status || 'confirmed'),
      }))
      .reverse();
  }

  const { data, error } = await supabase
    .from('stay_bookings')
    .select('*, room_types(*)')
    .eq('user_id', currentUserId)
    .order('created_at', { ascending: false });

  if (error) {
    console.warn('Error fetching stay bookings from database, falling back to local store:', error);
    const list = getMockBookings();
    return list
      .filter((b) => !currentUserId || b.user_id === currentUserId || b.userId === currentUserId)
      .map((b) => ({
        ...b,
        status: isBookingCancelledLocally(b.id || b.booking_ref || b.bookingId) ? 'cancelled' : (b.status || 'confirmed'),
      }))
      .reverse();
  }

  return (data || []).map((b) => {
    const ref = b.booking_ref || b.bookingRef || b.id;
    const isCancelled = b.status === 'cancelled' || isBookingCancelledLocally(b.id) || isBookingCancelledLocally(ref);
    return {
      ...b,
      id: b.id,
      uuid: b.id,
      rawId: b.id,
      db_id: b.id,
      stay_id: b.id,
      raw_id: b.id,
      booking_ref: ref,
      bookingRef: ref,
      bookingId: ref,
      user_id: b.user_id || currentUserId,
      userId: b.user_id || currentUserId,
      status: isCancelled ? 'cancelled' : b.status,
    };
  });
}

export default {
  getRoomTypes,
  getAvailability,
  createBooking,
  getMyStayBookings,
};
