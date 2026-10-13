import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useApp } from '../app/store/AppContext.jsx';
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
import { PageHeader } from '../components/ui/sections.jsx';
import { Reveal } from '../components/ui/motion.jsx';
import {
  UserIcon,
  ShieldIcon,
  BellIcon,
  CalendarIcon,
  MembershipIcon,
  ArrowRightIcon,
} from '../components/ui/icons.jsx';

// ---------------------------------------------------------------------------
// /profile — EVERY logged-in user. Reached only from the navbar avatar menu.
// Tabs: Personal Details (editable) · Change Password · Notification
// Preferences · My Bookings · Payment History.
// ---------------------------------------------------------------------------

const TABS = [
  { id: 'details', label: 'Personal Details', icon: UserIcon },
  { id: 'password', label: 'Change Password', icon: ShieldIcon },
  { id: 'notifications', label: 'Notification Preferences', icon: BellIcon },
  { id: 'bookings', label: 'My Bookings', icon: CalendarIcon },
  { id: 'payments', label: 'Payment History', icon: MembershipIcon },
];

function PersonalDetails({ user, pushToast }) {
  const [name, setName] = useState(user?.name || '');
  const [contact, setContact] = useState(user?.emailOrPhone || '');
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  function save(e) {
    e.preventDefault();
    setErr('');
    if (name.trim().length < 2) {
      setErr('Please enter your full name.');
      return;
    }
    if (contact.trim().length < 5) {
      setErr('Please enter a valid email or mobile number.');
      return;
    }
    setSaving(true);
    // TODO: PATCH /api/profile
    setTimeout(() => {
      setSaving(false);
      pushToast('Personal details saved.');
    }, 600);
  }

  return (
    <Card>
      <h3 className="h-card">Personal Details</h3>
      <p className="caption mt-1">User ID {user?.userId || '—'}</p>
      <form onSubmit={save} className="mt-5 grid gap-4 sm:grid-cols-2" noValidate>
        <div>
          <label className="label" htmlFor="profile-name">Full name</label>
          <Input id="profile-name" name="name" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />
        </div>
        <div>
          <label className="label" htmlFor="profile-contact">Email / Mobile</label>
          <Input id="profile-contact" name="contact" value={contact} onChange={(e) => setContact(e.target.value)} autoComplete="email" />
        </div>
        {err && <p className="field-error sm:col-span-2" role="alert">{err}</p>}
        <div className="sm:col-span-2">
          <LoadingButton loading={saving} className="px-6 py-2.5 bg-navy-900 text-white hover:bg-navy-800">
            Save changes
          </LoadingButton>
        </div>
      </form>
    </Card>
  );
}

function ChangePassword({ pushToast }) {
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  function save(e) {
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
    // TODO: POST /api/auth/change-password
    setTimeout(() => {
      setSaving(false);
      setCurrent('');
      setNext('');
      setConfirm('');
      pushToast('Password changed.');
    }, 600);
  }

  return (
    <Card>
      <h3 className="h-card">Change Password</h3>
      <p className="caption mt-1">Minimum 8 characters</p>
      <form onSubmit={save} className="mt-5 grid gap-4 sm:grid-cols-2" noValidate>
        <div className="sm:col-span-2">
          <label className="label" htmlFor="pw-current">Current password</label>
          <Input id="pw-current" name="current" type="password" value={current} onChange={(e) => setCurrent(e.target.value)} autoComplete="current-password" />
        </div>
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
            Update password
          </LoadingButton>
        </div>
      </form>
    </Card>
  );
}

const PREF_DEFAULTS = [
  { id: 'booking', label: 'Booking confirmations', desc: 'Slot holds, confirmations and cancellations.', on: true },
  { id: 'events', label: 'Events & open houses', desc: 'Galas, food fests and hall open houses.', on: true },
  { id: 'offers', label: 'Member offers', desc: 'Member-only rates and seasonal packages.', on: false },
];

