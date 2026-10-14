import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../app/store/AppContext.jsx';
import { getRedirect, isPlaceholder, OPEN_IN_NEW_TAB } from '../config/redirects.js';
import { GAMES } from '../features/activities/games.config.js';
import { LoadingButton } from './ui/controls.jsx';
import { todayISO, cx } from '../utils/helpers.js';
import { parseDMY } from '../utils/dates.js';
import {
  HotelIcon,
  HallIcon,
  ParkingIcon,
  GamepadIcon,
  MembershipIcon,
  CalendarIcon,
  UsersIcon,
  ClockIcon,
  CarIcon,
  MailIcon,
  ChevronDownIcon,
  StarIcon,
  ArrowRightIcon,
} from './ui/icons.jsx';
import { MEMBER_PROMO_NOTE } from '../config/pricing.js';
import { SITE_INFO } from '../config/siteInfo.js';

// ---------------------------------------------------------------------------
// THE booking bar — the one booking widget in the site. It is used
//   · on the signed-out landing hero and on every section landing page, where
//     it floats half on the hero photo and half on the section below
//     (the section pages preselect their own tab),
//   · on /book and the member home, inside the page.
//
// · Tabs on top — Stay · Hall · Parking · Activities · Membership — with the
//   active tab underlined in gold.
// · One row per tab on desktop, stacked on mobile: 48px inputs with a leading
//   icon, dates typed as DD/MM/YYYY (the site's single date format, see
//   /utils/dates.js), and one gold primary button on the right.
// · Submitting hands the values to that service's own page through the same
//   query parameters as before (see targetFor). No booking rule, no booking
//   screen and no price logic lives here — the service flows are untouched.
// ---------------------------------------------------------------------------

// Bumped from the old card's key: the bar stores dates as DD/MM/YYYY text, so
// a value saved by the previous widget must not be restored into it.
const STORAGE_KEY = 'frcc.bookingBar.v2';

const TABS = [
  { id: 'stay', label: 'Stay', icon: HotelIcon, button: 'Check availability', busyLabel: 'Checking…', redirectKey: 'hotel', showcase: '/book/hotel' },
  { id: 'hall', label: 'Hall', icon: HallIcon, button: 'Check availability', busyLabel: 'Checking…', redirectKey: 'hall', showcase: '/book/hall' },
  { id: 'parking', label: 'Parking', icon: ParkingIcon, button: 'Find a slot', busyLabel: 'Finding…', redirectKey: 'parking', showcase: '/book/parking' },
  { id: 'activities', label: 'Activities', icon: GamepadIcon, button: 'Check slots', busyLabel: 'Checking…', redirectKey: 'activities', showcase: '/book/activities' },
  { id: 'membership', label: 'Membership', icon: MembershipIcon, button: 'Explore plans', busyLabel: 'Loading…', redirectKey: 'membership', showcase: '/membership' },
];

// Game list comes from the activities team's config — the single source of truth.
const GAME_OPTIONS = (GAMES || []).map((g) => ({ value: g.id, label: g.name }));

const PLAN_OPTIONS = [
  { value: 'silver', label: 'Silver' },
  { value: 'gold', label: 'Gold' },
  { value: 'platinum', label: 'Platinum' },
  { value: 'corporate', label: 'Corporate' },
];

const GUEST_OPTIONS = ['1', '2', '3', '4', '5', '6'];
const ROOM_OPTIONS = ['1', '2', '3', '4'];
const VEHICLE_OPTIONS = ['Car', 'Bike'];
const EVENT_OPTIONS = ['Wedding', 'Conference', 'Party', 'Meeting'];
const DURATION_OPTIONS = [
  { value: '1', label: '1 hour' },
  { value: '2', label: '2 hours' },
  { value: '3', label: '3 hours' },
  { value: '4', label: '4 hours' },
  { value: 'full-day', label: 'Full day' },
];

// Starting values, so the stay row is never blank (a hotel search always has
// a party size and a room count).
const DEFAULTS = { stay: { adults: '2', rooms: '1' } };
const EMPTY = { stay: {}, hall: {}, parking: {}, activities: {}, membership: {} };

const SERVICE_HEADERS = {
  stay: 'Book your stay',
  hall: 'Book a hall',
  parking: 'Reserve parking',
  activities: 'Book a game',
  membership: 'Join FRCC',
};

