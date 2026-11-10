import { createContext, useContext, useMemo, useState, useEffect, useCallback } from 'react';

const BookingContext = createContext(null);
const EMPTY = {
  venue: '', hallId: null,
  cityId: '', areaId: '', venueId: '',
  date: '', startTime: '', endTime: '',
  eventType: '', guests: '', eventDetails: '',
  organizerName: '', phone: '', email: '', specialRequests: '',
  notifyUpdates: true,
  heldBookingId: null,
  holdExpiresAt: null,
  serverHallCharge: null,
  serverGst: null,
  serverAmount: null,
  slotError: '',
  slotErrorCode: '',
};

export function BookingProvider({ children }) {
  const [booking, setBookingState] = useState(() => {
    try { return { ...EMPTY, ...JSON.parse(sessionStorage.getItem('frcc_booking')) }; } catch { return EMPTY; }
  });
  const [confirmed, setConfirmed] = useState(() => {
    try { return JSON.parse(sessionStorage.getItem('frcc_confirmed')); } catch { return null; }
  });

  useEffect(() => { sessionStorage.setItem('frcc_booking', JSON.stringify(booking)); }, [booking]);
  useEffect(() => {
    if (confirmed) sessionStorage.setItem('frcc_confirmed', JSON.stringify(confirmed));
    else sessionStorage.removeItem('frcc_confirmed');
  }, [confirmed]);

  const updateBooking = useCallback((patch) => {
    setBookingState((b) => {
      const next = { ...b, ...patch };
      const slotChanged = (
        ('hallId' in patch && patch.hallId !== b.hallId) ||
        ('date' in patch && patch.date !== b.date) ||
        ('startTime' in patch && patch.startTime !== b.startTime) ||
        ('endTime' in patch && patch.endTime !== b.endTime) ||
        ('guests' in patch && String(patch.guests || '') !== String(b.guests || ''))
      );
      if (slotChanged && !('holdExpiresAt' in patch)) {
        next.holdExpiresAt = null;
        next.serverHallCharge = null;
        next.serverGst = null;
        next.serverAmount = null;
      }
      return next;
    });
  }, []);

  const clearHold = useCallback(() => {
    setBookingState((b) => ({
      ...b,
      heldBookingId: null,
      holdExpiresAt: null,
      serverHallCharge: null,
      serverGst: null,
      serverAmount: null,
    }));
  }, []);

  const clearSlotError = useCallback(() => {
    setBookingState((b) => ({ ...b, slotError: '', slotErrorCode: '' }));
  }, []);

  const resetBooking = useCallback(() => {
    setBookingState(EMPTY);
    setConfirmed(null);
    sessionStorage.removeItem('frcc_booking');
  }, []);

  const value = useMemo(
    () => ({ booking, updateBooking, resetBooking, clearHold, clearSlotError, confirmed, setConfirmed }),
    [booking, updateBooking, resetBooking, clearHold, clearSlotError, confirmed],
  );
  return <BookingContext.Provider value={value}>{children}</BookingContext.Provider>;
}

export const useBooking = () => useContext(BookingContext);
