import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { readSession, writeSession, clearSession, setLoggedOutMarker, clearLoggedOutMarker } from '../session.js';
import { supabase } from '../../services/supabase.js';
import * as authService from '../../services/authService.js';
import * as bookingsService from '../../services/bookingsService.js';
import * as membershipService from '../../services/membershipService.js';
import * as notificationsService from '../../services/notificationsService.js';

// ---------------------------------------------------------------------------
// Global state: Supabase session, bookings, payments,
// membership, toasts, notifications.
// ---------------------------------------------------------------------------
const AppContext = createContext(null);

export function newId(prefix = 'FRCC') {
  return bookingsService.generateBookingId(prefix);
}

const seedNotifications = [
  { id: 'n1', title: 'Welcome to FRCC', body: 'Complete your membership to unlock member rates.', date: 'Today' },
  { id: 'n2', title: 'Weekend gala', body: 'Convention Hall open house this Saturday.', date: 'Yesterday' },
];

export const MEMBERSHIP_STORAGE_KEY = 'frcc.membership.v1';
export const MEMBER_FLAG_KEY = 'frcc.isMember.v1';

function readStoredMembership() {
  try {
    const raw = window.localStorage.getItem(MEMBERSHIP_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function AppProvider({ children }) {
  const [user, setUser] = useState(() => {
    const s = readSession();
    return s.loggedIn ? s : null;
  });
  const [authLoading, setAuthLoading] = useState(() => {
    const s = readSession();
    return !s.loggedIn;
  });

  const [bookings, setBookings] = useState([]);
  const [payments, setPayments] = useState([]);
  const [membership, setMembership] = useState(() => readStoredMembership());
  const [isMember, setIsMemberState] = useState(() => {
    const stored = readStoredMembership();
    if (stored && stored.memberId) return true;
    return Boolean(user?.isMember);
  });
  const [toasts, setToasts] = useState([]);
  const [notifications, setNotifications] = useState(seedNotifications);

  const pushToast = useCallback((message, kind = 'success') => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    setToasts((t) => [...t, { id, message, kind }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4000);
  }, []);

  // Fetch full user data from Supabase
  const hydrateUserData = useCallback(async (supabaseUser) => {
    if (!supabaseUser) return;
    try {
      const [profile, memberData, remoteBookings, remotePayments, remoteNotifs] = await Promise.all([
        authService.getUserProfile(supabaseUser.id),
        membershipService.getUserMembership(supabaseUser.id),
        bookingsService.getUserBookings(supabaseUser.id),
        bookingsService.getUserPayments(supabaseUser.id),
        notificationsService.getNotifications(supabaseUser.id),
      ]);

      const memberStatus = Boolean(
        profile?.is_member || (memberData && String(memberData.status).toLowerCase() === 'active')
      );

      const sessionObj = {
        id: supabaseUser.id,
        userId: profile?.user_id_code || `FRCC-U-${supabaseUser.id.substring(0, 6).toUpperCase()}`,
        name: profile?.name || supabaseUser.user_metadata?.name || supabaseUser.email?.split('@')[0] || 'Member',
        emailOrPhone: profile?.email || supabaseUser.email || profile?.phone || '',
        phone: profile?.phone || supabaseUser.user_metadata?.phone || '',
        isMember: memberStatus,
        loggedIn: true,
      };

      setUser(sessionObj);
      writeSession(sessionObj);
      setIsMemberState(memberStatus);

      if (memberData) {
        setMembership(memberData);
        try {
          window.localStorage.setItem(MEMBERSHIP_STORAGE_KEY, JSON.stringify(memberData));
          window.localStorage.setItem(MEMBER_FLAG_KEY, memberStatus ? '1' : '0');
        } catch {
          /* ignore */
        }
      }

      setBookings(Array.isArray(remoteBookings) ? remoteBookings : []);
      setPayments(Array.isArray(remotePayments) ? remotePayments : []);
      if (Array.isArray(remoteNotifs) && remoteNotifs.length > 0) {
        setNotifications(
          remoteNotifs.map((n) => ({
            id: n.id,
            title: n.title,
            body: n.body,
            type: n.type,
            date: new Date(n.created_at).toLocaleDateString(),
          }))
        );
      }
    } catch (err) {
      console.warn('Hydrate user data error:', err);
    }
  }, []);

  // Listen to Supabase Auth state changes
  useEffect(() => {
    const { data: authListener } = authService.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        await hydrateUserData(session.user);
      } else if (event === 'SIGNED_OUT') {
        clearSession();
        setUser(null);
        setMembership(null);
        setIsMemberState(false);
      }
    });

    // Check initial session
    supabase.auth.getSession()
      .then(async ({ data: { session } }) => {
        if (session?.user) {
          await hydrateUserData(session.user);
        }
      })
      .finally(() => {
        setAuthLoading(false);
      });

    return () => {
      authListener?.subscription?.unsubscribe();
    };
  }, [hydrateUserData]);

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
      return value;
    });
  }, []);

  const login = useCallback(async ({ emailOrPhone, password }) => {
    clearLoggedOutMarker();
    const { user: authUser } = await authService.signIn({ emailOrPhone, password });
    if (authUser) {
      await hydrateUserData(authUser);
    }
    return authUser;
  }, [hydrateUserData]);

  const signup = useCallback(async ({ name, emailOrPhone, password }) => {
    const { user: authUser } = await authService.signUp({ name, emailOrPhone, password });
    if (authUser) {
      await hydrateUserData(authUser);
    }
    return authUser;
  }, [hydrateUserData]);

  const logout = useCallback(async () => {
    try {
      await authService.signOut();
    } catch (err) {
      console.warn('Sign out error:', err);
    }
    clearSession();
    setLoggedOutMarker();
    try {
      window.sessionStorage.removeItem('frcc.postLoginRedirect.v1');
    } catch {
      /* ignore */
    }
    setUser(null);
    setMembership(null);
    setIsMemberState(false);
  }, []);

  const addBooking = useCallback(async (booking) => {
    const bookingId = booking.id || booking.bookingId || newId('FRCC');
    const record = { ...booking, bookingId, id: bookingId, status: booking.status || 'Confirmed' };

    setBookings((b) => [record, ...b]);

    let payRecord = null;
    if (booking.payment) {
      payRecord = {
        id: bookingsService.generatePaymentId(),
        bookingId,
        method: booking.payment.method,
        amount: booking.payment.amount ?? 0,
        status: 'Success',
      };
      setPayments((p) => [payRecord, ...p]);
    }

    try {
      await bookingsService.createBooking(record, payRecord);
    } catch (err) {
      console.warn('Error saving booking to Supabase:', err);
    }

    return record;
  }, []);

  const saveMembership = useCallback(async (m) => {
    if (m) {
      // Save to database first so sequential member_code is assigned by DB sequence
      const saved = await membershipService.saveUserMembership({
        userId: m.userId || user?.id || null,
        ...m,
      });

      if (!saved || (!saved.memberId && !saved.memberCode)) {
        throw new Error('No sequential membership ID returned by the database.');
      }

      const assignedCode = saved.memberCode || saved.memberId;
      const sanitized = {
        userId: m.userId || user?.id || null,
        memberId: assignedCode,
        memberCode: assignedCode,
        name: m.name || m.fullName || '',
        mobile: m.mobile || '',
        email: m.email || '',
        planName: m.planName || m.plan || 'FRCC Membership',
        planPrice: Number(m.planPrice || 0),
        amountPaid: Number(m.amountPaid ?? m.planPrice ?? 0), // TODO-REMOVE-TEST-COUPON
        paymentMethod: m.paymentMethod || 'upi', // TODO-REMOVE-TEST-COUPON
        couponCode: m.couponCode || null, // TODO-REMOVE-TEST-COUPON
        isTest: Boolean(m.isTest), // TODO-REMOVE-TEST-COUPON
        status: m.status || 'Active',
        createdAt: m.createdAt || new Date().toISOString(),
        validUntil: m.validUntil || null,
        dateOfBirth: m.dateOfBirth || m.dob || '',
        gender: m.gender || '',
        address: m.address || m.addressLine || '',
        addressLine: m.addressLine || m.address || '',
        city: m.city || '',
        state: m.state || '',
        pincode: m.pincode || '',
        emergencyContact: m.emergencyContact || '',
        aadhaarMasked: m.aadhaarMasked || '',
        ...saved,
        memberId: assignedCode,
        memberCode: assignedCode,
      };

      setMembership(sanitized);
      setIsMemberState(true);
      setUser((curr) => {
        if (!curr) return curr;
        const updated = { ...curr, isMember: true };
        writeSession(updated);
        return updated;
      });

      try {
        window.localStorage.setItem(MEMBERSHIP_STORAGE_KEY, JSON.stringify(sanitized));
        window.localStorage.setItem(MEMBER_FLAG_KEY, '1');
      } catch {
        /* ignore */
      }

      return sanitized;
    } else {
      setMembership(null);
      setIsMemberState(false);
      try {
        window.localStorage.removeItem(MEMBERSHIP_STORAGE_KEY);
        window.localStorage.removeItem(MEMBER_FLAG_KEY);
      } catch {
        /* ignore */
      }
    }
  }, []);

  const refreshUserData = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      await hydrateUserData(session.user);
    }
  }, [hydrateUserData]);

  const value = useMemo(
    () => ({
      user,
      authLoading,
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
      refreshUserData,
    }),
    [user, authLoading, login, signup, logout, bookings, payments, membership, isMember, setIsMember, saveMembership, addBooking, toasts, pushToast, notifications, refreshUserData],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used inside <AppProvider>');
  return ctx;
}
