// ---------------------------------------------------------------------------
// /src/features/hall/HallPage.jsx — Halls Booking Flow & Landing Page
// ---------------------------------------------------------------------------

import { useState, useMemo, useEffect } from 'react';
import { useLocation, useSearchParams, Link } from 'react-router-dom';
import { useApp } from '../../app/store/AppContext.jsx';
import { ServiceLanding } from '../../components/ServiceLanding.jsx';
import { ServiceHero } from '../../components/ServiceHero.jsx';
import { FlowShell } from '../../components/FlowShell.jsx';
import { Card } from '../../components/ui/feedback.jsx';
import { Button, Input, Select, LoadingButton } from '../../components/ui/controls.jsx';
import { SmartImage } from '../../components/ui/media.jsx';
import { IMAGES } from '../../config/images.js';
import { areas as HALL_AREAS, halls as ALL_HALLS } from '../../data/halls.js';
import { memberDiscountPercent } from '../../config/site.js';
import { formatDMY } from '../../utils/dates.js';
import { formatInr } from '../../utils/pricing.js';
import {
  CheckCircleIcon,
  ChevronLeftIcon,
  ArrowRightIcon,
  PrinterIcon,
} from '../../components/ui/icons.jsx';
import { LocationTrigger } from '../../components/location/LocationTrigger.jsx';

const STORAGE_KEY = 'frcc_hall_booking_draft';

const STEPS = [
  'Area & Type',
  'Date & Time',
  'Availability',
  'Event Details',
  'Review & Pay',
  'Confirmation',
];

const SLOT_DETAILS = {
  morning: { label: 'Morning (08:00 – 13:00)', multiplier: 0.6 },
  afternoon: { label: 'Afternoon (13:00 – 18:00)', multiplier: 0.7 },
  evening: { label: 'Evening (18:00 – 23:00)', multiplier: 0.8 },
  fullDay: { label: 'Full Day (08:00 – 23:00)', multiplier: 1.0 },
};

function getTodayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function HallPage() {
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { user, isMember, pushToast } = useApp();

  const isBookingFlow = location.pathname.startsWith('/book/');

  // If on landing route (/halls or /hall), render landing view with ServiceHero
  if (!isBookingFlow) {
    return <ServiceLanding service="halls" hero={<ServiceHero service="hall" />} />;
  }

  // --- SessionStorage Draft State Initialization ---
  const [draft, setDraft] = useState(() => {
    let saved = null;
    try {
      const raw = window.sessionStorage.getItem(STORAGE_KEY);
      if (raw) saved = JSON.parse(raw);
    } catch {
      /* ignore */
    }

    const itemParam = searchParams.get('item') || searchParams.get('hall') || '';
    const initialHall = itemParam ? ALL_HALLS.find((h) => h.id === itemParam || h.name === itemParam) : null;
    const initialArea = searchParams.get('area') || initialHall?.areaId || saved?.areaId || HALL_AREAS[0]?.id || 'vja';
    const initialType = initialHall?.type || saved?.hallType || 'all';

    return {
      step: saved?.step && saved.step < 5 ? saved.step : (initialHall ? 2 : 0),
      areaId: initialArea,
      hallType: initialType,
      date: searchParams.get('date') || saved?.date || getTodayISO(),
      slot: searchParams.get('slot') || saved?.slot || 'evening',
      startTime: saved?.startTime || '10:00',
      hours: saved?.hours || '2',
      selectedHallId: initialHall?.id || saved?.selectedHallId || (ALL_HALLS.find((h) => h.areaId === initialArea)?.id || ALL_HALLS[0]?.id),
      eventType: searchParams.get('event') || saved?.eventType || 'Wedding / Reception',
      guests: searchParams.get('guests') || saved?.guests || '100',
      name: saved?.name || user?.name || '',
      mobile: saved?.mobile || user?.mobile || (user?.emailOrPhone && !user.emailOrPhone.includes('@') ? user.emailOrPhone : ''),
      email: saved?.email || user?.email || (user?.emailOrPhone && user.emailOrPhone.includes('@') ? user.emailOrPhone : ''),
      notes: saved?.notes || '',
      paymentMethod: saved?.paymentMethod || 'upi',
    };
  });

  const [paying, setPaying] = useState(false);
  const [confirmedBooking, setConfirmedBooking] = useState(() => {
    try {
      const raw = window.sessionStorage.getItem('frcc_hall_confirmed');
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  });

  // Sync draft to sessionStorage
  useEffect(() => {
    try {
      window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
    } catch {
      /* ignore */
    }
  }, [draft]);

  const updateDraft = (patch) => {
    setDraft((prev) => ({ ...prev, ...patch }));
  };

  const step = draft.step;
  const setStep = (newStep) => updateDraft({ step: newStep });

  // Area & Hall Objects
  const selectedArea = useMemo(
    () => HALL_AREAS.find((a) => a.id === draft.areaId) || HALL_AREAS[0],
    [draft.areaId]
  );

  const availableHalls = useMemo(() => {
    let list = ALL_HALLS.filter((h) => h.areaId === draft.areaId);
    if (draft.hallType && draft.hallType !== 'all') {
      list = list.filter((h) => h.type === draft.hallType);
    }
    return list;
  }, [draft.areaId, draft.hallType]);

  const selectedHall = useMemo(() => {
    return availableHalls.find((h) => h.id === draft.selectedHallId) || availableHalls[0] || ALL_HALLS[0];
  }, [availableHalls, draft.selectedHallId]);

  const isFunctionHall = selectedHall?.id === 'vja-function-hall' || selectedHall?.pricingUnit === 'per-person';
  const isMeetingHall = selectedHall?.id === 'vja-meeting-hall' || selectedHall?.pricingUnit === 'per-hour';

  // Pricing calculations
  // Function Hall total = guests x 1500 (read from selectedHall.price)
  // Meeting Hall total = hours x 1600 (read from selectedHall.price)
  const basePrice = useMemo(() => {
    if (!selectedHall) return 0;
    if (isFunctionHall) {
      const guests = Number(draft.guests) || 30;
      return Math.round((selectedHall.price || 1500) * guests);
    }
    if (isMeetingHall) {
      const hours = Math.max(1, Number(draft.hours) || 2);
      return Math.round((selectedHall.price || 1600) * hours);
    }
    return selectedHall.price || 1500;
  }, [selectedHall, isFunctionHall, isMeetingHall, draft.guests, draft.hours]);

  const discount = isMember ? Math.round(basePrice * (memberDiscountPercent / 100)) : 0;
  // GST not confirmed: no taxes line
  const total = Math.max(0, basePrice - discount);

  // Live Summary Card for FlowShell
  const hallSummary = useMemo(() => {
    const timeDetail = isMeetingHall
      ? `${draft.startTime || '10:00'} (${draft.hours || 2} hrs)`
      : (SLOT_DETAILS[draft.slot]?.label || 'Evening Slot');

    const guestDetail = isFunctionHall
      ? `${draft.guests || 30} Guests (₹1,500 per person, with food)`
      : `${draft.guests || 10} Guests`;

    return {
      name: selectedHall?.name || 'Convention Hall',
      image: IMAGES[selectedHall?.id] || IMAGES.hallFunction,
      detail: `${selectedArea.name} · ${draft.eventType}`,
      date: draft.date ? formatDMY(draft.date) : undefined,
      slot: timeDetail,
      guests: guestDetail,
      location: `${selectedArea.name} Campus · Convention Halls`,
      locationId: 'vja-halls',
      price: basePrice,
      memberDiscount: discount > 0 ? discount : undefined,
      total,
    };
  }, [selectedHall, selectedArea, draft.eventType, draft.date, draft.slot, draft.startTime, draft.hours, draft.guests, isFunctionHall, isMeetingHall, basePrice, discount, total]);

  // Step 1 Validation
  const isStep1Valid = Boolean(draft.areaId && draft.hallType);

  // Step 2 Validation
  const isStep2Valid = Boolean(draft.date && (isMeetingHall || draft.hallType === 'boardroom' ? (draft.startTime && Number(draft.hours) >= 1) : draft.slot));

  // Step 3 Validation
  const isStep3Valid = Boolean(draft.selectedHallId);

  // Step 4 Validation
  const isStep4Valid = useMemo(() => {
    const cleanMobile = draft.mobile.replace(/\D/g, '');
    const validEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(draft.email.trim());
    const guestsNum = Number(draft.guests);
    const validGuests = isFunctionHall
      ? guestsNum >= 30 && guestsNum <= 100000
      : guestsNum >= 1;
    const validHours = isMeetingHall
      ? Number(draft.hours) >= 1 && Boolean(draft.startTime)
      : true;
    return Boolean(draft.name.trim()) && cleanMobile.length === 10 && validEmail && validGuests && validHours;
  }, [draft.name, draft.mobile, draft.email, draft.guests, draft.hours, draft.startTime, isFunctionHall, isMeetingHall]);

  // Payment Handler
  function handlePay() {
    setPaying(true);

    // TODO(Razorpay): Integrate Razorpay gateway:
    // 1. const order = await createRazorpayOrder({ amount: total, currency: 'INR' });
    // 2. Open Razorpay modal with order.id
    // 3. await verifyRazorpayPayment(response);

    setTimeout(() => {
      setPaying(false);
      const year = new Date().getFullYear();
      const random6 = String(Math.floor(100000 + Math.random() * 900000));
      const bookingId = `FRCC-HALL-${year}-${random6}`;

      const confirmationRecord = {
        id: bookingId,
        hallName: selectedHall.name,
        areaName: selectedArea.name,
        date: draft.date,
        slotLabel: isMeetingHall ? `${draft.startTime} (${draft.hours} Hours)` : (SLOT_DETAILS[draft.slot]?.label || draft.slot),
        eventType: draft.eventType,
        guests: isFunctionHall ? `${draft.guests} Guests (with food)` : `${draft.guests} Guests`,
        organizerName: draft.name,
        mobile: draft.mobile,
        email: draft.email,
        total,
        createdAt: new Date().toISOString(),
      };

      try {
        window.sessionStorage.setItem('frcc_hall_confirmed', JSON.stringify(confirmationRecord));
        window.sessionStorage.removeItem(STORAGE_KEY);
      } catch {
        /* ignore */
      }

      setConfirmedBooking(confirmationRecord);
      setStep(5);
      pushToast('Convention hall booked successfully!');
    }, 1500);
  }

  return (
    <FlowShell
      service="halls"
      title="Book a hall"
      steps={STEPS}
      currentStep={step}
      onStepClick={(i) => {
        if (i < step && step < 5) setStep(i);
      }}
      summary={hallSummary}
    >
      <div>
        {/* Step 1: Area & Hall Type */}
        {step === 0 && (
          <Card>
            <p className="eyebrow">Step 1 · Area &amp; Hall Type</p>
            <h2 className="h-sub mt-1">Select location and venue preference</h2>
            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-slate-600">
              <span>Choose the campus area and whether you need AC halls, Non-AC open venues, or executive boardrooms.</span>
              <LocationTrigger locationId="vja-halls" className="text-xs text-navy-900 font-medium hover:text-gold-600 inline-flex">
                Vijayawada Campus · View on map &amp; get directions
              </LocationTrigger>
            </div>

            <div className="mt-6 space-y-6">
              {/* Area selector (visible only if multiple areas exist) */}
              {HALL_AREAS.length > 1 && (
                <div>
                  <label className="label">Campus Location</label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-2">
                    {HALL_AREAS.map((a) => {
                      const isSelected = draft.areaId === a.id;
                      return (
                        <button
                          key={a.id}
                          type="button"
                          onClick={() => updateDraft({ areaId: a.id })}
                          className={`p-3.5 rounded-xl border text-left font-semibold text-sm transition ${
                            isSelected
                              ? 'border-gold-500 bg-gold-50/40 text-navy-950 ring-1 ring-gold-500'
                              : 'border-slate-200 bg-white text-navy-900 hover:border-slate-300'
                          }`}
                        >
                          <span className="block font-display text-base">{a.name}</span>
                          <span className="text-xs font-normal text-slate-500 mt-0.5 block">Convention Centre</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Hall Type selector */}
              <div>
                <label className="label">Hall Type</label>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 mt-2">
                  {[
                    { id: 'all', label: 'All Types', desc: 'Browse all spaces' },
                    { id: 'ac', label: 'AC Halls', desc: 'Central air-conditioned' },
                    { id: 'non-ac', label: 'Non AC', desc: 'Open-air & pavilion' },
                    { id: 'boardroom', label: 'Board room', desc: 'Executive meetings' },
                  ].map((t) => {
                    const isSelected = draft.hallType === t.id;
                    return (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => updateDraft({ hallType: t.id })}
                        className={`p-3.5 rounded-xl border text-left font-semibold text-sm transition ${
                          isSelected
                            ? 'border-gold-500 bg-gold-50/40 text-navy-950 ring-1 ring-gold-500'
                            : 'border-slate-200 bg-white text-navy-900 hover:border-slate-300'
                        }`}
                      >
                        <span className="block font-display text-sm">{t.label}</span>
                        <span className="text-[11px] font-normal text-slate-500 mt-0.5 block">{t.desc}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="mt-8 flex justify-end border-t border-slate-100 pt-5">
              <Button
                variant="primary"
                disabled={!isStep1Valid}
                onClick={() => setStep(1)}
                className="px-7 py-2.5 inline-flex items-center gap-1.5"
              >
                Next: Date &amp; Time <ArrowRightIcon className="h-4 w-4" />
              </Button>
            </div>
          </Card>
        )}

        {/* Step 2: Date & Time */}
        {step === 1 && (
          <Card>
            <p className="eyebrow">Step 2 · Date &amp; Time</p>
            <h2 className="h-sub mt-1">Schedule your event</h2>
            <p className="mt-1 text-sm text-slate-600">Select the date of your event and choose the timing window.</p>

            <div className="mt-6 space-y-6 max-w-xl">
              <Input
                label="Event Date *"
                type="date"
                min={getTodayISO()}
                value={draft.date}
                onChange={(e) => updateDraft({ date: e.target.value })}
              />

              {isMeetingHall || draft.hallType === 'boardroom' ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Input
                      label="Start Time *"
                      type="time"
                      value={draft.startTime}
                      onChange={(e) => updateDraft({ startTime: e.target.value })}
                    />
                    <Input
                      label="Duration (Hours) *"
                      type="number"
                      min={1}
                      max={24}
                      value={draft.hours}
                      onChange={(e) => updateDraft({ hours: e.target.value })}
                    />
                  </div>
                  <p className="text-xs text-slate-500 font-medium">
                    Meeting Hall: {formatInr(selectedHall?.price || 1600)} per hour
                  </p>
                  {draft.hours !== '' && Number(draft.hours) < 1 && (
                    <p className="text-xs text-rose-600 font-medium">Minimum 1 hour required for Meeting Hall</p>
                  )}
                </div>
              ) : (
                <div>
                  <label className="label">Event Time Slot *</label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
                    {Object.entries(SLOT_DETAILS).map(([key, info]) => {
                      const isSelected = draft.slot === key;
                      return (
                        <button
                          key={key}
                          type="button"
                          onClick={() => updateDraft({ slot: key })}
                          className={`p-3.5 rounded-xl border text-left font-semibold text-sm transition ${
                            isSelected
                              ? 'border-gold-500 bg-gold-50/40 text-navy-950 ring-1 ring-gold-500'
                              : 'border-slate-200 bg-white text-navy-900 hover:border-slate-300'
                          }`}
                        >
                          <span className="block font-display text-sm">{key.charAt(0).toUpperCase() + key.slice(1)}</span>
                          <span className="text-xs font-normal text-slate-500 mt-0.5 block">{info.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            <div className="mt-8 flex justify-between border-t border-slate-100 pt-5">
              <button
                type="button"
                onClick={() => setStep(0)}
                className="btn-base border border-slate-300 bg-white text-navy-900 hover:bg-slate-50 px-5 py-2.5 inline-flex items-center gap-1.5"
              >
                <ChevronLeftIcon className="h-4 w-4" /> Back
              </button>
              <Button
                variant="primary"
                disabled={!isStep2Valid}
                onClick={() => setStep(2)}
                className="px-7 py-2.5 inline-flex items-center gap-1.5"
              >
                Next: Hall Availability <ArrowRightIcon className="h-4 w-4" />
              </Button>
            </div>
          </Card>
        )}

        {/* Step 3: Availability */}
        {step === 2 && (
          <Card>
            <p className="eyebrow">Step 3 · Venue Availability</p>
            <h2 className="h-sub mt-1">Available venues in {selectedArea.name}</h2>
            <p className="mt-1 text-sm text-slate-600">Showing spaces available on {formatDMY(draft.date)}.</p>

            <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
              {availableHalls.map((hall) => {
                const isSelected = draft.selectedHallId === hall.id;
                const hallImage = IMAGES[hall.id] || IMAGES.hallFunction;
                const isItemFunc = hall.id === 'vja-function-hall' || hall.pricingUnit === 'per-person';

                return (
                  <div
                    key={hall.id}
                    onClick={() => updateDraft({ selectedHallId: hall.id })}
                    className={`cursor-pointer rounded-2xl border p-4 transition-colors duration-150 flex flex-col justify-between ${
                      isSelected
                        ? 'border-2 border-gold-500 bg-gold-50/20 shadow-sm ring-1 ring-gold-500/40'
                        : 'border-slate-200 bg-white hover:border-gold-500/50'
                    }`}
                  >
                    <div>
                      <div className="h-40 overflow-hidden rounded-xl bg-slate-100">
                        <SmartImage image={hallImage} aspect="16 / 10" sizes="300px" />
                      </div>
                      <div className="mt-3 flex items-start justify-between gap-2">
                        <h3 className="font-display text-base font-bold text-navy-900">{hall.name}</h3>
                        {isSelected && <span className="tag tag-gold !px-2 !py-0.5 !text-[10px]">Selected</span>}
                      </div>
                      <p className="mt-1 text-xs text-slate-500 line-clamp-2">{hall.description}</p>
                      <div className="mt-2 flex flex-wrap gap-1">
                        {hall.amenities?.slice(0, 3).map((am, idx) => (
                          <span key={idx} className="bg-slate-100 text-slate-600 text-[10px] px-2 py-0.5 rounded-md">
                            {am}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="mt-4 flex items-baseline justify-between border-t border-slate-100 pt-3">
                      <span className="text-xs text-emerald-700 font-semibold">
                        {isItemFunc ? 'Seats 30 – 1,00,000 guests' : 'Seats up to 50 guests'}
                      </span>
                      <span className="font-display font-bold text-navy-900">
                        {isItemFunc ? (
                          <>
                            {formatInr(hall.price || 1500)}
                            <span className="text-xs font-normal text-slate-500"> per person, with food</span>
                          </>
                        ) : (
                          <>
                            {formatInr(hall.price || 1600)}
                            <span className="text-xs font-normal text-slate-500"> / hour</span>
                          </>
                        )}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-8 flex justify-between border-t border-slate-100 pt-5">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="btn-base border border-slate-300 bg-white text-navy-900 hover:bg-slate-50 px-5 py-2.5 inline-flex items-center gap-1.5"
              >
                <ChevronLeftIcon className="h-4 w-4" /> Back
              </button>
              <Button
                variant="primary"
                disabled={!isStep3Valid}
                onClick={() => setStep(3)}
                className="px-7 py-2.5 inline-flex items-center gap-1.5"
              >
                Next: Event Details <ArrowRightIcon className="h-4 w-4" />
              </Button>
            </div>
          </Card>
        )}

        {/* Step 4: Event Details */}
        {step === 3 && (
          <Card>
            <p className="eyebrow">Step 4 · Event Details</p>
            <h2 className="h-sub mt-1">Specify your occasion and contact</h2>
            <p className="mt-1 text-sm text-slate-600">Provide organizer and occasion details to complete venue coordination.</p>

            <div className="mt-6 max-w-xl space-y-5">
              <Select
                label="Occasion / Event Type *"
                value={draft.eventType}
                onChange={(e) => updateDraft({ eventType: e.target.value })}
                options={[
                  { value: 'Wedding / Reception', label: 'Wedding / Reception' },
                  { value: 'Conference / Summit', label: 'Conference / Corporate Summit' },
                  { value: 'Banquet / Dinner', label: 'Banquet / Gala Dinner' },
                  { value: 'Birthday / Celebration', label: 'Birthday / Family Celebration' },
                  { value: 'Exhibition', label: 'Exhibition / Product Launch' },
                ]}
              />

              {/* Function Hall: guests input min 30, max 1,00,000, validation messages; show "₹1,500 per person, with food" */}
              {isFunctionHall ? (
                <div>
                  <Input
                    label="Expected Guests Count (Min 30, Max 1,00,000) *"
                    type="number"
                    min={30}
                    max={100000}
                    value={draft.guests}
                    onChange={(e) => updateDraft({ guests: e.target.value })}
                    placeholder="e.g. 250"
                  />
                  <p className="mt-1 text-xs text-amber-700 font-semibold">
                    ₹1,500 per person, with food
                  </p>
                  {draft.guests !== '' && Number(draft.guests) < 30 && (
                    <p className="mt-1 text-xs text-rose-600 font-medium">
                      Minimum 30 guests required for Function Hall
                    </p>
                  )}
                  {Number(draft.guests) > 100000 && (
                    <p className="mt-1 text-xs text-rose-600 font-medium">
                      Maximum 1,00,000 guests allowed for Function Hall
                    </p>
                  )}
                </div>
              ) : (
                /* Meeting Hall: total = hours x 1600 (start time + hours) */
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Input
                      label="Start Time *"
                      type="time"
                      value={draft.startTime}
                      onChange={(e) => updateDraft({ startTime: e.target.value })}
                    />
                    <Input
                      label="Duration (Hours) *"
                      type="number"
                      min={1}
                      max={24}
                      value={draft.hours}
                      onChange={(e) => updateDraft({ hours: e.target.value })}
                    />
                  </div>
                  <p className="text-xs text-amber-700 font-semibold">
                    {formatInr(selectedHall?.price || 1600)} per hour
                  </p>
                  {draft.hours !== '' && Number(draft.hours) < 1 && (
                    <p className="text-xs text-rose-600 font-medium">
                      Minimum 1 hour required for Meeting Hall
                    </p>
                  )}
                  <Input
                    label="Expected Attendees / Guests *"
                    type="number"
                    min={1}
                    max={50}
                    value={draft.guests}
                    onChange={(e) => updateDraft({ guests: e.target.value })}
                    placeholder="e.g. 15"
                  />
                </div>
              )}

              <Input
                label="Organizer Full Name *"
                value={draft.name}
                onChange={(e) => updateDraft({ name: e.target.value })}
                placeholder="e.g. Anand Varma"
              />
              <Input
                label="Mobile Number (10 digits) *"
                type="tel"
                value={draft.mobile}
                onChange={(e) => updateDraft({ mobile: e.target.value.replace(/\D/g, '').slice(0, 10) })}
                placeholder="10-digit mobile number"
              />
              <Input
                label="Email Address *"
                type="email"
                value={draft.email}
                onChange={(e) => updateDraft({ email: e.target.value })}
                placeholder="anand@example.com"
              />
              <div>
                <label className="label">Special Instructions &amp; Setup Notes (Optional)</label>
                <textarea
                  value={draft.notes}
                  onChange={(e) => updateDraft({ notes: e.target.value })}
                  placeholder="e.g. Stage lighting preference, catering prep requirements, green room access"
                  rows={3}
                  className="input mt-1.5 resize-none text-sm"
                />
              </div>
            </div>

            <div className="mt-8 flex justify-between border-t border-slate-100 pt-5">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="btn-base border border-slate-300 bg-white text-navy-900 hover:bg-slate-50 px-5 py-2.5 inline-flex items-center gap-1.5"
              >
                <ChevronLeftIcon className="h-4 w-4" /> Back
              </button>
              <Button
                variant="primary"
                disabled={!isStep4Valid}
                onClick={() => setStep(4)}
                className="px-7 py-2.5 inline-flex items-center gap-1.5"
              >
                Next: Review &amp; Pay <ArrowRightIcon className="h-4 w-4" />
              </Button>
            </div>
          </Card>
        )}

        {/* Step 5: Review & Pay */}
        {step === 4 && (
          <Card>
            <p className="eyebrow">Step 5 · Review &amp; Pay</p>
            <h2 className="h-sub mt-1">Confirm hall reservation</h2>

            <div className="mt-6 max-w-xl space-y-6">
              {/* Review Box */}
              <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 space-y-2.5 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-600">Venue</span>
                  <span className="font-semibold text-navy-900">{selectedHall.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Campus</span>
                  <span className="font-semibold text-navy-900">{selectedArea.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Event Date &amp; Timing</span>
                  <span className="font-semibold text-navy-900">
                    {formatDMY(draft.date)} · {isMeetingHall ? `${draft.startTime} (${draft.hours} Hours)` : (SLOT_DETAILS[draft.slot]?.label || draft.slot)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Pricing Basis</span>
                  <span className="font-semibold text-navy-900">
                    {isFunctionHall
                      ? `${draft.guests} Guests × ₹1,500 (with food)`
                      : `${draft.hours} Hours × ${formatInr(selectedHall.price || 1600)}/hr`}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Occasion</span>
                  <span className="font-semibold text-navy-900">{draft.eventType}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Organizer</span>
                  <span className="font-semibold text-navy-900">{draft.name} (+91 {draft.mobile})</span>
                </div>
              </div>

              {/* Payment Method Selector */}
              <div>
                <label className="label">Payment Method</label>
                <div className="grid grid-cols-3 gap-3 mt-2">
                  {[
                    { id: 'upi', label: 'UPI / QR' },
                    { id: 'card', label: 'Credit/Debit Card' },
                    { id: 'netbanking', label: 'Net Banking' },
                  ].map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => updateDraft({ paymentMethod: m.id })}
                      className={`p-3 rounded-xl border text-center font-semibold text-sm transition ${
                        draft.paymentMethod === m.id
                          ? 'border-gold-500 bg-gold-50/40 text-navy-950 ring-1 ring-gold-500'
                          : 'border-slate-200 bg-white text-navy-900 hover:border-slate-300'
                      }`}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-8 flex justify-between border-t border-slate-100 pt-5">
              <button
                type="button"
                onClick={() => setStep(3)}
                className="btn-base border border-slate-300 bg-white text-navy-900 hover:bg-slate-50 px-5 py-2.5 inline-flex items-center gap-1.5"
              >
                <ChevronLeftIcon className="h-4 w-4" /> Back
              </button>
              <LoadingButton
                variant="gold"
                loading={paying}
                loadingLabel="Processing reservation…"
                onClick={handlePay}
                className="px-8 py-2.5 font-semibold"
              >
                Pay {formatInr(total)}
              </LoadingButton>
            </div>
          </Card>
        )}

        {/* Step 6: Confirmation */}
        {step === 5 && confirmedBooking && (
          <Card className="text-center !p-8 sm:!p-10 max-w-xl mx-auto">
            <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-emerald-50 text-emerald-600">
              <CheckCircleIcon className="h-10 w-10" />
            </div>
            <h2 className="font-display text-2xl font-bold text-navy-900 mt-4">Hall Booked Successfully</h2>
            <p className="mt-1 text-sm text-slate-600">
              Booking ID: <span className="font-mono font-bold text-navy-900">{confirmedBooking.id}</span>
            </p>

            <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50/80 p-5 text-left text-sm space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-500">Venue</span>
                <span className="font-semibold text-navy-900">{confirmedBooking.hallName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Campus</span>
                <span className="font-semibold text-navy-900">{confirmedBooking.areaName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Event Date</span>
                <span className="font-semibold text-navy-900">{formatDMY(confirmedBooking.date)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Timing</span>
                <span className="font-semibold text-navy-900">{confirmedBooking.slotLabel}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Occasion</span>
                <span className="font-semibold text-navy-900">{confirmedBooking.eventType} ({confirmedBooking.guests})</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Organizer</span>
                <span className="font-semibold text-navy-900">{confirmedBooking.organizerName}</span>
              </div>
              <div className="flex justify-between border-t border-slate-200 pt-2 font-bold">
                <span className="text-navy-900">Total Paid</span>
                <span className="text-navy-900">{formatInr(confirmedBooking.total)}</span>
              </div>
            </div>

            <p className="mt-4 text-xs text-slate-500">
              Show this booking ID and receipt at the FRCC event coordination desk upon arrival.
            </p>

            {/* Action Buttons - No WhatsApp button */}
            <div className="mt-6 flex flex-col sm:flex-row justify-center gap-3">
              <button
                type="button"
                onClick={() => window.print()}
                className="btn-base border border-slate-300 bg-white text-navy-900 hover:bg-slate-50 font-semibold px-6 py-2.5 inline-flex items-center justify-center gap-2"
              >
                <PrinterIcon className="h-4 w-4" /> Print / Download
              </button>
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
        )}
      </div>
    </FlowShell>
  );
}

export default HallPage;