function readParams() {
  if (typeof window === 'undefined') return {};
  try {
    const sp = new URLSearchParams(window.location.search);
    const result = {};
    const checkin = sp.get('checkin');
    const checkout = sp.get('checkout');
    const adults = sp.get('adults');
    const rooms = sp.get('rooms');
    if (checkin || checkout || adults || rooms) {
      result.stay = {};
      if (checkin) {
        const parts = checkin.split('-');
        result.stay.checkin = parts.length === 3 ? `${parts[2]}/${parts[1]}/${parts[0]}` : checkin;
      }
      if (checkout) {
        const parts = checkout.split('-');
        result.stay.checkout = parts.length === 3 ? `${parts[2]}/${parts[1]}/${parts[0]}` : checkout;
      }
      if (adults) result.stay.adults = adults;
      if (rooms) result.stay.rooms = rooms;
    }
    return result;
  } catch {
    return {};
  }
}

function readStored() {
  try {
    return JSON.parse(window.sessionStorage.getItem(STORAGE_KEY)) || null;
  } catch {
    return null;
  }
}

/** Keeps a typed date in the DD/MM/YYYY shape while the visitor types. */
function maskDMY(raw) {
  const text = String(raw || '').trim();

  // A pasted ISO date (2026-05-01) is reordered rather than garbled.
  const pasted = /^(\d{4})[-/. ](\d{1,2})[-/. ](\d{1,2})$/.exec(text);
  if (pasted) {
    return `${pasted[3].padStart(2, '0')}/${pasted[2].padStart(2, '0')}/${pasted[1]}`;
  }

  // If the visitor typed their own separators, keep their groups — that is what
  // makes "5/1/2026" work without forcing leading zeros.
  if (/[/.-]/.test(text)) {
    const parts = text.split(/[/.-]/).map((p) => p.replace(/\D/g, ''));
    const groups = [
      (parts[0] || '').slice(0, 2),
      (parts[1] || '').slice(0, 2),
      (parts[2] || '').slice(0, 4),
    ].slice(0, Math.min(parts.length, 3));
    return groups.join('/');
  }

  // Otherwise insert the slashes as the digits arrive: 05012026 → 05/01/2026.
  const digits = text.replace(/\D/g, '').slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}

/** Labeled field with a leading icon. */
function Field({ id, label, icon: Icon, error, children }) {
  return (
    <div className="min-w-0 flex-1">
      <label htmlFor={id} className="label">{label}</label>
      <div className="relative">
        <span aria-hidden className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
          <Icon className="h-4 w-4" />
        </span>
        {children}
      </div>
      {error && <p role="alert" id={`${id}-error`} className="field-error">{error}</p>}
    </div>
  );
}

const inputCls = 'field h-12 !pl-10 w-full';

function TextInput({ id, error, inputClass = inputCls, ...props }) {
  return (
    <input
      id={id}
      className={inputClass}
      aria-invalid={!!error}
      aria-describedby={error ? `${id}-error` : undefined}
      {...props}
    />
  );
}

function SelectInput({ id, error, inputClass = inputCls, nativeArrow = false, options, placeholder = 'Select…', ...props }) {
  return (
    <>
      <select
        id={id}
        className={nativeArrow ? inputClass : cx(inputClass, 'appearance-none pr-9')}
        aria-invalid={!!error}
        aria-describedby={error ? `${id}-error` : undefined}
        {...props}
      >
        <option value="">{placeholder}</option>
        {options.map((o) => (typeof o === 'string'
          ? <option key={o} value={o}>{o}</option>
          : <option key={o.value} value={o.value}>{o.label}</option>))}
      </select>
      {!nativeArrow && (
        <ChevronDownIcon className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
      )}
    </>
  );
}

/**
 * Date field typed as DD/MM/YYYY. The value it reports is the text the visitor
 * typed (the site's own format); parseDMY() turns it into the ISO date the
 * booking flow takes.
 */
function DateInput({ id, error, value, onChange, inputClass, ...props }) {
  return (
    <TextInput
      id={id}
      error={error}
      inputClass={inputClass}
      type="text"
      inputMode="numeric"
      autoComplete="off"
      placeholder="DD/MM/YYYY"
      maxLength={10}
      value={value || ''}
      onChange={(e) => onChange(maskDMY(e.target.value))}
      {...props}
    />
  );
}

