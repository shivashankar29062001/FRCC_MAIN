import { useMemo, useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { useApp } from '../../app/store/AppContext.jsx';
import { useMockQuery } from '../../app/hooks/useMockQuery.js';
import { Button, Input, Select, LoadingButton } from '../../components/ui/controls.jsx';
import { Card, EmptyState, SectionHeading } from '../../components/ui/feedback.jsx';
import { FlowShell } from '../../components/FlowShell.jsx';
import { Reveal } from '../../components/ui/motion.jsx';
import { IMAGES, gameSlot } from '../../config/images.js';
import { SmartImage } from '../../components/ui/media.jsx';
import { GAMES, gameById, quotePrice, formatINR, GAME_CATEGORIES } from './games.config.js';
import { getSlots } from './availability.service.js';
import { saveActivityBooking } from './bookings.store.js';
import { SlotGrid } from '../../components/booking/SlotGrid.jsx';
import { calculateTotal } from '../../utils/pricing.js';
import { formatDMY, formatDMYTime } from '../../utils/dates.js';
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
import { LocationTrigger } from '../../components/location/LocationTrigger.jsx';

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

const MOBILE_RE = /^[+\d][\d\s-]{7,14}$/;

const STORAGE_KEY = 'frcc_activities_booking_draft';

function blankDraft(gameId, user) {
  const looksPhone = user?.emailOrPhone && !user.emailOrPhone.includes('@');
  return {
    gameId: gameId || '',
    date: '',
    slot: '',
    name: user?.name || '',
    mobile: looksPhone ? user.emailOrPhone : '',
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
  const paramValid = Boolean(paramGame && gameById(paramGame));

  const [confirmed, setConfirmed] = useState(() => {
    try {
      const raw = window.sessionStorage.getItem('frcc_activities_confirmed');
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  });

  const [draft, setDraft] = useState(() => {
    let saved = null;
    try {
      const raw = window.sessionStorage.getItem(STORAGE_KEY);
      if (raw) saved = JSON.parse(raw);
    } catch {
      /* ignore */
    }
    const initialGame = paramValid ? paramGame : (saved?.gameId || '');
    const base = blankDraft(initialGame, user);
    if (saved) {
      return {
        ...base,
        ...saved,
        gameId: initialGame || saved.gameId || '',
      };
    }
    return base;
  });

  const [step, setStep] = useState(() => {
    if (confirmed) return 5;
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

  // Sync draft and step to sessionStorage for refresh safety
  useEffect(() => {
    try {
      window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ ...draft, step }));
    } catch {
      /* ignore */
    }
  }, [draft, step]);

  const game = gameById(draft.gameId);
  const patch = (p) => {
    setDraft((d) => ({ ...d, ...p }));
    setErrors({});
  };
  const patchExtra = (id, value) => {
    setDraft((d) => ({ ...d, extras: { ...d.extras, [id]: value } }));
    setErrors({});
  };

  // Slots load per game + date (mock latency + error/retry states).
  const slotsQuery = useMockQuery(() => getSlots(draft.gameId, draft.date), {
    deps: [draft.gameId, draft.date],
    delay: 450,
  });
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
      { label: game.playerLabel, value: draft.players || '—' },
    ];
  }, [game, draft.date, draft.slot, draft.players]);

  // Inline step validation
  const isStepValid = useMemo(() => {
    if (step === 0) {
      return Boolean(draft.gameId && gameById(draft.gameId));
    }
    if (step === 1) {
      return Boolean(draft.date && draft.date >= todayISO());
    }
    if (step === 2) {
      return Boolean(draft.slot && !slots.find((s) => s.time === draft.slot)?.booked);
    }
    if (step === 3) {
      const g = gameById(draft.gameId);
      const n = Number(draft.players);
      const nameOk = draft.name.trim().length >= 2;
      const cleanMobile = draft.mobile.replace(/\D/g, '');
      const mobileOk = cleanMobile.length === 10 || MOBILE_RE.test(draft.mobile.trim());
      const playersOk = Boolean(draft.players) && Number.isFinite(n) && n >= 1 && (!g || n <= g.maxPlayers);
      if (!nameOk || !mobileOk || !playersOk) return false;
      if (g?.extraFields) {
        for (const f of g.extraFields) {
          const v = draft.extras[f.id];
          if (f.required && (v === undefined || v === '' || v === false)) return false;
          if (f.type === 'number' && v !== undefined && v !== '') {
            const nv = Number(v);
            if (!Number.isFinite(nv)) return false;
            if (f.min !== undefined && nv < f.min) return false;
            if (f.max !== undefined && nv > f.max) return false;
          }
          if ((f.type === 'text' || f.type === 'tel') && f.required && String(v || '').trim().length < 2) return false;
          if (f.type === 'tel' && v && !MOBILE_RE.test(String(v).trim())) return false;
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
      if (!draft.gameId || !gameById(draft.gameId)) return fail({ gameId: 'Select a game to continue.' });
      return true;
    }
    if (target === 1) {
      if (!draft.date) return fail({ date: 'Pick a date for your game.' });
      if (draft.date < todayISO()) return fail({ date: 'Past dates are not bookable — pick today or later.' });
      return true;
    }
    if (target === 2) {
      if (!draft.slot) return fail({ slot: 'Pick an available slot.' });
      if (slots.find((s) => s.time === draft.slot)?.booked) return fail({ slot: 'That slot just got booked — pick another.' });
      return true;
    }
    if (target === 3) {
      const g = gameById(draft.gameId);
      const next = {};
      if (draft.name.trim().length < 2) next.name = 'Enter the booker’s full name.';
      const cleanMobile = draft.mobile.replace(/\D/g, '');
      if (cleanMobile.length !== 10 && !MOBILE_RE.test(draft.mobile.trim())) next.mobile = 'Enter a valid 10-digit mobile number.';
      const n = Number(draft.players);
      if (!draft.players || !Number.isFinite(n) || n < 1) next.players = 'Enter how many are playing.';
      else if (g && n > g.maxPlayers) next.players = `Max ${g.maxPlayers} for ${g.name}.`;
      if (g) {
        for (const f of g.extraFields) {
          const v = draft.extras[f.id];
          if (f.required && (v === undefined || v === '' || v === false)) {
            next[`x_${f.id}`] = f.type === 'checkbox' ? `Please accept: ${f.label}.` : `“${f.label}” is required.`;
          }
          if (f.type === 'number' && v !== undefined && v !== '') {
            const nv = Number(v);
            if (!Number.isFinite(nv)) next[`x_${f.id}`] = `“${f.label}” must be a number.`;
            else if ((f.min !== undefined && nv < f.min) || (f.max !== undefined && nv > f.max)) {
              next[`x_${f.id}`] = `“${f.label}” must be between ${f.min} and ${f.max}.`;
            }
          }
          if ((f.type === 'text' || f.type === 'tel') && f.required && String(v || '').trim().length < 2) {
            next[`x_${f.id}`] = `“${f.label}” is required.`;
          }
          if (f.type === 'tel' && v && !MOBILE_RE.test(String(v).trim())) {
            next[`x_${f.id}`] = `“${f.label}” must be a valid mobile number.`;
          }
        }
      }
      if (Object.keys(next).length > 0) return fail(next);
      return true;
    }
    return true;
  }

  function goNext() {
    if (!validate(step)) return;
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  }

  function goBack() {
    setErrors({});
    setStep((s) => Math.max(s - 1, 0));
  }

  function selectGame(id) {
    setDraft((d) => ({ ...blankDraft(id, user), name: d.name, mobile: d.mobile }));
    setErrors({});
  }

  function pay() {
    if (!draft.paymentMethod) {
      pushToast('Choose a payment method.', 'error');
      setErrors({ paymentMethod: 'Choose a payment method.' });
      return;
    }
    setPaying(true);

    // TODO(Razorpay): Real payment gateway integration
    // 1. const order = await createRazorpayOrder({ amount: quote.total, currency: 'INR' });
    // 2. Open Razorpay modal with order.id
    // 3. await verifyRazorpayPayment(response);

    setTimeout(() => {
      setPaying(false);
      const atVenue = draft.paymentMethod === 'pay_at_venue';
      const pricing = calculateTotal(quote.subtotal, isMember);
      const year = new Date().getFullYear();
      const random6 = String(Math.floor(100000 + Math.random() * 900000));
      const bookingId = `FRCC-ACT-${year}-${random6}`;

      const record = {
        bookingId,
        userId: user?.userId || 'guest',
        game: draft.gameId,
        gameName: game?.name || draft.gameId,
        date: draft.date,
        slot: draft.slot,
        players: draft.players,
        extras: { ...draft.extras, equipment: draft.equipment || undefined },
        subtotal: pricing.subtotal,
        discount: pricing.discount,
        amount: pricing.total,
        isMember,
        status: atVenue ? 'Pending' : 'Confirmed',
        paymentMethod: draft.paymentMethod,
        userName: draft.name,
        mobile: draft.mobile,
      };
      const { booking } = saveActivityBooking({
        booking: record,
        payment: {
          method: draft.paymentMethod,
          amount: pricing.total,
          status: atVenue ? 'Pending' : 'Success',
        },
      });

      try {
        window.sessionStorage.setItem('frcc_activities_confirmed', JSON.stringify(booking));
        window.sessionStorage.removeItem(STORAGE_KEY);
      } catch {
        /* ignore */
      }

      setConfirmed(booking);
      setStep(5);
      pushToast(atVenue ? 'Slot reserved — pay at the venue.' : 'Booking confirmed.');
    }, 1500);
  }

  function downloadReceipt() {
    if (!confirmed) return;
    const g = gameById(confirmed.game);
    const pricing = calculateTotal(confirmed.subtotal ?? confirmed.amount, Boolean(confirmed.isMember ?? isMember));
    const text = [
      'FRCC — Activities Booking Receipt',
      `Booking ID: ${confirmed.bookingId}`,
      `Game: ${confirmed.gameName || g?.name || confirmed.game}`,
      `Date: ${prettyDate(confirmed.date)}`,
      `Slot: ${confirmed.slot}`,
      `Players: ${confirmed.players}`,
      `Subtotal: ${formatINR(pricing.subtotal)}`,
      ...(pricing.discount > 0 ? [`${MEMBER_DISCOUNT_LABEL}: ${formatINR(-pricing.discount)}`] : []),
      `Total: ${formatINR(pricing.total)}`,
      `Payment: ${confirmed.paymentMethod || draft.paymentMethod} · ${formatINR(pricing.total)}`,
      `Status: ${confirmed.status}`,
      `Booked: ${formatDMYTime(confirmed.createdAt)}`,
      ...(!isMember ? [`Note: ${MEMBER_PROMO_NOTE}`] : []),
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
    const keepGame = draft.gameId;
    setDraft({ ...blankDraft(keepGame, user) });
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
    if (f.type === 'tel' || f.type === 'text') {
      return (
        <Input key={f.id} label={f.label} name={f.id} type={f.type} value={value} onChange={(e) => patchExtra(f.id, e.target.value)} placeholder={f.placeholder} hint={f.hint} error={err} />
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
    if (game?.id === 'luxury-gym') {
      const tier = draft.extras.tier || 'standard';
      detailText = tier === 'premium' ? 'Premium Tier (₹3,000 / month)' : 'Standard Tier (₹2,000 / month)';
    } else if (game?.id === 'swimming-pool') {
      const hrs = Number(draft.extras.hours || 1);
      detailText = `${hrs} Hour${hrs > 1 ? 's' : ''} (₹1,000 / hr)`;
    } else if (game) {
      const sess = Number(draft.extras.sessions || 1);
      detailText = `${sess} Session${sess > 1 ? 's' : ''} (₹1,500 / session)`;
    }

    return {
      name: game?.name || 'Activity',
      image: game ? gameSlot(game.imageKey) : undefined,
      detail: detailText,
      date: draft.date ? prettyDate(draft.date) : undefined,
      slot: draft.slot ? `${draft.slot} (${game?.slotMinutes || 0} min)` : undefined,
      guests: draft.players ? `${draft.players} ${game?.playerLabel || 'players'}` : undefined,
      location: 'Vijayawada Campus · Sports Complex',
      locationId: 'vja-activities',
      price: quote.subtotal,
      memberDiscount: quote.discount > 0 ? quote.discount : undefined,
      total: quote.total,
    };
  }, [game, draft.date, draft.slot, draft.players, draft.extras, quote]);

  return (
    <FlowShell
      service="activities"
      title={game ? `Book ${game.name}` : 'Book your game'}
      steps={STEPS.map((s) => s.title)}
      currentStep={step}
      onStepClick={(i) => {
        if (i < step && step < 5) {
          setErrors({});
          setStep(i);
        }
      }}
      summary={processSummary}
    >
      <div>
        {/* STEP 1 · Select Game -------------------------------------- */}
        {step === 0 && (
          <Reveal>
            <Card>
              <p className="eyebrow">Step 1 · Select Game</p>
              <h2 className="h-sub mt-1">Which game are you booking?</h2>
              <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-slate-600">
                <span>All facilities and courts are open daily at FRCC.</span>
                <LocationTrigger locationId="vja-activities" className="text-xs text-navy-900 font-medium hover:text-gold-600 inline-flex">
                  Vijayawada Campus · View on map &amp; get directions
                </LocationTrigger>
              </div>
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
                          {g.id === 'luxury-gym'
                            ? '₹2,000 to ₹3,000 per month'
                            : g.id === 'swimming-pool'
                            ? `${formatINR(g.price || 1000)} per hour`
                            : `${GAME_CATEGORIES[g.category]} · ${formatINR(g.price || 1500)} per session`}
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
                  <p className="eyebrow">Step 2 · Date & Time</p>
                  <h2 className="h-sub mt-1">{game.name} — pick a date</h2>
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
            {step === 2 && game && (
              <Reveal>
                <Card>
                  <p className="eyebrow">Step 3 · Available Slot</p>
                  <h2 className="h-sub mt-1">Pick a {game.slotMinutes}-minute slot</h2>
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
                  <p className="eyebrow">Step 4 · Player / Guest Details</p>
                  <h2 className="h-sub mt-1">Who’s playing?</h2>
                  <div className="mt-5 grid gap-4 sm:grid-cols-2">
                    <Input label="Full name" name="name" value={draft.name} onChange={(e) => patch({ name: e.target.value })} autoComplete="name" error={errors.name} />
                    <Input label="Mobile" name="mobile" type="tel" value={draft.mobile} onChange={(e) => patch({ mobile: e.target.value })} autoComplete="tel" error={errors.mobile} />
                    <Input
                      label={`${game.playerLabel} (max ${game.maxPlayers})`}
                      name="players"
                      type="number"
                      min={1}
                      max={game.maxPlayers}
                      value={draft.players}
                      onChange={(e) => patch({ players: e.target.value })}
                      error={errors.players}
                    />
                    {game.id !== 'luxury-gym' && game.id !== 'swimming-pool' && (
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
                  <p className="eyebrow">Step 5 · Review & Payment</p>
                  <h2 className="h-sub mt-1">Review, then pay</h2>
                  <dl className="mt-5 divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200 text-sm">
                    {[
                      ['Game', game.name],
                      ['Date', prettyDate(draft.date)],
                      ['Slot', `${draft.slot} (${game.slotMinutes} min)`],
                      [`${game.playerLabel}`, draft.players],
                      ['Booker', `${draft.name} · ${draft.mobile}`],
                    ].map(([k, v]) => (
                      <div key={k} className="flex items-center justify-between gap-4 bg-white px-4 py-2.5">
                        <dt className="text-slate-500">{k}</dt>
                        <dd className="text-right font-medium text-navy-900">{v}</dd>
                      </div>
                    ))}
                  </dl>

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

                  <div className="mt-6 rounded-xl border border-navy-900/10 bg-navy-50/60 p-4 text-sm">
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
                  </div>

                  {!isMember && (
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

                  <p className="mt-3 flex items-start gap-1.5 text-xs text-slate-500">
                    <ShieldIcon className="h-3.5 w-3.5 shrink-0 text-gold-600" />
                    Secure payment. A receipt is issued to your account once payment is complete.
                  </p>
                  <LoadingButton loading={paying} onClick={pay} className="mt-4 w-full px-6 py-3 bg-navy-900 text-white hover:bg-navy-800">
                    {draft.paymentMethod === 'pay_at_venue' ? `Reserve for ${formatINR(quote.total)}` : `Pay ${formatINR(quote.total)}`}
                  </LoadingButton>
                </Card>
              </Reveal>
            )}

            {/* STEP 6 · Confirmation ------------------------------------------ */}
            {step === 5 && confirmed && (() => {
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
                      <div className="flex justify-between">
                        <span className="text-slate-500">Date</span>
                        <span className="font-semibold text-navy-900">{prettyDate(confirmed.date)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Slot</span>
                        <span className="font-semibold text-navy-900">{confirmed.slot}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">{gameById(confirmed.game)?.playerLabel || 'Players'}</span>
                        <span className="font-semibold text-navy-900">{confirmed.players}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Subtotal</span>
                        <span className="font-semibold text-navy-900">{formatINR(confirmedPricing.subtotal)}</span>
                      </div>
                      {confirmedPricing.discount > 0 && (
                        <div className="flex justify-between text-green-700 font-medium">
                          <span>{MEMBER_DISCOUNT_LABEL}</span>
                          <span>{formatINR(-confirmedPricing.discount)}</span>
                        </div>
                      )}
                      <div className="flex justify-between border-t border-slate-200 pt-2 font-bold text-navy-900">
                        <span>Total Paid</span>
                        <span>{formatINR(confirmedPricing.total)}</span>
                      </div>
                      <div className="flex justify-between text-xs text-slate-500">
                        <span>Status</span>
                        <span className="font-medium text-emerald-700">{confirmed.status}</span>
                      </div>
                    </div>

                    {!isMember && (
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
                      <Link to="/home" className="text-slate-600 hover:text-navy-900 transition">
                        Back to Home
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
                      <span className="block text-xs text-slate-500">from {formatINR(g.pricePerSlot)} · {GAME_CATEGORIES[g.category]}</span>
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