function NotificationPrefs({ pushToast }) {
  const [prefs, setPrefs] = useState(PREF_DEFAULTS);
  return (
    <Card>
      <h3 className="h-card">Notification Preferences</h3>
      <p className="caption mt-1">Preferences are saved locally</p>
      <ul className="mt-5 divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200">
        {prefs.map((p) => (
          <li key={p.id} className="flex items-center justify-between gap-4 bg-white px-4 py-3.5">
            <span>
              <span className="block text-sm font-semibold text-navy-900">{p.label}</span>
              <span className="block text-xs text-slate-500">{p.desc}</span>
            </span>
            <button
              type="button"
              role="switch"
              aria-checked={p.on}
              aria-label={p.label}
              onClick={() => {
                setPrefs((prev) => prev.map((x) => (x.id === p.id ? { ...x, on: !x.on } : x)));
                pushToast(`${p.label} ${p.on ? 'muted' : 'enabled'}.`);
              }}
              className={`relative h-6 w-11 shrink-0 rounded-full transition ${p.on ? 'bg-navy-900' : 'bg-slate-300'}`}
            >
              <span
                aria-hidden
                className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${p.on ? 'left-[22px]' : 'left-0.5'}`}
              />
            </button>
          </li>
        ))}
      </ul>
    </Card>
  );
}

export function ProfilePage({ initialTab = 'details' }) {
  const { user, pushToast } = useApp();
  // Bookings and payments from the activities booking store.
  const { bookings, payments } = useActivityBookings();
  const [params] = useSearchParams();
  const [tab, setTab] = useState(params.get('tab') || initialTab);
  const [payQuery, setPayQuery] = useState('');
  const { loading, error, retry } = useMockQuery(() => ({ ready: true }));

  const filteredPayments = useMemo(() => {
    const q = payQuery.trim().toLowerCase();
    if (!q) return payments;
    return payments.filter((p) =>
      [p.id, p.bookingId, p.method].some((v) => String(v || '').toLowerCase().includes(q)),
    );
  }, [payments, payQuery]);

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

  const tabs = TABS.map((t) =>
    t.id === 'bookings' ? { ...t, count: bookings.length } : t.id === 'payments' ? { ...t, count: payments.length } : t,
  );

  return (
    <div>
      <PageHeader
        title={`Hi, ${(user?.name || 'Member').split(' ')[0]}`}
        description={`${user?.emailOrPhone || ''} · ${user?.userId || ''}`}
        image={IMAGES.bannerProfile}
        breadcrumbs={[{ label: 'Home', to: '/home' }, { label: 'Profile' }]}
      />

      <div className="container-x section-top">
        <div role="tablist" aria-label="Profile sections" className="flex flex-wrap gap-2 border-b border-slate-200 pb-3">
          {tabs.map((t) => {
            const selected = tab === t.id;
            return (
              <button
                key={t.id}
                id={`tab-${t.id}`}
                role="tab"
                type="button"
                aria-selected={selected}
                aria-controls={`panel-${t.id}`}
                onClick={() => setTab(t.id)}
                className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
                  selected
                    ? 'bg-navy-900 text-white shadow-card'
                    : 'border border-slate-200 bg-white text-slate-600 hover:border-navy-900/30 hover:text-navy-900'
                }`}
              >
                <t.icon className="h-4 w-4" />
                {t.label}
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
          {tab === 'details' && (
            <div id="panel-details" role="tabpanel" aria-labelledby="tab-details">
              <Reveal><PersonalDetails user={user} pushToast={pushToast} /></Reveal>
            </div>
          )}
          {tab === 'password' && (
            <div id="panel-password" role="tabpanel" aria-labelledby="tab-password">
              <Reveal><ChangePassword pushToast={pushToast} /></Reveal>
            </div>
          )}
          {tab === 'notifications' && (
            <div id="panel-notifications" role="tabpanel" aria-labelledby="tab-notifications">
              <Reveal><NotificationPrefs pushToast={pushToast} /></Reveal>
            </div>
          )}
          {tab === 'bookings' && (
            <div id="panel-bookings" role="tabpanel" aria-labelledby="tab-bookings">
              {bookings.length === 0 ? (
                <EmptyState
                  title="No bookings yet"
                  body="Games booked on the Activities booking page will appear here with their status."
                  icon={CalendarIcon}
                  action={
                    <Link to="/book/activities" className="btn-base px-5 py-2.5 bg-navy-900 text-white hover:bg-navy-800">
                      Browse activities <ArrowRightIcon className="h-4 w-4" />
                    </Link>
                  }
                />
              ) : (
                <div className="grid gap-4 sm:grid-cols-2">
                  {bookings.map((b) => (
                    <Card key={b.bookingId} className="card-hover">
                      <div className="flex items-start justify-between gap-3">
                        <p className="font-semibold text-navy-900">{b.gameName || b.game}</p>
                        <StatusTag status={b.status} />
                      </div>
                      <p className="mt-2 font-mono text-xs text-slate-500">{b.bookingId}</p>
                      <dl className="mt-3 space-y-1.5 border-t border-slate-100 pt-3 text-sm">
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
                          <dd className="font-medium text-navy-900">{formatINR(b.amount)}</dd>
                        </div>
                      </dl>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}
          {tab === 'payments' && (
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