/** Validation for the outgoing values. Returns { field: message }. */
function validate(tab, v) {
  const errs = {};
  const today = todayISO();

  /** Reads a DD/MM/YYYY field, recording the right message when it is unusable. */
  function readDate(key, emptyMsg, pastMsg) {
    const raw = String(v[key] || '').trim();
    if (!raw) {
      errs[key] = emptyMsg;
      return null;
    }
    const iso = parseDMY(raw);
    if (!iso) {
      errs[key] = 'Enter the date as DD/MM/YYYY.';
      return null;
    }
    if (iso < today) {
      errs[key] = pastMsg;
      return null;
    }
    return iso;
  }

  const need = (key, msg) => { if (!v[key]) errs[key] = msg; };

  if (tab === 'stay') {
    const checkin = readDate('checkin', 'Choose a check-in date.', 'Check-in cannot be in the past.');
    const checkout = readDate('checkout', 'Choose a check-out date.', 'Check-out cannot be in the past.');
    if (checkin && checkout && checkout <= checkin) errs.checkout = 'Check-out must be after check-in.';
    need('adults', 'Choose the number of guests.');
    need('rooms', 'Choose the number of rooms.');
  }

  if (tab === 'hall') {
    readDate('date', 'Choose the event date.', 'Date cannot be in the past.');
    need('event', 'Choose an event type.');
    need('guests', 'Enter the number of guests.');
    if (v.guests && Number(v.guests) < 1) errs.guests = 'At least 1 guest.';
  }

  if (tab === 'parking') {
    readDate('date', 'Choose a date.', 'Date cannot be in the past.');
    need('vehicle', 'Choose a vehicle type.');
    need('duration', 'Choose how long you need the slot.');
  }

  if (tab === 'activities') {
    readDate('date', 'Choose a date.', 'Date cannot be in the past.');
    need('game', 'Choose a game.');
    need('players', 'Enter the number of players.');
    if (v.players && Number(v.players) < 1) errs.players = 'At least 1 player.';
  }

  if (tab === 'membership') {
    need('plan', 'Choose a plan type.');
    need('contact', 'Enter your email or mobile.');
    if (v.contact && v.contact.trim().length < 4) errs.contact = 'That looks too short — check it once.';
  }

  return errs;
}

/**
 * Where the button sends the visitor, with their values on the query string.
 * Dates are converted from DD/MM/YYYY to YYYY-MM-DD here, so every service flow
 * keeps receiving exactly what it received before.
 */
function targetFor(tabId, v) {
  const t = TABS.find((x) => x.id === tabId);
  const params = new URLSearchParams();

  if (tabId === 'stay') {
    const checkin = parseDMY(v.checkin);
    const checkout = parseDMY(v.checkout);
    if (checkin) params.set('checkin', checkin);
    if (checkout) params.set('checkout', checkout);
    if (v.adults) params.set('adults', v.adults);
    if (v.rooms) params.set('rooms', v.rooms);
  }
  if (tabId === 'hall') {
    const date = parseDMY(v.date);
    if (date) params.set('date', date);
    if (v.event) params.set('event', v.event);
    if (v.guests) params.set('guests', v.guests);
  }
  if (tabId === 'parking') {
    const date = parseDMY(v.date);
    if (date) params.set('date', date);
    if (v.vehicle) params.set('vehicle', v.vehicle);
    if (v.duration) params.set('duration', v.duration);
  }
  if (tabId === 'activities') {
    const date = parseDMY(v.date);
    if (v.game) params.set('game', v.game);
    if (date) params.set('date', date);
    if (v.players) params.set('players', v.players);
  }
  if (tabId === 'membership') {
    if (v.plan) params.set('plan', v.plan);
    if (v.contact) params.set('contact', v.contact.trim());
  }

  const qs = params.toString();
  const url = getRedirect(t.redirectKey);
  // A service whose URL is still a placeholder ("#") falls back to its own page
  // in the app, so the bar always lands somewhere useful.
  const base = isPlaceholder(url) ? t.showcase : url;
  return `${base}${qs ? `?${qs}` : ''}`;
}

/**
 * State shared by every placement: which tab, the values, validation and the
 * hand-off. Nothing here is presentation-specific.
 */
