// ---------------------------------------------------------------------------
// /src/features/dining/TableBookingPage.jsx — Table Booking Wizard in FlowShell
// ---------------------------------------------------------------------------

import { useState, useEffect, useMemo, useRef } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { FlowShell } from '../../components/FlowShell.jsx';
import { Card } from '../../components/ui/feedback.jsx';
import { SmartImage } from '../../components/ui/media.jsx';
import { IMAGES } from '../../config/images.js';
import { venues } from '../../data/dining.js';
import { phone, diningLabel } from '../../config/site.js';
import { getTableSlots, createTableBooking, isDiningSlotPast, stripDiningLocationTag } from '../../api/dining.js';
import { useApp } from '../../app/store/AppContext.jsx';
import { QRCodeSVG } from 'qrcode.react';
import { formatDMY, parseDMY } from '../../utils/dates.js';
import { todayISO } from '../../utils/helpers.js';
import { normalizeMobile, isValidMobile } from '../../utils/phone.js';
import {
  INDIAN_MOBILE_MESSAGE,
  INDIAN_MOBILE_PLACEHOLDER,
  isValidIndianMobile,
  sanitizeMobileInput,
} from '../../utils/mobile.js';
import { isValidName, normalizeName, sanitizeNameInput, nameError } from '../../utils/fullName.js';
import {
  PrinterIcon,
  CheckCircleIcon,
  ChevronLeftIcon,
  ArrowRightIcon,
  CalendarIcon,
  UsersIcon,
  ClockIcon,
} from '../../components/ui/icons.jsx';

import { LocationSelector } from '../../components/booking/LocationSelector.jsx';
import { DINING_LOCATIONS } from '../../data/bookingLocations.js';

const STEPS = ['Location & Venue', 'Date & Time', 'Your Details', 'Confirmation'];

