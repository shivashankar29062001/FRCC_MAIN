// ---------------------------------------------------------------------------
// /src/features/hotel/HotelPage.jsx — Stay Booking Flow & Landing Page
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
import { roomSlot } from '../../config/images.js';
import { areas as HOTEL_AREAS, rooms as ALL_ROOMS } from '../../data/hotel.js';
import { memberDiscountPercent } from '../../config/site.js';
import { formatInr } from '../../utils/pricing.js';
import {
  CheckCircleIcon,
  ChevronLeftIcon,
  ArrowRightIcon,
  PrinterIcon,
} from '../../components/ui/icons.jsx';

const STORAGE_KEY = 'frcc_stay_booking_draft';

const STEPS = [
  'Area & Dates',
  'Room Availability',
  'Guest Details',
  'Review & Pay',
  'Confirmation',
];

function getTodayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function getTomorrowISO() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function calculateNights(start, end) {
  if (!start || !end) return 1;
  const d1 = new Date(start);
  const d2 = new Date(end);
  const diffTime = d2.getTime() - d1.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays > 0 ? diffDays : 1;
}

export function HotelPage() {
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { user, isMember, pushToast } = useApp();

  const isBookingFlow = location.pathname.startsWith('/book/');

  // If on landing route (/stay), render landing view with ServiceHero
  if (!isBookingFlow) {
    return <ServiceLanding service="stay" hero={<ServiceHero service="stay" />} />;
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

    const itemParam = searchParams.get('item') || searchParams.get('room') || '';
    const initialRoom = itemParam
      ? ALL_ROOMS.find((r) => r.id === itemParam || r.type === itemParam)
      : null;

    const initialArea = searchParams.get('area') || initialRoom?.areaId || saved?.areaId || HOTEL_AREAS[0]?.id || 'vja';

    return {
      step: saved?.step && saved.step < 4 ? saved.step : (initialRoom ? 1 : 0),
      areaId: initialArea,
      checkin: searchParams.get('checkin') || saved?.checkin || getTodayISO(),
      checkout: searchParams.get('checkout') || saved?.checkout || getTomorrowISO(),
      adults: searchParams.get('adults') || saved?.adults || '2',
      children: searchParams.get('children') || saved?.children || '0',
      roomsCount: searchParams.get('rooms') || saved?.roomsCount || '1',
      selectedRoomId: initialRoom?.id || saved?.selectedRoomId || (ALL_ROOMS.find((r) => r.areaId === initialArea)?.id || ALL_ROOMS[0]?.id),
      name: saved?.name || user?.name || '',
      mobile: saved?.mobile || user?.mobile || (user?.emailOrPhone && !user.emailOrPhone.includes('@') ? user.emailOrPhone : ''),
      email: saved?.email || user?.email || (user?.emailOrPhone && user.emailOrPhone.includes('@') ? user.emailOrPhone : ''),
      specialRequest: saved?.specialRequest || '',
      paymentMethod: saved?.paymentMethod || 'upi',
    };
  });

  const [paying, setPaying] = useState(false);
  const [confirmedBooking, setConfirmedBooking] = useState(() => {
    try {
      const raw = window.sessionStorage.getItem('frcc_stay_confirmed');
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

  // Area & Room Objects
  const selectedArea = useMemo(
    () => HOTEL_AREAS.find((a) => a.id === draft.areaId) || HOTEL_AREAS[0],
    [draft.areaId]
  );

  const availableRooms = useMemo(
    () => ALL_ROOMS.filter((r) => r.areaId === draft.areaId),
    [draft.areaId]
  );

  const selectedRoom = useMemo(() => {
    return availableRooms.find((r) => r.id === draft.selectedRoomId) || availableRooms[0] || ALL_ROOMS[0];
  }, [availableRooms, draft.selectedRoomId]);

  // Pricing calculations
  const nights = useMemo(
    () => calculateNights(draft.checkin, draft.checkout),
    [draft.checkin, draft.checkout]
  );

  const basePrice = (selectedRoom?.pricePerNight || 2500) * nights * Number(draft.roomsCount || 1);
  const discount = isMember ? Math.round(basePrice * (memberDiscountPercent / 100)) : 0;
  // GST not confirmed by client: no taxes line
  const total = Math.max(0, basePrice - discount);

  // Live Summary Card for FlowShell
  const staySummary = useMemo(() => {
    return {
      name: selectedRoom?.name || 'Hotel Room',
      image: selectedRoom?.image || roomSlot(selectedRoom?.type),
      detail: `${selectedArea.name} · ${draft.roomsCount} Room${Number(draft.roomsCount) > 1 ? 's' : ''}`,
      date: draft.checkin && draft.checkout ? `${formatDMY(draft.checkin)} – ${formatDMY(draft.checkout)}` : undefined,
      slot: `${nights} Night${nights > 1 ? 's' : ''}`,
      guests: `${draft.adults} Adults${Number(draft.children) > 0 ? `, ${draft.children} Children` : ''}`,
      price: basePrice,
      memberDiscount: discount > 0 ? discount : undefined,
      total,
    };
  }, [selectedRoom, selectedArea, draft.roomsCount, draft.checkin, draft.checkout, nights, draft.adults, draft.children, basePrice, discount, total]);

  // Step 1 Validation
  const isStep1Valid = useMemo(() => {
    if (!draft.areaId || !draft.checkin || !draft.checkout) return false;
    const d1 = new Date(draft.checkin);
    const d2 = new Date(draft.checkout);
    return d2.getTime() > d1.getTime() && Number(draft.adults) >= 1 && Number(draft.roomsCount) >= 1;
  }, [draft.areaId, draft.checkin, draft.checkout, draft.adults, draft.roomsCount]);

  // Step 2 Validation
  const isStep2Valid = Boolean(draft.selectedRoomId);

  // Step 3 Validation
  const isStep3Valid = useMemo(() => {
    const cleanMobile = draft.mobile.replace(/\D/g, '');
    const validEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(draft.email.trim());
    return Boolean(draft.name.trim()) && cleanMobile.length === 10 && validEmail;
  }, [draft.name, draft.mobile, draft.email]);

  // Payment Handler
  function handlePay() {
    setPaying(true);

    // TODO(Razorpay): Real payment gateway integration
    // 1. const order = await createRazorpayOrder({ amount: total, currency: 'INR' });
    // 2. Open Razorpay modal with order.id
    // 3. await verifyRazorpayPayment(response);

    setTimeout(() => {
      setPaying(false);
      const year = new Date().getFullYear();
      const random6 = String(Math.floor(100000 + Math.random() * 900000));
      const bookingId = `FRCC-STAY-${year}-${random6}`;

      const confirmationRecord = {
        id: bookingId,
        roomName: selectedRoom.name,
        areaName: selectedArea.name,
        checkin: draft.checkin,
        checkout: draft.checkout,
        nights,
        roomsCount: draft.roomsCount,
        guests: `${draft.adults} Adults, ${draft.children} Children`,
        guestName: draft.name,
        mobile: draft.mobile,
        email: draft.email,
        total,
        createdAt: new Date().toISOString(),
      };

      try {
        window.sessionStorage.setItem('frcc_stay_confirmed', JSON.stringify(confirmationRecord));
        window.sessionStorage.removeItem(STORAGE_KEY);
      } catch {
        /* ignore */
      }

      setConfirmedBooking(confirmationRecord);
      setStep(4);
      pushToast('Room booked successfully! Welcome to FRCC.');
    }, 1500);
  }

  // WhatsApp Link Builder
  const waUrl = useMemo(() => {
    if (!confirmedBooking) return '#';
    const cleanDigits = String(confirmedBooking.mobile || '').replace(/\D/g, '').slice(-10);
    const targetDigits =
      whatsappTarget === 'club' && club?.whatsappNumber
        ? String(club.whatsappNumber).replace(/\D/g, '')
        : (cleanDigits ? `91${cleanDigits}` : String(club?.whatsappNumber || '917893616262').replace(/\D/g, ''));

    const msg = `*FRCC Stay Reservation*\nBooking ID: ${confirmedBooking.id}\nRoom: ${confirmedBooking.roomName}\nLocation: ${confirmedBooking.areaName}\nCheck-in: ${formatDMY(confirmedBooking.checkin)}\nCheck-out: ${formatDMY(confirmedBooking.checkout)} (${confirmedBooking.nights} night${confirmedBooking.nights > 1 ? 's' : ''})\nGuests: ${confirmedBooking.guests}\nTotal Paid: ${formatInr(confirmedBooking.total)}\n\nShow this confirmation at the front desk.`;

    return `https://wa.me/${targetDigits}?text=${encodeURIComponent(msg)}`;
  }, [confirmedBooking]);

  return (
    <FlowShell
      service="stay"
      title="Book your stay"
      steps={STEPS}
      currentStep={step}
      onStepClick={(i) => {
        if (i < step && step < 4) setStep(i);
      }}
      summary={staySummary}
    >
      <div>
        {/* Step 1: Area & Dates */}
        {/* Step 1: Area & Dates */}
        {step === 0 && (
          <Card>
            <p className="eyebrow">{HOTEL_AREAS.length > 1 ? 'Step 1 · Area & Dates' : 'Step 1 · Stay Dates'}</p>
            <h2 className="h-sub mt-1">{HOTEL_AREAS.length > 1 ? 'Select location and travel dates' : 'Select travel dates & guests'}</h2>
            <p className="mt-1 text-sm text-slate-600">{HOTEL_AREAS.length > 1 ? 'Choose campus region, check-in and check-out dates, and number of guests.' : 'Choose check-in and check-out dates, and number of guests.'}</p>

            <div className="mt-6 space-y-6">
              {/* Area selector — hidden when only one location */}
              {HOTEL_AREAS.length > 1 && (
                <div>
                  <label className="label">Campus Location</label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-2">
                    {HOTEL_AREAS.map((a) => {
                      const isSelected = draft.areaId === a.id;
                      return (
                        <button
                          key={a.id}
                          type="button"
                          onClick={() => {
                            const firstRoomInArea = ALL_ROOMS.find((r) => r.areaId === a.id);
                            updateDraft({
                              areaId: a.id,
                              selectedRoomId: firstRoomInArea ? firstRoomInArea.id : draft.selectedRoomId,
                            });
                          }}
                          className={`p-3.5 rounded-xl border text-left font-semibold text-sm transition ${
                            isSelected
                              ? 'border-gold-500 bg-gold-50/40 text-navy-950 ring-1 ring-gold-500'
                              : 'border-slate-200 bg-white text-navy-900 hover:border-slate-300'
                          }`}
                        >
                          <span className="block font-display text-base">{a.name}</span>
                          <span className="text-xs font-normal text-slate-500 mt-0.5 block">FRCC Campus &amp; Club</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Dates & Guests Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <Input
                  label="Check-in Date *"
                  type="date"
                  min={getTodayISO()}
                  value={draft.checkin}
                  onChange={(e) => updateDraft({ checkin: e.target.value })}
                />
                <Input
                  label="Check-out Date *"
                  type="date"
                  min={draft.checkin || getTodayISO()}
                  value={draft.checkout}
                  onChange={(e) => updateDraft({ checkout: e.target.value })}
                />
                <Select
                  label="Adults (Age 12+) *"
                  value={draft.adults}
                  onChange={(e) => updateDraft({ adults: e.target.value })}
                  options={[
                    { value: '1', label: '1 Adult' },
                    { value: '2', label: '2 Adults' },
                    { value: '3', label: '3 Adults' },
                    { value: '4', label: '4 Adults' },
                  ]}
                />
                <Select
                  label="Children (Under 12)"
                  value={draft.children}
                  onChange={(e) => updateDraft({ children: e.target.value })}
                  options={[
                    { value: '0', label: '0 Children' },
                    { value: '1', label: '1 Child' },
                    { value: '2', label: '2 Children' },
                    { value: '3', label: '3 Children' },
                  ]}
                />
                <Select
                  label="Rooms Count *"
                  value={draft.roomsCount}
                  onChange={(e) => updateDraft({ roomsCount: e.target.value })}
                  options={[
                    { value: '1', label: '1 Room' },
                    { value: '2', label: '2 Rooms' },
                    { value: '3', label: '3 Rooms' },
                  ]}
                />
              </div>

              {new Date(draft.checkout) <= new Date(draft.checkin) && (
                <p className="text-xs text-rose-600 font-medium">Check-out date must be after check-in date.</p>
              )}
            </div>

            <div className="mt-8 flex justify-end border-t border-slate-100 pt-5">
              <Button
                variant="primary"
                disabled={!isStep1Valid}
                onClick={() => setStep(1)}
                className="px-7 py-2.5 inline-flex items-center gap-1.5"
              >
                Next: Available Rooms <ArrowRightIcon className="h-4 w-4" />
              </Button>
            </div>
          </Card>
        )}

        {/* Step 2: Room Availability */}
        {step === 1 && (
          <Card>
            <p className="eyebrow">Step 2 · Room Availability</p>
            <h2 className="h-sub mt-1">Available rooms in {selectedArea.name}</h2>
            <p className="mt-1 text-sm text-slate-600">Showing verified rooms for {formatDMY(draft.checkin)} to {formatDMY(draft.checkout)} ({nights} night{nights > 1 ? 's' : ''}).</p>

            {/* Category ranges banner */}
            <div className="mt-4 flex flex-wrap gap-2 text-xs font-semibold">
              <span className="rounded-lg bg-slate-100 px-3 py-1.5 text-navy-900 border border-slate-200">
                Normal rooms ₹2,500 to ₹4,500 per night
              </span>
              <span className="rounded-lg bg-gold-50/70 px-3 py-1.5 text-navy-950 border border-gold-200">
                Suites ₹4,500 to ₹10,000 per night
              </span>
            </div>

            <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
              {availableRooms.map((room) => {
                const isSelected = draft.selectedRoomId === room.id;
                return (
                  <div
                    key={room.id}
                    onClick={() => updateDraft({ selectedRoomId: room.id })}
                    className={`cursor-pointer rounded-2xl border p-4 transition-colors duration-150 flex flex-col justify-between ${
                      isSelected
                        ? 'border-2 border-gold-500 bg-gold-50/20 shadow-sm ring-1 ring-gold-500/40'
                        : 'border-slate-200 bg-white hover:border-gold-500/50'
                    }`}
                  >
                    <div>
                      <div className="h-40 overflow-hidden rounded-xl bg-slate-100">
                        <SmartImage image={room.image} aspect="16 / 10" sizes="300px" />
                      </div>
                      <div className="mt-3 flex items-start justify-between gap-2">
                        <h3 className="font-display text-base font-bold text-navy-900">{room.name}</h3>
                        {isSelected && <span className="tag tag-gold !px-2 !py-0.5 !text-[10px]">Selected</span>}
                      </div>
                      <p className="mt-1 text-xs text-slate-500">{room.bedType} · {room.view} · {room.sizeSqft} sq ft</p>
                      <div className="mt-2 flex flex-wrap gap-1">
                        {room.amenities.slice(0, 3).map((am, idx) => (
                          <span key={idx} className="bg-slate-100 text-slate-600 text-[10px] px-2 py-0.5 rounded-md">
                            {am}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="mt-4 flex items-baseline justify-between border-t border-slate-100 pt-3">
                      <span className="text-xs text-emerald-700 font-semibold">
                        Available · {room.roomsTotal} rooms left
                      </span>
                      <span className="font-display font-bold text-navy-900">
                        {formatInr(room.pricePerNight)}
                        <span className="text-xs font-normal text-slate-500">/night</span>
                      </span>
                    </div>
                  </div>
                );
              })}
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
                Next: Guest Details <ArrowRightIcon className="h-4 w-4" />
              </Button>
            </div>
          </Card>
        )}

        {/* Step 3: Guest Details */}
        {step === 2 && (
          <Card>
            <p className="eyebrow">Step 3 · Guest Details</p>
            <h2 className="h-sub mt-1">Primary guest information</h2>
            <p className="mt-1 text-sm text-slate-600">Provide contact details for booking confirmation and check-in verification.</p>

            <div className="mt-6 max-w-xl space-y-5">
              <Input
                label="Full Name (as per government photo ID) *"
                value={draft.name}
                onChange={(e) => updateDraft({ name: e.target.value })}
                placeholder="e.g. Ramesh Kumar"
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
                placeholder="ramesh@example.com"
              />
              <div>
                <label className="label">Special Request (Optional)</label>
                <textarea
                  value={draft.specialRequest}
                  onChange={(e) => updateDraft({ specialRequest: e.target.value })}
                  placeholder="e.g. Early check-in preference, quiet room, extra towels"
                  rows={3}
                  className="input mt-1.5 resize-none text-sm"
                />
              </div>
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
                Next: Review &amp; Pay <ArrowRightIcon className="h-4 w-4" />
              </Button>
            </div>
          </Card>
        )}

        {/* Step 4: Review & Pay */}
        {step === 3 && (
          <Card>
            <p className="eyebrow">Step 4 · Review &amp; Pay</p>
            <h2 className="h-sub mt-1">Review reservation and payment</h2>

            <div className="mt-6 max-w-xl space-y-6">
              {/* Review Box */}
              <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 space-y-2.5 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-600">Room</span>
                  <span className="font-semibold text-navy-900">{selectedRoom.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Campus</span>
                  <span className="font-semibold text-navy-900">{selectedArea.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Stay Duration</span>
                  <span className="font-semibold text-navy-900">
                    {formatDMY(draft.checkin)} – {formatDMY(draft.checkout)} ({nights} night{nights > 1 ? 's' : ''})
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Guest</span>
                  <span className="font-semibold text-navy-900">{draft.name} (+91 {draft.mobile})</span>
                </div>
              </div>

              {/* Payment Method Selector */}
              <div>
                <label className="label">Choose Payment Method</label>
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
                onClick={() => setStep(2)}
                className="btn-base border border-slate-300 bg-white text-navy-900 hover:bg-slate-50 px-5 py-2.5 inline-flex items-center gap-1.5"
              >
                <ChevronLeftIcon className="h-4 w-4" /> Back
              </button>
              <LoadingButton
                variant="gold"
                loading={paying}
                loadingLabel="Processing payment…"
                onClick={handlePay}
                className="px-8 py-2.5 font-semibold"
              >
                Pay {formatInr(total)}
              </LoadingButton>
            </div>
          </Card>
        )}

        {/* Step 5: Confirmation */}
        {step === 4 && confirmedBooking && (
          <Card className="text-center !p-8 sm:!p-10 max-w-xl mx-auto">
            <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-emerald-50 text-emerald-600">
              <CheckCircleIcon className="h-10 w-10" />
            </div>
            <h2 className="font-display text-2xl font-bold text-navy-900 mt-4">Room Booked Successfully</h2>
            <p className="mt-1 text-sm text-slate-600">
              Booking ID: <span className="font-mono font-bold text-navy-900">{confirmedBooking.id}</span>
            </p>

            <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50/80 p-5 text-left text-sm space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-500">Room</span>
                <span className="font-semibold text-navy-900">{confirmedBooking.roomName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Location</span>
                <span className="font-semibold text-navy-900">{confirmedBooking.areaName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Dates</span>
                <span className="font-semibold text-navy-900">
                  {formatDMY(confirmedBooking.checkin)} – {formatDMY(confirmedBooking.checkout)} ({confirmedBooking.nights} night{confirmedBooking.nights > 1 ? 's' : ''})
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Guest</span>
                <span className="font-semibold text-navy-900">{confirmedBooking.guestName}</span>
              </div>
              <div className="flex justify-between border-t border-slate-200 pt-2 font-bold">
                <span className="text-navy-900">Total Paid</span>
                <span className="text-navy-900">{formatInr(confirmedBooking.total)}</span>
              </div>
            </div>

            <p className="mt-4 text-xs text-slate-500">
              A digital confirmation has been issued. Show this booking ID or receipt at hotel reception during check-in.
            </p>

            {/* Action Buttons */}
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

export default HotelPage;