import { useMemo, useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { useApp } from '../../app/store/AppContext.jsx';
import { useMockQuery } from '../../app/hooks/useMockQuery.js';
import { Button, Input, Select, LoadingButton } from '../../components/ui/controls.jsx';
import { Card, EmptyState, SectionHeading } from '../../components/ui/feedback.jsx';
import { FlowShell } from '../../components/FlowShell.jsx';
import { Reveal } from '../../components/ui/motion.jsx';
import { IMAGES, gameSlot } from '../../config/images.js';
import { SmartImage } from '../../components/ui/media.jsx';
import {
  GAMES,
  gameById,
  quotePrice,
  formatINR,
  GAME_CATEGORIES,
  resolveActivityLocation,
  isGroupActivity,
  getMaxPlayersForSlot,
  validateChildAges,
} from './games.config.js';
import { getSlots, getSlotAvailability } from './availability.service.js';
import { saveActivityBooking, createActivityBookingRemote, CHANGED_EVENT } from './bookings.store.js';
import { SlotGrid } from '../../components/booking/SlotGrid.jsx';
import { LocationSelector } from '../../components/booking/LocationSelector.jsx';
import { LocationTrigger } from '../../components/location/LocationTrigger.jsx';
import { ACTIVITY_LOCATIONS } from '../../data/bookingLocations.js';
import { calculateTotal } from '../../utils/pricing.js';
import { formatDMY, formatDMYTime } from '../../utils/dates.js';
import {
  INDIAN_MOBILE_MESSAGE,
  INDIAN_MOBILE_PLACEHOLDER,
  isValidIndianMobile,
  sanitizeMobileInput,
} from '../../utils/mobile.js';
import { MEMBER_DISCOUNT_LABEL, MEMBER_PROMO_NOTE } from '../../config/pricing.js';
import { MEMBERSHIP_REDIRECT_URL } from '../../config/services.js';
import {
  TrophyIcon,
  WavesIcon,
  UsersIcon,
  CalendarIcon,
  ClockIcon,
  CheckCircleIcon,
  ShieldIcon,
  DownloadIcon,
  PrinterIcon,
  ChevronLeftIcon,
  ArrowRightIcon,
} from '../../components/ui/icons.jsx';




// ---------------------------------------------------------------------------
// /book/activities/process — the Activities booking page (redirect target of
// ACTIVITIES_BOOKING_URL, default internal route). Same Navbar, Footer,
// PageHeader, colors, fonts, buttons, inputs and cards as the main site; all
// game data comes from games.config.js so this page is self-contained and can
// move to another project/domain with the same ?game=<id> URL pattern.
// Steps: Game → Date/Time → Slot → Player/Guest Details → Review & Payment
// → Confirmation. Requires login (ProtectedRoute sends logged-
// out users to "/" and back here afterwards).
// ---------------------------------------------------------------------------

const STEPS = [
  { id: 'game', title: 'Select Game' },
  { id: 'date', title: 'Date & Time' },
  { id: 'slot', title: 'Available Slot' },
  { id: 'details', title: 'Player Details' },
  { id: 'payment', title: 'Review & Pay' },
  { id: 'confirm', title: 'Confirmation' },
];

const PAYMENT_METHODS = [
  { id: 'upi', label: 'UPI', hint: 'GPay, PhonePe, Paytm & more' },
  { id: 'card', label: 'Card', hint: 'Credit / debit cards' },
  { id: 'netbanking', label: 'Net Banking', hint: 'All major banks' },
  { id: 'pay_at_venue', label: 'Pay at Venue', hint: 'Cash / UPI at the counter' },
];

const GAME_ICONS = { water: WavesIcon, kids: UsersIcon };

function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function maxISO() {
  const d = new Date();
  d.setDate(d.getDate() + 90);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// Every date on this page is shown as DD/MM/YYYY.
function prettyDate(iso) {
  return formatDMY(iso);
}

function hour12(h) {
  const hh = ((h + 11) % 12) + 1;
  const ap = h < 12 ? 'AM' : 'PM';
  return `${hh} ${ap}`;
}

/** Deterministic QR-looking placeholder (no new dependency). */
function QrPlaceholder({ seed = 'frcc' }) {
  const SIZE = 9;
  const cells = useMemo(() => {
    let h = 2166136261;
    for (let i = 0; i < seed.length; i += 1) {
      h ^= seed.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    const out = [];
    for (let i = 0; i < SIZE * SIZE; i += 1) {
      h = Math.imul(h ^ (h >>> 15), 2246822507);
      out.push(((h >>> (i % 24)) & 3) !== 0);
    }
    return out;
  }, [seed]);
  const finders = [[0, 0], [0, SIZE - 3], [SIZE - 3, 0]];
  const inFinder = (r, c) => finders.some(([r0, c0]) => r >= r0 && r < r0 + 3 && c >= c0 && c < c0 + 3);
  return (
    <div role="img" aria-label="Booking QR code placeholder" className="grid h-24 w-24 shrink-0 gap-[2px] rounded-lg bg-white p-2 shadow-card" style={{ gridTemplateColumns: `repeat(${SIZE}, minmax(0, 1fr))` }}>
      {cells.map((on, i) => {
        const r = Math.floor(i / SIZE);
        const c = i % SIZE;
        const dark = inFinder(r, c) ? !(r % 3 === 1 && c % 3 === 1) : on;
        return <span key={i} className={dark ? 'rounded-[1px] bg-navy-950' : 'rounded-[1px] bg-navy-50'} />;
      })}
    </div>
  );
}

const STORAGE_KEY = 'frcc_activities_booking_draft';

function blankDraft(gameId, user, cityParam = '') {
  const prefilledMobile = user?.phone || user?.mobile || (user?.emailOrPhone && !user.emailOrPhone.includes('@') ? user.emailOrPhone : '');
  const loc = resolveActivityLocation(cityParam ? { cityId: cityParam } : {});
  return {
    gameId: gameId || '',
    cityId: loc.cityId,
    cityName: loc.cityName,
    venueLocationId: loc.venueLocationId,
    venueLocationName: loc.venueLocationName,
    areaName: loc.areaName,
    location: loc.location,
    date: '',
    slot: '',
    name: user?.name || '',
    mobile: prefilledMobile ? prefilledMobile.replace(/\D/g, '').slice(-10) : '',
    players: '',
    equipment: false,
    extras: {},
    paymentMethod: 'upi',
  };
}

export function ActivitiesProcessPage() {
  const { user, isMember, pushToast } = useApp();
  const [params] = useSearchParams();
  const paramGame = params.get('game') || params.get('item') || '';
  const paramCity = params.get('city') || params.get('cityId') || '';
  const paramValid = Boolean(paramGame && gameById(paramGame));

  const navigate = useNavigate();
  useEffect(() => {
    if (paramGame === 'carom' || paramGame === 'kids-play-area') {
      navigate('/activities', { replace: true });
    }
  }, [paramGame, navigate]);

  const [confirmed, setConfirmed] = useState(null);

  const [draft, setDraft] = useState(() => {
    if (paramValid) {
      return blankDraft(paramGame, user, paramCity);
    }
    let saved = null;
    try {
      const raw = window.sessionStorage.getItem(STORAGE_KEY);
      if (raw) saved = JSON.parse(raw);
    } catch {
      /* ignore */
    }
    if (saved && saved.step < 5) {
      const base = blankDraft(saved.gameId || '', user, paramCity);
      return {
        ...base,
        ...saved,
        ...(paramCity
          ? {
              cityId: base.cityId,
              cityName: base.cityName,
              venueLocationId: base.venueLocationId,
              venueLocationName: base.venueLocationName,
              areaName: base.areaName,
              location: base.location,
            }
          : {}),
      };
    }
    return blankDraft('', user, paramCity);
  });

  const [step, setStep] = useState(() => {
    if (paramValid) return 1;
    let saved = null;
    try {
      const raw = window.sessionStorage.getItem(STORAGE_KEY);
      if (raw) saved = JSON.parse(raw);
    } catch {
      /* ignore */
    }
    if (saved?.step !== undefined && saved.step < 5) return saved.step;
    return 0;
  });

  const [errors, setErrors] = useState({});
  const [paying, setPaying] = useState(false);

  // Reset flow when query param changes to a different game
  useEffect(() => {
    if (paramValid && paramGame && paramGame !== draft.gameId) {
      setDraft((prev) => {
        const next = blankDraft(paramGame, user, paramCity);
        if (paramCity || !prev.cityId) return next;
        return {
          ...next,
          cityId: prev.cityId,
          cityName: prev.cityName,
          venueLocationId: prev.venueLocationId,
          venueLocationName: prev.venueLocationName,
          areaName: prev.areaName,
          location: prev.location,
        };
      });
      setStep(1);
      setConfirmed(null);
      setErrors({});
      try {
        window.sessionStorage.removeItem(STORAGE_KEY);
        window.sessionStorage.removeItem('frcc_activities_confirmed');
      } catch (_) {}
    }
  }, [paramGame, paramValid, paramCity, user]);

  // Purge past confirmation receipt if user changes or logs out
  useEffect(() => {
    if (confirmed) {
      const matches = user?.id && (confirmed.userId === user.id || confirmed.user_id === user.id || confirmed.userId === user.userId);
      if (!matches) {
        setConfirmed(null);
        setStep(paramValid ? 1 : 0);
        try {
          window.sessionStorage.removeItem('frcc_activities_confirmed');
        } catch (_) {}
      }
    }
  }, [user?.id, user?.userId, confirmed, paramValid]);

  // Prefill name and mobile from user when available
  useEffect(() => {
    if (!user) return;
    setDraft((prev) => {
      const updates = {};
      if (!prev.name && user.name) updates.name = user.name;
      const userPhone = user.phone || user.mobile || (user.emailOrPhone && !user.emailOrPhone.includes('@') ? user.emailOrPhone : '');
      if (!prev.mobile && userPhone) updates.mobile = userPhone.replace(/\D/g, '').slice(-10);
      return Object.keys(updates).length > 0 ? { ...prev, ...updates } : prev;
    });
  }, [user]);

  // Sync draft and step to sessionStorage for refresh safety during active flow (steps 0-4)
  useEffect(() => {
    try {
      if (step < 5) {
        window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ ...draft, step }));
      } else {
        window.sessionStorage.removeItem(STORAGE_KEY);
        window.sessionStorage.removeItem('frcc_activities_confirmed');
      }
    } catch {
      /* ignore */
    }
  }, [draft, step]);

  const game = gameById(draft.gameId);
  const isGymFlow = draft.gameId === 'luxury-gym';
  const patch = (p) => {
    setDraft((d) => ({ ...d, ...p }));
    setErrors({});
  };
  const patchExtra = (id, value) => {
    setDraft((d) => ({ ...d, extras: { ...d.extras, [id]: value } }));
    setErrors({});
  };

  function handleCityChange(nextCityId, cityObj, firstVenue) {
    if (!nextCityId) {
      patch({
        cityId: '',
        cityName: '',
        venueLocationId: '',
        venueLocationName: '',
        areaName: '',
        location: '',
        slot: '',
      });
      return;
    }
    const loc = resolveActivityLocation({
      cityId: nextCityId,
      cityName: cityObj?.name,
      venueLocationId: firstVenue?.id,
      venueLocationName: firstVenue?.name,
      areaName: firstVenue?.areaName,
      location: firstVenue?.displayName,
    });
    patch({ ...loc, slot: '' });
  }

  function handleVenueChange(nextVenueId, venueObj) {
    if (!nextVenueId) {
      patch({
        venueLocationId: '',
        venueLocationName: '',
        location: '',
        slot: '',
      });
      return;
    }
    const loc = resolveActivityLocation({
      cityId: draft.cityId,
      venueLocationId: nextVenueId,
      venueLocationName: venueObj?.name,
      areaName: venueObj?.areaName,
      location: venueObj?.displayName,
    });
    patch({ ...loc, slot: '' });
  }

  const activeLocationInfo = useMemo(
    () => (draft.cityId ? { cityId: draft.cityId, areaName: draft.areaName, location: draft.location } : null),
    [draft.cityId, draft.areaName, draft.location],
  );

  // Slots load per game + date + location from database RPC / live bookings query
  const slotsQuery = useMockQuery(() => getSlotAvailability(draft.gameId, draft.date, activeLocationInfo), {
    deps: [draft.gameId, draft.date, draft.cityId],
    delay: 200,
  });
  // Always refresh slots when opening the slot picker (step 2)
  useEffect(() => {
    if (step === 2 && !isGymFlow && draft.gameId && draft.date) {
      slotsQuery.retry();
    }
  }, [step, draft.gameId, draft.date, draft.cityId, isGymFlow]);

  // Gym has no slot step: redirect away if somehow landed on step 2
  useEffect(() => {
    if (isGymFlow && step === 2) {
      setStep(3);
    }
  }, [isGymFlow, step]);

  // Immediately refresh slots when an activity booking is confirmed or changed on this device
  useEffect(() => {
    const onBookingsChanged = () => {
      slotsQuery.retry();
    };
    window.addEventListener(CHANGED_EVENT, onBookingsChanged);
    return () => {
      window.removeEventListener(CHANGED_EVENT, onBookingsChanged);
    };
  }, [slotsQuery]);

  const slots = slotsQuery.data || [];
  const fullyBooked = !slotsQuery.loading && !slotsQuery.error && slots.length > 0 && slots.every((s) => s.booked);

  const quote = useMemo(
    () => (game ? quotePrice(game, { extras: draft.extras, equipment: draft.equipment }, isMember) : { lines: [], total: 0 }),
    [game, draft.extras, draft.equipment, isMember],
  );

  const summaryRows = useMemo(() => {
    if (!game) return [{ label: 'Game', value: 'Not selected yet' }];
    return [
      { label: 'Game', value: game.name },
      { label: 'Date', value: draft.date ? prettyDate(draft.date) : '—' },
      { label: 'Slot', value: draft.slot ? `${draft.slot} (${game.slotMinutes} min)` : '—' },
      ...(game?.id === 'luxury-gym' ? [] : [{ label: game.playerLabel, value: draft.players || '—' }]),
    ];
  }, [game, draft.date, draft.slot, draft.players]);

  // Inline step validation
  const isStepValid = useMemo(() => {
    if (step === 0) {
      return Boolean(draft.gameId && gameById(draft.gameId) && draft.cityId && draft.venueLocationId);
    }
    if (step === 1) {
      return Boolean(draft.cityId && draft.venueLocationId && draft.date && draft.date >= todayISO());
    }
    if (step === 2) {
      const s = slots.find((item) => item.time === draft.slot);
      return Boolean(draft.slot && !s?.booked && (s?.remaining === undefined || s.remaining > 0));
    }
    if (step === 3) {
      const g = gameById(draft.gameId);
      const n = Number(draft.players);
      const nameOk = draft.name.trim().length >= 2;
      const cleanMobile = draft.mobile.replace(/\D/g, '');
      const mobileOk = isValidIndianMobile(draft.mobile);
      const selectedSlot = slots.find((s) => s.time === draft.slot);
      const maxAllowed = getMaxPlayersForSlot(g, selectedSlot);
      const playersOk = game?.id === 'luxury-gym' || (Boolean(draft.players) && Number.isFinite(n) && n >= 1 && n <= maxAllowed);
      if (!nameOk || !mobileOk || !playersOk) return false;
      if (g?.extraFields) {
        for (const f of g.extraFields) {
          const v = draft.extras[f.id];
          if (f.required && (v === undefined || v === '' || v === false)) return false;
          if (f.id === 'ages' && validateChildAges(v, n)) return false;
          if (f.type === 'number' && v !== undefined && v !== '') {
            const nv = Number(v);
            if (!Number.isFinite(nv)) return false;
            if (f.min !== undefined && nv < f.min) return false;
            if (f.max !== undefined && nv > f.max) return false;
          }
          if ((f.type === 'text' || f.type === 'tel') && f.required && String(v || '').trim().length < 2 && f.id !== 'ages') return false;
          if (f.type === 'tel' && v && !isValidIndianMobile(v)) return false;
        }
      }
      return true;
    }
    if (step === 4) {
      return Boolean(draft.paymentMethod);
    }
    return true;
  }, [step, draft, slots, game]);

  function fail(next) {
    setErrors(next);
    const first = Object.values(next)[0];
    if (first) pushToast(first, 'error');
    return false;
  }

  function validate(target) {
    if (target === 0) {
      if (!draft.cityId || !draft.venueLocationId) return fail({ location: 'Select a city and campus location.' });
      if (!draft.gameId || !gameById(draft.gameId)) return fail({ gameId: 'Select a game to continue.' });
      return true;
    }
    if (target === 1) {
      if (!draft.cityId || !draft.venueLocationId) return fail({ location: 'Select a city and campus location.' });
      if (!draft.date) return fail({ date: 'Pick a date for your game.' });
      if (draft.date < todayISO()) return fail({ date: 'Past dates are not bookable — pick today or later.' });
      return true;
    }
    if (target === 2) {
      if (!draft.slot) return fail({ slot: 'Pick an available slot.' });
      const s = slots.find((item) => item.time === draft.slot);
      if (s?.booked || (s?.remaining !== undefined && s.remaining <= 0)) {
        return fail({ slot: 'This slot is no longer available' });
      }
      return true;
    }
    if (target === 3) {
      const g = gameById(draft.gameId);
      const next = {};
      if (draft.name.trim().length < 2) next.name = 'Enter the booker’s full name.';
      if (!isValidIndianMobile(draft.mobile)) next.mobile = INDIAN_MOBILE_MESSAGE;
      const n = Number(draft.players);
      const selectedSlot = slots.find((s) => s.time === draft.slot);
      const maxAllowed = getMaxPlayersForSlot(g, selectedSlot);

      if (g?.id !== 'luxury-gym' && (!draft.players || !Number.isFinite(n) || n < 1)) {
        next.players = 'Enter how many are playing.';
      } else if (g?.id !== 'luxury-gym' && n > maxAllowed) {
        next.players = isGroupActivity(g?.id) && selectedSlot && selectedSlot.remaining !== undefined
          ? `Only ${selectedSlot.remaining} spot${selectedSlot.remaining > 1 ? 's' : ''} available for this slot.`
          : `Max ${g?.maxPlayers} for ${g?.name}.`;
      }
      if (g) {
        for (const f of g.extraFields) {
          const v = draft.extras[f.id];
          if (f.required && (v === undefined || v === '' || v === false)) {
            next[`x_${f.id}`] = f.type === 'checkbox' ? `Please accept: ${f.label}.` : `“${f.label}” is required.`;
          } else if (f.id === 'ages') {
            const ageErr = validateChildAges(v, n);
            if (ageErr) next[`x_${f.id}`] = ageErr;
          } else if (f.type === 'number' && v !== undefined && v !== '') {
            const nv = Number(v);
            if (!Number.isFinite(nv)) next[`x_${f.id}`] = `“${f.label}” must be a number.`;
            else if ((f.min !== undefined && nv < f.min) || (f.max !== undefined && nv > f.max)) {
              next[`x_${f.id}`] = `“${f.label}” must be between ${f.min} and ${f.max}.`;
            }
          } else if ((f.type === 'text' || f.type === 'tel') && f.required && String(v || '').trim().length < 2) {
            next[`x_${f.id}`] = `“${f.label}” is required.`;
          }
          if (f.type === 'tel' && v && !isValidIndianMobile(v)) {
            next[`x_${f.id}`] = INDIAN_MOBILE_MESSAGE;
          }
        }
      }
      if (Object.keys(next).length > 0) return fail(next);
      return true;
    }
    return true;
  }

  async function goNext() {
    if (!validate(step)) return;
    if (!isGymFlow && step === 3) {
      // Re-check slot availability before proceeding to Review & Payment
      try {
        const freshSlots = await getSlotAvailability(draft.gameId, draft.date, activeLocationInfo);
        const freshSlot = freshSlots.find((s) => s.time === draft.slot);
        const reqPlayers = Number(draft.players || 1);
        const slotUnavailable =
          !freshSlot ||
          freshSlot.booked ||
          (freshSlot.remaining !== undefined &&
            (isGroupActivity(draft.gameId) ? freshSlot.remaining < reqPlayers : freshSlot.remaining <= 0));
        if (slotUnavailable) {
          pushToast('This slot is no longer available', 'error');
          setErrors({ slot: 'This slot is no longer available' });
          slotsQuery.retry();
          setStep(2); // Return to slot selection step
          return;
        }
      } catch (err) {
        console.warn('Slot pre-check warning:', err);
      }
    }
    // Gym: skip the (removed) slot step
    if (isGymFlow && step === 1) {
      setStep(3);
      return;
    }
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  }

  function goBack() {
    setErrors({});
    if (isGymFlow && step === 3) {
      setStep(1);
      return;
    }
    setStep((s) => Math.max(s - 1, 0));
  }

  function selectGame(id) {
    setDraft((d) => ({
      ...blankDraft(id, user, paramCity),
      cityId: d.cityId,
      cityName: d.cityName,
      venueLocationId: d.venueLocationId,
      venueLocationName: d.venueLocationName,
      areaName: d.areaName,
      location: d.location,
      name: d.name,
      mobile: d.mobile,
    }));
    setErrors({});
  }

  const isFreeGame = Boolean(game && (game.isFree || (game.price ?? game.pricePerSlot) === 0));

  async function pay() {
    if (paying) return;
    if (!isFreeGame && !draft.paymentMethod) {
      pushToast('Choose a payment method.', 'error');
      setErrors({ paymentMethod: 'Choose a payment method.' });
      return;
    }
    setPaying(true);
    setErrors({});

    try {
      const loc = resolveActivityLocation({
        cityId: draft.cityId,
        cityName: draft.cityName,
        areaName: draft.areaName,
        venueLocationId: draft.venueLocationId,
        venueLocationName: draft.venueLocationName,
        location: draft.location,
      });
      const created = await createActivityBookingRemote({
        gameId: draft.gameId,
        date: draft.date,
        slot: isGymFlow ? '06:00' : draft.slot,
        players: Number(draft.players || 1),
        userName: draft.name,
        mobile: draft.mobile,
        email: user?.email || user?.user_metadata?.email || null,
        paymentMethod: isFreeGame ? 'free' : draft.paymentMethod,
        cityId: loc.cityId,
        cityName: loc.cityName,
        areaName: loc.areaName,
        venueLocationId: loc.venueLocationId,
        venueLocationName: loc.venueLocationName,
        location: loc.location,
        details: {
          ...draft.extras,
          equipment: draft.equipment,
          gameName: game?.name,
          isFree: isFreeGame,
          cityId: loc.cityId,
          cityName: loc.cityName,
          areaName: loc.areaName,
          venueLocationId: loc.venueLocationId,
          venueLocationName: loc.venueLocationName,
          location: loc.location,
        },
      });

      const confirmedRecord = {
        ...created,
        isFree: Boolean(isFreeGame || created.isFree || Number(created.amount ?? 0) === 0),
        bookingId: created.booking_id,
        id: created.booking_id,
        game: created.game_id || draft.gameId,
        gameName: created.title || game?.name,
        cityId: created.cityId || loc.cityId,
        cityName: created.cityName || loc.cityName,
        areaName: created.areaName || loc.areaName,
        venueLocationId: created.venueLocationId || loc.venueLocationId,
        venueLocationName: created.venueLocationName || loc.venueLocationName,
        location: created.location || loc.location,
        userId: created.user_id,
        user_id: created.user_id,
      };

      try {
        window.sessionStorage.removeItem(STORAGE_KEY);
        window.sessionStorage.removeItem('frcc_activities_confirmed');
      } catch (_) {}

      setConfirmed(confirmedRecord);
      slotsQuery.retry();
      setStep(5);
      pushToast(isFreeGame ? 'Complimentary booking confirmed.' : draft.paymentMethod === 'pay_at_venue' ? 'Slot reserved — pay at the venue.' : 'Booking confirmed.');
    } catch (err) {
      const msg = err?.message || String(err);
      const isSlotConflict =
        msg.includes('SLOT_FULL') ||
        msg.includes('no longer available') ||
        msg.includes('ALREADY_BOOKED') ||
        msg.includes('already booked') ||
        msg.includes('duplicate') ||
        msg.includes('23505') ||
        msg.includes('unique constraint');

      if (isSlotConflict) {
        pushToast('This slot is no longer available. Please select another slot.', 'error');
        setErrors({
          slot: 'This slot is no longer available. Please select another slot.',
          alreadyBooked: 'This slot is no longer available. Please select another slot.',
        });
        slotsQuery.retry();
        setStep(isGymFlow ? 1 : 2); // Return to Date & Time (gym) or Available Slot step
      } else {
        pushToast(msg || 'Failed to complete booking. Please try again.', 'error');
        setErrors({ submit: msg });
      }
    } finally {
      setPaying(false);
    }
  }

  function downloadReceipt() {
    if (!confirmed) return;
    const g = gameById(confirmed.game);
    const confirmedIsFree = Boolean(confirmed.isFree || g?.isFree || (g?.price ?? g?.pricePerSlot) === 0 || Number(confirmed.amount ?? 0) === 0);
    const pricing = calculateTotal(confirmed.subtotal ?? confirmed.amount, Boolean(confirmed.isMember ?? isMember));
    const text = [
      'FRCC — Activities Booking Receipt',
      `Booking ID: ${confirmed.bookingId}`,
      `Game: ${confirmed.gameName || g?.name || confirmed.game}`,
      `Location: ${confirmed.location || confirmed.areaName || draft.location}`,
      `Date: ${prettyDate(confirmed.date)}`,
      ...(g?.id === 'luxury-gym' ? [] : [`Slot: ${confirmed.slot}`]),
      ...(g?.id === 'luxury-gym' ? [] : [`Players: ${confirmed.players}`]),
      ...(confirmedIsFree
        ? ['Rate: Complimentary (Free)', 'Total: Free (₹0)', 'Payment: Complimentary Pass']
        : [
            `Subtotal: ${formatINR(pricing.subtotal)}`,
            ...(pricing.discount > 0 ? [`${MEMBER_DISCOUNT_LABEL}: ${formatINR(-pricing.discount)}`] : []),
            `Total: ${formatINR(pricing.total)}`,
            `Payment: ${confirmed.paymentMethod || draft.paymentMethod} · ${formatINR(pricing.total)}`,
          ]),
      `Status: ${confirmed.status}`,
      `Booked: ${formatDMYTime(confirmed.createdAt)}`,
      ...(!confirmedIsFree && !isMember ? [`Note: ${MEMBER_PROMO_NOTE}`] : []),
    ].join('\n');
    const blob = new Blob([text], { type: 'text/plain' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${confirmed.bookingId}-receipt.txt`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    pushToast('Receipt downloaded.');
  }

  function bookAnother() {
    try {
      window.sessionStorage.removeItem('frcc_activities_confirmed');
      window.sessionStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }
    const keepGame = paramValid ? paramGame : '';
    setDraft({ ...blankDraft(keepGame, user, paramCity) });
    setConfirmed(null);
    setErrors({});
    setStep(keepGame ? 1 : 0);
  }

  function renderExtraField(f) {
    const err = errors[`x_${f.id}`];
    const value = draft.extras[f.id] ?? '';
    if (f.type === 'select') {
      const opts = f.options.map((o) => (typeof o === 'string' ? { value: o, label: o } : o));
      return (
        <Select key={f.id} label={f.label} name={f.id} value={value} onChange={(e) => patchExtra(f.id, e.target.value)} options={opts} error={err} />
      );
    }
    if (f.type === 'number') {
      return (
        <Input key={f.id} label={f.label} name={f.id} type="number" min={f.min} max={f.max} value={value} onChange={(e) => patchExtra(f.id, e.target.value)} placeholder={f.placeholder} error={err} />
      );
    }
    if (f.type === 'tel') {
      return (
        <Input
          key={f.id}
          label={f.label}
          name={f.id}
          type="tel"
          inputMode="numeric"
          pattern="[6-9][0-9]{9}"
          maxLength={10}
          autoComplete="tel-national"
          value={value}
          onChange={(e) => patchExtra(f.id, sanitizeMobileInput(e.target.value))}
          placeholder={f.placeholder || INDIAN_MOBILE_PLACEHOLDER}
          hint={f.hint}
          error={err}
        />
      );
    }
    if (f.type === 'text') {
      if (f.id === 'ages') {
        const liveAgeErr = value !== undefined && String(value).trim() !== ''
          ? validateChildAges(value, Number(draft.players))
          : '';
        return (
          <Input
            key={f.id}
            label={f.label}
            name={f.id}
            type="text"
            maxLength={40}
            value={value}
            onChange={(e) => {
              const cleaned = e.target.value.replace(/[^\d,\s]/g, '').slice(0, 40);
              patchExtra(f.id, cleaned);
            }}
            placeholder={f.placeholder}
            hint="Enter age(s) between 3 and 10, separated by commas (e.g. 4, 6, 7)."
            error={err || liveAgeErr}
          />
        );
      }
      return (
        <Input key={f.id} label={f.label} name={f.id} type="text" value={value} onChange={(e) => patchExtra(f.id, e.target.value)} placeholder={f.placeholder} hint={f.hint} error={err} />
      );
    }
    if (f.type === 'checkbox') {
      return (
        <label key={f.id} className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-300 bg-white px-3.5 py-3 transition hover:border-navy-900/40">
          <input
            type="checkbox"
            className="mt-1 h-4 w-4 accent-[#0B1D3A]"
            checked={Boolean(value)}
            onChange={(e) => patchExtra(f.id, e.target.checked)}
            aria-describedby={err ? `${f.id}-err` : undefined}
          />
          <span>
            <span className="block text-sm font-medium text-slate-700">
              {f.label}
              {f.required && <span aria-hidden className="text-red-600"> *</span>}
            </span>
            {(f.ackText || f.hint) && <span className="mt-0.5 block text-xs text-slate-500">{f.ackText || f.hint}</span>}
            {err && <span id={`${f.id}-err`} role="alert" className="field-error">{err}</span>}
          </span>
        </label>
      );
    }
    return null;
  }

  const processSummary = useMemo(() => {
    let detailText = `${GAME_CATEGORIES[game?.category || 'indoor']} · ${game?.slotMinutes || 60} min`;
    if (isFreeGame) {
      detailText = `${GAME_CATEGORIES[game?.category || 'indoor']} · Free (${game?.slotMinutes || 60} min)`;
    } else if (game?.id === 'luxury-gym') {
      detailText = 'Monthly Membership (₹8,000 / month)';
    } else if (game?.id === 'swimming-pool') {
      const hrs = Number(draft.extras.hours || 1);
      detailText = `${hrs} Hour${hrs > 1 ? 's' : ''} (₹1,000 / hr)`;
    } else if (game) {
      const sess = Number(draft.extras.sessions || 1);
      detailText = `${sess} Session${sess > 1 ? 's' : ''} (₹1,500 / session)`;
    }

    return {
      service: 'activities',
      name: game?.name || 'Activity',
      image: game ? gameSlot(game.imageKey) : undefined,
      detail: detailText,
      date: draft.date ? prettyDate(draft.date) : undefined,
      slot: draft.slot ? `${draft.slot} (${game?.slotMinutes || 0} min)` : undefined,
      guests: draft.players ? `${draft.players} ${game?.playerLabel || 'players'}` : undefined,
      location: draft.location || draft.areaName || undefined,
      locationId: draft.venueLocationId || (draft.cityId === 'hyd' ? 'hyd-activities' : 'vja-activities'),
      isFree: Boolean(quote.isFree),

      price: quote.subtotal,
      memberDiscount: quote.discount > 0 ? quote.discount : undefined,
      total: quote.total,
    };
  }, [game, isFreeGame, draft.date, draft.slot, draft.players, draft.extras, draft.location, draft.areaName, draft.venueLocationId, draft.cityId, quote]);

  const locationSelectorField = (
    <div className="mt-5">
      <LocationSelector
        locations={ACTIVITY_LOCATIONS}
        cityId={draft.cityId}
        venueId={draft.venueLocationId}
        cityLabel="Select City"
        venueLabel="Select Campus / Location"
        onCityChange={handleCityChange}
        onVenueChange={handleVenueChange}
        className="!mb-0"
      />
      {draft.venueLocationId && (
        <div className="mt-2">
          <LocationTrigger
            locationId={draft.venueLocationId}
            className="text-xs font-medium text-navy-900 hover:text-gold-600"
          >
            {draft.location || draft.areaName} · View on map
          </LocationTrigger>
        </div>
      )}
      {errors.location && <p role="alert" className="field-error mt-2">{errors.location}</p>}
    </div>
  );

  return (
    <FlowShell
      service="activities"
      title={game ? `Book ${game.name}` : 'Book your game'}
      steps={(isGymFlow ? STEPS.filter((s) => s.id !== 'slot') : STEPS).map((s) => s.title)}
      currentStep={isGymFlow ? (step <= 1 ? step : step - 1) : step}
      onStepClick={(i) => {
        if (isGymFlow) {
          const internal = i <= 1 ? i : i + 1;
          if (internal < step && step < 5) {
            setErrors({});
            setStep(internal);
          }
        } else {
          if (i < step && step < 5) {
            setErrors({});
            setStep(i);
          }
        }
      }}
      summary={processSummary}
    >
      <div>
        {/* STEP 1 · Select Game -------------------------------------- */}
        {step === 0 && (
          <Reveal>
            <Card>
              <p className="eyebrow">Step 1 · Select Location &amp; Game</p>
              <h2 className="h-sub mt-1">Which campus and game are you booking?</h2>
              <p className="mt-1 text-sm text-slate-600">
                Choose between Vijayawada and Hyderabad sports complexes, then select your game.
              </p>

              {locationSelectorField}

              {paramGame && !paramValid && (
                <p className="mt-3 rounded-xl border border-amber-500/40 bg-amber-50 p-3 text-sm text-amber-700" role="alert">
                  “{paramGame}” isn’t a known game — pick one below to start.
                </p>
              )}
              <div className="mt-5 grid gap-3 sm:grid-cols-2" role="group" aria-label="Choose a game">
                {GAMES.map((g) => {
                  const selected = draft.gameId === g.id;
                  const Icon = GAME_ICONS[g.category] || TrophyIcon;
                  return (
                    <button
                      key={g.id}
                      type="button"
                      onClick={() => selectGame(g.id)}
                      aria-pressed={selected}
                      className={`group flex items-center gap-3 rounded-2xl border p-3 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy-800 ${
                        selected ? 'border-navy-900 bg-navy-50/60 shadow-card' : 'border-slate-200 bg-white hover:border-navy-900/40 hover:shadow-card'
                      }`}
                    >
                      <span aria-hidden className="h-14 w-14 shrink-0 overflow-hidden rounded-xl">
                        <SmartImage image={gameSlot(g.imageKey)} aspect="1 / 1" sizes="56px" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-1.5">
                          <Icon className="h-3.5 w-3.5 shrink-0 text-gold-600" />
                          <strong className="truncate text-sm text-navy-900">{g.name}</strong>
                        </span>
                        <span className="mt-0.5 block text-xs text-slate-500">
                          {g.isFree || (g.price ?? g.pricePerSlot) === 0
                            ? `${GAME_CATEGORIES[g.category]} · Free`
                            : g.id === 'luxury-gym'
                            ? '₹8,000 per month'
                            : g.id === 'swimming-pool'
                            ? `${formatINR(g.price ?? 1000)} per hour`
                            : `${GAME_CATEGORIES[g.category]} · ${formatINR(g.price ?? 1500)} per session`}
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>
              {errors.gameId && <p role="alert" className="field-error mt-3">{errors.gameId}</p>}
            </Card>
          </Reveal>
        )}

            {/* STEP 2 · Date & Time --------------------------------------- */}
            {step === 1 && game && (
              <Reveal>
                <Card>
                  <p className="eyebrow">Step 2 · Location, Date &amp; Time</p>
                  <h2 className="h-sub mt-1">{game.name} — choose campus &amp; date</h2>
                  {locationSelectorField}
                  <div className="mt-5 grid gap-4 sm:grid-cols-2">
                    <Input
                      label={draft.date ? `Date — ${formatDMY(draft.date)}` : 'Date (DD/MM/YYYY)'}
                      name="date"
                      type="date"
                      lang="en-GB"
                      min={todayISO()}
                      max={maxISO()}
                      value={draft.date}
                      onChange={(e) => patch({ date: e.target.value, slot: '' })}
                      hint="No past dates — bookings open 90 days ahead."
                      error={errors.date}
                    />
                    <div className="rounded-xl border border-navy-900/10 bg-navy-50 p-4 text-sm">
                      <p className="flex items-center gap-2 font-semibold text-navy-900">
                        <ClockIcon className="h-4 w-4 text-gold-600" /> Operating hours
                      </p>
                      <p className="mt-1 text-slate-600">
                        {hour12(game.hours.open)} – {hour12(game.hours.close)} · {game.slotMinutes}-minute slots
                      </p>
                      <p className="mt-1 flex items-center gap-2 text-slate-600">
                        <CalendarIcon className="h-4 w-4 text-gold-600" />
                        {draft.date ? prettyDate(draft.date) : 'No date picked yet'}
                      </p>
                    </div>
                  </div>
                </Card>
              </Reveal>
            )}

            {/* STEP 3 · Slot ----------------------------------------------- */}
            {step === 2 && game && !isGymFlow && (
              <Reveal>
                <Card>
                  <p className="eyebrow">Step 3 · Available Slot</p>
                  <h2 className="h-sub mt-1">Pick a {game.slotMinutes}-minute slot</h2>
                  {draft.location && (
                    <p className="mt-1 text-xs font-medium text-slate-500">
                      Showing slots for <strong className="text-navy-900">{draft.location}</strong>
                    </p>
                  )}
                  <div className="mt-5">
                    <SlotGrid
                      gameId={game.id}
                      gameName={game.name}
                      dateLabel={draft.date ? prettyDate(draft.date) : ''}
                      slots={slots}
                      value={draft.slot}
                      onChange={(t) => patch({ slot: t })}
                      loading={slotsQuery.loading}
                      error={slotsQuery.error}
                      onRetry={slotsQuery.retry}
                      isGroup={isGroupActivity(game.id)}
                      hideTotal={game?.id === 'luxury-gym'}
                    />
                    {fullyBooked && (
                      <div className="mt-4">
                        <EmptyState
                          title="Fully booked for this date"
                          body="Every slot is taken — try another date or game."
                          icon={CalendarIcon}
                        />
                      </div>
                    )}
                    {errors.slot && <p role="alert" className="field-error mt-3">{errors.slot}</p>}
                  </div>
                </Card>
              </Reveal>
            )}

            {/* STEP 4 · Player / Guest Details ------------------------------ */}
            {step === 3 && game && (
              <Reveal>
                <Card>
                  <p className="eyebrow">{isGymFlow ? 'Step 3' : 'Step 4'} · Player / Guest Details</p>
                  <h2 className="h-sub mt-1">Who’s playing?</h2>
                  <div className="mt-5 grid gap-4 sm:grid-cols-2">
                    <Input label="Full name" name="name" value={draft.name} onChange={(e) => patch({ name: e.target.value })} autoComplete="name" error={errors.name} />
                    <Input
                      label="Mobile"
                      name="mobile"
                      type="tel"
                      inputMode="numeric"
                      pattern="[6-9][0-9]{9}"
                      maxLength={10}
                      autoComplete="tel-national"
                      placeholder={INDIAN_MOBILE_PLACEHOLDER}
                      value={draft.mobile}
                      onChange={(e) => patch({ mobile: sanitizeMobileInput(e.target.value) })}
                      error={errors.mobile}
                    />
                    {game?.id !== 'luxury-gym' && (() => {
                      const selectedSlot = slots.find((s) => s.time === draft.slot);
                      const maxAllowed = getMaxPlayersForSlot(game, selectedSlot);
                      return (
                        <Input
                          label={`${game.playerLabel} (max ${maxAllowed})`}
                          name="players"
                          type="number"
                          min={1}
                          max={maxAllowed}
                          value={draft.players}
                          onChange={(e) => patch({ players: e.target.value })}
                          error={errors.players}
                        />
                      );
                    })()}
                    {!isFreeGame && game.id !== 'luxury-gym' && game.id !== 'swimming-pool' && (
                      <Select
                        label="Number of Sessions (₹1,500 per session) *"
                        name="sessions"
                        value={draft.extras.sessions || '1'}
                        onChange={(e) => patchExtra('sessions', e.target.value)}
                        options={[
                          { value: '1', label: '1 session (₹1,500)' },
                          { value: '2', label: '2 sessions (₹3,000)' },
                          { value: '3', label: '3 sessions (₹4,500)' },
                          { value: '4', label: '4 sessions (₹6,000)' },
                        ]}
                      />
                    )}
                    {game.rentalPrice > 0 && (
                      <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-300 bg-white px-3.5 py-3 transition hover:border-navy-900/40 sm:mt-7">
                        <input type="checkbox" className="mt-1 h-4 w-4 accent-[#0B1D3A]" checked={draft.equipment} onChange={(e) => patch({ equipment: e.target.checked })} />
                        <span>
                          <span className="block text-sm font-medium text-slate-700">Equipment rental (+{formatINR(game.rentalPrice)})</span>
                          <span className="mt-0.5 block text-xs text-slate-500">Optional extra, collected at the venue.</span>
                        </span>
                      </label>
                    )}
                    {game.extraFields.map(renderExtraField)}
                  </div>
                  <p className="caption mt-4">Name and mobile are prefilled from your login where available.</p>
                </Card>
              </Reveal>
            )}

            {/* STEP 5 · Review & Payment ------------------------------------- */}
            {step === 4 && game && (
              <Reveal>
                <Card>
                  <p className="eyebrow">{isFreeGame ? (isGymFlow ? 'Step 4 · Review & Confirm' : 'Step 5 · Review & Confirm') : (isGymFlow ? 'Step 4 · Review & Payment' : 'Step 5 · Review & Payment')}</p>
                  <h2 className="h-sub mt-1">{isFreeGame ? 'Review, then confirm' : 'Review, then pay'}</h2>
                  <dl className="mt-5 divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200 text-sm">
                    {[
                      ['Game', game.name],
                      ['Location', draft.location || draft.areaName || 'Sports Complex'],
                      ['Date', prettyDate(draft.date)],
                      ...(isGymFlow ? [] : [['Slot', `${draft.slot} (${game.slotMinutes} min)`]]),
                      ...(game?.id === 'luxury-gym' ? [] : [[`${game.playerLabel}`, draft.players]]),
                      ['Booker', `${draft.name} · ${draft.mobile}`],
                    ].map(([k, v]) => (
                      <div key={k} className="flex items-center justify-between gap-4 bg-white px-4 py-2.5">
                        <dt className="text-slate-500">{k}</dt>
                        <dd className="text-right font-medium text-navy-900">{v}</dd>
                      </div>
                    ))}
                  </dl>

                  {!isFreeGame && (
                    <fieldset className="mt-6">
                      <legend className="label">Payment method</legend>
                      <div className="grid gap-2.5 sm:grid-cols-2" role="radiogroup" aria-label="Payment method">
                        {PAYMENT_METHODS.map((m) => {
                          const selected = draft.paymentMethod === m.id;
                          return (
                            <label
                              key={m.id}
                              className={`cursor-pointer rounded-xl border px-4 py-3 transition focus-within:ring-2 focus-within:ring-navy-800/30 ${
                                selected ? 'border-navy-900 bg-navy-900 text-white shadow-card' : 'border-slate-300 bg-white hover:border-navy-900/50'
                              }`}
                            >
                              <input type="radio" name="paymentMethod" className="sr-only" checked={selected} onChange={() => patch({ paymentMethod: m.id })} />
                              <span className={`block text-sm font-semibold ${selected ? 'text-white' : 'text-navy-900'}`}>{m.label}</span>
                              <span className={`block text-xs ${selected ? 'text-slate-300' : 'text-slate-500'}`}>{m.hint}</span>
                            </label>
                          );
                        })}
                      </div>
                      {errors.paymentMethod && <p role="alert" className="field-error mt-2">{errors.paymentMethod}</p>}
                    </fieldset>
                  )}

                  <div className="mt-6 rounded-xl border border-navy-900/10 bg-navy-50/60 p-4 text-sm">
                    {quote.isFree ? (
                      <>
                        <div className="flex justify-between text-slate-600">
                          <span>Rate</span>
                          <span className="font-semibold text-emerald-700">Complimentary Pass</span>
                        </div>
                        <div className="mt-2 flex justify-between border-t border-navy-900/10 pt-2 font-semibold text-navy-900">
                          <span>Total</span>
                          <span className="text-emerald-700 font-bold">Free (₹0)</span>
                        </div>
                      </>
                    ) : (
                      <>
                        <dl className="space-y-1.5">
                          {quote.lines.map((l) => (
                            <div key={l.label} className="flex justify-between gap-3">
                              <dt className="text-slate-500">{l.label}</dt>
                              <dd className={`font-medium tabular-nums ${l.value < 0 ? 'text-green-700' : 'text-navy-900'}`}>{formatINR(l.value)}</dd>
                            </div>
                          ))}
                        </dl>
                        <div className="mt-2 flex justify-between border-t border-navy-900/10 pt-2 font-semibold text-navy-900">
                          <span>Total</span><span>{formatINR(quote.total)}</span>
                        </div>
                      </>
                    )}
                  </div>

                  {!isFreeGame && !isMember && (
                    <div className="mt-3 rounded-xl border border-gold-200 bg-gold-50/70 p-3 text-xs text-slate-700">
                      <span>{MEMBER_PROMO_NOTE}. </span>
                      {MEMBERSHIP_REDIRECT_URL.startsWith('http') ? (
                        <a href={MEMBERSHIP_REDIRECT_URL} target="_blank" rel="noopener noreferrer" className="font-semibold text-gold-700 underline hover:text-gold-800">
                          Get Membership →
                        </a>
                      ) : (
                        <Link to={MEMBERSHIP_REDIRECT_URL} className="font-semibold text-gold-700 underline hover:text-gold-800">
                          Get Membership →
                        </Link>
                      )}
                    </div>
                  )}

                  {errors.alreadyBooked && (
                    <div className="mt-4 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900" role="alert">
                      <p className="font-semibold">{errors.alreadyBooked}</p>
                      <p className="mt-1 text-xs text-amber-800">
                        You already have an active booking for this slot. Check your bookings in your profile.
                      </p>
                      <div className="mt-3">
                        <Link
                          to="/profile/bookings"
                          className="inline-flex items-center gap-1.5 rounded-lg bg-navy-900 px-4 py-2 text-xs font-semibold text-white hover:bg-navy-800 transition"
                        >
                          View My Bookings →
                        </Link>
                      </div>
                    </div>
                  )}
                  {errors.submit && (
                    <p role="alert" className="field-error mt-3">{errors.submit}</p>
                  )}

                  <p className="mt-3 flex items-start gap-1.5 text-xs text-slate-500">
                    <ShieldIcon className="h-3.5 w-3.5 shrink-0 text-gold-600" />
                    {isFreeGame
                      ? 'Complimentary access. A confirmation pass is issued to your account right away.'
                      : 'Secure payment. A receipt is issued to your account once payment is complete.'}
                  </p>
                  <LoadingButton loading={paying} disabled={paying || Boolean(errors.alreadyBooked)} onClick={pay} className="mt-4 w-full px-6 py-3 bg-navy-900 text-white hover:bg-navy-800">
                    {isFreeGame
                      ? 'Confirm Free Booking'
                      : draft.paymentMethod === 'pay_at_venue'
                      ? `Reserve for ${formatINR(quote.total)}`
                      : `Pay ${formatINR(quote.total)}`}
                  </LoadingButton>
                </Card>
              </Reveal>
            )}

            {/* STEP 6 · Confirmation ------------------------------------------ */}
            {step === 5 && confirmed && (() => {
              const confirmedGame = gameById(confirmed.game);
              const confirmedIsFree = Boolean(
                confirmed.isFree ||
                  confirmedGame?.isFree ||
                  (confirmedGame && (confirmedGame.price ?? confirmedGame.pricePerSlot) === 0) ||
                  Number(confirmed.amount ?? 0) === 0
              );
              const confirmedPricing = calculateTotal(confirmed.subtotal ?? confirmed.amount, Boolean(confirmed.isMember ?? isMember));
              return (
                <Reveal>
                  <Card className="text-center !p-8 sm:!p-10">
                    <span aria-hidden className="mx-auto grid h-16 w-16 place-items-center rounded-full border border-green-600/30 bg-green-50 text-green-700">
                      <CheckCircleIcon className="h-8 w-8" />
                    </span>
                    <p className="eyebrow mt-4 !text-green-700">{confirmed.status === 'Pending' ? 'Reserved' : 'Confirmed'}</p>
                    <h2 className="h-sub mt-1">{confirmed.gameName} — you’re booked</h2>
                    <p className="mx-auto mt-3 inline-flex items-center gap-2 rounded-full bg-navy-900 px-4 py-1.5 font-mono text-sm text-white">
                      <span className="text-gold-400">Booking ID</span> {confirmed.bookingId}
                    </p>

                    {/* Entry QR Code */}
                    <div className="my-6 flex flex-col items-center justify-center">
                      <div className="p-3 bg-white rounded-2xl border-2 border-slate-200 shadow-sm inline-block">
                        <QRCodeSVG
                          value={`FRCC:ACT:${confirmed.bookingId}`}
                          size={160}
                          fgColor="#0B1D3A"
                          bgColor="#ffffff"
                          level="M"
                        />
                      </div>
                      <p className="text-xs text-slate-500 mt-2 font-medium">
                        Scan this QR code at the sports reception desk.
                      </p>
                    </div>

                    <div className="mx-auto mt-4 max-w-md rounded-2xl border border-slate-200 bg-slate-50/80 p-5 text-left text-sm space-y-2">
                      {(confirmed.location || confirmed.areaName || draft.location) && (
                        <div className="flex justify-between gap-4">
                          <span className="text-slate-500">Location</span>
                          <span className="font-semibold text-navy-900 text-right">{confirmed.location || confirmed.areaName || draft.location}</span>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span className="text-slate-500">Date</span>
                        <span className="font-semibold text-navy-900">{prettyDate(confirmed.date)}</span>
                      </div>
                      {confirmedGame?.id !== 'luxury-gym' && (
                      <div className="flex justify-between">
                        <span className="text-slate-500">Slot</span>
                        <span className="font-semibold text-navy-900">{confirmed.slot}</span>
                      </div>
                      )}
                      {confirmedGame?.id !== 'luxury-gym' && (
                      <div className="flex justify-between">
                        <span className="text-slate-500">{confirmedGame?.playerLabel || 'Players'}</span>
                        <span className="font-semibold text-navy-900">{confirmed.players}</span>
                      </div>
                      )}
                      {!confirmedIsFree && (
                        <div className="flex justify-between">
                          <span className="text-slate-500">Subtotal</span>
                          <span className="font-semibold text-navy-900">{formatINR(confirmedPricing.subtotal)}</span>
                        </div>
                      )}
                      {confirmedPricing.discount > 0 && (
                        <div className="flex justify-between text-green-700 font-medium">
                          <span>{MEMBER_DISCOUNT_LABEL}</span>
                          <span>{formatINR(-confirmedPricing.discount)}</span>
                        </div>
                      )}
                      <div className="flex justify-between border-t border-slate-200 pt-2 font-bold text-navy-900">
                        <span>{confirmedIsFree ? 'Fee' : 'Total Paid'}</span>
                        <span className={confirmedIsFree ? 'text-emerald-700' : ''}>
                          {confirmedIsFree ? 'Free (₹0)' : formatINR(confirmedPricing.total)}
                        </span>
                      </div>
                      <div className="flex justify-between text-xs text-slate-500">
                        <span>Status</span>
                        <span className="font-medium text-emerald-700">{confirmed.status}</span>
                      </div>
                    </div>

                    {!confirmedIsFree && !isMember && (
                      <div className="mx-auto mt-4 max-w-md rounded-xl border border-gold-200 bg-gold-50/70 p-3 text-xs text-slate-700">
                        <span>{MEMBER_PROMO_NOTE}. </span>
                        {MEMBERSHIP_REDIRECT_URL.startsWith('http') ? (
                          <a href={MEMBERSHIP_REDIRECT_URL} target="_blank" rel="noopener noreferrer" className="font-semibold text-gold-700 underline hover:text-gold-800">
                            Get Membership →
                          </a>
                        ) : (
                          <Link to={MEMBERSHIP_REDIRECT_URL} className="font-semibold text-gold-700 underline hover:text-gold-800">
                            Get Membership →
                          </Link>
                        )}
                      </div>
                    )}
                    <p className="caption mt-4">Show this QR at the venue reception. {gameById(confirmed.game)?.cancellationNote}</p>

                    {/* Action Buttons - No WhatsApp button */}
                    <div className="mt-6 flex flex-col sm:flex-row justify-center gap-3">
                      <button
                        type="button"
                        onClick={() => window.print()}
                        className="btn-base border border-slate-300 bg-white text-navy-900 hover:bg-slate-50 font-semibold px-6 py-2.5 inline-flex items-center justify-center gap-2"
                      >
                        <PrinterIcon className="h-4 w-4" /> Print / Download
                      </button>
                      <Button variant="outline" onClick={downloadReceipt}>
                        <DownloadIcon className="h-4 w-4" /> Receipt
                      </Button>
                      <Button variant="outline" onClick={bookAnother}>
                        Book Another
                      </Button>
                    </div>

                    <div className="mt-6 border-t border-slate-100 pt-5 flex justify-center gap-4 text-sm font-semibold">
                      <Link to="/profile/bookings" className="text-navy-900 hover:text-gold-600 transition">
                        View My Bookings →
                      </Link>
                      <span className="text-slate-300">·</span>
                      <Link to="/activities" className="text-slate-600 hover:text-navy-900 transition">
                        Back to Activities
                      </Link>
                    </div>
                  </Card>
                </Reveal>
              );
            })()}

            {/* Back / Next ----------------------------------------------------- */}
            {step < 4 && (
              <div className="mt-6 flex items-center justify-between gap-3">
                <Button variant="outline" onClick={goBack} disabled={step === 0}>
                  <ChevronLeftIcon className="h-4 w-4" /> Back
                </Button>
                <Button variant="primary" onClick={goNext} className="px-7" disabled={!isStepValid}>
                  {step === 3 ? 'Review Booking' : 'Next'} <ArrowRightIcon className="h-4 w-4" />
                </Button>
              </div>
            )}
            {step === 4 && (
              <div className="mt-6">
                <Button variant="outline" onClick={goBack}>
                  <ChevronLeftIcon className="h-4 w-4" /> Back
                </Button>
              </div>
            )}

          {/* Rules & safety and Related games */}
          {game && (
            <Card className="mt-6">
              <p className="eyebrow">Rules & safety</p>
              <ul className="mt-2 space-y-1.5 text-xs leading-relaxed text-slate-600">
                {game.rules.map((r) => <li key={r}>· {r}</li>)}
              </ul>
            </Card>
          )}

          {game && step < 5 && (
            <div className="mt-8">
              <SectionHeading eyebrow="Keep exploring" title="Other games" sub="Switch games any time from step 1 — the summary updates live." />
              <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {GAMES.filter((g) => g.id !== game.id).slice(0, 4).map((g) => (
                  <button
                    key={g.id}
                    type="button"
                    onClick={() => { selectGame(g.id); setStep(1); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                    className="card card-hover flex items-center gap-3 p-3 text-left"
                  >
                    <span aria-hidden className="h-12 w-12 shrink-0 overflow-hidden rounded-xl">
                      <SmartImage image={gameSlot(g.imageKey)} aspect="1 / 1" sizes="48px" />
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold text-navy-900">{g.name}</span>
                      <span className="block text-xs text-slate-500">
                        {g.isFree || (g.price ?? g.pricePerSlot) === 0
                          ? `Free · ${GAME_CATEGORIES[g.category]}`
                          : g.id === 'luxury-gym'
                          ? `${formatINR(g.price ?? 8000)} / month`
                          : `from ${formatINR(g.pricePerSlot ?? g.price)} · ${GAME_CATEGORIES[g.category]}`}
                      </span>
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
    </FlowShell>
  );
}

export default ActivitiesProcessPage;
