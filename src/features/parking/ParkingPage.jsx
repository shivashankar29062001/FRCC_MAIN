// ---------------------------------------------------------------------------
// /src/features/parking/ParkingPage.jsx — Parking Booking Flow & Landing Page
// ---------------------------------------------------------------------------

import { useState, useMemo, useEffect } from 'react';
import { useLocation, useSearchParams, Link } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { useApp } from '../../app/store/AppContext.jsx';
import { ServiceLanding } from '../../components/ServiceLanding.jsx';
import { ServiceHero } from '../../components/ServiceHero.jsx';
import { FlowShell } from '../../components/FlowShell.jsx';
import { Card } from '../../components/ui/feedback.jsx';
import { Button, Input, Select, LoadingButton } from '../../components/ui/controls.jsx';
import { IMAGES } from '../../config/images.js';
import { zones as ALL_ZONES, areas as PARKING_AREAS } from '../../data/parking.js';
import { formatDMY } from '../../utils/dates.js';
import { formatInr } from '../../utils/pricing.js';
import {
  CheckCircleIcon,
  ChevronLeftIcon,
  ArrowRightIcon,
  PrinterIcon,
} from '../../components/ui/icons.jsx';
import { LocationTrigger } from '../../components/location/LocationTrigger.jsx';

const STORAGE_KEY = 'frcc_parking_booking_draft';

const STEPS = [
  'Date & Duration',
  'Available Slot',
  'Vehicle Details',
  'Review & Confirm',
  'Confirmation',
];

const TIME_OPTIONS = [
  '06:00 AM', '07:00 AM', '08:00 AM', '09:00 AM', '10:00 AM', '11:00 AM',
  '12:00 PM', '01:00 PM', '02:00 PM', '03:00 PM', '04:00 PM', '05:00 PM',
  '06:00 PM', '07:00 PM', '08:00 PM', '09:00 PM',
].map((t) => ({ value: t, label: t }));

const MOCK_SLOTS = [
  { id: 'Bay A-01', booked: true },
  { id: 'Bay A-02', booked: false },
  { id: 'Bay A-03', booked: false },
  { id: 'Bay A-04', booked: false },
  { id: 'Bay A-05', booked: true },
  { id: 'Bay B-01', booked: false },
  { id: 'Bay B-02', booked: false },
  { id: 'Bay B-03', booked: true },
  { id: 'Bay B-04', booked: false },
  { id: 'Bay B-05', booked: false },
  { id: 'Bay C-01', booked: false },
  { id: 'Bay C-02', booked: false },
];

function getTodayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function ParkingPage() {
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { user, pushToast } = useApp();

  const isBookingFlow = location.pathname.startsWith('/book/');

  // If on landing route (/parking), render landing view with ServiceHero
  if (!isBookingFlow) {
    return <ServiceLanding service="parking" hero={<ServiceHero service="parking" />} />;
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

    const itemParam = searchParams.get('item') || searchParams.get('zone') || '';
    const initialZone = itemParam ? ALL_ZONES.find((z) => z.id === itemParam || z.id.endsWith(itemParam)) : null;
    const initialArea = searchParams.get('area') || initialZone?.areaId || saved?.areaId || PARKING_AREAS[0]?.id || 'vja';

    return {
      step: saved?.step && saved.step < 4 ? saved.step : (initialZone ? 1 : 0),
      areaId: initialArea,
      date: searchParams.get('date') || saved?.date || getTodayISO(),
      startTime: searchParams.get('time') || saved?.startTime || '09:00 AM',
      duration: searchParams.get('duration') || saved?.duration || '2',
      vehicleType: searchParams.get('vehicle') || saved?.vehicleType || 'car',
      selectedZoneId: initialZone?.id || saved?.selectedZoneId || (ALL_ZONES.find((z) => z.areaId === initialArea)?.id || ALL_ZONES[0]?.id),
      selectedSlot: saved?.selectedSlot || 'Bay A-02',
      plateNumber: saved?.plateNumber || '',
      ownerName: saved?.ownerName || user?.name || '',
      mobile: saved?.mobile || user?.mobile || (user?.emailOrPhone && !user.emailOrPhone.includes('@') ? user.emailOrPhone : ''),
    };
  });

  const [paying, setPaying] = useState(false);
  const [confirmedBooking, setConfirmedBooking] = useState(() => {
    try {
      const raw = window.sessionStorage.getItem('frcc_parking_confirmed');
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

  // Area & Zone Objects
  const selectedArea = useMemo(
    () => PARKING_AREAS.find((a) => a.id === draft.areaId) || PARKING_AREAS[0],
    [draft.areaId]
  );

  const availableZones = useMemo(() => {
    return ALL_ZONES.filter((z) => z.areaId === draft.areaId);
  }, [draft.areaId]);

  const selectedZone = useMemo(() => {
    return availableZones.find((z) => z.id === draft.selectedZoneId) || availableZones[0] || ALL_ZONES[0];
  }, [availableZones, draft.selectedZoneId]);

  // Pricing calculations: Parking is completely FREE
  const price = 0;
  const discount = 0;
  const total = 0;

  // Live Summary Card for FlowShell
  const parkingSummary = useMemo(() => {
    return {
      name: selectedZone?.name || 'Parking Zone',
      image: IMAGES[selectedZone?.id] || IMAGES.parkingEntry,
      detail: `${selectedArea.name} · ${draft.vehicleType === 'bike' ? 'Two Wheeler' : 'Car'}`,
      date: draft.date ? formatDMY(draft.date) : undefined,
      slot: `${draft.selectedSlot} (${draft.duration === 'full-day' ? 'Full Day Pass' : `${draft.duration} Hours`})`,
      location: `${selectedArea.name} Campus · Parking Facility`,
      locationId: 'vja-parking',
      isFree: true,
      price: 0,
      total: 0,
    };
  }, [selectedZone, selectedArea, draft.vehicleType, draft.date, draft.selectedSlot, draft.duration]);

  // Step 1 Validation
  const isStep1Valid = Boolean(draft.areaId && draft.date && draft.startTime && draft.duration && draft.vehicleType);

  // Step 2 Validation
  const isStep2Valid = Boolean(draft.selectedZoneId && draft.selectedSlot);

  // Step 3 Validation
  const isStep3Valid = useMemo(() => {
    const cleanMobile = draft.mobile.replace(/\D/g, '');
    const cleanPlate = draft.plateNumber.trim();
    return cleanPlate.length >= 4 && Boolean(draft.ownerName.trim()) && cleanMobile.length === 10;
  }, [draft.plateNumber, draft.ownerName, draft.mobile]);

  // Free Confirmation Handler (No Payment Step)
  function handleConfirmFreeBooking() {
    setPaying(true);

    setTimeout(() => {
      setPaying(false);
      const year = new Date().getFullYear();
      const random6 = String(Math.floor(100000 + Math.random() * 900000));
      const bookingId = `FRCC-PARK-${year}-${random6}`;

      const confirmationRecord = {
        id: bookingId,
        zoneName: selectedZone.name,
        areaName: selectedArea.name,
        slot: draft.selectedSlot,
        date: draft.date,
        startTime: draft.startTime,
        duration: draft.duration === 'full-day' ? 'Full Day Pass (12 Hours)' : `${draft.duration} Hours`,
        vehicle: draft.vehicleType === 'bike' ? 'Two Wheeler' : 'Four Wheeler',
        plateNumber: draft.plateNumber.toUpperCase(),
        ownerName: draft.ownerName,
        mobile: draft.mobile,
        total: 0,
        createdAt: new Date().toISOString(),
      };

      try {
        window.sessionStorage.setItem('frcc_parking_confirmed', JSON.stringify(confirmationRecord));
        window.sessionStorage.removeItem(STORAGE_KEY);
      } catch {
        /* ignore */
      }

      setConfirmedBooking(confirmationRecord);
      setStep(4);
      pushToast('Complimentary parking pass confirmed! Scan QR at the entry gate.');
    }, 1200);
  }

  return (
    <FlowShell
      service="parking"
      title="Reserve parking"
      steps={STEPS}
      currentStep={step}
      onStepClick={(i) => {
        if (i < step && step < 4) setStep(i);
      }}
      summary={parkingSummary}
    >
      <div>
        {/* Step 1: Date & Duration */}
        {step === 0 && (
          <Card>
            <p className="eyebrow">Step 1 · Date &amp; Duration</p>
            <h2 className="h-sub mt-1">When are you parking?</h2>
            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-slate-600">
              <span>Select arrival campus location, date, time, and vehicle category.</span>
              <LocationTrigger locationId="vja-parking" className="text-xs text-navy-900 font-medium hover:text-gold-600 inline-flex">
                Vijayawada Campus · View on map &amp; get directions
              </LocationTrigger>
            </div>

            <div className="mt-6 space-y-6">
              {/* Campus Selector (visible only if multiple areas exist) */}
              {PARKING_AREAS.length > 1 && (
                <div>
                  <label className="label">Campus Location</label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-2">
                    {PARKING_AREAS.map((a) => {
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
                          <span className="text-xs font-normal text-slate-500 mt-0.5 block">Campus Gates</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Grid of Inputs */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <Input
                  label="Parking Date *"
                  type="date"
                  min={getTodayISO()}
                  value={draft.date}
                  onChange={(e) => updateDraft({ date: e.target.value })}
                />
                <Select
                  label="Expected Arrival Time *"
                  value={draft.startTime}
                  onChange={(e) => updateDraft({ startTime: e.target.value })}
                  options={TIME_OPTIONS}
                />
                <Select
                  label="Parking Duration *"
                  value={draft.duration}
                  onChange={(e) => updateDraft({ duration: e.target.value })}
                  options={[
                    { value: '1', label: '1 Hour' },
                    { value: '2', label: '2 Hours' },
                    { value: '3', label: '3 Hours' },
                    { value: '4', label: '4 Hours' },
                    { value: 'full-day', label: 'Full Day Pass (Up to 12 Hours)' },
                  ]}
                />
                <Select
                  label="Vehicle Type *"
                  value={draft.vehicleType}
                  onChange={(e) => updateDraft({ vehicleType: e.target.value })}
                  options={[
                    { value: 'car', label: 'Car (Four Wheeler / EV)' },
                    { value: 'bike', label: 'Bike (Two Wheeler)' },
                  ]}
                />
              </div>
            </div>

            <div className="mt-8 flex justify-end border-t border-slate-100 pt-5">
              <Button
                variant="primary"
                disabled={!isStep1Valid}
                onClick={() => setStep(1)}
                className="px-7 py-2.5 inline-flex items-center gap-1.5"
              >
                Next: Available Slots <ArrowRightIcon className="h-4 w-4" />
              </Button>
            </div>
          </Card>
        )}

        {/* Step 2: Available Slot */}
        {step === 1 && (
          <Card>
            <p className="eyebrow">Step 2 · Available Slot</p>
            <h2 className="h-sub mt-1">Select zone and parking bay</h2>
            <p className="mt-1 text-sm text-slate-600">Pick your preferred zone in {selectedArea.name} and reserve a specific parking bay.</p>

            <div className="mt-6 space-y-6">
              {/* Zone Cards */}
              <div>
                <label className="label">Select Parking Zone</label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-2">
                  {availableZones.map((z) => {
                    const isSelected = draft.selectedZoneId === z.id;
                    const zoneIsFree = z.isFree || (z.price === 0 && (!z.prices || z.prices.hour === 0));
                    const zoneRate = zoneIsFree ? 0 : (draft.vehicleType === 'bike' ? Math.round((z.prices?.hour || z.price || 0) * 0.4) : (z.prices?.hour || z.price || 0));

                    return (
                      <div
                        key={z.id}
                        onClick={() => updateDraft({ selectedZoneId: z.id })}
                        className={`cursor-pointer rounded-xl border p-3.5 transition ${
                          isSelected
                            ? 'border-gold-500 bg-gold-50/40 text-navy-950 ring-1 ring-gold-500'
                            : 'border-slate-200 bg-white text-navy-900 hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-1">
                          <span className="block font-display text-sm font-bold">{z.name}</span>
                          <span className="tag tag-green !text-[10px] !py-0.5 !px-1.5 font-semibold shrink-0">Free</span>
                        </div>
                        <span className="text-xs text-slate-500 mt-1 block">{z.description}</span>
                        <div className="mt-3 flex justify-between items-baseline border-t border-slate-100 pt-2 text-xs">
                          <span className="text-emerald-700 font-semibold">{z.spots} bays</span>
                          <span className="font-bold text-emerald-700">Free</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Slot Picker Grid */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="label mb-0">Choose Parking Bay</label>
                  <span className="text-xs text-slate-500">Selected: <strong className="text-navy-900 font-mono">{draft.selectedSlot}</strong></span>
                </div>

                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2.5">
                  {MOCK_SLOTS.map((s) => {
                    const isSelected = draft.selectedSlot === s.id;
                    return (
                      <button
                        key={s.id}
                        type="button"
                        disabled={s.booked}
                        onClick={() => updateDraft({ selectedSlot: s.id })}
                        className={`py-3 px-2 rounded-xl border text-center font-mono text-xs font-bold transition ${
                          s.booked
                            ? 'border-slate-200 bg-slate-100 text-slate-400 cursor-not-allowed'
                            : isSelected
                            ? 'border-navy-900 bg-navy-900 text-white shadow-sm ring-1 ring-navy-900'
                            : 'border-slate-300 bg-white text-navy-900 hover:border-navy-800'
                        }`}
                      >
                        <span className="block">{s.id}</span>
                        <span className="text-[10px] font-sans font-normal opacity-75 mt-0.5 block">
                          {s.booked ? 'Occupied' : isSelected ? 'Selected' : 'Available'}
                        </span>
                      </button>
                    );
                  })}
                </div>

                <div className="mt-3 flex items-center gap-4 text-xs text-slate-500">
                  <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded border border-slate-300 bg-white" /> Available</span>
                  <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded border border-slate-200 bg-slate-100" /> Occupied</span>
                  <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded border border-navy-900 bg-navy-900" /> Selected</span>
                </div>
              </div>
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
                Next: Vehicle Details <ArrowRightIcon className="h-4 w-4" />
              </Button>
            </div>
          </Card>
        )}

        {/* Step 3: Vehicle Details */}
        {step === 2 && (
          <Card>
            <p className="eyebrow">Step 3 · Vehicle Details</p>
            <h2 className="h-sub mt-1">Vehicle and driver information</h2>
            <p className="mt-1 text-sm text-slate-600">The license plate will be automatically verified at the ANPR campus boom barrier.</p>

            <div className="mt-6 max-w-xl space-y-5">
              <Input
                label="Vehicle Registration Plate Number *"
                value={draft.plateNumber}
                onChange={(e) => updateDraft({ plateNumber: e.target.value.toUpperCase() })}
                placeholder="e.g. TS 09 AB 1234"
              />
              <Input
                label="Driver / Vehicle Owner Full Name *"
                value={draft.ownerName}
                onChange={(e) => updateDraft({ ownerName: e.target.value })}
                placeholder="e.g. Vikram Chandra"
              />
              <Input
                label="Mobile Number (10 digits) *"
                type="tel"
                value={draft.mobile}
                onChange={(e) => updateDraft({ mobile: e.target.value.replace(/\D/g, '').slice(0, 10) })}
                placeholder="10-digit mobile number"
              />
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
                Next: Review &amp; Confirm <ArrowRightIcon className="h-4 w-4" />
              </Button>
            </div>
          </Card>
        )}

        {/* Step 4: Review & Confirm (No Payment Step - Completely FREE) */}
        {step === 3 && (
          <Card>
            <p className="eyebrow">Step 4 · Review &amp; Confirm</p>
            <h2 className="h-sub mt-1">Confirm complimentary parking reservation</h2>
            <p className="mt-1 text-sm text-slate-600">FRCC parking is complimentary for visitors and members. Review your details below to generate your entry QR pass.</p>

            <div className="mt-6 max-w-xl space-y-6">
              {/* Review Box */}
              <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 space-y-2.5 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-600">Zone &amp; Bay</span>
                  <span className="font-semibold text-navy-900">{selectedZone.name} · {draft.selectedSlot}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Campus</span>
                  <span className="font-semibold text-navy-900">{selectedArea.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Date &amp; Time</span>
                  <span className="font-semibold text-navy-900">
                    {formatDMY(draft.date)} at {draft.startTime} ({draft.duration === 'full-day' ? 'Full Day Pass' : `${draft.duration} Hours`})
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Vehicle</span>
                  <span className="font-semibold text-navy-900">
                    {draft.plateNumber.toUpperCase()} ({draft.vehicleType === 'bike' ? 'Two Wheeler' : 'Car'})
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Driver</span>
                  <span className="font-semibold text-navy-900">{draft.ownerName} (+91 {draft.mobile})</span>
                </div>
                <div className="flex justify-between border-t border-slate-200/80 pt-2 font-semibold">
                  <span className="text-slate-700">Parking Fee</span>
                  <span className="text-emerald-700 flex items-center gap-1.5">
                    <span className="tag tag-green !text-xs !py-0.5 !px-2 font-semibold">Free</span>
                    Free (₹0)
                  </span>
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
                loadingLabel="Confirming pass…"
                onClick={handleConfirmFreeBooking}
                className="px-8 py-2.5 font-semibold"
              >
                Confirm free booking
              </LoadingButton>
            </div>
          </Card>
        )}

        {/* Step 5: Confirmation with Entry QR */}
        {step === 4 && confirmedBooking && (
          <Card className="text-center !p-8 sm:!p-10 max-w-xl mx-auto">
            <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-emerald-50 text-emerald-600">
              <CheckCircleIcon className="h-10 w-10" />
            </div>
            <h2 className="font-display text-2xl font-bold text-navy-900 mt-4">Parking Pass Confirmed</h2>
            <p className="mt-1 text-sm text-slate-600">
              Pass ID: <span className="font-mono font-bold text-navy-900">{confirmedBooking.id}</span>
            </p>

            {/* Entry QR Code */}
            <div className="my-6 flex flex-col items-center justify-center">
              <div className="p-3 bg-white rounded-2xl border-2 border-slate-200 shadow-sm">
                <QRCodeSVG
                  value={`FRCC:PARK:${confirmedBooking.id}`}
                  size={180}
                  fgColor="#0a192f"
                  bgColor="#ffffff"
                  level="M"
                />
              </div>
              <p className="text-xs text-slate-500 mt-2.5 font-medium">
                Scan this QR code at campus entry boom barrier.
              </p>
            </div>

            <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50/80 p-5 text-left text-sm space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-500">Zone &amp; Bay</span>
                <span className="font-semibold text-navy-900">{confirmedBooking.zoneName} · {confirmedBooking.slot}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Location</span>
                <span className="font-semibold text-navy-900">{confirmedBooking.areaName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Date &amp; Time</span>
                <span className="font-semibold text-navy-900">{formatDMY(confirmedBooking.date)} at {confirmedBooking.startTime}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Vehicle</span>
                <span className="font-semibold text-navy-900">{confirmedBooking.plateNumber} ({confirmedBooking.vehicle})</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Driver</span>
                <span className="font-semibold text-navy-900">{confirmedBooking.ownerName}</span>
              </div>
              <div className="flex justify-between border-t border-slate-200 pt-2 font-bold">
                <span className="text-navy-900">Total</span>
                <span className="text-emerald-700 flex items-center gap-1.5">
                  <span className="tag tag-green !text-xs !py-0.5 !px-2 font-semibold">Free</span>
                  Free (₹0)
                </span>
              </div>
            </div>

            {/* Action Buttons - No WhatsApp button */}
            <div className="mt-6 flex flex-col sm:flex-row justify-center gap-3">
              <button
                type="button"
                onClick={() => window.print()}
                className="btn-base border border-slate-300 bg-white text-navy-900 hover:bg-slate-50 font-semibold px-6 py-2.5 inline-flex items-center justify-center gap-2"
              >
                <PrinterIcon className="h-4 w-4" /> Print / Download Pass
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

export default ParkingPage;