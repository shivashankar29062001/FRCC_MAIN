import { createContext, useContext, useMemo, useState, useEffect } from 'react';

const BookingContext = createContext(null);
const EMPTY = {
  venue: '', hallId: null,
  cityId: '', areaId: '', venueId: '',
  date: '', startTime: '', endTime: '',
  eventType: '', guests: '', eventDetails: '',
  organizerName: '', phone: '', email: '', specialRequests: '',
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

  const updateBooking = (patch) => setBookingState(b => ({ ...b, ...patch }));
  const resetBooking = () => { setBookingState(EMPTY); setConfirmed(null); sessionStorage.removeItem('frcc_booking'); };

  const value = useMemo(() => ({ booking, updateBooking, resetBooking, confirmed, setConfirmed }), [booking, confirmed]);
  return <BookingContext.Provider value={value}>{children}</BookingContext.Provider>;
}

export const useBooking = () => useContext(BookingContext);
