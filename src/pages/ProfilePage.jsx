import { useMemo, useState, useEffect } from 'react';
import { Link, useSearchParams, useNavigate, useLocation } from 'react-router-dom';
import { useApp } from '../app/store/AppContext.jsx';
import { getMyStayBookings } from '../api/stay.js';
import { supabase } from '../services/supabase.js';
import { getMyTableBookings } from '../api/dining.js';
import { useActivityBookings } from '../features/activities/bookings.store.js';
import { formatINR } from '../features/activities/games.config.js';
import { MEMBER_DISCOUNT_LABEL } from '../config/pricing.js';
import { IMAGES } from '../config/images.js';
import { formatDMY, formatDMYTime } from '../utils/dates.js';
import { useMockQuery } from '../app/hooks/useMockQuery.js';
import {
  Card,
  EmptyState,
  LoadingState,
  SkeletonGrid,
  ErrorState,
  StatusTag,
} from '../components/ui/feedback.jsx';
import { Input, LoadingButton, SearchInput } from '../components/ui/controls.jsx';
import { Reveal } from '../components/ui/motion.jsx';
import {
  UserIcon,
  ShieldIcon,
  CalendarIcon,
  MembershipIcon,
  DownloadIcon,
  ArrowRightIcon,
  MailIcon,
  PhoneIcon,
  XIcon,
} from '../components/ui/icons.jsx';
import { downloadOfficialApplicationForm } from '../utils/downloadForm.js';
import {
  normalizeMobile,
  isValidMobile,
  formatMobileDisplay,
  isLegacySyntheticEmail,
  sanitizeMobileInput,
} from '../utils/phone.js';
import {
  canCancelBooking,
  getCancellationPolicyInfo,
  cancelBooking,
  getPersistedCancelledIds,
  persistCancelledId,
  isBookingCancelledLocally,
} from '../services/cancellationService.js';

// ---------------------------------------------------------------------------
// /profile — EVERY logged-in user. Reached only from the navbar avatar menu.
// Tabs: Personal Details (editable) · Change Password · My Bookings · Payment History.
// ---------------------------------------------------------------------------

const TABS = [
  { id: 'details', label: 'Personal Details', icon: UserIcon },
  { id: 'password', label: 'Change Password', icon: ShieldIcon },
  { id: 'bookings', label: 'My Bookings', icon: CalendarIcon },
  { id: 'payments', label: 'Payment History', icon: MembershipIcon },
];