function useBookingForm(defaultTab, preselect) {
  const { user } = useApp();
  const navigate = useNavigate();
  const [tab, setTab] = useState(() => {
    // Section landing pages pass preselect + their own tab; everywhere else the
    // last tab of the session is restored (defaulting to Stay).
    if (preselect) return defaultTab;
    try {
      return readStored()?.tab || defaultTab;
    } catch {
      return defaultTab;
    }
  });
  const [values, setValues] = useState(() => {
    try {
      const stored = readStored()?.values || {};
      const fromUrl = readParams();
      return {
        ...EMPTY,
        ...stored,
        ...(fromUrl.stay ? { stay: { ...(stored.stay || {}), ...(fromUrl.stay || {}) } } : {}),
      };
    } catch {
      return { ...EMPTY, ...readParams() };
    }
  });

  useEffect(() => {
    if (preselect && defaultTab) {
      setTab(defaultTab);
    }
  }, [defaultTab, preselect]);
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const tabRefs = useRef({});

  // Remember the last tab + values for the session (restored after sign-in too).
  useEffect(() => {
    try {
      window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ tab, values }));
    } catch {
      /* storage disabled — the bar still works for this view */
    }
  }, [tab, values]);

  const v = { ...(DEFAULTS[tab] || {}), ...(values[tab] || {}) };

  const patch = (p) => {
    setValues((prev) => ({ ...prev, [tab]: { ...(prev[tab] || {}), ...p } }));
    setErrors({});
  };

  function selectTab(id) {
    setTab(id);
    setErrors({});
    setBusy(false);
  }

  function onTabKey(e) {
    const ids = TABS.map((t) => t.id);
    const i = ids.indexOf(tab);
    let next = null;
    if (e.key === 'ArrowRight') next = ids[(i + 1) % ids.length];
    if (e.key === 'ArrowLeft') next = ids[(i - 1 + ids.length) % ids.length];
    if (e.key === 'Home') next = ids[0];
    if (e.key === 'End') next = ids[ids.length - 1];
    if (next) {
      e.preventDefault();
      selectTab(next);
      tabRefs.current[next]?.focus();
    }
  }

  function submit(e) {
    e.preventDefault();
    const found = validate(tab, v);
    setErrors(found);
    if (Object.keys(found).length > 0) return;
    const target = targetFor(tab, v);
    setBusy(true);
    // Brief beat so the button's loading state is perceptible, then redirect.
    setTimeout(() => {
      setBusy(false);
      if (!user) {
        // Logged out → the protected target redirects to "/" with state.from,
        // and the Sign in link forwards the visitor back after signing in.
        navigate(target);
        return;
      }
      if (target.startsWith('/')) {
        navigate(target);
      } else if (OPEN_IN_NEW_TAB) {
        window.open(target, '_blank', 'noopener,noreferrer');
      } else {
        window.location.assign(target);
      }
    }, 450);
  }

  return { tab, selectTab, onTabKey, tabRefs, v, patch, errors, busy, submit };
}

