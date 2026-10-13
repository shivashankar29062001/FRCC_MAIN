import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { readSession, writeSession, clearSession, createSessionUser, setLoggedOutMarker, clearLoggedOutMarker } from '../session.js';

// ---------------------------------------------------------------------------
// Global state: session (login + user id), bookings, payments,
// membership, toasts, notifications.
// Session logic lives in ../session.js so other teams can share it.
// ---------------------------------------------------------------------------
const AppContext = createContext(null);

let seq = 1000;
export function newId(prefix = 'FRCC') {
  seq += 1;
  const d = new Date();
  const ymd = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
  return `${prefix}-${ymd}-${seq}`;
}

const seedNotifications = [
  { id: 'n1', title: 'Welcome to FRCC', body: 'Complete your membership to unlock member rates.', date: 'Today' },
  { id: 'n2', title: 'Weekend gala', body: 'Convention Hall open house this Saturday.', date: 'Yesterday' },
];

const IS_DEMO_MODE = typeof import.meta !== 'undefined' && import.meta.env?.VITE_DEMO_MODE === 'true';
const MEMBER_FLAG_KEY = 'frcc.isMember.v1';

function readMemberFlag() {
  try {
    const saved = window.localStorage.getItem(MEMBER_FLAG_KEY);
    if (saved !== null) return saved === '1';
    return IS_DEMO_MODE;
  } catch {
    return IS_DEMO_MODE;
  }
}

export function AppProvider({ children }) {
  // null = logged out (ProtectedRoute checks truthiness), otherwise the session shape.
  const [user, setUser] = useState(() => {
    const s = readSession();
    return s.loggedIn ? s : null;
  });
  const [bookings, setBookings] = useState([]); // { id, type, title, date, amount, status, details }
  const [payments, setPayments] = useState([]); // { id, bookingId, method, amount, date, status }
  // Membership data — filled by the membership team's module.
  const [membership, setMembership] = useState(null); // { memberId, plan, name, qrPayload }
  // isMember drives /membership/dashboard (active vs locked) and the navbar Member badge.
  const [isMember, setIsMemberState] = useState(() => (user?.isMember !== undefined ? Boolean(user.isMember) : readMemberFlag()));

  const setIsMember = useCallback((next) => {
    setIsMemberState((prev) => {
      const value = typeof next === 'function' ? next(prev) : Boolean(next);
      try {
        window.localStorage.setItem(MEMBER_FLAG_KEY, value ? '1' : '0');
      } catch {
        /* ignore */
      }
      setUser((curr) => {
        if (!curr) return null;
        const updated = { ...curr, isMember: value };
        writeSession(updated);
        return updated;
      });
      // Keep a placeholder membership card in sync so both dashboard views are testable.
      // TODO(Phase 2): replace with GET /api/membership/me.
      setMembership((m) =>
        value
          ? m || { memberId: 'FRCC-M-2026-0042', planName: 'Gold Lifetime', name: 'Member', since: '2026', validity: 'Lifetime · Active', qrPayload: 'FRCC-M-2026-0042' }
          : null,
      );
      return value;
    });
  }, []);
  const [toasts, setToasts] = useState([]);
  const [notifications] = useState(seedNotifications);

  const pushToast = useCallback((message, kind = 'success') => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    setToasts((t) => [...t, { id, message, kind }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3600);
  }, []);

  const login = useCallback((payload) => {
    // TODO: POST /api/auth/login → verify credentials → issue session.
    const memberFlag = payload.isMember !== undefined ? Boolean(payload.isMember) : readMemberFlag();
    const next = createSessionUser({ ...payload, isMember: memberFlag });
    writeSession(next);
    clearLoggedOutMarker(); // clear logout marker on successful login
    setUser(next);
    setIsMemberState(memberFlag);
    return next;
  }, []);

  const signup = useCallback((payload) => {
    // TODO: POST /api/auth/signup with Name / Mail-Mobile / password hash + OTP.
    return createSessionUser(payload);
  }, []);

  const logout = useCallback(() => {
    // TODO: POST /api/auth/logout → revoke server session.
    clearSession();
    setLoggedOutMarker(); // prevent demo auto-login until next sign-in
    try {
      window.sessionStorage.removeItem('frcc.postLoginRedirect.v1');
    } catch {
      /* ignore */
    }
    setUser(null);
  }, []);

  const addBooking = useCallback((booking) => {
    const id = booking.id || newId('FRCC');
    const record = { ...booking, id, status: booking.status || 'Confirmed', createdAt: new Date().toISOString() };
    setBookings((b) => [record, ...b]);
    if (booking.payment) {
      setPayments((p) => [
        { id: newId('PAY'), bookingId: id, method: booking.payment.method, amount: booking.payment.amount ?? 0, date: new Date().toLocaleString(), status: 'Success' },
        ...p,
      ]);
    }
    return record;
  }, []);

  // Integration point for the membership team's module.
  const saveMembership = useCallback((m) => {
    // TODO: called by GET/POST /api/membership once that team's data lands.
    setMembership(m);
  }, []);

  const value = useMemo(
    () => ({
      user,
      userId: user?.userId || null,
      login,
      signup,
      logout,
      bookings,
      payments,
      membership,
      membershipData: membership || {},
      isMember: Boolean(user?.isMember !== undefined ? user.isMember : isMember),
      setIsMember,
      saveMembership,
      addBooking,
      toasts,
      pushToast,
      notifications,
    }),
    [user, login, signup, logout, bookings, payments, membership, isMember, setIsMember, saveMembership, addBooking, toasts, pushToast, notifications],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used inside <AppProvider>');
  return ctx;
}
