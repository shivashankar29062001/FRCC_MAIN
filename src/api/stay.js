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
            const isHyd = Boolean(
              s.cityId === 'hyd' ||
              s.city_id === 'hyd' ||
              s.venueId === 'hyd-residency' ||
              (s.cityName && s.cityName.toLowerCase().includes('hyd')) ||
              (s.areaName && s.areaName.toLowerCase().includes('hyd')) ||
              (s.location && s.location.toLowerCase().includes('hyd')) ||
              (s.details?.cityName && s.details.cityName.toLowerCase().includes('hyd')) ||
              (s.details?.cityId && String(s.details.cityId).toLowerCase().includes('hyd'))
            );
            list.push({
              id: s.id || matchRef,
              booking_ref: matchRef,
              bookingRef: matchRef,
              bookingId: matchRef,
              user_id: s.userId || s.user_id,
              userId: s.userId || s.user_id,
              room_type_id: s.roomId || s.roomTypeId || s.room_type_id,
              check_in: s.checkin || s.check_in,
              check_out: s.checkout || s.check_out,
              rooms: Number(s.roomsCount || s.rooms || 1),
              guest_name: s.guestName || s.userName,
              guest_mobile: s.mobile || s.guestMobile || '',
              status: s.status || 'confirmed',
              areaName: s.areaName || s.area_name || s.details?.areaName || (isHyd ? 'Hyderabad Campus' : 'Vijayawada Campus'),
              area_name: s.areaName || s.area_name || s.details?.areaName || (isHyd ? 'Hyderabad Campus' : 'Vijayawada Campus'),
              venueName: s.venueName || s.venue_name || s.details?.venueName || (isHyd ? 'Hyderabad Club Residency' : 'FRCC Riverfront'),
              venue_name: s.venueName || s.venue_name || s.details?.venueName || (isHyd ? 'Hyderabad Club Residency' : 'FRCC Riverfront'),
              cityName: s.cityName || s.city_name || s.details?.cityName || (isHyd ? 'Hyderabad' : 'Vijayawada'),
              city_name: s.cityName || s.city_name || s.details?.cityName || (isHyd ? 'Hyderabad' : 'Vijayawada'),
              cityId: isHyd ? 'hyd' : (s.cityId || s.city_id || 'vja'),
              city_id: isHyd ? 'hyd' : (s.cityId || s.city_id || 'vja'),
              venueId: s.venueId || s.venue_id || s.details?.venueId || (isHyd ? 'hyd-residency' : 'vja-residency'),
              venue_id: s.venueId || s.venue_id || s.details?.venueId || (isHyd ? 'hyd-residency' : 'vja-residency'),
              location: s.location || s.details?.location || (isHyd ? 'Hyderabad Campus · Hyderabad Club Residency' : 'Vijayawada Campus · FRCC Riverfront'),
              special_request: s.specialRequest || s.special_request || s.notes || null,
              specialRequest: s.specialRequest || s.special_request || s.notes || null,
              details: s.details,
              nights: s.nights || s.details?.nights,
              total: s.total ?? s.amount,
              subtotal: s.subtotal ?? s.basePrice,
              amount: s.amount ?? s.total,
              roomName: s.roomName || s.title,
              title: s.title || s.roomName,
              is_test: Boolean(s.is_test),
              created_at: s.createdAt || s.created_at || new Date().toISOString(),
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
export async function getAvailability(checkIn, checkOut, cityId = null) {
  const targetCity = cityId ? (String(cityId).toLowerCase().includes('hyd') ? 'hyd' : 'vja') : 'vja';

  // 1. Gather all local mock/offline bookings
  const localBookings = getMockBookings();

  // 2. Gather DB bookings if online
  let dbBookings = [];
  if (!isMock && supabase) {
    try {
      const { data } = await supabase
        .from('stay_bookings')
        .select('id, booking_ref, room_type_id, rooms, status, hold_expires_at, check_in, check_out, special_request')
        .lt('check_in', checkOut)
        .gt('check_out', checkIn)
        .neq('status', 'cancelled');
      if (data && Array.isArray(data)) {
        dbBookings = data;
      }
    } catch (_) {}
  }

  // Combine and deduplicate active bookings
  const allActiveBookings = [...localBookings];
  for (const dbB of dbBookings) {
    const ref = dbB.booking_ref || dbB.id;
    if (!allActiveBookings.some((b) => (b.booking_ref && b.booking_ref === ref) || (b.id && b.id === ref))) {
      allActiveBookings.push(dbB);
    }
  }

  return LOCAL_ROOMS.map((r) => {
    // 1 room of each room type in FRCC (client specification: 6 rooms total, 1 of each type)
    const maxRooms = 1;

    const bookedRooms = allActiveBookings
      .filter((b) => {
        if (b.status === 'cancelled') return false;
        if (isBookingCancelledLocally(b.id) || isBookingCancelledLocally(b.booking_ref) || isBookingCancelledLocally(b.bookingId)) {
          return false;
        }

        const bIn = b.check_in || b.checkin;
        const bOut = b.check_out || b.checkout;
        if (!bIn || !bOut) return false;
        if (bIn >= checkOut || bOut <= checkIn) return false;

        const bCity = (b.cityId || b.city_id || b.cityName || b.areaName || '').toLowerCase().includes('hyd') ||
          (b.special_request && String(b.special_request).toLowerCase().includes('hyd')) ? 'hyd' : 'vja';
        if (bCity !== targetCity) return false;

        const rId = String(r.id || '').toLowerCase().replace('vja-', '');
        const bRoomId = String(b.room_type_id || b.roomId || b.roomTypeId || '').toLowerCase().replace('vja-', '');
        const rName = String(r.name || '').toLowerCase();
        const bRoomName = String(b.roomName || b.title || '').toLowerCase();

        const matchId = bRoomId === rId || bRoomId === String(r.id).toLowerCase();
        const matchName = bRoomName && (bRoomName === rName || bRoomName.includes(rName) || rName.includes(bRoomName));

        return matchId || matchName;
      })
      .reduce((sum, b) => sum + (Number(b.rooms || b.roomsCount || 1)), 0);

    const available = Math.max(0, maxRooms - bookedRooms);
    return {
      id: r.id,
      area_id: targetCity === 'hyd' ? 'hyd' : (r.areaId || 'vijayawada'),
      category: r.category,
      name: r.name,
      description: r.description,
      bed_type: r.bedType,
      view: r.view,
      size_sqft: r.sizeSqft,
      max_guests: r.maxGuests,
      rooms_total: maxRooms,
      price_per_night: r.pricePerNight,
      amenities: r.amenities,
      active: true,
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

  const isHyd = Boolean(
    payload.cityId === 'hyd' ||
    payload.city_id === 'hyd' ||
    payload.venueId === 'hyd-residency' ||
    (payload.cityName && payload.cityName.toLowerCase().includes('hyd')) ||
    (payload.areaName && payload.areaName.toLowerCase().includes('hyd')) ||
    (payload.venueName && payload.venueName.toLowerCase().includes('hyd')) ||
    (payload.location && payload.location.toLowerCase().includes('hyd')) ||
    (payload.specialRequest && payload.specialRequest.toLowerCase().includes('hyd')) ||
    (payload.special_request && payload.special_request.toLowerCase().includes('hyd'))
  );
  const payloadCity = isHyd ? 'hyd' : 'vja';

  const pRoomId = String(roomTypeId || '').toLowerCase().replace('vja-', '').replace('hyd-', '');
  const pRoomName = String(payload.roomName || payload.title || '').toLowerCase();
  const roomType = LOCAL_ROOMS.find((r) => {
    const rId = String(r.id || '').toLowerCase().replace('vja-', '').replace('hyd-', '');
    const rName = String(r.name || '').toLowerCase();
    return rId === pRoomId || (pRoomName && (pRoomName === rName || pRoomName.includes(rName) || rName.includes(pRoomName)));
  }) || LOCAL_ROOMS[0];
  const totalRooms = 1; // Strict 1-room-per-type client rule (6 rooms total across property)

  // Enforce conflict check across both local bookings and Supabase
  const allBookings = [...getMockBookings()];
  if (supabase) {
    try {
      const { data: dbData } = await supabase
        .from('stay_bookings')
        .select('*')
        .lt('check_in', checkOut)
        .gt('check_out', checkIn)
        .neq('status', 'cancelled');
      if (dbData && Array.isArray(dbData)) {
        for (const dbB of dbData) {
          const ref = dbB.booking_ref || dbB.id;
          if (!allBookings.some((b) => (b.booking_ref && b.booking_ref === ref) || (b.id && b.id === ref))) {
            allBookings.push(dbB);
          }
        }
      }
    } catch (_) {}
  }

  const overlappingBookings = allBookings.filter((b) => {
    if (b.status === 'cancelled') return false;
    if (isBookingCancelledLocally(b.id) || isBookingCancelledLocally(b.booking_ref) || isBookingCancelledLocally(b.bookingId)) {
      return false;
    }
    const bIn = b.check_in || b.checkin;
    const bOut = b.check_out || b.checkout;
    if (!bIn || !bOut) return false;
    if (bIn >= checkOut || bOut <= checkIn) return false;

    const bCity = (b.cityId || b.city_id || b.cityName || b.areaName || '').toLowerCase().includes('hyd') ||
      (b.special_request && String(b.special_request).toLowerCase().includes('hyd')) ? 'hyd' : 'vja';
    if (bCity !== payloadCity) return false;

    const bRoomId = String(b.room_type_id || b.roomId || b.roomTypeId || '').toLowerCase().replace('vja-', '').replace('hyd-', '');
    const tRoomId = String(roomType.id || '').toLowerCase().replace('vja-', '').replace('hyd-', '');
    const bRoomName = String(b.roomName || b.title || '').toLowerCase();
    const tRoomName = String(roomType.name || '').toLowerCase();

    const matchId = bRoomId === tRoomId || bRoomId === String(roomType.id).toLowerCase();
    const matchName = bRoomName && (bRoomName === tRoomName || bRoomName.includes(tRoomName) || tRoomName.includes(bRoomName));

    return matchId || matchName;
  });

  const bookedRooms = overlappingBookings.reduce((sum, b) => sum + Number(b.rooms || b.roomsCount || 1), 0);
  if (bookedRooms + requestedRooms > totalRooms) {
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

  if (isMock) {

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
      bookingRef: bookingRef,
      bookingId: bookingRef,
      user_id: currentUserId,
      userId: currentUserId,
      room_type_id: roomType.id,
      roomName: payload.roomName || roomType.name,
      title: payload.roomName || roomType.name,
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
      specialRequest: payload.specialRequest || payload.special_request || null,
      areaName: payload.areaName || (isHyd ? 'Hyderabad Campus' : 'Vijayawada Campus'),
      area_name: payload.areaName || (isHyd ? 'Hyderabad Campus' : 'Vijayawada Campus'),
      venueName: payload.venueName || (isHyd ? 'Hyderabad Club Residency' : 'FRCC Riverfront'),
      venue_name: payload.venueName || (isHyd ? 'Hyderabad Club Residency' : 'FRCC Riverfront'),
      cityName: payload.cityName || (isHyd ? 'Hyderabad' : 'Vijayawada'),
      city_name: payload.cityName || (isHyd ? 'Hyderabad' : 'Vijayawada'),
      cityId: payloadCity,
      city_id: payloadCity,
      venueId: payload.venueId || (isHyd ? 'hyd-residency' : 'vja-residency'),
      venue_id: payload.venueId || (isHyd ? 'hyd-residency' : 'vja-residency'),
      location: payload.location || (isHyd ? 'Hyderabad Campus · Hyderabad Club Residency' : 'Vijayawada Campus · FRCC Riverfront'),
      details: payload.details || {
        areaName: payload.areaName || (isHyd ? 'Hyderabad Campus' : 'Vijayawada Campus'),
        venueName: payload.venueName || (isHyd ? 'Hyderabad Club Residency' : 'FRCC Riverfront'),
        cityName: payload.cityName || (isHyd ? 'Hyderabad' : 'Vijayawada'),
        cityId: payloadCity,
        venueId: payload.venueId || (isHyd ? 'hyd-residency' : 'vja-residency'),
      },
      price_per_night: pricePerNight,
      subtotal,
      member_discount: memberDiscount,
      coupon_code: payload.couponCode || payload.coupon_code || null,
      coupon_discount: couponDiscount,
      total,
      payment_method: payload.paymentMethod || payload.payment_method || 'upi',
      status: total === 0 || payload.isMockPaid ? 'confirmed' : 'pending',
      hold_expires_at: total === 0 ? null : new Date(Date.now() + 15 * 60 * 1000).toISOString(),
      is_test: Boolean(payload.isTest || payload.is_test),
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

  if (data) {
    mockStayBookings.push({
      ...data,
      room_type_id: roomType.id,
      roomName: payload.roomName || roomType.name,
      title: payload.roomName || roomType.name,
      cityId: payloadCity,
      city_id: payloadCity,
      cityName: payloadCity === 'hyd' ? 'Hyderabad' : 'Vijayawada',
      areaName: isHyd ? 'Hyderabad Campus' : 'Vijayawada Campus',
      venueName: isHyd ? 'Hyderabad Club Residency' : 'FRCC Riverfront',
      check_in: checkIn,
      check_out: checkOut,
      rooms: requestedRooms,
    });
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