/** The field row for the active service: one row on desktop, stacked on mobile. */
function Fields({ tab, v, errors, patch, busy }) {
  const active = TABS.find((t) => t.id === tab) || TABS[0];

  return (
    <div className="flex flex-col gap-3 px-1 lg:flex-row lg:items-end">
      {tab === 'stay' && (
        <>
          <Field id="stay-checkin" label="Check-in" icon={CalendarIcon} error={errors.checkin}>
            <DateInput id="stay-checkin" error={errors.checkin} value={v.checkin} onChange={(val) => patch({ checkin: val })} />
          </Field>
          <Field id="stay-checkout" label="Check-out" icon={CalendarIcon} error={errors.checkout}>
            <DateInput id="stay-checkout" error={errors.checkout} value={v.checkout} onChange={(val) => patch({ checkout: val })} />
          </Field>
          <Field id="stay-guests" label="Guests" icon={UsersIcon} error={errors.adults}>
            <SelectInput id="stay-guests" error={errors.adults} value={v.adults || ''} onChange={(e) => patch({ adults: e.target.value })} options={GUEST_OPTIONS} placeholder="Guests…" />
          </Field>
          <Field id="stay-rooms" label="Rooms" icon={HotelIcon} error={errors.rooms}>
            <SelectInput id="stay-rooms" error={errors.rooms} value={v.rooms || ''} onChange={(e) => patch({ rooms: e.target.value })} options={ROOM_OPTIONS} placeholder="Rooms…" />
          </Field>
        </>
      )}

      {tab === 'hall' && (
        <>
          <Field id="hall-date" label="Event date" icon={CalendarIcon} error={errors.date}>
            <DateInput id="hall-date" error={errors.date} value={v.date} onChange={(val) => patch({ date: val })} />
          </Field>
          <Field id="hall-guests" label="Guests" icon={UsersIcon} error={errors.guests}>
            <TextInput id="hall-guests" error={errors.guests} type="number" min="1" placeholder="e.g. 200" value={v.guests || ''} onChange={(e) => patch({ guests: e.target.value })} />
          </Field>
          <Field id="hall-event" label="Event type" icon={HallIcon} error={errors.event}>
            <SelectInput id="hall-event" error={errors.event} value={v.event || ''} onChange={(e) => patch({ event: e.target.value })} options={EVENT_OPTIONS} placeholder="Choose…" />
          </Field>
        </>
      )}

      {tab === 'parking' && (
        <>
          <Field id="parking-date" label="Date" icon={CalendarIcon} error={errors.date}>
            <DateInput id="parking-date" error={errors.date} value={v.date} onChange={(val) => patch({ date: val })} />
          </Field>
          <Field id="parking-vehicle" label="Vehicle type" icon={CarIcon} error={errors.vehicle}>
            <SelectInput id="parking-vehicle" error={errors.vehicle} value={v.vehicle || ''} onChange={(e) => patch({ vehicle: e.target.value })} options={VEHICLE_OPTIONS} placeholder="Choose…" />
          </Field>
          <Field id="parking-duration" label="Duration" icon={ClockIcon} error={errors.duration}>
            <SelectInput id="parking-duration" error={errors.duration} value={v.duration || ''} onChange={(e) => patch({ duration: e.target.value })} options={DURATION_OPTIONS} placeholder="Choose…" />
          </Field>
        </>
      )}

      {tab === 'activities' && (
        <>
          <Field id="activities-game" label="Game" icon={GamepadIcon} error={errors.game}>
            <SelectInput id="activities-game" error={errors.game} value={v.game || ''} onChange={(e) => patch({ game: e.target.value })} options={GAME_OPTIONS} placeholder="Choose a game…" />
          </Field>
          <Field id="activities-date" label="Date" icon={CalendarIcon} error={errors.date}>
            <DateInput id="activities-date" error={errors.date} value={v.date} onChange={(val) => patch({ date: val })} />
          </Field>
          <Field id="activities-players" label="Players" icon={UsersIcon} error={errors.players}>
            <TextInput id="activities-players" error={errors.players} type="number" min="1" placeholder="e.g. 4" value={v.players || ''} onChange={(e) => patch({ players: e.target.value })} />
          </Field>
        </>
      )}

      {tab === 'membership' && (
        <>
          <Field id="membership-plan" label="Plan type" icon={MembershipIcon} error={errors.plan}>
            <SelectInput id="membership-plan" error={errors.plan} value={v.plan || ''} onChange={(e) => patch({ plan: e.target.value })} options={PLAN_OPTIONS} placeholder="Choose a plan…" />
          </Field>
          <Field id="membership-contact" label="Contact" icon={MailIcon} error={errors.contact}>
            <TextInput id="membership-contact" error={errors.contact} type="text" autoComplete="email" placeholder="Email or mobile" value={v.contact || ''} onChange={(e) => patch({ contact: e.target.value })} />
          </Field>
        </>
      )}

      <div className="lg:shrink-0">
        <LoadingButton
          type="submit"
          variant="gold"
          loading={busy}
          loadingLabel={active.busyLabel}
          className="h-12 w-full lg:w-auto"
        >
          {active.button}
        </LoadingButton>
      </div>
    </div>
  );
}

