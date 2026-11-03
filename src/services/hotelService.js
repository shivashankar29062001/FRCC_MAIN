// ---------------------------------------------------------------------------
// /src/services/hotelService.js — FRCC Stay / Hotel Service Adapter
// Bridges to /src/api/stay.js for unified database and mock operations
// ---------------------------------------------------------------------------

import {
  getRoomTypes,
  getAvailability,
  createBooking as apiCreateStayBooking,
  getMyStayBookings,
} from '../api/stay.js';
import { rooms as LOCAL_ROOMS } from '../data/hotel.js';

export function generateStayBookingId() {
  const year = new Date().getFullYear();
  const random6 = String(Math.floor(100000 + Math.random() * 900000));
  return `FRCC-S-${year}-${random6}`;
}

export async function getStayRooms(areaId = 'vijayawada') {
  return getRoomTypes();
}

export async function getStayRoomById(id) {
  const rooms = await getRoomTypes();
  return rooms.find((r) => r.id === id || r.type === id || r.name === id) || LOCAL_ROOMS.find((r) => r.id === id) || null;
}

export async function checkStayAvailability(roomId, checkin, checkout) {
  const rooms = await getAvailability(checkin, checkout);
  const found = rooms.find((r) => r.id === roomId);
  return {
    roomId,
    totalRooms: found?.rooms_total || found?.roomsTotal || 10,
    availableRooms: found?.available ?? 10,
    isAvailable: (found?.available ?? 10) > 0,
  };
}

export async function createStayReservation(stayData, paymentMethod = 'upi') {
  return apiCreateStayBooking({
    clientRequestId: stayData.clientRequestId || `stay_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
    userId: stayData.userId,
    roomTypeId: stayData.roomId || stayData.roomTypeId || stayData.id,
    checkIn: stayData.checkin || stayData.check_in,
    checkOut: stayData.checkout || stayData.check_out,
    rooms: stayData.roomsCount || stayData.rooms || 1,
    adults: stayData.adults || 1,
    children: stayData.children || 0,
    guestName: stayData.guestName || stayData.name || 'Guest',
    guestMobile: stayData.mobile || stayData.guestMobile || '',
    guestEmail: stayData.email || stayData.guestEmail || '',
    specialRequest: stayData.specialRequest || stayData.special_request || null,
    paymentMethod,
    couponCode: stayData.couponCode || null,
    isMember: Boolean(stayData.isMember),
    isMockPaid: Boolean(stayData.total === 0 || stayData.amount === 0 || paymentMethod === 'mock' || paymentMethod === 'coupon'),
  });
}

export async function getUserStayBookings(userId = null) {
  return getMyStayBookings(userId);
}

export {
  getRoomTypes,
  getAvailability,
  apiCreateStayBooking,
  getMyStayBookings,
};

export default {
  getStayRooms,
  getStayRoomById,
  checkStayAvailability,
  createStayReservation,
  getUserStayBookings,
};