function getFutureDateISO(daysAhead) {
  const d = new Date();
  d.setDate(d.getDate() + daysAhead);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function TableBookingPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useApp();

  const venueParam = searchParams.get('venue');
  const hasPreselectedVenue = Boolean(venueParam);
  const initialVenueParam = venueParam || 'restaurant';
  const initialDateParam = searchParams.get('date') || formatDMY(todayISO());
  const initialGuestsParam = Number(searchParams.get('guests')) || 2;

  // Step index: 0 = Venue, 1 = Date/time/guests, 2 = Your details, 3 = Confirmation
  const [step, setStep] = useState(0);

  // If a venue was chosen in the dining section, show only that venue by default
  const [showAllVenues, setShowAllVenues] = useState(() => !hasPreselectedVenue);

  const effectiveSteps = useMemo(() => {
    if (hasPreselectedVenue) {
      return ['Location & Venue', 'Date & Time', 'Your Details', 'Confirmation'];
    }
    return STEPS;
  }, [hasPreselectedVenue]);

  // Form state (supports optional ?city=hyd URL param while defaulting to first city)
  const initialCityParam = (searchParams.get('city') || searchParams.get('cityId') || '').toLowerCase();
  const matchedInitCity = DINING_LOCATIONS.find((c) => String(c.id).toLowerCase() === initialCityParam) || DINING_LOCATIONS[0];
  const [selectedCityId, setSelectedCityId] = useState(matchedInitCity?.id || 'vja');
  const [selectedVenueLocationId, setSelectedVenueLocationId] = useState(matchedInitCity?.venues?.[0]?.id || 'vja-dining');
  const [selectedVenueId, setSelectedVenueId] = useState(initialVenueParam);

  const selectedCity = useMemo(
    () => DINING_LOCATIONS.find((c) => String(c.id) === String(selectedCityId)) || DINING_LOCATIONS[0],
    [selectedCityId]
  );
  const selectedVenueLocation = useMemo(
    () => selectedCity?.venues?.find((v) => String(v.id) === String(selectedVenueLocationId)) || selectedCity?.venues?.[0] || null,
    [selectedCity, selectedVenueLocationId]
  );

  const displayedVenues = useMemo(() => {
    if (hasPreselectedVenue && !showAllVenues) {
      const v = venues.find((item) => item.id === selectedVenueId) || venues[0];
      return [v];
    }
    return venues;
  }, [hasPreselectedVenue, showAllVenues, selectedVenueId]);
  const [dateStr, setDateStr] = useState(initialDateParam);
  const [guestsCount, setGuestsCount] = useState(initialGuestsParam);
  const [selectedSlot, setSelectedSlot] = useState('');
  const [slotsList, setSlotsList] = useState([]);
  const [loadingSlots, setLoadingSlots] = useState(false);

  // Guest details state
  const [guestName, setGuestName] = useState('');
  const [guestMobile, setGuestMobile] = useState('');
  const [guestEmail, setGuestEmail] = useState('');
  const [notes, setNotes] = useState('');
  const [ageConfirmed, setAgeConfirmed] = useState(false);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [confirmedBooking, setConfirmedBooking] = useState(null);

  // Stable client request id for idempotency
  const clientRequestIdRef = useRef(`tbl_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`);

  // Prefill details from authenticated user
  useEffect(() => {
    if (user) {
      if (!guestName && user.name) setGuestName(user.name);
      if (!guestEmail && user.email && !user.email.toLowerCase().endsWith('@frcc.member')) setGuestEmail(user.email);
      const userPhone = user.phone || user.mobile || (!user.emailOrPhone?.includes('@') ? user.emailOrPhone : '');
      if (!guestMobile && userPhone) setGuestMobile(userPhone.replace(/\D/g, '').slice(-10));
    }
  }, [user]);

  const venue = useMemo(() => {
    return venues.find((v) => v.id === selectedVenueId) || venues[0];
  }, [selectedVenueId]);

  // Load available table slots whenever venue or date changes
  useEffect(() => {
    let mounted = true;
    setLoadingSlots(true);
    getTableSlots(venue.id, dateStr)
      .then((slots) => {
        if (mounted) {
          setSlotsList(slots);
          setLoadingSlots(false);
          // If previously selected slot is no longer available, clear it
          if (selectedSlot && !slots.some((s) => s.time === selectedSlot && s.available)) {
            setSelectedSlot('');
          }
        }
      })
      .catch(() => {
        if (mounted) setLoadingSlots(false);
      });
    return () => {
      mounted = false;
    };
  }, [venue.id, dateStr]);

  // Date validation: must be DD/MM/YYYY, between today and today + 30 days
  const dateError = useMemo(() => {
    const raw = String(dateStr || '').trim();
    if (!raw) return 'Please choose a date.';
    const iso = parseDMY(raw);
    if (!iso) return 'Enter date as DD/MM/YYYY.';
    const today = todayISO();
    const maxDate = getFutureDateISO(30);
    if (iso < today) return 'Date cannot be in the past.';
    if (iso > maxDate) return 'Bookings can only be made up to 30 days in advance.';
    return '';
  }, [dateStr]);

  const isGroupExceeded = guestsCount > 12;

  // Step 1 validation
  const canProceedStep1 = useMemo(() => {
    const slotItem = slotsList.find((s) => s.time === selectedSlot);
    return Boolean(
      selectedVenueId &&
      !dateError &&
      guestsCount >= 1 &&
      guestsCount <= 12 &&
      selectedSlot &&
      (!slotItem || slotItem.available) &&
      !isDiningSlotPast(dateStr, selectedSlot)
    );
  }, [selectedVenueId, dateError, guestsCount, selectedSlot, slotsList, dateStr]);

  // Step 2 validation
  function validateDetails() {
    const errs = {};
    if (!guestName.trim()) {
      errs.name = 'Full name is required.';
    } else if (!isValidName(guestName)) {
      errs.name = nameError('Full name');
    }
    const cleanPhone = normalizeMobile(guestMobile);
    if (!cleanPhone) {
      errs.mobile = 'Mobile number is required.';
    } else if (!isValidMobile(cleanPhone)) {
      errs.mobile = 'Enter a valid 10-digit mobile number starting with 6, 7, 8, or 9.';
    }
    const cleanEmail = guestEmail.trim().toLowerCase();
    if (!cleanEmail) {
      errs.email = 'Valid email is required.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      errs.email = 'Enter a valid email address.';
    }
    if (venue.minAge > 0 && !ageConfirmed) {
      errs.age = `You must confirm that you are ${venue.minAge} or older to book at ${venue.name}.`;
    }
    setErrors(errs);

    if (Object.keys(errs).length > 0) {
      const firstFieldId = errs.name
        ? 'details-name'
        : errs.mobile
        ? 'details-mobile'
        : errs.email
        ? 'details-email'
        : errs.age
        ? 'details-age-confirm'
        : null;
      if (firstFieldId) {
        setTimeout(() => {
          const el = document.getElementById(firstFieldId);
          if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            el.focus();
          }
        }, 10);
      }
      return false;
    }
    return true;
  }

  async function handleConfirmBooking() {
    if (submitting) return;
    if (!validateDetails()) return;
    if (isDiningSlotPast(dateStr, selectedSlot)) {
      const msg = 'Selected time slot has already passed. Please choose an upcoming time slot.';
      setErrors({ slot: msg, form: msg });
      setSelectedSlot('');
      setStep(1);
      getTableSlots(venue.id, dateStr).then(setSlotsList).catch(() => {});
      return;
    }
    setSubmitting(true);
    setErrors({});
    try {
      const cleanMob = normalizeMobile(guestMobile);
      const payload = {
        clientRequestId: clientRequestIdRef.current,
        userId: user?.id || null,
        venueId: venue.id,
        date: dateStr,
        time: selectedSlot,
        guests: guestsCount,
        name: guestName.trim(),
        mobile: cleanMob,
        email: guestEmail.trim().toLowerCase(),
        notes: (function() {
          const loc = `[Location: ${selectedCityId || 'vja'} | ${selectedCity?.name || 'Vijayawada'} | ${selectedVenueLocation?.areaName || 'Vijayawada Campus'} | ${selectedVenueLocation?.name || 'FRCC Clubhouse Dining'}]`;
          return notes.trim() ? `${notes.trim()} ${loc}` : loc;
        })(),
        ageConfirmed: Boolean(ageConfirmed),
        cityId: selectedCityId,
        cityName: selectedCity?.name || 'Vijayawada',
        venueLocationId: selectedVenueLocationId,
        venueLocationName: selectedVenueLocation?.name || 'FRCC Clubhouse Dining',
        areaName: selectedVenueLocation?.areaName || 'Vijayawada Campus',
        location: selectedVenueLocation?.displayName || selectedVenueLocation?.areaName || 'Vijayawada Campus',
      };
      const booking = await createTableBooking(payload);
      setConfirmedBooking(booking);
      setStep(3);
    } catch (err) {
      console.error('Failed to create table booking:', err);
      const msg = err?.message || 'Unable to reserve table. Please try again.';
      const lowerMsg = msg.toLowerCase();
      if (lowerMsg.includes('capacity') || lowerMsg.includes('seat') || lowerMsg.includes('not available') || lowerMsg.includes('passed') || lowerMsg.includes('past')) {
        setStep(1); // Return to Date & Time selection
        setErrors({ slot: msg, form: msg });
        getTableSlots(venue.id, dateStr).then(setSlotsList).catch(() => {});
      } else {
        setErrors({ form: msg });
      }
    } finally {
      setSubmitting(false);
    }
  }

  // Summary object for sticky sidebar
  const slotKey = `dining-${venue.id}`;
  const venueImage = IMAGES[slotKey] || { slot: slotKey, name: venue.name, alt: venue.name };

  const summary = {
    name: venue.name,
    image: venueImage,
    detail: venue.cuisine,
    isFree: true,
    rows: [
      { label: 'Location', value: selectedVenueLocation?.displayName || selectedVenueLocation?.areaName || 'Vijayawada Campus' },
      { label: 'Venue', value: venue.name },
      { label: 'Date', value: dateStr || '—' },
      { label: 'Time slot', value: selectedSlot || 'Not chosen' },
      { label: 'Guests', value: `${guestsCount} ${guestsCount === 1 ? 'Guest' : 'Guests'}` },
    ],
  };

  return (
    <FlowShell
      title="Table Booking"
      service={{ label: diningLabel, to: '/dining' }}
      steps={effectiveSteps}
      currentStep={step}
      summary={summary}
    >
      {/* STEP 0: VENUE */}
      {step === 0 && (
        <Card className="!p-6 sm:!p-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-100 pb-4 mb-6">
            <div>
              <h2 className="font-display text-xl sm:text-2xl font-bold text-navy-900">
                {hasPreselectedVenue && !showAllVenues ? 'Step 1: Your Selected Venue' : 'Step 1: Select Location & Venue'}
              </h2>
              <p className="mt-1 text-xs text-slate-500">
                {hasPreselectedVenue && !showAllVenues
                  ? `Selected: ${venue.name} (${venue.hours})`
                  : 'Select one of our five dining destinations on campus'}
              </p>
            </div>
            {hasPreselectedVenue && (
              <button
                type="button"
                onClick={() => setShowAllVenues((prev) => !prev)}
                className="text-xs font-semibold text-navy-900 underline hover:text-gold-600 self-start sm:self-auto cursor-pointer"
              >
                {showAllVenues ? 'Show only selected venue' : 'Change venue'}
              </button>
            )}
          </div>

          <LocationSelector
            locations={DINING_LOCATIONS}
            cityId={selectedCityId}
            venueId={selectedVenueLocationId}
            onCityChange={(nextCityId, cityObj, firstVenue) => {
              setSelectedCityId(nextCityId);
              if (firstVenue) setSelectedVenueLocationId(firstVenue.id);
            }}
            onVenueChange={(nextVenueId) => setSelectedVenueLocationId(nextVenueId)}
            cityLabel="Select City"
            venueLabel="Select Campus / Location"
          />

          <div className={`grid grid-cols-1 gap-4 ${hasPreselectedVenue && !showAllVenues ? 'max-w-md' : 'sm:grid-cols-2'}`}>
            {displayedVenues.map((v) => {
              const isSelected = selectedVenueId === v.id;
              const imgSlot = `dining-${v.id}`;
              const img = IMAGES[imgSlot] || { slot: imgSlot, name: v.name, alt: v.name };

              return (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => setSelectedVenueId(v.id)}
                  className={`text-left rounded-2xl border p-4 transition cursor-pointer flex flex-col justify-between ${
                    isSelected
                      ? 'border-2 border-gold-500 bg-gold-50/20 shadow-sm ring-1 ring-gold-500/30'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <div className="space-y-3">
                    <div className="relative overflow-hidden rounded-xl border border-slate-200">
                      <SmartImage image={img} aspect="16 / 9" sizes="300px" />
                      {v.minAge > 0 && (
                        <span className="absolute top-2 right-2 rounded bg-amber-500 px-2 py-0.5 text-[10px] font-bold text-navy-950">
                          21+
                        </span>
                      )}
                    </div>
                    <div>
                      <div className="flex items-center justify-between gap-1">
                        <h3 className="font-display text-base font-bold text-navy-900">{v.name}</h3>
                        <span className={`h-4 w-4 rounded-full border flex items-center justify-center shrink-0 ${isSelected ? 'border-gold-500 bg-gold-500' : 'border-slate-300'}`}>
                          {isSelected && <span className="h-1.5 w-1.5 rounded-full bg-white" />}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-1 line-clamp-2">{v.tagline}</p>
                      <p className="text-[11px] text-slate-400 mt-2">
                        <strong>Hours:</strong> {v.hours}
                      </p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          <div className="mt-8 flex justify-end border-t border-slate-100 pt-5">
            <button
              type="button"
              disabled={!selectedVenueId}
              onClick={() => setStep(1)}
              className="btn-base bg-gold-500 text-navy-950 hover:bg-gold-400 px-6 py-2.5 font-semibold text-sm inline-flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
            >
              Continue to Date &amp; Time <ArrowRightIcon className="h-4 w-4" />
            </button>
          </div>
        </Card>
      )}

      {/* STEP 1: DATE / TIME / GUESTS */}
      {step === 1 && (
        <Card className="!p-6 sm:!p-8">
          <div className="border-b border-slate-100 pb-4 mb-6">
            <h2 className="font-display text-xl sm:text-2xl font-bold text-navy-900">Date, Time &amp; Party Size</h2>
            <p className="mt-1 text-xs text-slate-500">Selected: <strong>{venue.name}</strong> ({venue.hours})</p>
          </div>

          <div className="space-y-6">
            {/* Date input */}
            <div>
              <label htmlFor="booking-date" className="label">Reservation Date (DD/MM/YYYY) *</label>
              <div className="relative max-w-sm">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                  <CalendarIcon className="h-4 w-4" />
                </span>
                <input
                  id="booking-date"
                  type="text"
                  placeholder="DD/MM/YYYY"
                  value={dateStr}
                  onChange={(e) => setDateStr(e.target.value)}
                  className={`field h-12 w-full !pl-10 text-sm ${dateError ? 'border-rose-400 focus:border-rose-500' : ''}`}
                />
              </div>
              {dateError && <p className="field-error mt-1">{dateError}</p>}
              <p className="caption mt-1">Bookings are accepted up to 30 days in advance.</p>
            </div>

            {/* Guests input */}
            <div>
              <label htmlFor="booking-guests" className="label">Number of Guests (1 to 12) *</label>
              <div className="relative max-w-sm">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                  <UsersIcon className="h-4 w-4" />
                </span>
                <select
                  id="booking-guests"
                  value={guestsCount}
                  onChange={(e) => setGuestsCount(Number(e.target.value))}
                  className="field h-12 w-full !pl-10 text-sm"
                >
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13].map((n) => (
                    <option key={n} value={n}>
                      {n > 12 ? 'More than 12 guests' : `${n} ${n === 1 ? 'Guest' : 'Guests'}`}
                    </option>
                  ))}
                </select>
              </div>

              {isGroupExceeded && (
                <div className="mt-3 rounded-xl border border-amber-300 bg-amber-50 p-3.5 text-xs text-amber-900 max-w-md">
                  <p className="font-semibold">For larger groups please contact us</p>
                  <p className="mt-0.5">Please call us directly at <a href={`tel:${phone.replace(/\s/g, '')}`} className="underline font-bold">{phone}</a> to arrange seating for groups larger than 12.</p>
                </div>
              )}
            </div>

            {/* Available time slots */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="label mb-0">Select Time Slot *</label>
                {loadingSlots && <span className="text-xs text-slate-400">Checking availability…</span>}
              </div>

              {slotsList.length === 0 && !loadingSlots ? (
                <p className="text-xs text-slate-500">No time slots available for the selected date.</p>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {slotsList.map((s) => {
                    const isSelected = selectedSlot === s.time;
                    return (
                      <button
                        key={s.id}
                        type="button"
                        disabled={!s.available || isGroupExceeded}
                        onClick={() => setSelectedSlot(s.time)}
                        className={`rounded-xl border p-3 text-left transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                          isSelected
                            ? 'border-2 border-gold-500 bg-gold-50/40 shadow-xs'
                            : 'border-slate-200 bg-white hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-center gap-1.5 font-bold text-sm text-navy-950">
                          <ClockIcon className="h-3.5 w-3.5 text-gold-500" />
                          <span>{s.time}</span>
                        </div>
                        <p className={`text-[11px] mt-1 font-medium ${s.available ? 'text-emerald-700' : 'text-slate-400'}`}>
                          {s.isPast ? 'Time passed' : s.available ? `${s.seatsLeft} seats left` : 'Full'}
                        </p>
                      </button>
                    );
                  })}
                </div>
              )}
              {!loadingSlots && slotsList.length > 0 && slotsList.every((s) => s.isPast) && (
                <p className="field-error mt-2" role="alert">
                  All time slots for today have already passed. Please select a future date.
                </p>
              )}
              {errors.slot && (
                <p className="field-error mt-2" role="alert">
                  {errors.slot}
                </p>
              )}
            </div>
          </div>

          <div className="mt-8 flex justify-between border-t border-slate-100 pt-5">
            <button
              type="button"
              onClick={() => setStep(0)}
              className="btn-base border border-slate-300 bg-white text-navy-900 hover:bg-slate-50 px-5 py-2.5 inline-flex items-center gap-1.5 cursor-pointer"
            >
              <ChevronLeftIcon className="h-4 w-4" /> Back
            </button>
            <button
              type="button"
              disabled={!canProceedStep1}
              onClick={() => setStep(2)}
              className="btn-base bg-gold-500 text-navy-950 hover:bg-gold-400 px-6 py-2.5 font-semibold text-sm inline-flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
            >
              Continue <ArrowRightIcon className="h-4 w-4" />
            </button>
          </div>
        </Card>
      )}

      {/* STEP 2: YOUR DETAILS */}
      {step === 2 && (
        <Card className="!p-6 sm:!p-8">
          <div className="border-b border-slate-100 pb-4 mb-6">
            <h2 className="font-display text-xl sm:text-2xl font-bold text-navy-900">Your Details</h2>
            <p className="mt-1 text-xs text-slate-500">Provide contact details to receive your booking confirmation</p>
          </div>

          <div className="space-y-4 max-w-xl">
            <div>
              <label htmlFor="details-name" className="label">Full Name *</label>
              <input
                id="details-name"
                type="text"
                placeholder="e.g. Ramesh Kumar"
                value={guestName}
                onChange={(e) => {
                  setGuestName(sanitizeNameInput(e.target.value));
                  if (errors.name) setErrors((prev) => ({ ...prev, name: null }));
                }}
                onBlur={(e) => setGuestName(normalizeName(e.target.value))}
                className={`field h-11 w-full text-sm ${errors.name ? 'border-rose-400' : ''}`}
              />
              {errors.name && <p className="field-error mt-1">{errors.name}</p>}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="details-mobile" className="label">Mobile Number (+91) *</label>
                <input
                  id="details-mobile"
                  name="mobile"
                  type="tel"
                  inputMode="numeric"
                  pattern="[6-9][0-9]{9}"
                  autoComplete="tel-national"
                  maxLength={10}
                  placeholder={INDIAN_MOBILE_PLACEHOLDER}
                  value={guestMobile}
                  onChange={(e) => {
                    setGuestMobile(sanitizeMobileInput(e.target.value));
                    if (errors.mobile) setErrors((prev) => ({ ...prev, mobile: null }));
                  }}
                  className={`field h-11 w-full text-sm ${errors.mobile ? 'border-rose-400' : ''}`}
                />
                {errors.mobile && <p className="field-error mt-1">{errors.mobile}</p>}
              </div>

              <div>
                <label htmlFor="details-email" className="label">Email Address *</label>
                <input
                  id="details-email"
                  type="email"
                  placeholder="name@example.com"
                  value={guestEmail}
                  onChange={(e) => {
                    setGuestEmail(e.target.value);
                    if (errors.email) setErrors((prev) => ({ ...prev, email: null }));
                  }}
                  className={`field h-11 w-full text-sm ${errors.email ? 'border-rose-400' : ''}`}
                />
                {errors.email && <p className="field-error mt-1">{errors.email}</p>}
              </div>
            </div>

            <div>
              <label htmlFor="details-notes" className="label">Special Requests / Notes (Optional)</label>
              <textarea
                id="details-notes"
                rows={3}
                placeholder="Seating preferences, anniversary, high chair, etc."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="field w-full p-3 text-sm"
              />
            </div>

            {/* Min Age requirement checkbox */}
            {venue.minAge > 0 && (
              <div className="pt-2">
                <label
                  htmlFor="details-age-confirm"
                  className={`flex items-start gap-3 cursor-pointer select-none rounded-xl border p-4 transition ${
                    errors.age ? 'border-rose-400 bg-rose-50/50' : 'border-amber-300 bg-amber-50/60'
                  }`}
                >
                  <input
                    type="checkbox"
                    id="details-age-confirm"
                    checked={ageConfirmed}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      setAgeConfirmed(checked);
                      if (checked) {
                        setErrors((prev) => {
                          const next = { ...prev };
                          delete next.age;
                          if (next.form && next.form.toLowerCase().includes('older')) {
                            delete next.form;
                          }
                          return next;
                        });
                      }
                    }}
                    className="mt-0.5 h-4 w-4 rounded border-amber-400 text-gold-600 focus:ring-gold-500 cursor-pointer"
                  />
                  <div className="text-xs text-amber-950">
                    <span className="font-semibold block">
                      I confirm I am {venue.minAge} or older and will carry a valid photo ID *
                    </span>
                    <span className="text-amber-800 text-[11px] block mt-0.5">
                      Entry to {venue.name} requires government-issued photo identification verifying age {venue.minAge}+.
                    </span>
                  </div>
                </label>
                {errors.age && (
                  <p id="details-age-err" className="field-error mt-1.5" role="alert">
                    {errors.age}
                  </p>
                )}
              </div>
            )}

            <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-3.5 text-xs text-emerald-900">
              <p className="font-semibold">Complimentary table reservation</p>
              <p className="mt-0.5 text-emerald-800">
                No reservation charges or deposits. Food and beverages will be billed at the venue.
              </p>
            </div>

            {errors.form && (
              <div
                id="details-form-err"
                className="rounded-xl border border-rose-300 bg-rose-50 p-4 text-xs text-rose-800 flex items-start justify-between gap-3"
                role="alert"
              >
                <div>
                  <p className="font-semibold text-sm">Reservation Failed</p>
                  <p className="mt-0.5">{errors.form}</p>
                </div>
                <button
                  type="button"
                  onClick={handleConfirmBooking}
                  disabled={submitting}
                  className="btn-base px-3.5 py-1.5 bg-rose-700 text-white hover:bg-rose-800 text-xs font-semibold rounded-lg shrink-0 transition"
                >
                  Retry
                </button>
              </div>
            )}
          </div>

          <div className="mt-8 flex justify-between border-t border-slate-100 pt-5">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="btn-base border border-slate-300 bg-white text-navy-900 hover:bg-slate-50 px-5 py-2.5 inline-flex items-center gap-1.5 cursor-pointer"
            >
              <ChevronLeftIcon className="h-4 w-4" /> Back
            </button>
            <button
              type="button"
              disabled={submitting}
              onClick={handleConfirmBooking}
              className="btn-base bg-gold-500 text-navy-950 hover:bg-gold-400 px-8 py-2.5 font-bold text-sm inline-flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition shadow-sm"
            >
              {submitting ? (
                <>
                  <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-navy-950 border-t-transparent" />
                  Confirming…
                </>
              ) : (
                'Confirm reservation'
              )}
            </button>
          </div>
        </Card>
      )}

      {/* STEP 3: CONFIRMATION */}
      {step === 3 && confirmedBooking && (
        <Card id="table-confirmation-card" className="text-center !p-8 sm:!p-10 max-w-xl mx-auto">
          <style>{`
            @media print {
              body * {
                visibility: hidden !important;
              }
              #table-confirmation-card, #table-confirmation-card * {
                visibility: visible !important;
              }
              #table-confirmation-card {
                position: absolute !important;
                left: 0 !important;
                top: 0 !important;
                width: 100% !important;
                margin: 0 !important;
                box-shadow: none !important;
                border: none !important;
              }
            }
          `}</style>

          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 mb-4">
            <CheckCircleIcon className="h-8 w-8" />
          </div>

          <p className="text-xs uppercase tracking-widest font-bold text-gold-600">Table Confirmed</p>
          <h2 className="font-display text-2xl sm:text-3xl font-bold text-navy-900 mt-1">
            Reservation Booked!
          </h2>
          <p className="mt-2 text-xs text-slate-500">
            Booking Reference:{' '}
            <strong className="text-navy-900 font-mono text-sm tracking-wide">
              {confirmedBooking.bookingRef}
            </strong>
          </p>

          {/* QR Code */}
          <div className="my-6 flex justify-center">
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm inline-block">
              <QRCodeSVG
                value={`FRCC:TABLE:${confirmedBooking.bookingRef}`}
                size={140}
                level="M"
                includeMargin={false}
              />
              <p className="mt-2 text-[10px] font-mono font-medium text-slate-400">
                FRCC:TABLE:{confirmedBooking.bookingRef}
              </p>
            </div>
          </div>

          {/* Details table */}
          <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4 text-left text-xs space-y-2 mb-6">
            <div className="flex justify-between">
              <span className="text-slate-500">Venue</span>
              <span className="font-bold text-navy-900">{confirmedBooking.venue_name || confirmedBooking.venueName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Location</span>
              <span className="font-semibold text-navy-900">{confirmedBooking.location || confirmedBooking.areaName || confirmedBooking.area_name || 'Vijayawada Campus'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Date</span>
              <span className="font-semibold text-navy-900">{confirmedBooking.date}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Time Slot</span>
              <span className="font-semibold text-navy-900">{confirmedBooking.time}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Guests</span>
              <span className="font-semibold text-navy-900">{confirmedBooking.guests}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Guest Name</span>
              <span className="font-semibold text-navy-900">{confirmedBooking.guest_name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Mobile</span>
              <span className="font-semibold text-navy-900">{confirmedBooking.guest_mobile}</span>
            </div>
            {stripDiningLocationTag(confirmedBooking.notes) && (
              <div className="flex justify-between">
                <span className="text-slate-500">Notes</span>
                <span className="font-semibold text-navy-900 truncate max-w-[200px]">{stripDiningLocationTag(confirmedBooking.notes)}</span>
              </div>
            )}
            <div className="flex justify-between border-t border-slate-200 pt-2">
              <span className="text-slate-500">Reservation Fee</span>
              <span className="font-bold text-emerald-700">Free</span>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3 print:hidden">
            <button
              type="button"
              onClick={() => window.print()}
              className="btn-base border border-slate-300 bg-white text-navy-900 hover:bg-slate-50 px-5 py-2.5 text-xs font-semibold inline-flex items-center gap-2 cursor-pointer"
            >
              <PrinterIcon className="h-4 w-4" /> Print pass
            </button>
            <Link
              to="/profile/bookings"
              className="btn-base bg-navy-900 text-white hover:bg-navy-800 px-5 py-2.5 text-xs font-semibold cursor-pointer"
            >
              View my bookings
            </Link>
            <Link
              to="/dining"
              className="btn-base border border-navy-900/20 text-navy-900 hover:bg-slate-100 px-5 py-2.5 text-xs font-semibold cursor-pointer"
            >
              Dining home
            </Link>
          </div>
        </Card>
      )}
    </FlowShell>
  );
}

export default TableBookingPage;