/** Tab strip — active tab underlined in gold. Keyboard: ←/→/Home/End. */
function ServiceTabs({ tab, onTabKey, tabRefs, selectTab }) {
  return (
    <div
      role="tablist"
      aria-label="Booking services"
      onKeyDown={onTabKey}
      className="flex gap-0.5 overflow-x-auto no-scrollbar border-b border-slate-200 px-1"
    >
      {TABS.map((t) => {
        const selected = t.id === tab;
        return (
          <button
            key={t.id}
            ref={(el) => { tabRefs.current[t.id] = el; }}
            type="button"
            role="tab"
            id={`booking-tab-${t.id}`}
            aria-selected={selected}
            aria-controls={`booking-panel-${t.id}`}
            tabIndex={selected ? 0 : -1}
            onClick={() => selectTab(t.id)}
            className={cx(
              'relative flex shrink-0 items-center gap-1.5 px-3 py-3 text-sm font-semibold transition-colors duration-150 sm:px-4',
              selected
                ? 'text-navy-900 after:absolute after:inset-x-2 after:-bottom-px after:h-0.5 after:rounded-full after:bg-gold-500'
                : 'text-slate-500 hover:text-navy-900',
            )}
          >
            <t.icon className={cx('h-4 w-4', selected ? 'text-gold-600' : 'text-slate-400')} />
            {t.label}
          </button>
        );
      })}
    </div>
  );
}

/**
 * The booking card shown inside the hero on the landing page and the home
 * hub. Same tabs, fields, validation and hand-off as the bar — only the
 * presentation differs: compact tab row, vertically stacked fields (stay
 * pairs check-in/check-out and guests/rooms side by side), full-width gold
 * button. Dates stay DD/MM/YYYY.
 */
/** Dark field for the hero card: small white label above, icon left. */
function CardField({ id, label, icon: Icon, error, children }) {
  return (
    <div className="min-w-0 flex-1">
      <label htmlFor={id} className="booking-label">{label}</label>
      <div className="relative">
        <span aria-hidden className="booking-field-icon">
          <Icon className="h-4 w-4" />
        </span>
        {children}
      </div>
      {error && <p role="alert" id={`${id}-error`} className="field-error">{error}</p>}
    </div>
  );
}

/** Segmented 5-tab control for the hero card — same tab keys as the bar. */
function CardTabs({ tab, onTabKey, tabRefs, selectTab }) {
  const items = [
    { id: 'stay', label: 'Stay', icon: HotelIcon },
    { id: 'hall', label: 'Hall', icon: HallIcon },
    { id: 'parking', label: 'Parking', icon: ParkingIcon },
    { id: 'activities', label: 'Play', icon: GamepadIcon },
    { id: 'membership', label: 'Member', icon: MembershipIcon },
  ];
  return (
    <div
      role="tablist"
      aria-label="Booking services"
      onKeyDown={onTabKey}
      className="booking-tabs"
    >
      {items.map((t) => {
        const selected = t.id === tab;
        return (
          <button
            key={t.id}
            ref={(el) => { tabRefs.current[t.id] = el; }}
            type="button"
            role="tab"
            id={`booking-card-tab-${t.id}`}
            aria-selected={selected}
            aria-controls={`booking-card-panel-${t.id}`}
            tabIndex={selected ? 0 : -1}
            onClick={() => selectTab(t.id)}
            className="booking-tab"
          >
            <t.icon className="h-4 w-4" />
            {t.label}
          </button>
        );
      })}
    </div>
  );
}