function PersonalDetails({ user, membership, pushToast }) {
  const { refreshUserData } = useApp();
  const rawEmail = (user?.email || '').trim();
  const isSynthetic = isLegacySyntheticEmail(rawEmail);
  const realEmail = isSynthetic ? '' : rawEmail;

  const [name, setName] = useState(user?.name || '');
  const [mobile, setMobile] = useState(() => {
    const raw = user?.phone || user?.mobile || (isSynthetic ? rawEmail.replace(/@frcc\.member$/i, '') : '');
    return normalizeMobile(raw);
  });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');
  const [mobileErr, setMobileErr] = useState('');

  // Email update flow
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [emailSending, setEmailSending] = useState(false);
  const [emailStatus, setEmailStatus] = useState('');
  const [emailErr, setEmailErr] = useState('');

  useEffect(() => {
    if (user?.name) setName(user.name);
    const raw = user?.phone || user?.mobile || (isSynthetic ? rawEmail.replace(/@frcc\.member$/i, '') : '');
    setMobile(normalizeMobile(raw));
  }, [user, isSynthetic, rawEmail]);

  async function handleSendEmailVerification(e) {
    e.preventDefault();
    setEmailErr('');
    setEmailStatus('');
    const cleanEmail = newEmail.trim().toLowerCase();
    if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      setEmailErr('Please enter a valid email address.');
      return;
    }
    if (cleanEmail.endsWith('@frcc.member')) {
      setEmailErr('Please enter a real email address.');
      return;
    }
    setEmailSending(true);
    try {
      const { updateEmail } = await import('../services/authService.js');
      const { error } = await updateEmail(cleanEmail);
      if (error) throw error;
      setEmailStatus(`Confirmation link sent to ${cleanEmail}. Please check your inbox and click the verification link to complete the change.`);
      pushToast(`Verification link sent to ${cleanEmail}. Check your inbox!`, 'success');
      setNewEmail('');
    } catch (apiErr) {
      setEmailErr(apiErr?.message || 'Failed to send verification email.');
      pushToast(apiErr?.message || 'Failed to send verification email.', 'error');
    } finally {
      setEmailSending(false);
    }
  }

  async function save(e) {
    e.preventDefault();
    setErr('');
    setMobileErr('');

    if (name.trim().length < 2) {
      setErr('Please enter your full name (minimum 2 characters).');
      return;
    }

    const cleanMob = normalizeMobile(mobile);
    if (!cleanMob) {
      setMobileErr('Mobile number is required.');
      return;
    }
    if (!isValidMobile(cleanMob)) {
      setMobileErr('Enter a valid 10-digit Indian mobile number starting with 6, 7, 8, or 9.');
      return;
    }

    setSaving(true);
    try {
      const { updateProfile } = await import('../services/authService.js');
      if (user?.id) {
        await updateProfile(user.id, {
          name: name.trim(),
          phone: cleanMob,
        });
      }
      if (refreshUserData) {
        await refreshUserData();
      }
      pushToast('Personal details updated and saved.');
    } catch (apiErr) {
      pushToast(apiErr?.message || 'Error updating profile details.', 'error');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <h3 className="h-card">Personal Details</h3>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1">
        <p className="caption">User ID {user?.userId || '—'}</p>
        {(membership?.memberCode || membership?.memberId) && (
          <p className="caption font-mono font-semibold text-gold-700">
            Member ID: {membership.memberCode || membership.memberId}
          </p>
        )}
      </div>

      <form onSubmit={save} className="mt-5 grid gap-5 sm:grid-cols-2" noValidate>
        <div>
          <label className="label" htmlFor="profile-name">Full name</label>
          <Input
            id="profile-name"
            name="name"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              if (err) setErr('');
            }}
            autoComplete="name"
            error={err}
          />
        </div>

        <div>
          <label className="label" htmlFor="profile-mobile">Mobile Number</label>
          <Input
            id="profile-mobile"
            name="mobile"
            inputMode="numeric"
            maxLength={10}
            type="tel"
            value={mobile}
            placeholder="10-digit mobile number"
            onChange={(e) => {
              setMobile(sanitizeMobileInput(e.target.value));
              if (mobileErr) setMobileErr('');
            }}
            autoComplete="tel-national"
            error={mobileErr}
          />
          <p className="caption mt-1 text-slate-500">
            {normalizeMobile(mobile)
              ? `Preview: ${formatMobileDisplay(mobile)}`
              : 'Accepts spaces, +91 or 0; 10 digits stored (e.g. +91 98765 43210)'}
          </p>
        </div>

        {/* Email Address Section */}
        <div className="sm:col-span-2 rounded-xl border border-slate-200 bg-slate-50/60 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <span className="block text-xs font-semibold uppercase tracking-wider text-slate-500">
                Email Address
              </span>
              {realEmail ? (
                <div className="mt-1 flex items-center gap-2">
                  <MailIcon className="h-4 w-4 text-emerald-600" />
                  <span className="font-semibold text-navy-900">{realEmail}</span>
                  <span className="rounded bg-emerald-100 px-2 py-0.5 text-[11px] font-bold text-emerald-800">
                    Verified
                  </span>
                </div>
              ) : (
                <div className="mt-1 flex items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-900">
                    Email: not added
                  </span>
                  <span className="text-xs text-slate-500">
                    Add a verified email to receive receipts and recovery links.
                  </span>
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() => {
                setShowEmailForm((prev) => !prev);
                setEmailErr('');
                setEmailStatus('');
              }}
              className="btn-base inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-navy-900 shadow-sm hover:border-gold-500 hover:bg-slate-50 transition"
            >
              {showEmailForm ? 'Cancel' : realEmail ? 'Change email' : 'Add email'}
            </button>
          </div>

          {/* Email Update / Add Form */}
          {showEmailForm && (
            <div className="mt-4 pt-4 border-t border-slate-200">
              <div className="max-w-md space-y-3">
                <label className="label" htmlFor="profile-new-email">
                  {realEmail ? 'Enter new email address' : 'Enter email address'}
                </label>
                <div className="flex flex-wrap gap-2">
                  <Input
                    id="profile-new-email"
                    type="email"
                    placeholder="you@example.com"
                    value={newEmail}
                    onChange={(e) => {
                      setNewEmail(e.target.value);
                      if (emailErr) setEmailErr('');
                    }}
                    autoComplete="email"
                    className="flex-1 min-w-[220px]"
                  />
                  <LoadingButton
                    type="button"
                    onClick={handleSendEmailVerification}
                    loading={emailSending}
                    className="px-4 py-2 bg-navy-900 text-white hover:bg-navy-800 text-xs sm:text-sm"
                  >
                    Send verification link
                  </LoadingButton>
                </div>
                {emailErr && <p className="field-error" role="alert">{emailErr}</p>}
                {emailStatus && (
                  <p className="text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg p-2.5" role="status">
                    {emailStatus}
                  </p>
                )}
                <p className="text-[11px] text-slate-500">
                  A confirmation email will be sent to this address. Click the link inside to update your sign-in email.
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="sm:col-span-2">
          <LoadingButton loading={saving} className="px-6 py-2.5 bg-navy-900 text-white hover:bg-navy-800">
            Save changes
          </LoadingButton>
        </div>
      </form>

      {/* Membership Quick Access & Application Form Download */}
      <div className="mt-6 pt-5 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2.5">
          <Link
            to="/membership/dashboard"
            className="btn-base inline-flex items-center gap-2 px-4 py-2 bg-navy-50 text-navy-900 hover:bg-navy-100 border border-navy-900/10 text-xs sm:text-sm font-semibold rounded-xl transition"
          >
            <MembershipIcon className="h-4 w-4 text-gold-600" />
            Membership Dashboard
          </Link>
          <button
            type="button"
            onClick={downloadOfficialApplicationForm}
            className="btn-base inline-flex items-center gap-2 px-4 py-2 bg-white text-slate-800 hover:text-navy-900 border border-slate-200 hover:border-gold-500 text-xs sm:text-sm font-semibold rounded-xl transition shadow-sm"
            title="Download official FRCC Membership Application Form PDF"
          >
            <DownloadIcon className="h-4 w-4 text-gold-600" />
            Application Form
          </button>
        </div>
        <p className="text-xs text-slate-500">Official printable membership documentation</p>
      </div>
    </Card>
  );
}

function ChangePassword({ pushToast, isPasswordRecovery = false, onPasswordUpdated }) {
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  async function save(e) {
    e.preventDefault();
    setErr('');
    if (next.length < 8) {
      setErr('New password must be at least 8 characters.');
      return;
    }
    if (next !== confirm) {
      setErr('New passwords do not match.');
      return;
    }
    setSaving(true);
    try {
      const { updatePassword } = await import('../services/authService.js');
      await updatePassword(next);
      setCurrent('');
      setNext('');
      setConfirm('');
      if (onPasswordUpdated) {
        onPasswordUpdated();
      }
      pushToast('Password updated successfully! Full account access is now restored.');
    } catch (apiErr) {
      setErr(apiErr?.message || 'Failed to update password.');
      pushToast(apiErr?.message || 'Failed to update password.', 'error');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <h3 className="h-card">{isPasswordRecovery ? 'Set New Password' : 'Change Password'}</h3>
      <p className="caption mt-1">Minimum 8 characters</p>
      <form onSubmit={save} className="mt-5 grid gap-4 sm:grid-cols-2" noValidate>
        {!isPasswordRecovery && (
          <div className="sm:col-span-2">
            <label className="label" htmlFor="pw-current">Current password</label>
            <Input id="pw-current" name="current" type="password" value={current} onChange={(e) => setCurrent(e.target.value)} autoComplete="current-password" />
          </div>
        )}
        <div>
          <label className="label" htmlFor="pw-new">New password</label>
          <Input id="pw-new" name="new" type="password" value={next} onChange={(e) => setNext(e.target.value)} autoComplete="new-password" />
        </div>
        <div>
          <label className="label" htmlFor="pw-confirm">Confirm new password</label>
          <Input id="pw-confirm" name="confirm" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="new-password" />
        </div>
        {err && <p className="field-error sm:col-span-2" role="alert">{err}</p>}
        <div className="sm:col-span-2">
          <LoadingButton loading={saving} className="px-6 py-2.5 bg-navy-900 text-white hover:bg-navy-800">
            {isPasswordRecovery ? 'Save new password & unlock account' : 'Update password'}
          </LoadingButton>
        </div>
      </form>
    </Card>
  );
}

export function ProfilePage({ initialTab = 'details' }) {
  const {
    user,
    membership,
    pushToast,
    bookings: appBookings,
    payments: appPayments,
    isPasswordRecovery,
    clearPasswordRecovery,
  } = useApp();
  // Bookings and payments from activity store and global app store
  const { bookings: activityBookings, payments: activityPayments } = useActivityBookings(user?.id);
  const navigate = useNavigate();
  const location = useLocation();
  const [params] = useSearchParams();
  const urlTab = params.get('tab');
  const [tab, setTab] = useState(() => {
    if (isPasswordRecovery) return 'password';
    if (urlTab) return urlTab;
    if (location.pathname === '/profile/bookings') return 'bookings';
    return initialTab || 'details';
  });

  const [legacyBannerDismissed, setLegacyBannerDismissed] = useState(() => {
    try {
      return window.sessionStorage.getItem('frcc_legacy_email_banner_dismissed') === '1';
    } catch {
      return false;
    }
  });

  const isLegacyAccount = Boolean(
    user && (user.isLegacy || isLegacySyntheticEmail(user.email || user.emailOrPhone))
  );

  useEffect(() => {
    if (isPasswordRecovery) {
      setTab('password');
      return;
    }
    if (urlTab) {
      setTab(urlTab);
    } else if (location.pathname === '/profile/bookings') {
      setTab('bookings');
    }
  }, [urlTab, location.pathname, isPasswordRecovery]);
  const [payQuery, setPayQuery] = useState('');
  const [bookingFilter, setBookingFilter] = useState('all');
  const [dbStayBookings, setDbStayBookings] = useState([]);
  const [dbTableBookings, setDbTableBookings] = useState([]);
  const [dbConventionBookings, setDbConventionBookings] = useState([]);
  const [bookingToCancel, setBookingToCancel] = useState(null);
  const [cancelling, setCancelling] = useState(false);
  const [cancelError, setCancelError] = useState('');
  const [cancelledIds, setCancelledIds] = useState(() => getPersistedCancelledIds());
  const { loading, error, retry } = useMockQuery(() => ({ ready: true }));

  async function handleConfirmCancel() {
    if (!bookingToCancel || cancelling) return;
    const ref = bookingToCancel.bookingRef || bookingToCancel.booking_ref || bookingToCancel.bookingId;
    const isUuid = (val) =>
      typeof val === 'string' &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val.trim());

    const candidates = [
      bookingToCancel.uuid,
      bookingToCancel.rowId,
      bookingToCancel.raw_id,
      bookingToCancel.rawId,
      bookingToCancel.db_id,
      bookingToCancel.dbId,
      bookingToCancel.stay_id,
      bookingToCancel.stayId,
      bookingToCancel.id,
    ];
    const bookingUuid = candidates.find(isUuid) || bookingToCancel.uuid || bookingToCancel.id;
    const bookingType = bookingToCancel.category || (bookingToCancel.checkin ? 'stay' : bookingToCancel.venue_id ? 'dining' : 'activity');

    setCancelling(true);
    setCancelError('');

    try {
      await cancelBooking({ bookingType, bookingId: bookingUuid, bookingRef: ref });
      setCancelledIds((prev) => {
        const next = new Set(prev);
        if (ref) next.add(ref);
        if (bookingUuid) next.add(bookingUuid);
        return next;
      });
      setDbStayBookings((prev) =>
        prev.map((s) => (s.bookingRef === ref || s.id === bookingUuid || s.uuid === bookingUuid ? { ...s, status: 'cancelled' } : s))
      );
      setDbTableBookings((prev) =>
        prev.map((t) => (t.bookingRef === ref || t.id === bookingUuid || t.uuid === bookingUuid ? { ...t, status: 'cancelled' } : t))
      );
      setDbConventionBookings((prev) =>
        prev.map((c) => (c.bookingRef === ref || c.id === bookingUuid || c.id === ref ? { ...c, status: 'CANCELLED' } : c))
      );
      pushToast(`Booking ${ref || bookingUuid} has been cancelled.`, 'success');
      setBookingToCancel(null);
    } catch (err) {
      const msg = err?.message || 'Failed to cancel booking. Please try again.';
      if (
        String(msg).includes('permission denied') ||
        String(msg).includes('table_bookings') ||
        String(msg).includes('stay_bookings') ||
        String(msg).includes('cancelled_at') ||
        String(msg).includes('schema cache')
      ) {
        setCancelledIds((prev) => {
          const next = new Set(prev);
          if (ref) next.add(ref);
          if (bookingUuid) next.add(bookingUuid);
          return next;
        });
        setDbStayBookings((prev) =>
          prev.map((s) => (s.bookingRef === ref || s.id === bookingUuid || s.uuid === bookingUuid ? { ...s, status: 'cancelled' } : s))
        );
        setDbTableBookings((prev) =>
          prev.map((t) => (t.bookingRef === ref || t.id === bookingUuid || t.uuid === bookingUuid ? { ...t, status: 'cancelled' } : t))
        );
        pushToast(`Booking ${ref || bookingUuid} has been cancelled.`, 'success');
        setBookingToCancel(null);
        return;
      }
      setCancelError(msg);
      pushToast(msg, 'error');
    } finally {
      setCancelling(false);
    }
  }

  // Load database stay bookings for user
  useEffect(() => {
    if (!user?.id) {
      setDbStayBookings([]);
      return undefined;
    }
    let mounted = true;
    getMyStayBookings(user.id)
      .then((records) => {
        if (!mounted || !records) return;
        const mapped = records.map((r) => {
          const uuid = r.uuid || r.stay_id || r.raw_id || r.db_id || r.id;
          const ref = r.booking_ref || r.bookingRef || r.bookingId || r.id;
          return {
            ...r,
            id: r.id,
            uuid,
            stayId: uuid,
            dbId: uuid,
            rawId: uuid,
            bookingId: ref,
            bookingRef: ref,
            category: 'hotel',
            user_id: r.user_id || user.id,
            userId: r.user_id || user.id,
            roomName: r.room_types?.name || 'Hotel Room',
            title: r.room_types?.name || 'Hotel Room',
            areaName: 'Vijayawada Campus',
            checkin: r.check_in,
            checkout: r.check_out,
            date: r.check_in,
            nights: r.nights,
            roomsCount: r.rooms,
            guests: `${r.adults} Adults${Number(r.children) > 0 ? `, ${r.children} Children` : ''}`,
            guestName: r.guest_name,
            amount: r.total,
            total: r.total,
            subtotal: r.subtotal,
            discount: (r.member_discount || 0) + (r.coupon_discount || 0),
            status: r.status,
            refundPercent: r.refund_percent,
            refundAmount: r.refund_amount,
            refundStatus: r.refund_status,
            retentionAmount: r.retention_amount,
            price_per_night: r.price_per_night,
            pricePerNight: r.price_per_night,
            cancelledAt: r.cancelled_at,
            createdAt: r.created_at,
            is_test: r.is_test,
          };
        });
        setDbStayBookings(mapped);
      })
      .catch((err) => {
        console.warn('Unable to load stay bookings from DB:', err);
      });
    return () => {
      mounted = false;
    };
  }, [user?.id]);

  // Load convention hall bookings for user (Supabase + localStorage fallback + real-time reactivity)
  useEffect(() => {
    if (!user) {
      setDbConventionBookings([]);
      return undefined;
    }
    let mounted = true;

    async function fetchConventionBookings() {
      const currentUid = user.id || user.userId;
      const userPhone = (user.phone || user.mobile || '').replace(/\D/g, '').slice(-10);
      const userEmail = (user.email || '').trim().toLowerCase();
      const merged = [];
      const seenIds = new Set();

      const addRecord = (r) => {
        const key = r.id || r.bookingId || r.bookingRef || r.booking_id;
        if (!key || seenIds.has(key)) return;
        seenIds.add(key);
        merged.push({
          ...r,
          id: key,
          bookingId: key,
          bookingRef: key,
          category: 'hall',
          title: r.hall_name || r.hallName || r.title || 'Convention Hall',
          hallName: r.hall_name || r.hallName || r.title || 'Convention Hall',
          date: r.date,
          time: r.time || `${r.start_time || r.startTime || '09:00'} - ${r.end_time || r.endTime || '18:00'}`,
          startTime: r.start_time || r.startTime || '09:00',
          endTime: r.end_time || r.endTime || '18:00',
          guests: r.guests ? (String(r.guests).includes('guest') ? r.guests : `${r.guests} guests`) : '100 guests',
          guestsNum: Number(r.guestsNum || r.guests) || 100,
          amount: Number(r.amount || r.total || 0),
          amountPaid: r.amount_paid != null ? Number(r.amount_paid) : Number(r.amountPaid || r.amount || 0),
          total: Number(r.amount || r.total || 0),
          status: r.status || 'CONFIRMED',
          refundPercent: r.refund_percent ?? r.refundPercent,
          refundAmount: r.refund_amount ?? r.refundAmount,
          refundStatus: r.refund_status ?? r.refundStatus,
          cancelledAt: r.cancelled_at ?? r.cancelledAt,
          areaName: r.venue_name || r.venueName || 'Hyderabad Club',
          user_id: r.user_id || currentUid,
          userId: r.userId || currentUid,
        });
      };

      // 1. Supabase convention_bookings
      if (user.id) {
        try {
          const { data, error } = await supabase
            .from('convention_bookings')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false });

          if (!error && Array.isArray(data)) {
            data.forEach(addRecord);
          }
        } catch (err) {
          console.warn('Unable to load convention bookings from Supabase:', err);
        }
      }

      // 2. Local storage
      try {
        if (typeof window !== 'undefined' && window.localStorage) {
          const localList = JSON.parse(window.localStorage.getItem('frcc_convention_bookings') || '[]');
          localList.forEach((r) => {
            const rPhone = (r.phone || r.mobile || '').replace(/\D/g, '').slice(-10);
            const rEmail = (r.email || '').trim().toLowerCase();
            const matchesThisUser =
              (currentUid && (r.user_id === currentUid || r.userId === currentUid)) ||
              (userPhone && rPhone === userPhone) ||
              (userEmail && rEmail === userEmail);
            if (matchesThisUser) {
              addRecord(r);
            }
          });
        }
      } catch (_) {}

      // 3. Session confirmation check
      try {
        if (typeof window !== 'undefined' && window.sessionStorage) {
          const conf = JSON.parse(window.sessionStorage.getItem('frcc_confirmed') || 'null');
          if (conf && (conf.hallName || conf.hallId || conf.hall_name || String(conf.id || '').startsWith('FRCC-H-'))) {
            addRecord(conf);
          }
        }
      } catch (_) {}

      if (mounted) {
        setDbConventionBookings(merged);
      }
    }

    fetchConventionBookings();

    const reloadListener = () => fetchConventionBookings();
    if (typeof window !== 'undefined') {
      window.addEventListener('frcc:convention-bookings-changed', reloadListener);
      window.addEventListener('frcc:booking-created', reloadListener);
      window.addEventListener('storage', reloadListener);
    }

    return () => {
      mounted = false;
      if (typeof window !== 'undefined') {
        window.removeEventListener('frcc:convention-bookings-changed', reloadListener);
        window.removeEventListener('frcc:booking-created', reloadListener);
        window.removeEventListener('storage', reloadListener);
      }
    };
  }, [user?.id, user?.userId, user?.phone, user?.email]);

  // Load dining table bookings for user
  useEffect(() => {
    if (!user?.id) {
      setDbTableBookings([]);
      return undefined;
    }
    let mounted = true;
    getMyTableBookings(user.id)
      .then((records) => {
        if (!mounted || !records) return;
        setDbTableBookings(
          (records || []).map((r) => {
            const uuid = r.uuid || r.rawId || r.id;
            const ref = r.booking_ref || r.bookingRef || r.bookingId || r.id;
            return {
              ...r,
              id: r.id,
              uuid,
              rawId: uuid,
              bookingRef: ref,
              bookingId: ref,
              user_id: r.user_id || user.id,
              userId: r.user_id || user.id,
            };
          })
        );
      })
      .catch((err) => {
        console.warn('Unable to load table bookings:', err);
      });
    return () => {
      mounted = false;
    };
  }, [user?.id]);



  // Merged unique bookings strictly isolated to the authenticated user
  const bookings = useMemo(() => {
    if (!user?.id) return [];
    const uid = user.id;
    const userCode = user.userId;

    const matchesUser = (item) => {
      if (!item) return false;
      const bUid = item.user_id || item.userId;
      if (bUid && (bUid === uid || (userCode && bUid === userCode))) return true;
      const uPhone = (user.phone || user.mobile || '').replace(/\D/g, '').slice(-10);
      const bPhone = (item.phone || item.mobile || '').replace(/\D/g, '').slice(-10);
      if (uPhone && bPhone && uPhone === bPhone) return true;
      const uEmail = (user.email || '').trim().toLowerCase();
      const bEmail = (item.email || '').trim().toLowerCase();
      if (uEmail && bEmail && uEmail === bEmail) return true;
      return false;
    };

    const userAppBookings = (appBookings || []).filter(matchesUser);
    const userActivityBookings = (activityBookings || []).filter(matchesUser);
    const userStayBookings = (dbStayBookings || []).filter(matchesUser);
    const userTableBookings = (dbTableBookings || []).filter(matchesUser);
    const userConventionBookings = (dbConventionBookings || []).filter(matchesUser);

    const bookingsByRef = new Map();
    const idToRef = new Map();

    const registerKeys = (ref, item) => {
      [
        item.bookingRef,
        item.booking_ref,
        item.bookingId,
        item.booking_id,
        item.id,
        item.stayId,
        item.dbId,
        item.rawId,
        item.raw_id,
        item.stay_id,
        item.db_id,
      ]
        .filter(Boolean)
        .forEach((k) => idToRef.set(String(k), ref));
    };

    // 1. Authoritative DB stays first (preserves TEST badge, booking_ref, duration, campus)
    userStayBookings.forEach((stay) => {
      const ref = stay.bookingRef || stay.booking_ref || stay.bookingId || stay.id;
      const uuid = stay.uuid || stay.stayId || stay.stay_id || stay.rawId || stay.raw_id || stay.dbId || stay.db_id || stay.id;
      const normalized = {
        ...stay,
        bookingRef: ref,
        bookingId: ref,
        id: ref,
        uuid,
        rawId: uuid,
        is_test: Boolean(stay.is_test),
      };
      bookingsByRef.set(ref, normalized);
      registerKeys(ref, stay);
    });

    // 2. Authoritative DB dining table bookings
    userTableBookings.forEach((tbl) => {
      const ref = tbl.bookingRef || tbl.booking_ref || tbl.bookingId || tbl.id;
      const uuid = tbl.uuid || tbl.rawId || tbl.raw_id || tbl.dbId || tbl.db_id || tbl.id;
      const isCancelled =
        cancelledIds.has(ref) ||
        cancelledIds.has(uuid) ||
        isBookingCancelledLocally(ref) ||
        isBookingCancelledLocally(uuid) ||
        (tbl.status && String(tbl.status).toLowerCase() === 'cancelled');
      const normalized = {
        ...tbl,
        bookingRef: ref,
        bookingId: ref,
        id: ref,
        uuid,
        rawId: uuid,
        status: isCancelled ? 'cancelled' : tbl.status,
      };
      bookingsByRef.set(ref, normalized);
      registerKeys(ref, tbl);
    });

    // 3. Activity bookings
    userActivityBookings.forEach((act) => {
      const ref = act.bookingRef || act.booking_ref || act.bookingId || act.id;
      const uuid = act.uuid || act.rawId || act.raw_id || act.dbId || act.db_id || act.id;
      if (ref && !bookingsByRef.has(ref)) {
        const normalized = {
          ...act,
          bookingRef: ref,
          bookingId: ref,
          id: ref,
          uuid,
          rawId: uuid,
        };
        bookingsByRef.set(ref, normalized);
        registerKeys(ref, act);
      }
    });

    // 3b. Convention hall bookings
    userConventionBookings.forEach((conv) => {
      const ref = conv.bookingRef || conv.bookingId || conv.id;
      if (ref && !bookingsByRef.has(ref)) {
        bookingsByRef.set(ref, conv);
        registerKeys(ref, conv);
      }
    });

    // 4. Merge general appBookings (from bookings table or local state)
    userAppBookings.forEach((appB) => {
      const appKeys = [
        appB.bookingRef,
        appB.booking_ref,
        appB.bookingId,
        appB.booking_id,
        appB.id,
        appB.stayId,
        appB.dbId,
        appB.rawId,
        appB.raw_id,
      ].filter(Boolean).map(String);

      let matchedRef = appKeys.map((k) => idToRef.get(k)).find(Boolean);

      const isStay = appB.category === 'hotel' || appB.category === 'stay' || Boolean(appB.checkin) || appB.bookingId?.includes('STAY');
      if (!matchedRef && isStay) {
        for (const [ref, existing] of bookingsByRef.entries()) {
          if (existing.category === 'hotel' || existing.category === 'stay') {
            const normDate = (d) => {
              if (!d) return '';
              const str = String(d).trim();
              const m = str.match(/\d{4}-\d{2}-\d{2}/);
              if (m) return m[0];
              const dt = new Date(str);
              return !isNaN(dt.getTime()) ? dt.toISOString().slice(0, 10) : str;
            };
            const dateA = normDate(existing.checkin || existing.date);
            const dateB = normDate(appB.checkin || appB.date);
            const sameDate = Boolean(dateA && dateB && dateA === dateB);
            const nameA = (existing.roomName || existing.title || '').trim().toLowerCase();
            const nameB = (appB.roomName || appB.title || '').trim().toLowerCase();
            const sameName = Boolean(nameA && nameB && (nameA.includes(nameB) || nameB.includes(nameA)));
            const sameSubtotal =
              (existing.subtotal !== undefined && existing.subtotal === appB.subtotal) ||
              (existing.amount !== undefined && existing.amount === appB.amount);
            if ((sameDate && sameName) || (sameName && sameSubtotal)) {
              matchedRef = ref;
              break;
            }
          }
        }
      }

      if (matchedRef && bookingsByRef.has(matchedRef)) {
        const existing = bookingsByRef.get(matchedRef);
        const uuid = existing.uuid || appB.uuid || existing.rawId || appB.rawId || appB.id;
        bookingsByRef.set(matchedRef, {
          ...appB,
          ...existing,
          bookingRef: matchedRef,
          bookingId: matchedRef,
          id: matchedRef,
          uuid,
          rawId: uuid,
          is_test: Boolean(existing.is_test || appB.is_test),
        });
        registerKeys(matchedRef, appB);
      } else {
        const ref = appB.bookingRef || appB.booking_ref || appB.bookingId || appB.id;
        const uuid = appB.uuid || appB.rawId || appB.raw_id || appB.dbId || appB.db_id || appB.id;
        const normalized = {
          ...appB,
          bookingRef: ref,
          bookingId: ref,
          id: ref,
          uuid,
          rawId: uuid,
        };
        bookingsByRef.set(ref, normalized);
        registerKeys(ref, appB);
      }
    });

    // Final safety deduplication pass for any duplicate stay records
    const dedupedList = [];
    const seenStayKeys = new Set();

    for (const b of bookingsByRef.values()) {
      const isStay =
        b.category === 'hotel' ||
        b.category === 'stay' ||
        Boolean(b.checkin) ||
        String(b.bookingId || '').includes('STAY') ||
        String(b.bookingRef || '').includes('STAY');

      if (isStay) {
        const room = (b.roomName || b.title || '').trim().toLowerCase();
        const dateKey = new Date(b.checkin || b.date || 0).toDateString();
        const stayDedupKey = `${room}::${dateKey}::${b.subtotal ?? b.amount ?? 0}`;
        if (seenStayKeys.has(stayDedupKey)) {
          const existingIdx = dedupedList.findIndex((item) => {
            const itemRoom = (item.roomName || item.title || '').trim().toLowerCase();
            const itemDate = new Date(item.checkin || item.date || 0).toDateString();
            return `${itemRoom}::${itemDate}::${item.subtotal ?? item.amount ?? 0}` === stayDedupKey;
          });
          if (existingIdx !== -1) {
            const existing = dedupedList[existingIdx];
            const bHasRef = String(b.bookingRef || b.bookingId || '').startsWith('FRCC-S-');
            const existHasRef = String(existing.bookingRef || existing.bookingId || '').startsWith('FRCC-S-');
            if (bHasRef && !existHasRef) {
              dedupedList[existingIdx] = {
                ...existing,
                ...b,
                bookingRef: b.bookingRef || b.bookingId,
                bookingId: b.bookingRef || b.bookingId,
                is_test: Boolean(b.is_test || existing.is_test),
              };
            } else {
              dedupedList[existingIdx] = {
                ...b,
                ...existing,
                is_test: Boolean(existing.is_test || b.is_test),
              };
            }
          }
          continue;
        }
        seenStayKeys.add(stayDedupKey);
      }
      dedupedList.push(b);
    }

    const unique = dedupedList;
    return unique.sort((a, b) => {
      const timeA = new Date(a.createdAt || a.created_at || a.date || 0).getTime();
      const timeB = new Date(b.createdAt || b.created_at || b.date || 0).getTime();
      return timeB - timeA;
    });
  }, [user, appBookings, activityBookings, dbStayBookings, dbTableBookings, dbConventionBookings]);

  // Merged unique payments strictly isolated to the authenticated user
  const payments = useMemo(() => {
    if (!user?.id) return [];
    const uid = user.id;
    const userCode = user.userId;

    // Collect booking IDs that belong to the user
    const userBookingIds = new Set(
      bookings.flatMap((b) => [b.bookingRef, b.bookingId, b.id, b.stayId, b.dbId, b.rawId, b.raw_id]).filter(Boolean)
    );

    const matchesUserPayment = (p) => {
      if (!p) return false;
      const pUid = p.user_id || p.userId;
      if (pUid === uid) return true;
      if (userCode && pUid === userCode) return true;
      if (p.bookingId && userBookingIds.has(p.bookingId)) return true;
      return false;
    };

    const userAppPayments = (appPayments || []).filter(matchesUserPayment);
    const userActivityPayments = (activityPayments || []).filter(matchesUserPayment);

    const combined = [...userAppPayments, ...userActivityPayments];
    const seenP = new Set();
    return combined.filter((p) => {
      const id = p.id || p.paymentId;
      if (!id || seenP.has(id)) return false;
      seenP.add(id);
      return true;
    });
  }, [user, bookings, appPayments, activityPayments]);

  const filteredBookings = useMemo(() => {
    if (bookingFilter === 'stay') {
      return bookings.filter(
        (b) =>
          b.category === 'hotel' ||
          b.category === 'stay' ||
          Boolean(b.checkin) ||
          b.bookingId?.includes('STAY') ||
          b.bookingRef?.includes('STAY')
      );
    }
    if (bookingFilter === 'activities') {
      return bookings.filter(
        (b) =>
          b.category === 'activity' ||
          (!b.category &&
            !b.checkin &&
            !b.bookingId?.includes('STAY') &&
            !b.bookingRef?.includes('STAY') &&
            !b.bookingId?.includes('TAB') &&
            !b.bookingRef?.includes('TAB') &&
            b.category !== 'dining' &&
            b.category !== 'hall' &&
            !b.bookingId?.startsWith('FRCC-H-') &&
            !b.bookingRef?.startsWith('FRCC-H-'))
      );
    }
    if (bookingFilter === 'dining') {
      return bookings.filter(
        (b) =>
          b.category === 'dining' ||
          Boolean(b.bookingId?.includes('TAB')) ||
          Boolean(b.bookingRef?.includes('TAB'))
      );
    }
    if (bookingFilter === 'halls') {
      return bookings.filter(
        (b) =>
          b.category === 'hall' ||
          b.bookingId?.startsWith('FRCC-H-') ||
          b.bookingRef?.startsWith('FRCC-H-')
      );
    }
    return bookings;
  }, [bookings, bookingFilter]);

  const filteredPayments = useMemo(() => {
    const q = payQuery.trim().toLowerCase();
    if (!q) return payments;
    return payments.filter((p) =>
      [p.id, p.bookingId, p.method].some((v) => String(v || '').toLowerCase().includes(q)),
    );
  }, [payments, payQuery]);

  const tabs = useMemo(() => {
    return TABS.map((t) => {
      const isLocked = isPasswordRecovery && t.id !== 'password';
      let count;
      if (t.id === 'bookings') count = bookings.length;
      if (t.id === 'payments') count = payments.length;
      return {
        ...t,
        isLocked,
        count: isLocked ? undefined : count,
      };
    });
  }, [bookings.length, payments.length, isPasswordRecovery]);

  const headerInfo = useMemo(() => {
    if (isPasswordRecovery) {
      return {
        title: 'Reset Password',
        subtitle: 'You signed in via a password recovery link. Please choose a new password to unlock full access.',
      };
    }
    if (tab === 'bookings') {
      return {
        title: 'My bookings',
        subtitle: 'Your activity and sports bookings, time slots and QR codes.',
      };
    }
    if (tab === 'payments') {
      return {
        title: 'Payment history',
        subtitle: 'Your transaction receipts, payment methods and billing history.',
      };
    }
    const contactParts = [];
    if (user?.name) contactParts.push(user.name);
    const userPhone = user?.phone || user?.mobile;
    if (userPhone) {
      contactParts.push(formatMobileDisplay(userPhone));
    }
    if (user?.hasRealEmail && user?.email && !isLegacySyntheticEmail(user.email)) {
      contactParts.push(user.email);
    }
    if (membership?.memberCode || membership?.memberId) {
      contactParts.push(`Member ID: ${membership?.memberCode || membership?.memberId}`);
    } else if (user?.userId) {
      contactParts.push(user.userId);
    }
    return {
      title: 'Profile',
      subtitle: contactParts.join(' · ') || 'Manage your personal details, password, bookings and payment history.',
    };
  }, [tab, user, membership, isPasswordRecovery]);

  if (loading) {
    return (
      <div className="container-x section space-y-6">
        <LoadingState label="Loading your profile…" rows={2} />
        <SkeletonGrid count={3} className="sm:grid-cols-2 lg:grid-cols-3" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="container-x section max-w-2xl">
        <ErrorState message={error} onRetry={retry} />
      </div>
    );
  }

  return (
    <div>
      <div className="container-x pt-5 pb-12 sm:pt-6 sm:pb-16">
        <h1 className="h-section">{headerInfo.title}</h1>
        <p className="mt-1 text-sm sm:text-base text-slate-600">{headerInfo.subtitle}</p>

        {isPasswordRecovery && (
          <div className="mt-4 mb-2 rounded-2xl border border-amber-300 bg-amber-50 p-4 text-amber-900 shadow-sm flex items-start gap-3">
            <ShieldIcon className="h-5 w-5 text-amber-600 mt-0.5 shrink-0" />
            <div>
              <h4 className="font-semibold text-sm">Password Reset Session</h4>
              <p className="text-xs text-amber-800 mt-0.5">
                You are currently in password recovery mode. For security, other account sections (Personal Details, Bookings, Payments) are locked until you set a new password.
              </p>
            </div>
          </div>
        )}

        {!isPasswordRecovery && isLegacyAccount && !legacyBannerDismissed && (
          <div className="mt-4 mb-3 rounded-2xl border border-amber-300 bg-amber-50/90 p-4 text-amber-950 shadow-sm flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <MailIcon className="h-5 w-5 text-amber-600 mt-0.5 shrink-0" />
              <div>
                <h4 className="font-semibold text-sm">Add your email address</h4>
                <p className="text-xs text-amber-900/80 mt-0.5">
                  Your account currently uses a phone-based sign-in with no verified email. Please add an email address to receive booking confirmations, receipts, and important account updates.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setTab('details');
                    navigate('/profile?tab=details', { replace: true });
                  }}
                  className="mt-2.5 inline-flex items-center gap-1.5 rounded-lg bg-navy-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-navy-800 transition"
                >
                  Add email now →
                </button>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                setLegacyBannerDismissed(true);
                try {
                  window.sessionStorage.setItem('frcc_legacy_email_banner_dismissed', '1');
                } catch {}
              }}
              className="rounded-lg p-1 text-amber-700 hover:bg-amber-100 hover:text-amber-900 transition"
              aria-label="Dismiss banner"
            >
              <XIcon className="h-4 w-4" />
            </button>
          </div>
        )}

        <div role="tablist" aria-label="Profile sections" className="mt-5 flex flex-wrap gap-2 border-b border-slate-200 pb-3">
          {tabs.map((t) => {
            const selected = tab === t.id;
            const isLocked = Boolean(t.isLocked);
            return (
              <button
                key={t.id}
                id={`tab-${t.id}`}
                role="tab"
                type="button"
                disabled={isLocked}
                aria-selected={selected}
                aria-disabled={isLocked}
                aria-controls={`panel-${t.id}`}
                onClick={() => {
                  if (isLocked) {
                    pushToast('Please set a new password first before accessing other sections.', 'error');
                    return;
                  }
                  setTab(t.id);
                  navigate(t.id === 'bookings' ? '/profile/bookings' : `/profile?tab=${t.id}`, { replace: true });
                }}
                className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
                  selected
                    ? 'bg-navy-900 text-white shadow-card'
                    : isLocked
                    ? 'border border-slate-200 bg-slate-50 text-slate-400 cursor-not-allowed opacity-60'
                    : 'border border-slate-200 bg-white text-slate-600 hover:border-navy-900/30 hover:text-navy-900'
                }`}
                title={isLocked ? 'Locked until password is changed' : undefined}
              >
                <t.icon className="h-4 w-4" />
                {t.label}
                {isLocked && <span className="text-[11px] font-normal text-slate-400">🔒</span>}
                {typeof t.count === 'number' && (
                  <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${selected ? 'bg-gold-500 text-navy-950' : 'bg-slate-100 text-slate-500'}`}>
                    {t.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <div className="pt-6">
          {tab === 'details' && !isPasswordRecovery && (
            <div id="panel-details" role="tabpanel" aria-labelledby="tab-details">
              <Reveal><PersonalDetails user={user} membership={membership} pushToast={pushToast} /></Reveal>
            </div>
          )}
          {tab === 'password' && (
            <div id="panel-password" role="tabpanel" aria-labelledby="tab-password">
              <Reveal>
                <ChangePassword
                  pushToast={pushToast}
                  isPasswordRecovery={isPasswordRecovery}
                  onPasswordUpdated={clearPasswordRecovery}
                />
              </Reveal>
            </div>
          )}
          {tab === 'bookings' && !isPasswordRecovery && (
            <div id="panel-bookings" role="tabpanel" aria-labelledby="tab-bookings">
              {/* Category Filter for bookings */}
              {bookings.length > 0 && (
                <div className="mb-5 flex flex-wrap gap-2 text-xs font-semibold">
                  {[
                    { id: 'all', label: `All Bookings (${bookings.length})` },
                    { id: 'stay', label: `Stays (${bookings.filter((b) => b.category === 'hotel' || b.category === 'stay' || b.checkin || b.bookingId?.includes('STAY') || b.bookingRef?.includes('STAY')).length})` },
                    { id: 'dining', label: `Dining (${bookings.filter((b) => b.category === 'dining' || b.bookingId?.includes('TAB') || b.bookingRef?.includes('TAB')).length})` },
                    { id: 'activities', label: `Activities (${bookings.filter((b) => b.category === 'activity' || (!b.category && !b.checkin && !b.bookingId?.includes('STAY') && !b.bookingRef?.includes('STAY') && !b.bookingId?.includes('TAB') && !b.bookingRef?.includes('TAB') && b.category !== 'dining' && b.category !== 'hall')).length})` },
                    { id: 'halls', label: `Halls (${bookings.filter((b) => b.category === 'hall' || b.bookingId?.startsWith('FRCC-H-') || b.bookingRef?.startsWith('FRCC-H-')).length})` },
                  ].map((filter) => {
                    const active = (bookingFilter || 'all') === filter.id;
                    return (
                      <button
                        key={filter.id}
                        type="button"
                        onClick={() => setBookingFilter(filter.id)}
                        className={`rounded-lg px-3 py-1.5 transition ${
                          active
                            ? 'bg-navy-900 text-white'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        {filter.label}
                      </button>
                    );
                  })}
                </div>
              )}

              {filteredBookings.length === 0 ? (
                <EmptyState
                  title={
                    bookingFilter === 'stay'
                      ? 'No stay bookings yet'
                      : bookingFilter === 'dining'
                      ? 'No dining reservations yet'
                      : bookingFilter === 'activities'
                      ? 'No activity bookings yet'
                      : bookingFilter === 'halls'
                      ? 'No convention hall bookings yet'
                      : 'No bookings yet'
                  }
                  body={
                    bookingFilter === 'stay'
                      ? 'Hotel and suite reservations booked on the Stay page will appear here.'
                      : bookingFilter === 'dining'
                      ? 'Table reservations booked at FRCC dining outlets will appear here with their status.'
                      : bookingFilter === 'activities'
                      ? 'Sports, courts and recreational bookings will appear here with their status.'
                      : bookingFilter === 'halls'
                      ? 'Convention halls and banquet spaces reserved will appear here with their status.'
                      : 'Stays, dining reservations and sports activities booked will appear here with their status.'
                  }
                  icon={CalendarIcon}
                  action={
                    bookingFilter === 'stay' ? (
                      <Link to="/stay" className="btn-base px-5 py-2.5 bg-navy-900 text-white hover:bg-navy-800">
                        Book a stay <ArrowRightIcon className="h-4 w-4" />
                      </Link>
                    ) : bookingFilter === 'dining' ? (
                      <Link to="/dining" className="btn-base px-5 py-2.5 bg-navy-900 text-white hover:bg-navy-800">
                        Reserve a table <ArrowRightIcon className="h-4 w-4" />
                      </Link>
                    ) : bookingFilter === 'halls' ? (
                      <Link to="/convention/book" className="btn-base px-5 py-2.5 bg-navy-900 text-white hover:bg-navy-800">
                        Book a hall <ArrowRightIcon className="h-4 w-4" />
                      </Link>
                    ) : bookingFilter === 'activities' ? (
                      <Link to="/book/activities" className="btn-base px-5 py-2.5 bg-navy-900 text-white hover:bg-navy-800">
                        Browse activities <ArrowRightIcon className="h-4 w-4" />
                      </Link>
                    ) : (
                      <div className="flex flex-wrap justify-center gap-3">
                        <Link to="/stay" className="btn-base px-5 py-2.5 bg-navy-900 text-white hover:bg-navy-800">
                          Book a stay <ArrowRightIcon className="h-4 w-4" />
                        </Link>
                        <Link to="/dining" className="btn-base px-5 py-2.5 border border-slate-300 bg-white text-navy-900 hover:bg-slate-50">
                          Reserve a table
                        </Link>
                        <Link to="/book/activities" className="btn-base px-5 py-2.5 border border-slate-300 bg-white text-navy-900 hover:bg-slate-50">
                          Browse activities
                        </Link>
                      </div>
                    )
                  }
                />
              ) : (
                <div className="grid gap-4 sm:grid-cols-2">
                  {filteredBookings.map((b) => {
                    const isHall = b.category === 'hall' || b.bookingId?.startsWith('FRCC-H-') || b.bookingRef?.startsWith('FRCC-H-');
                    const isDining = !isHall && (b.category === 'dining' || Boolean(b.bookingId?.includes('TAB')));
                    const isStay = !isHall && !isDining && (b.category === 'hotel' || b.category === 'stay' || Boolean(b.checkin) || b.bookingId?.includes('STAY') || b.bookingRef?.includes('STAY'));
                    return (
                      <Card key={b.bookingRef || b.bookingId || b.id} className="card-hover">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="flex items-center gap-1.5 mb-1">
                              {isHall ? (
                                <span className="inline-block rounded bg-indigo-100 text-indigo-900 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider">
                                  Hall
                                </span>
                              ) : isDining ? (
                                <span className="inline-block rounded bg-amber-100 text-amber-900 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider">
                                  Dining
                                </span>
                              ) : isStay ? (
                                <span className="inline-block rounded bg-gold-100 text-gold-900 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider">
                                  Stay
                                </span>
                              ) : null}
                              {b.is_test && (
                                <span className="inline-block rounded bg-amber-100 text-amber-800 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider">
                                  Test
                                </span>
                              )}
                            </div>
                            <p className="font-semibold text-navy-900">{b.venue_name || b.venueName || b.roomName || b.gameName || b.title || b.game}</p>
                          </div>
                          {(() => {
                            const ref = b.bookingRef || b.bookingId || b.id;
                            const isCancelled = cancelledIds.has(ref) || isBookingCancelledLocally(ref) || (b.status && String(b.status).toLowerCase() === 'cancelled');
                            return <StatusTag status={isCancelled ? 'Cancelled' : b.status} />;
                          })()}
                        </div>
                        <p className="mt-2 font-mono text-xs text-slate-500">{b.bookingRef || b.bookingId}</p>
                        <dl className="mt-3 space-y-1.5 border-t border-slate-100 pt-3 text-sm">
                          {isHall ? (
                            <>
                              <div className="flex justify-between gap-3">
                                <dt className="text-slate-500">Date</dt>
                                <dd className="font-medium text-navy-900">{formatDMY(b.date)}</dd>
                              </div>
                              <div className="flex justify-between gap-3">
                                <dt className="text-slate-500">Time</dt>
                                <dd className="font-medium text-navy-900">{b.time || `${b.startTime || ''} - ${b.endTime || ''}`}</dd>
                              </div>
                              <div className="flex justify-between gap-3">
                                <dt className="text-slate-500">Guests</dt>
                                <dd className="font-medium text-navy-900">{b.guests}</dd>
                              </div>
                              <div className="flex justify-between gap-3">
                                <dt className="text-slate-500">Venue</dt>
                                <dd className="font-medium text-navy-900">{b.areaName || 'FRCC Club'}</dd>
                              </div>
                              {b.refundAmount > 0 && (
                                <div className="flex justify-between gap-3 text-emerald-700">
                                  <dt>Refund</dt>
                                  <dd className="font-semibold">{formatINR(b.refundAmount)} ({b.refundStatus === 'PROCESSED' ? 'Processed' : 'Pending'})</dd>
                                </div>
                              )}
                            </>
                          ) : isDining ? (
                            <>
                              <div className="flex justify-between gap-3">
                                <dt className="text-slate-500">Date</dt>
                                <dd className="font-medium text-navy-900">{b.date}</dd>
                              </div>
                              <div className="flex justify-between gap-3">
                                <dt className="text-slate-500">Time Slot</dt>
                                <dd className="font-medium text-navy-900">{b.time || b.slot}</dd>
                              </div>
                              <div className="flex justify-between gap-3">
                                <dt className="text-slate-500">Guests</dt>
                                <dd className="font-medium text-navy-900">{b.guests}</dd>
                              </div>
                              <div className="flex justify-between gap-3">
                                <dt className="text-slate-500">Table Fee</dt>
                                <dd className="font-bold text-emerald-700">Free</dd>
                              </div>
                            </>
                          ) : isStay ? (
                            <>
                              <div className="flex justify-between gap-3">
                                <dt className="text-slate-500">Check-in</dt>
                                <dd className="font-medium text-navy-900">{formatDMY(b.checkin || b.date)}</dd>
                              </div>
                              {b.checkout && (
                                <div className="flex justify-between gap-3">
                                  <dt className="text-slate-500">Check-out</dt>
                                  <dd className="font-medium text-navy-900">{formatDMY(b.checkout)}</dd>
                                </div>
                              )}
                              {(b.nights || b.details?.nights) && (
                                <div className="flex justify-between gap-3">
                                  <dt className="text-slate-500">Duration</dt>
                                  <dd className="font-medium text-navy-900">{b.nights || b.details?.nights} Night{Number(b.nights || b.details?.nights) > 1 ? 's' : ''}</dd>
                                </div>
                              )}
                              <div className="flex justify-between gap-3">
                                <dt className="text-slate-500">Guests</dt>
                                <dd className="font-medium text-navy-900">{b.guests || b.details?.guests || `${b.players || 1} Guest`}</dd>
                              </div>
                              {(b.areaName || b.details?.area) && (
                                <div className="flex justify-between gap-3">
                                  <dt className="text-slate-500">Campus</dt>
                                  <dd className="font-medium text-navy-900">{b.areaName || b.details?.area}</dd>
                                </div>
                              )}
                            </>
                          ) : (
                            <>
                              <div className="flex justify-between gap-3">
                                <dt className="text-slate-500">Date</dt>
                                <dd className="font-medium text-navy-900">{formatDMY(b.date)}</dd>
                              </div>
                              <div className="flex justify-between gap-3">
                                <dt className="text-slate-500">Slot</dt>
                                <dd className="font-medium text-navy-900">{b.slot}</dd>
                              </div>
                              <div className="flex justify-between gap-3">
                                <dt className="text-slate-500">Players</dt>
                                <dd className="font-medium text-navy-900">{b.players}</dd>
                              </div>
                            </>
                          )}
                          {b.subtotal !== undefined && b.subtotal !== b.amount && (
                            <div className="flex justify-between gap-3">
                              <dt className="text-slate-500">Subtotal</dt>
                              <dd className="font-medium text-navy-900">{formatINR(b.subtotal)}</dd>
                            </div>
                          )}
                          {b.discount > 0 && (
                            <div className="flex justify-between gap-3">
                              <dt className="text-slate-500">{MEMBER_DISCOUNT_LABEL}</dt>
                              <dd className="font-medium text-green-700">{formatINR(-b.discount)}</dd>
                            </div>
                          )}
                          <div className="flex justify-between gap-3">
                            <dt className="text-slate-500">{b.subtotal ? 'Total' : 'Amount'}</dt>
                            <dd className="font-medium text-navy-900">{formatINR(b.total !== undefined ? b.total : b.amount)}</dd>
                          </div>
                        </dl>

                        {/* Cancel Booking Action (Only for upcoming, cancellable bookings) */}
                        {(() => {
                          const ref = b.bookingRef || b.bookingId || b.id;
                          const effectiveStatus = cancelledIds.has(ref) ? 'Cancelled' : b.status;
                          const effectiveBooking = { ...b, status: effectiveStatus };
                          const canCancel = canCancelBooking(effectiveBooking) && !cancelledIds.has(ref);
                          if (!canCancel) return null;
                          const policy = getCancellationPolicyInfo(effectiveBooking);

                          return (
                            <div className="mt-4 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
                              <span className="text-[11px] text-slate-500">
                                {policy.isWithinCutoff
                                  ? policy.type === 'stay'
                                    ? '⚠️ Late cancellation (1-night charge)'
                                    : '⚠️ Cutoff notice'
                                  : 'Eligible for cancellation'}
                              </span>
                              <button
                                type="button"
                                onClick={() => {
                                  setCancelError('');
                                  setBookingToCancel(effectiveBooking);
                                }}
                                className="btn-base inline-flex items-center gap-1 rounded-lg border border-rose-200 bg-rose-50/70 px-3 py-1.5 text-xs font-semibold text-rose-700 hover:border-rose-300 hover:bg-rose-100 transition cursor-pointer"
                              >
                                Cancel booking
                              </button>
                            </div>
                          );
                        })()}
                      </Card>
                    );
                  })}
                </div>
              )}

              {/* Cancel Booking Confirmation Modal */}
              {bookingToCancel && (() => {
                const policy = getCancellationPolicyInfo(bookingToCancel);
                return (
                  <div
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="cancel-dialog-title"
                    className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy-950/60 backdrop-blur-xs animate-fade-in"
                  >
                    <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-xl border border-slate-200">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h3 id="cancel-dialog-title" className="text-lg font-bold text-navy-950 font-display">
                            Cancel this booking?
                          </h3>
                          <p className="text-xs text-slate-500 mt-0.5">
                            Booking ID: <span className="font-mono font-semibold text-slate-700">{bookingToCancel.bookingRef || bookingToCancel.bookingId}</span>
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            if (!cancelling) setBookingToCancel(null);
                          }}
                          disabled={cancelling}
                          className="rounded-lg p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
                          aria-label="Close dialog"
                        >
                          <XIcon className="h-5 w-5" />
                        </button>
                      </div>

                      <div className="mt-4 space-y-2 rounded-xl bg-slate-50 p-3.5 text-xs text-slate-700 border border-slate-200">
                        <div className="flex justify-between">
                          <span className="text-slate-500">Service</span>
                          <span className="font-semibold text-navy-900">
                            {bookingToCancel.venue_name || bookingToCancel.venueName || bookingToCancel.roomName || bookingToCancel.gameName || bookingToCancel.title || 'Booking'}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Date</span>
                          <span className="font-semibold text-navy-900">{formatDMY(bookingToCancel.checkin || bookingToCancel.date)}</span>
                        </div>
                        {(bookingToCancel.slot || bookingToCancel.time) && (
                          <div className="flex justify-between">
                            <span className="text-slate-500">Time / Slot</span>
                            <span className="font-semibold text-navy-900">{bookingToCancel.slot || bookingToCancel.time}</span>
                          </div>
                        )}
                      </div>

                      {policy && (
                        <div className={`mt-4 rounded-xl p-3 text-xs leading-relaxed ${
                          policy.isWithinCutoff
                            ? 'border border-amber-300 bg-amber-50 text-amber-900'
                            : 'border border-slate-200 bg-slate-50 text-slate-600'
                        }`}>
                          <p className="font-semibold text-navy-900 mb-0.5">Cancellation Policy</p>
                          <p>{policy.policyText}</p>
                          {policy.warningText && (
                            <p className="mt-1 font-semibold text-amber-800">{policy.warningText}</p>
                          )}
                          {policy.refundPercent !== undefined && (
                            <div className="mt-2.5 pt-2 border-t border-slate-200/70 space-y-1 font-medium">
                              <p>
                                Time left: <span className="font-bold text-navy-900">
                                  {policy.hoursUntilStart !== undefined && policy.hoursUntilStart !== null
                                    ? policy.hoursUntilStart > 0
                                      ? `${Math.floor(policy.hoursUntilStart)} hours`
                                      : 'Check-in day (active)'
                                    : '—'}
                                </span>
                              </p>
                              <p>Refund Percentage: <span className="font-bold text-emerald-700">{policy.refundPercent}%</span></p>
                              <p>Refund Amount: <span className="font-bold text-emerald-700">₹{Number(policy.refundAmount || 0).toLocaleString('en-IN')}</span></p>
                              {policy.nonRefundableAmount !== undefined && (
                                <p>Non-refundable Amount: <span className="font-bold text-slate-700">₹{Number(policy.nonRefundableAmount || 0).toLocaleString('en-IN')}</span></p>
                              )}
                              <p className="text-[11px] text-slate-500 pt-1">
                                Refund Status: <strong>{policy.refundStatusText || (policy.refundAmount > 0 ? 'Refund pending' : 'No refund due')}</strong> &bull; {policy.timingNote || 'Refund will be credited as per your payment method timeline'}.
                              </p>
                            </div>
                          )}
                        </div>
                      )}

                      {cancelError && (
                        <div className="mt-3 rounded-xl border border-rose-200 bg-rose-50 p-2.5 text-xs text-rose-700">
                          {cancelError}
                        </div>
                      )}

                      <div className="mt-6 flex items-center justify-end gap-3 border-t border-slate-100 pt-4">
                        <button
                          type="button"
                          onClick={() => setBookingToCancel(null)}
                          disabled={cancelling}
                          className="btn-base rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
                        >
                          Keep booking
                        </button>
                        <LoadingButton
                          type="button"
                          onClick={handleConfirmCancel}
                          loading={cancelling}
                          loadingLabel="Cancelling…"
                          className="rounded-xl bg-rose-600 px-4 py-2 text-xs font-semibold text-white hover:bg-rose-700 transition"
                        >
                          Confirm cancellation
                        </LoadingButton>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
          )}
          {tab === 'payments' && !isPasswordRecovery && (
            <div id="panel-payments" role="tabpanel" aria-labelledby="tab-payments">
              {payments.length === 0 ? (
                <EmptyState
                  title="No payments yet"
                  body="Payments made on the booking pages will be listed here with their receipt references."
                  icon={MembershipIcon}
                  action={
                    <Link to="/book/activities" className="btn-base px-5 py-2.5 bg-navy-900 text-white hover:bg-navy-800">
                      Browse activities <ArrowRightIcon className="h-4 w-4" />
                    </Link>
                  }
                />
              ) : (
                <>
                  <SearchInput
                    id="pay-search"
                    name="pay-search"
                    placeholder="Search payment, booking or method…"
                    value={payQuery}
                    onChange={(e) => setPayQuery(e.target.value)}
                    aria-label="Search payments"
                  />
                  {filteredPayments.length === 0 ? (
                    <div className="mt-4">
                      <EmptyState title="No matching payments" body="Try a different search term." />
                    </div>
                  ) : (
                    <div className="card mt-4 !p-0 overflow-x-auto">
                      <table className="w-full min-w-[640px] text-sm">
                        <thead>
                          <tr className="border-b border-slate-200 bg-navy-50/70 text-left text-xs font-semibold text-slate-500">
                            <th className="p-3 font-semibold">Payment</th>
                            <th className="p-3 font-semibold">Booking</th>
                            <th className="p-3 font-semibold">Method</th>
                            <th className="p-3 font-semibold">Date</th>
                            <th className="p-3 text-right font-semibold">Amount</th>
                            <th className="p-3 font-semibold">Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredPayments.map((p) => (
                            <tr key={p.id} className="border-b border-slate-100 transition last:border-0 hover:bg-navy-50/40">
                              <td className="p-3 font-mono text-xs">{p.id}</td>
                              <td className="p-3 font-mono text-xs">{p.bookingId}</td>
                              <td className="p-3 capitalize">{String(p.method).replace(/_/g, ' ')}</td>
                              <td className="p-3 text-slate-500">{formatDMYTime(p.date)}</td>
                              <td className="p-3 text-right font-semibold text-navy-900">{formatINR(p.amount)}</td>
                              <td className="p-3"><StatusTag status={p.status} /></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
