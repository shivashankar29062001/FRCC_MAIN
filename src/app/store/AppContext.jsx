import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
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
const EMPTY_MEMBERSHIP = {};

export function getMembershipStorageKey(userId) {
  return userId ? `${MEMBERSHIP_STORAGE_KEY}.${userId}` : `${MEMBERSHIP_STORAGE_KEY}.anon`;
}

export function getMemberFlagKey(userId) {
  return userId ? `${MEMBER_FLAG_KEY}.${userId}` : `${MEMBER_FLAG_KEY}.anon`;
}

function readStoredMembership(userId = null) {
  if (!userId) return null;
  try {
    const raw = window.localStorage.getItem(getMembershipStorageKey(userId));
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

/**
 * Purges all wizard drafts, confirmed receipts, and user-specific cached keys across the app.
 */
export function clearUserSessionAndDrafts(userId = null) {
  try {
    // SessionStorage wizard confirmations and drafts
    window.sessionStorage.removeItem('frcc_stay_confirmed');
    window.sessionStorage.removeItem('frcc_activities_confirmed');
    window.sessionStorage.removeItem('frcc_parking_confirmed_bookings_v1');
    window.sessionStorage.removeItem('frcc:confirmedBookings');
    window.sessionStorage.removeItem('frcc_stay_booking_draft');
    window.sessionStorage.removeItem('frcc_activities_booking_draft');
    window.sessionStorage.removeItem('frcc_booking');
    window.sessionStorage.removeItem('frcc_confirmed');
    window.sessionStorage.removeItem('frcc.postLoginRedirect.v1');

    // Clear user-specific storage keys if userId is known
    if (userId) {
      window.localStorage.removeItem(`frcc.activities.bookings.v1.${userId}`);
      window.localStorage.removeItem(`frcc_table_bookings_v1.${userId}`);
      window.localStorage.removeItem(`frcc.membership.v1.${userId}`);
      window.localStorage.removeItem(`frcc.isMember.v1.${userId}`);
      window.sessionStorage.removeItem(`frcc_parking_confirmed_bookings_v1.${userId}`);
    }

    // Always clean un-namespaced legacy keys
    window.localStorage.removeItem('frcc.activities.bookings.v1');
    window.localStorage.removeItem('frcc_table_bookings_v1');
    window.localStorage.removeItem('frcc.membership.v1');
    window.localStorage.removeItem('frcc.isMember.v1');
    window.sessionStorage.removeItem('frcc_parking_confirmed_bookings_v1');
  } catch {
    /* ignore storage errors */
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
  const [membership, setMembership] = useState(() => readStoredMembership(user?.id));
  const [isMember, setIsMemberState] = useState(() => {
    const stored = readStoredMembership(user?.id);
    if (stored && stored.memberId) return true;
    return Boolean(user?.isMember);
  });
  const [toasts, setToasts] = useState([]);
  const [notifications, setNotifications] = useState(seedNotifications);
  const [isPasswordRecovery, setIsPasswordRecovery] = useState(() => {
    try {
      if (typeof window !== 'undefined') {
        const stored = window.sessionStorage.getItem('frcc_is_password_recovery') === '1';
        const hasHash = Boolean(window.location.hash && window.location.hash.includes('type=recovery'));
        return Boolean(stored || hasHash);
      }
    } catch {
      /* ignore */
    }
    return false;
  });

  const clearPasswordRecovery = useCallback(() => {
    setIsPasswordRecovery(false);
    try {
      window.sessionStorage.removeItem('frcc_is_password_recovery');
    } catch {
      /* ignore */
    }
  }, []);

  // Clean legacy shared storage keys once on app startup
  useEffect(() => {
    try {
      window.localStorage.removeItem('frcc.activities.bookings.v1');
      window.localStorage.removeItem('frcc_table_bookings_v1');
      window.localStorage.removeItem('frcc.membership.v1');
      window.localStorage.removeItem('frcc.isMember.v1');
      window.sessionStorage.removeItem('frcc_parking_confirmed_bookings_v1');
    } catch (_) {}
  }, []);

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

      setUser((prevUser) => {
        if (
          prevUser &&
          prevUser.id === sessionObj.id &&
          prevUser.userId === sessionObj.userId &&
          prevUser.name === sessionObj.name &&
          prevUser.emailOrPhone === sessionObj.emailOrPhone &&
          prevUser.phone === sessionObj.phone &&
          prevUser.isMember === sessionObj.isMember &&
          prevUser.loggedIn === sessionObj.loggedIn
        ) {
          return prevUser;
        }
        writeSession(sessionObj);
        return sessionObj;
      });
      setIsMemberState((prev) => (prev === memberStatus ? prev : memberStatus));

      if (memberData) {
        setMembership((prev) => {
          if (
            prev &&
            prev.memberId === memberData.memberId &&
            prev.status === memberData.status &&
            prev.validUntil === memberData.validUntil
          ) {
            return prev;
          }
          try {
            window.localStorage.setItem(getMembershipStorageKey(supabaseUser.id), JSON.stringify(memberData));
            window.localStorage.setItem(getMemberFlagKey(supabaseUser.id), memberStatus ? '1' : '0');
          } catch {
            /* ignore */
          }
          return memberData;
        });
      } else {
        setMembership((prev) => {
          if (prev === null) return null;
          try {
            window.localStorage.removeItem(getMembershipStorageKey(supabaseUser.id));
            window.localStorage.setItem(getMemberFlagKey(supabaseUser.id), '0');
          } catch {
            /* ignore */
          }
          return null;
        });
      }

      setBookings((prev) => {
        const next = Array.isArray(remoteBookings) ? remoteBookings : [];
        if (prev.length === next.length && JSON.stringify(prev) === JSON.stringify(next)) {
          return prev;
        }
        return next;
      });
      setPayments((prev) => {
        const next = Array.isArray(remotePayments) ? remotePayments : [];
        if (prev.length === next.length && JSON.stringify(prev) === JSON.stringify(next)) {
          return prev;
        }
        return next;
      });
      if (Array.isArray(remoteNotifs) && remoteNotifs.length > 0) {
        const mapped = remoteNotifs.map((n) => ({
          id: n.id,
          title: n.title,
          body: n.body,
          type: n.type,
          date: new Date(n.created_at).toLocaleDateString(),
        }));
        setNotifications((prev) => {
          if (prev.length === mapped.length && JSON.stringify(prev) === JSON.stringify(mapped)) {
            return prev;
          }
          return mapped;
        });
      } else {
        setNotifications((prev) => (prev === seedNotifications ? prev : seedNotifications));
      }
    } catch (err) {
      console.warn('Hydrate user data error:', err);
    }
  }, []);

  const currentUserIdRef = useRef(user?.id || null);
  useEffect(() => {
    currentUserIdRef.current = user?.id || null;
  }, [user?.id]);

  // Listen to Supabase Auth state changes and run initial getSession once on mount
  useEffect(() => {
    let mounted = true;

    const { data: authListener } = authService.onAuthStateChange(async (event, session) => {
      if (!mounted) return;
      if (event === 'PASSWORD_RECOVERY') {
        setIsPasswordRecovery(true);
        try {
          window.sessionStorage.setItem('frcc_is_password_recovery', '1');
        } catch {
          /* ignore */
        }
      }
      if (session?.user) {
        const prevId = currentUserIdRef.current;
        if (prevId && prevId !== session.user.id) {
          clearUserSessionAndDrafts(prevId);
          setBookings([]);
          setPayments([]);
          setMembership(null);
          setIsMemberState(false);
          setNotifications(seedNotifications);
        }
        currentUserIdRef.current = session.user.id;
        await hydrateUserData(session.user);
      } else if (event === 'SIGNED_OUT') {
        clearPasswordRecovery();
        const prevId = currentUserIdRef.current;
        clearSession();
        clearUserSessionAndDrafts(prevId);
        currentUserIdRef.current = null;
        setUser(null);
        setBookings([]);
        setPayments([]);
        setMembership(null);
        setIsMemberState(false);
        setNotifications(seedNotifications);
      }
    });

    // Check initial session
    supabase.auth.getSession()
      .then(async ({ data: { session } }) => {
        if (!mounted) return;
        if (session?.user) {
          currentUserIdRef.current = session.user.id;
          await hydrateUserData(session.user);
        }
      })
      .catch((err) => {
        console.warn('Initial session check error:', err);
      })
      .finally(() => {
        if (mounted) {
          setAuthLoading(false);
        }
      });

    return () => {
      mounted = false;
      authListener?.subscription?.unsubscribe();
    };
  }, [hydrateUserData]);

  const setIsMember = useCallback((next) => {
    setIsMemberState((prev) => {
      const value = typeof next === 'function' ? next(prev) : Boolean(next);
      try {
        if (user?.id) {
          window.localStorage.setItem(getMemberFlagKey(user.id), value ? '1' : '0');
        }
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
  }, [user?.id]);

  const login = useCallback(async ({ emailOrPhone, password }) => {
    clearLoggedOutMarker();
    clearUserSessionAndDrafts(user?.id);
    setBookings([]);
    setPayments([]);
    setMembership(null);
    setIsMemberState(false);
    setNotifications(seedNotifications);
    const { user: authUser } = await authService.signIn({ emailOrPhone, password });
    if (authUser) {
      await hydrateUserData(authUser);
    }
    return authUser;
  }, [user?.id, hydrateUserData]);

  const signup = useCallback(async ({ name, emailOrPhone, password }) => {
    clearLoggedOutMarker();
    clearUserSessionAndDrafts(user?.id);
    setBookings([]);
    setPayments([]);
    setMembership(null);
    setIsMemberState(false);
    setNotifications(seedNotifications);
    const { user: authUser } = await authService.signUp({ name, emailOrPhone, password });
    if (authUser) {
      await hydrateUserData(authUser);
    }
    return authUser;
  }, [user?.id, hydrateUserData]);

  const logout = useCallback(async () => {
    clearPasswordRecovery();
    const prevUserId = user?.id;
    try {
      await authService.signOut();
    } catch (err) {
      console.warn('Sign out error:', err);
    }
    clearSession();
    setLoggedOutMarker();
    clearUserSessionAndDrafts(prevUserId);
    setUser(null);
    setBookings([]);
    setPayments([]);
    setMembership(null);
    setIsMemberState(false);
    setNotifications(seedNotifications);
  }, [user?.id]);

  const addBooking = useCallback(async (booking) => {
    const bookingId = booking.id || booking.bookingId || newId('FRCC');
    const currentUid = booking.user_id || booking.userId || user?.id || null;
    const record = {
      ...booking,
      bookingId,
      id: bookingId,
      user_id: currentUid,
      userId: currentUid,
      status: booking.status || 'Confirmed'
    };

    setBookings((b) => [record, ...b]);

    let payRecord = null;
    if (booking.payment) {
      payRecord = {
        id: bookingsService.generatePaymentId(),
        bookingId,
        user_id: currentUid,
        userId: currentUid,
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
  }, [user?.id]);

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
        const uid = sanitized.userId || user?.id;
        if (uid) {
          window.localStorage.setItem(getMembershipStorageKey(uid), JSON.stringify(sanitized));
          window.localStorage.setItem(getMemberFlagKey(uid), '1');
        }
      } catch {
        /* ignore */
      }

      return sanitized;
    } else {
      setMembership(null);
      setIsMemberState(false);
      try {
        if (user?.id) {
          window.localStorage.removeItem(getMembershipStorageKey(user.id));
          window.localStorage.removeItem(getMemberFlagKey(user.id));
        }
      } catch {
        /* ignore */
      }
    }
  }, [user?.id]);

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
      isPasswordRecovery,
      clearPasswordRecovery,
      login,
      signup,
      logout,
      bookings,
      payments,
      membership,
      membershipData: membership || EMPTY_MEMBERSHIP,
      isMember: Boolean(user?.isMember !== undefined ? user.isMember : isMember),
      setIsMember,
      saveMembership,
      addBooking,
      toasts,
      pushToast,
      notifications,
      refreshUserData,
    }),
    [user, authLoading, isPasswordRecovery, clearPasswordRecovery, login, signup, logout, bookings, payments, membership, isMember, setIsMember, saveMembership, addBooking, toasts, pushToast, notifications, refreshUserData],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used inside <AppProvider>');
  return ctx;
}