function CardFields({ tab, v, errors, patch, busy, compact = false }) {
  const active = TABS.find((t) => t.id === tab) || TABS[0];

  return (
    <div className="flex flex-col gap-3">
      {tab === 'stay' && (
        <>
          <div className={compact ? "grid grid-cols-2 gap-[10px]" : "grid grid-cols-2 gap-3"}>
            <CardField id="card-stay-checkin" label="Check-in" icon={CalendarIcon} error={errors.checkin}>
              <DateInput inputClass="booking-field" id="card-stay-checkin" error={errors.checkin} value={v.checkin} onChange={(val) => patch({ checkin: val })} />
            </CardField>
            <CardField id="card-stay-checkout" label="Check-out" icon={CalendarIcon} error={errors.checkout}>
              <DateInput inputClass="booking-field" id="card-stay-checkout" error={errors.checkout} value={v.checkout} onChange={(val) => patch({ checkout: val })} />
            </CardField>
          </div>
          <div className={compact ? "grid grid-cols-2 gap-[10px]" : "grid grid-cols-2 gap-3"}>
            <CardField id="card-stay-guests" label="Guests" icon={UsersIcon} error={errors.adults}>
              <SelectInput inputClass="booking-field" nativeArrow id="card-stay-guests" error={errors.adults} value={v.adults || ''} onChange={(e) => patch({ adults: e.target.value })} options={GUEST_OPTIONS} placeholder="Guests…" />
            </CardField>
            <CardField id="card-stay-rooms" label="Rooms" icon={HotelIcon} error={errors.rooms}>
              <SelectInput inputClass="booking-field" nativeArrow id="card-stay-rooms" error={errors.rooms} value={v.rooms || ''} onChange={(e) => patch({ rooms: e.target.value })} options={ROOM_OPTIONS} placeholder="Rooms…" />
            </CardField>
          </div>
        </>
      )}

      {tab === 'hall' && (
        <>
          <CardField id="card-hall-date" label="Event date" icon={CalendarIcon} error={errors.date}>
            <DateInput inputClass="booking-field" id="card-hall-date" error={errors.date} value={v.date} onChange={(val) => patch({ date: val })} />
          </CardField>
          <div className={compact ? "grid grid-cols-2 gap-[10px]" : "grid grid-cols-2 gap-3"}>
            <CardField id="card-hall-event" label="Event type" icon={HallIcon} error={errors.event}>
              <SelectInput inputClass="booking-field" nativeArrow id="card-hall-event" error={errors.event} value={v.event || ''} onChange={(e) => patch({ event: e.target.value })} options={EVENT_OPTIONS} placeholder="Choose…" />
            </CardField>
            <CardField id="card-hall-guests" label="Guests" icon={UsersIcon} error={errors.guests}>
              <TextInput inputClass="booking-field" id="card-hall-guests" error={errors.guests} type="number" min="1" placeholder="e.g. 200" value={v.guests || ''} onChange={(e) => patch({ guests: e.target.value })} />
            </CardField>
          </div>
        </>
      )}

      {tab === 'parking' && (
        <>
          <CardField id="card-parking-date" label="Date" icon={CalendarIcon} error={errors.date}>
            <DateInput inputClass="booking-field" id="card-parking-date" error={errors.date} value={v.date} onChange={(val) => patch({ date: val })} />
          </CardField>
          <div className={compact ? "grid grid-cols-2 gap-[10px]" : "grid grid-cols-2 gap-3"}>
            <CardField id="card-parking-vehicle" label="Vehicle type" icon={CarIcon} error={errors.vehicle}>
              <SelectInput inputClass="booking-field" nativeArrow id="card-parking-vehicle" error={errors.vehicle} value={v.vehicle || ''} onChange={(e) => patch({ vehicle: e.target.value })} options={VEHICLE_OPTIONS} placeholder="Choose…" />
            </CardField>
            <CardField id="card-parking-duration" label="Duration" icon={ClockIcon} error={errors.duration}>
              <SelectInput inputClass="booking-field" nativeArrow id="card-parking-duration" error={errors.duration} value={v.duration || ''} onChange={(e) => patch({ duration: e.target.value })} options={DURATION_OPTIONS} placeholder="Choose…" />
            </CardField>
          </div>
        </>
      )}

      {tab === 'activities' && (
        <>
          <CardField id="card-activities-game" label="Game" icon={GamepadIcon} error={errors.game}>
            <SelectInput inputClass="booking-field" nativeArrow id="card-activities-game" error={errors.game} value={v.game || ''} onChange={(e) => patch({ game: e.target.value })} options={GAME_OPTIONS} placeholder="Choose a game…" />
          </CardField>
          <div className={compact ? "grid grid-cols-2 gap-[10px]" : "grid grid-cols-2 gap-3"}>
            <CardField id="card-activities-date" label="Date" icon={CalendarIcon} error={errors.date}>
              <DateInput inputClass="booking-field" id="card-activities-date" error={errors.date} value={v.date} onChange={(val) => patch({ date: val })} />
            </CardField>
            <CardField id="card-activities-players" label="Players" icon={UsersIcon} error={errors.players}>
              <TextInput inputClass="booking-field" id="card-activities-players" error={errors.players} type="number" min="1" placeholder="e.g. 4" value={v.players || ''} onChange={(e) => patch({ players: e.target.value })} />
            </CardField>
          </div>
        </>
      )}

      {tab === 'membership' && (
        <>
          <CardField id="card-membership-plan" label="Plan type" icon={MembershipIcon} error={errors.plan}>
            <SelectInput inputClass="booking-field" nativeArrow id="card-membership-plan" error={errors.plan} value={v.plan || ''} onChange={(e) => patch({ plan: e.target.value })} options={PLAN_OPTIONS} placeholder="Choose a plan…" />
          </CardField>
          <CardField id="card-membership-contact" label="Preferred contact" icon={MailIcon} error={errors.contact}>
            <TextInput inputClass="booking-field" id="card-membership-contact" error={errors.contact} type="text" autoComplete="email" placeholder="Email or mobile" value={v.contact || ''} onChange={(e) => patch({ contact: e.target.value })} />
          </CardField>
        </>
      )}

      {!compact && MEMBER_PROMO_NOTE && (
        <p className="booking-offer">
          <StarIcon className="h-3.5 w-3.5 shrink-0" /> {MEMBER_PROMO_NOTE}
        </p>
      )}

      <LoadingButton
        type="submit"
        variant="gold"
        loading={busy}
        loadingLabel={active.busyLabel}
        className={compact ? "h-[46px] w-full text-sm font-semibold" : "h-[54px] w-full text-base font-semibold"}
      >
        {active.button || 'Check availability'} {!compact && <ArrowRightIcon className="h-4 w-4" />}
      </LoadingButton>
    </div>
  );
}

export function BookingCard({ defaultTab = 'stay', preselect = false, className, compact = false, service = null }) {
  const activeTab = service || defaultTab;
  const isServiceMode = Boolean(service);
  const isCompact = compact || isServiceMode;
  const { tab, selectTab, onTabKey, tabRefs, v, patch, errors, busy, submit } = useBookingForm(activeTab, Boolean(service || preselect));
  const currentTab = service || tab;
  const phoneHref = SITE_INFO.phone ? `tel:${SITE_INFO.phone.replace(/\s/g, '')}` : null;
  const title = (service && SERVICE_HEADERS[service]) || 'Plan your visit';

  return (
    <section
      aria-label="Booking"
      className={cx('booking-card', isCompact && 'booking-card--compact', className)}
    >
      {!isCompact && <p className="booking-eyebrow">Book direct</p>}
      <h2 className="booking-title font-display">{title}</h2>
      {!service && <CardTabs tab={currentTab} onTabKey={onTabKey} tabRefs={tabRefs} selectTab={selectTab} />}
      <div
        key={currentTab}
        role="tabpanel"
        id={`booking-card-panel-${currentTab}`}
        aria-labelledby={!service ? `booking-card-tab-${currentTab}` : undefined}
        className={isCompact ? "pt-3" : "pt-4"}
      >
        <form onSubmit={submit} noValidate>
          <CardFields tab={currentTab} v={v} errors={errors} patch={patch} busy={busy} compact={isCompact} />
        </form>
      </div>
      {!isCompact && SITE_INFO.phone && phoneHref && (
        <p className="booking-help">
          Need help? Call <a href={phoneHref}>{SITE_INFO.phone}</a>
        </p>
      )}
    </section>
  );
}

/**
 * The booking bar. `preselect` + `defaultTab` are used by the section landing
 * pages so the bar opens on that section's tab; everywhere else the session's
 * last tab is restored.
 */
export function BookingBar({ defaultTab = 'stay', preselect = false, className }) {
  const { tab, selectTab, onTabKey, tabRefs, v, patch, errors, busy, submit } = useBookingForm(defaultTab, preselect);

  return (
    <section
      aria-label="Booking"
      className={cx('rounded-2xl border border-slate-200/80 bg-white p-2 shadow-lift sm:p-3', className)}
    >
      <ServiceTabs tab={tab} onTabKey={onTabKey} tabRefs={tabRefs} selectTab={selectTab} />
      <div
        key={tab}
        role="tabpanel"
        id={`booking-panel-${tab}`}
        aria-labelledby={`booking-tab-${tab}`}
        className="pt-3"
      >
        <form onSubmit={submit} noValidate>
          <Fields tab={tab} v={v} errors={errors} patch={patch} busy={busy} />
        </form>
      </div>
    </section>
  );
}

export default BookingBar;
