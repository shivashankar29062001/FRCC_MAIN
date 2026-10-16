// ---------------------------------------------------------------------------
// /src/features/hotel/HotelPage.jsx — Stay Booking Flow & Landing Page
// ---------------------------------------------------------------------------

import { useState, useMemo, useEffect, useRef } from 'react';
import { useLocation, useSearchParams, Link } from 'react-router-dom';
import { useApp } from '../../app/store/AppContext.jsx';
import { ServiceHero } from '../../components/ServiceHero.jsx';
import { FlowShell } from '../../components/FlowShell.jsx';
import { Card } from '../../components/ui/feedback.jsx';
import { Button, Input, Select, LoadingButton } from '../../components/ui/controls.jsx';
import { SmartImage } from '../../components/ui/media.jsx';
import { roomSlot } from '../../config/images.js';
import { areas as HOTEL_AREAS, rooms as ALL_ROOMS, checkInTime, checkOutTime, cancellationPolicy } from '../../data/hotel.js';
import { memberDiscountPercent, whatsappNumber } from '../../config/site.js';
import { formatInr } from '../../utils/pricing.js';
import { formatDMY } from '../../utils/dates.js';
import { getRoomTypes, createBooking as createStayReservation, getAvailability } from '../../api/stay.js';
import { validateCoupon } from '../../services/couponService.js';
import { getUserMembership } from '../../services/membershipService.js';
import { QRCodeSVG } from 'qrcode.react';
import {
  CheckCircleIcon,
  ChevronLeftIcon,
  ArrowRightIcon,
  PrinterIcon,
} from '../../components/ui/icons.jsx';
import { LocationTrigger } from '../../components/location/LocationTrigger.jsx';

const STORAGE_KEY = 'frcc_stay_booking_draft';

const STEPS = [
  'Dates',
  'Guests',
  'Choose Room',
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
  const { user, isMember, pushToast, addBooking } = useApp();

  const isBookingFlow = location.pathname.startsWith('/book/') || location.pathname === '/stay/book';

  // Category filter state for rooms
  const [categoryFilter, setCategoryFilter] = useState('all');

  // Room types from API/database
  const [roomTypes, setRoomTypes] = useState(ALL_ROOMS);

  useEffect(() => {
    let mounted = true;
    getRoomTypes()
      .then((data) => {
        if (mounted && data && data.length > 0) {
          setRoomTypes(data);
        }
      })
      .catch((err) => {
        console.error('Failed to fetch room types:', err);
      });
    return () => {
      mounted = false;
    };
  }, []);

  const [confirmedBooking, setConfirmedBooking] = useState(() => {
    try {
      const raw = window.sessionStorage.getItem('frcc_stay_confirmed');
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  });

  // --- SessionStorage Draft State Initialization ---
  const [draft, setDraft] = useState(() => {
    let saved = null;
    try {
      const raw = window.sessionStorage.getItem(STORAGE_KEY);
      if (raw) saved = JSON.parse(raw);
    } catch {
      /* ignore */
    }

    let hasConfirmed = false;
    try {
      hasConfirmed = Boolean(window.sessionStorage.getItem('frcc_stay_confirmed'));
    } catch {
      /* ignore */
    }

    const itemParam = searchParams.get('item') || searchParams.get('room') || '';
    const initialRoom = itemParam
      ? ALL_ROOMS.find((r) => r.id === itemParam || r.type === itemParam)
      : null;

    const initialArea = searchParams.get('area') || initialRoom?.areaId || saved?.areaId || HOTEL_AREAS[0]?.id || 'vja';

    return {
      step: hasConfirmed ? 5 : (saved?.step !== undefined ? saved.step : 0),
      areaId: initialArea,
      checkin: searchParams.get('checkin') || saved?.checkin || getTodayISO(),
      checkout: searchParams.get('checkout') || saved?.checkout || getTomorrowISO(),
      adults: searchParams.get('adults') || saved?.adults || '2', // SAMPLE
      children: searchParams.get('children') || saved?.children || '0', // SAMPLE
      roomsCount: searchParams.get('rooms') || saved?.roomsCount || '1', // SAMPLE
      selectedRoomId: initialRoom?.id || saved?.selectedRoomId || (ALL_ROOMS.find((r) => r.areaId === initialArea)?.id || ALL_ROOMS[0]?.id),
      name: saved?.name || user?.name || '',
      mobile: saved?.mobile || user?.mobile || (user?.emailOrPhone && !user.emailOrPhone.includes('@') ? user.emailOrPhone : ''),
      email: saved?.email || user?.email || (user?.emailOrPhone && user.emailOrPhone.includes('@') ? user.emailOrPhone : ''),
      specialRequest: saved?.specialRequest || '', // SAMPLE
      paymentMethod: saved?.paymentMethod || 'upi',
    };
  });

  const [paying, setPaying] = useState(false);

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

  const submittedRef = useRef(false);

  // Prefill guest details from signed-in user if not already set
  useEffect(() => {
    if (!user) return;
    setDraft((prev) => {
      const updates = {};
      if (!prev.name && user.name) updates.name = user.name;
      if (!prev.mobile) {
        const uMob = user.mobile || (user.emailOrPhone && !user.emailOrPhone.includes('@') ? user.emailOrPhone : '');
        if (uMob) updates.mobile = uMob.replace(/\D/g, '').slice(0, 10);
      }
      if (!prev.email) {
        const uEmail = user.email || (user.emailOrPhone && user.emailOrPhone.includes('@') ? user.emailOrPhone : '');
        if (uEmail) updates.email = uEmail;
      }
      return Object.keys(updates).length > 0 ? { ...prev, ...updates } : prev;
    });
  }, [user]);

  // Sync searchParams into draft if parameters arrive on navigation
  useEffect(() => {
    const itemParam = searchParams.get('item') || searchParams.get('room');
    const checkinParam = searchParams.get('checkin');
    const checkoutParam = searchParams.get('checkout');
    const adultsParam = searchParams.get('adults');
    const roomsParam = searchParams.get('rooms');

    const patch = {};
    if (checkinParam) patch.checkin = checkinParam;
    if (checkoutParam) patch.checkout = checkoutParam;
    if (adultsParam) patch.adults = adultsParam;
    if (roomsParam) patch.roomsCount = roomsParam;
    if (itemParam) {
      patch.selectedRoomId = itemParam;
    }
    if (Object.keys(patch).length > 0) {
      updateDraft(patch);
    }
  }, [searchParams]);

  const step = draft.step;
  const setStep = (newStep) => updateDraft({ step: newStep });

  // Handle check-in change: auto set check-out to next day
  function handleCheckinChange(val) {
    const patch = { checkin: val };
    const dIn = new Date(val);
    if (!isNaN(dIn.getTime())) {
      const nextDay = new Date(dIn);
      nextDay.setDate(dIn.getDate() + 1);
      const nextDayISO = nextDay.toISOString().split('T')[0];

      if (!draft.checkout || new Date(draft.checkout) <= dIn) {
        patch.checkout = nextDayISO;
      } else {
        const n = calculateNights(val, draft.checkout);
        if (n > 30) {
          patch.checkout = nextDayISO;
        }
      }
    }
    updateDraft(patch);
  }

  // Live Availability for Step 3
  const [availabilityRooms, setAvailabilityRooms] = useState([]);
  const [availabilityLoading, setAvailabilityLoading] = useState(false);

  useEffect(() => {
    if (draft.checkin && draft.checkout) {
      setAvailabilityLoading(true);
      getAvailability(draft.checkin, draft.checkout)
        .then((rooms) => {
          if (rooms && rooms.length > 0) {
            setAvailabilityRooms(rooms);
          }
        })
        .catch((err) => {
          console.error('Failed to get room availability:', err);
        })
        .finally(() => {
          setAvailabilityLoading(false);
        });
    }
  }, [draft.checkin, draft.checkout]);

  const displayRooms = useMemo(() => {
    if (availabilityRooms.length > 0) return availabilityRooms;
    return roomTypes.map((r) => ({
      ...r,
      available: r.rooms_total || r.roomsTotal || 10,
    }));
  }, [availabilityRooms, roomTypes]);

  const selectedRoom = useMemo(() => {
    return displayRooms.find((r) => r.id === draft.selectedRoomId) || displayRooms[0] || ALL_ROOMS[0];
  }, [displayRooms, draft.selectedRoomId]);

  // Coupon state
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [showCouponInput, setShowCouponInput] = useState(false);
  const [couponInput, setCouponInput] = useState('');
  const [couponError, setCouponError] = useState('');
  const [validatingCoupon, setValidatingCoupon] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [submitError, setSubmitError] = useState('');

  // Active membership verification from database
  const [hasDbMembership, setHasDbMembership] = useState(false);

  useEffect(() => {
    let mounted = true;
    getUserMembership(user?.id)
      .then((m) => {
        if (mounted && m && (m.status === 'active' || m.status === 'Active' || m.status === 'confirmed')) {
          setHasDbMembership(true);
        } else if (mounted) {
          setHasDbMembership(Boolean(isMember));
        }
      })
      .catch(() => {
        if (mounted) setHasDbMembership(Boolean(isMember));
      });
    return () => {
      mounted = false;
    };
  }, [user?.id, isMember]);

  const isEffectiveMember = hasDbMembership || isMember;
  const COUPON_ENABLED = typeof import.meta !== 'undefined' && import.meta.env?.VITE_ENABLE_TEST_COUPON !== 'false';

  async function handleApplyCoupon() {
    const code = couponInput.trim();
    if (!code) return;
    setValidatingCoupon(true);
    setCouponError('');
    setSubmitError('');

    try {
      const res = await validateCoupon(code);
      if (res.valid) {
        setAppliedCoupon(res);
        setShowCouponInput(false);
        setCouponInput('');
        pushToast(`Coupon ${res.code} applied! ${res.percent_off}% off.`);
      } else {
        setCouponError(res.error || 'Invalid or expired coupon code.');
      }
    } catch {
      setCouponError('Unable to validate coupon. Please try again.');
    } finally {
      setValidatingCoupon(false);
    }
  }

  function handleRemoveCoupon() {
    setAppliedCoupon(null);
    setCouponError('');
    pushToast('Coupon removed.');
  }

  // Pricing calculations
  const nights = useMemo(
    () => calculateNights(draft.checkin, draft.checkout),
    [draft.checkin, draft.checkout]
  );

  const pricePerNight = selectedRoom?.price_per_night || selectedRoom?.pricePerNight || 2500;
  const basePrice = pricePerNight * nights * Number(draft.roomsCount || 1);
  const memberDiscount = isEffectiveMember ? Math.round(basePrice * (memberDiscountPercent / 100)) : 0;
  const afterMember = Math.max(0, basePrice - memberDiscount);
  const couponDiscount = appliedCoupon ? Math.round(afterMember * ((appliedCoupon.percent_off || 100) / 100)) : 0;
  const total = Math.max(0, afterMember - couponDiscount);

  // Live Summary Card for FlowShell
  const staySummary = useMemo(() => {
    return {
      name: selectedRoom?.name || 'Hotel Room',
      image: { ...roomSlot(selectedRoom?.id || selectedRoom?.type), slot: `room-${selectedRoom?.id || 'standard'}` },
      detail: `Vijayawada Campus · ${draft.roomsCount} Room${Number(draft.roomsCount) > 1 ? 's' : ''}`,
      date: draft.checkin && draft.checkout ? `${formatDMY(draft.checkin)} – ${formatDMY(draft.checkout)}` : undefined,
      slot: `${nights} Night${nights > 1 ? 's' : ''}`,
      guests: `${draft.adults} Adults${Number(draft.children) > 0 ? `, ${draft.children} Children` : ''}`,
      location: 'Vijayawada Campus · Riverfront Hotel',
      locationId: 'vja-hotel',
      price: basePrice,
      memberDiscount: memberDiscount > 0 ? memberDiscount : undefined,
      couponDiscount: couponDiscount > 0 ? couponDiscount : undefined,
      total,
    };
  }, [selectedRoom, draft.roomsCount, draft.checkin, draft.checkout, nights, draft.adults, draft.children, basePrice, memberDiscount, couponDiscount, total]);

  // Step 1 Validation (Dates)
  const isStep1Valid = useMemo(() => {
    if (!draft.checkin || !draft.checkout) return false;
    const d1 = new Date(draft.checkin);
    const d2 = new Date(draft.checkout);
    const today = new Date(getTodayISO());
    if (d1 < today) return false;
    if (d2 <= d1) return false;
    const n = calculateNights(draft.checkin, draft.checkout);
    return n >= 1 && n <= 30;
  }, [draft.checkin, draft.checkout]);

  const step1Error = useMemo(() => {
    if (!draft.checkin) return 'Please choose a check-in date.';
    if (!draft.checkout) return 'Please choose a check-out date.';
    const d1 = new Date(draft.checkin);
    const d2 = new Date(draft.checkout);
    const today = new Date(getTodayISO());
    if (d1 < today) return 'Check-in date cannot be in the past.';
    if (d2 <= d1) return 'Check-out date must be after check-in date.';
    const n = calculateNights(draft.checkin, draft.checkout);
    if (n < 1) return 'Minimum stay is 1 night.';
    if (n > 30) return 'Maximum stay is 30 nights.';
    return null;
  }, [draft.checkin, draft.checkout]);

  // Step 2 Validation (Guests)
  const isStep2Valid = useMemo(() => {
    const a = Number(draft.adults);
    const c = Number(draft.children);
    const r = Number(draft.roomsCount);
    return a >= 1 && a <= 10 && c >= 0 && c <= 6 && r >= 1 && r <= 5;
  }, [draft.adults, draft.children, draft.roomsCount]);

  const step2Errors = useMemo(() => {
    const errs = {};
    const a = Number(draft.adults);
    const c = Number(draft.children);
    const r = Number(draft.roomsCount);
    if (isNaN(a) || a < 1 || a > 10) errs.adults = 'Choose between 1 and 10 adults.';
    if (isNaN(c) || c < 0 || c > 6) errs.children = 'Choose between 0 and 6 children.';
    if (isNaN(r) || r < 1 || r > 5) errs.rooms = 'Choose between 1 and 5 rooms.';
    return errs;
  }, [draft.adults, draft.children, draft.roomsCount]);

  // Step 3 Validation (Choose room & capacity check)
  const selectedMaxGuests = selectedRoom?.max_guests || selectedRoom?.maxGuests || 2;
  const maxRoomCapacity = selectedMaxGuests * Number(draft.roomsCount || 1);
  const totalPartySize = Number(draft.adults || 1) + Number(draft.children || 0);
  const fitsParty = totalPartySize <= maxRoomCapacity;
  const isSelectedSoldOut = Boolean(selectedRoom && selectedRoom.available === 0);

  const isStep3Valid = Boolean(draft.selectedRoomId && !isSelectedSoldOut && fitsParty);

  // Step 4 Validation (Guest details)
  const isStep4Valid = useMemo(() => {
    const cleanMobile = draft.mobile.replace(/\D/g, '');
    const validEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(draft.email.trim());
    const validSpecial = (draft.specialRequest || '').length <= 300;
    return Boolean(draft.name.trim()) && cleanMobile.length === 10 && validEmail && validSpecial;
  }, [draft.name, draft.mobile, draft.email, draft.specialRequest]);

  // Payment Handler
  async function handlePay() {
    if (paying || submittedRef.current) return;
    submittedRef.current = true;
    setPaying(true);
    setSubmitError('');

    try {
      // Double click / refresh idempotency ID
      const clientRequestId = typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `stay_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

      const year = new Date().getFullYear();
      const random6 = String(Math.floor(100000 + Math.random() * 900000));
      const fallbackBookingRef = `FRCC-S-${year}-${random6}`;

      // If total > 0, simulate mock payment processing
      if (total > 0) {
        // TODO-RAZORPAY: order creation and verification will go here
        await new Promise((resolve) => setTimeout(resolve, 1500));
      }

      const isTestBooking = Boolean(appliedCoupon?.is_test || appliedCoupon);

      const bookingPayload = {
        clientRequestId,
        userId: user?.id || null,
        roomTypeId: selectedRoom.id,
        checkIn: draft.checkin,
        checkOut: draft.checkout,
        rooms: Number(draft.roomsCount || 1),
        adults: Number(draft.adults || 1),
        children: Number(draft.children || 0),
        guestName: draft.name,
        guestMobile: draft.mobile,
        guestEmail: draft.email,
        specialRequest: draft.specialRequest || null,
        paymentMethod: total === 0 ? 'coupon' : draft.paymentMethod,
        couponCode: appliedCoupon?.code || null,
        couponDiscount,
        isMember: isEffectiveMember,
        isMockPaid: true,
        isTest: isTestBooking,
        total,
      };

      let created = null;
      try {
        created = await createStayReservation(bookingPayload);
      } catch (err) {
        submittedRef.current = false;
        const errMsg = (err?.message || '').toLowerCase();
        if (errMsg.includes('availability') || errMsg.includes('insufficient') || errMsg.includes('unavailable') || errMsg.includes('sold out')) {
          setSubmitError('The selected room is no longer available for your chosen dates. Please choose another room.');
          setStep(2);
          pushToast('Room became unavailable. Please choose another room.');
          return;
        }
        setSubmitError(err?.message || 'Failed to complete booking. Please try again.');
        pushToast(err?.message || 'Booking submission failed.');
        return;
      }

      const bookingRef = created?.booking_ref || created?.bookingRef || fallbackBookingRef;
      const bookingId = created?.id || bookingRef;

      const confirmationRecord = {
        id: bookingId,
        bookingId,
        bookingRef,
        category: 'hotel',
        title: selectedRoom.name,
        roomName: selectedRoom.name,
        roomId: selectedRoom.id,
        areaName: 'Vijayawada',
        checkin: draft.checkin,
        checkout: draft.checkout,
        date: draft.checkin,
        nights,
        roomsCount: draft.roomsCount,
        guests: `${draft.adults} Adults${Number(draft.children) > 0 ? `, ${draft.children} Children` : ''}`,
        guestName: draft.name,
        userName: draft.name,
        mobile: draft.mobile,
        email: draft.email,
        basePrice,
        subtotal: basePrice,
        memberDiscount,
        couponCode: appliedCoupon?.code || null,
        couponDiscount,
        amount: total,
        total,
        paymentMethod: total === 0 ? 'coupon' : draft.paymentMethod,
        isMember: isEffectiveMember,
        is_test: isTestBooking,
        status: 'confirmed',
        createdAt: new Date().toISOString(),
      };

      try {
        window.sessionStorage.setItem('frcc_stay_confirmed', JSON.stringify(confirmationRecord));
        window.sessionStorage.removeItem(STORAGE_KEY);
      } catch {
        /* ignore */
      }

      if (addBooking) {
        await addBooking(confirmationRecord);
      }

      setConfirmedBooking(confirmationRecord);
      setStep(5);
      pushToast('Room booked successfully! Welcome to FRCC.');
    } catch (err) {
      submittedRef.current = false;
      console.error('Stay reservation error:', err);
      const msg = err?.message || 'Failed to complete reservation. Please try again.';
      setSubmitError(msg);
      pushToast(msg);
    } finally {
      setPaying(false);
    }
  }

  // WhatsApp Link Builder
  const waUrl = useMemo(() => {
    if (!confirmedBooking) return '#';
    const cleanDigits = String(confirmedBooking.mobile || '').replace(/\D/g, '').slice(-10);
    const targetDigits = cleanDigits ? `91${cleanDigits}` : String(whatsappNumber || '917893616262').replace(/\D/g, '');

    const msg = `*FRCC Stay Reservation*\nBooking ID: ${confirmedBooking.id}\nRoom: ${confirmedBooking.roomName}\nLocation: ${confirmedBooking.areaName}\nCheck-in: ${formatDMY(confirmedBooking.checkin)}\nCheck-out: ${formatDMY(confirmedBooking.checkout)} (${confirmedBooking.nights} night${confirmedBooking.nights > 1 ? 's' : ''})\nGuests: ${confirmedBooking.guests}\nTotal Paid: ${formatInr(confirmedBooking.total)}\n\nShow this confirmation at the front desk.`;

    return `https://wa.me/${targetDigits}?text=${encodeURIComponent(msg)}`;
  }, [confirmedBooking]);

  // -------------------------------------------------------------------------
  // Stay Landing Page Mode
  // -------------------------------------------------------------------------
  if (!isBookingFlow) {
    const defaultCheckin = searchParams.get('checkin') || draft.checkin || getTodayISO();
    const defaultCheckout = searchParams.get('checkout') || draft.checkout || getTomorrowISO();

    const filteredLandingRooms = categoryFilter === 'all'
      ? roomTypes
      : roomTypes.filter((r) => r.category === categoryFilter);

    return (
      <div className="min-h-screen bg-slate-50 text-slate-800">
        <ServiceHero service="stay" />

        <div id="content" className="container-x py-12 sm:py-16">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 border-b border-slate-200 pb-6">
            <div>
              <p className="eyebrow">Accommodations</p>
              <h2 className="h-section mt-1">Choose your room</h2>
              <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-slate-600">
                <span>Normal rooms ₹2,500 to ₹4,500 per night</span>
                <span className="text-slate-300">·</span>
                <span>Suites ₹4,500 to ₹10,000 per night</span>
              </div>
            </div>
            <LocationTrigger locationId="vja-hotel" className="text-xs text-navy-900 font-semibold hover:text-gold-600 inline-flex self-start sm:self-end">
              Vijayawada Campus · View on map
            </LocationTrigger>
          </div>

          {/* Filter Chips */}
          <div className="mt-6 flex flex-wrap gap-2 text-xs font-semibold">
            {[
              { id: 'all', label: 'All' },
              { id: 'normal', label: 'Normal rooms' },
              { id: 'suite', label: 'Suites' },
            ].map((f) => {
              const active = categoryFilter === f.id;
              return (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setCategoryFilter(f.id)}
                  className={`rounded-xl px-4 py-2 border transition ${
                    active
                      ? 'border-navy-900 bg-navy-900 text-white shadow-sm'
                      : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                  }`}
                >
                  {f.label}
                </button>
              );
            })}
          </div>

          {/* Room Cards from getRoomTypes() */}
          <div className="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredLandingRooms.map((room) => {
              const imageConfig = {
                ...roomSlot(room.id),
                slot: `room-${room.id}`,
                name: room.name,
                alt: room.name,
              };
              const bedType = room.bed_type || room.bedType || 'King Bed';
              const view = room.view || 'Garden View';
              const size = room.size_sqft || room.sizeSqft || 350;
              const maxGuests = room.max_guests || room.maxGuests || 2;
              const price = room.price_per_night || room.pricePerNight || 2500;
              const amenities = (room.amenities || []).slice(0, 3);

              return (
                <div
                  key={room.id}
                  className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm flex flex-col justify-between"
                >
                  <div>
                    <div className="h-48 overflow-hidden bg-slate-100">
                      <SmartImage
                        image={imageConfig}
                        aspect="16 / 10"
                        sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                      />
                    </div>
                    <div className="p-5">
                      <div className="flex items-center justify-between gap-2">
                        <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
                          room.category === 'suite' ? 'bg-gold-100 text-gold-900' : 'bg-slate-100 text-slate-700'
                        }`}>
                          {room.category === 'suite' ? 'Suite' : 'Normal room'}
                        </span>
                        <span className="text-xs text-slate-500 font-medium">Max {maxGuests} guests</span>
                      </div>

                      <h3 className="font-display text-lg font-bold text-navy-900 mt-2">{room.name}</h3>
                      <p className="text-xs text-slate-500 mt-0.5">{bedType} · {view} · {size} sq ft</p>
                      {room.description && (
                        <p className="text-xs text-slate-600 mt-3 line-clamp-2">{room.description}</p>
                      )}

                      {/* 3 amenity chips */}
                      <div className="mt-4 flex flex-wrap gap-1.5">
                        {amenities.map((am, i) => (
                          <span key={i} className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md font-medium">
                            {am}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="border-t border-slate-100 p-5 flex items-center justify-between bg-slate-50/50">
                    <div>
                      <span className="font-display text-xl font-bold text-navy-900">
                        {formatInr(price)}
                      </span>
                      <span className="text-xs text-slate-500 ml-1">/ night</span>
                    </div>
                    <Link
                      to={`/book/hotel?item=${encodeURIComponent(room.id)}&checkin=${defaultCheckin}&checkout=${defaultCheckout}`}
                      className="btn-base bg-gold-500 text-navy-950 hover:bg-gold-400 font-semibold px-4 py-2 text-xs rounded-xl transition shadow-sm inline-flex items-center justify-center"
                    >
                      Select room
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Campus Hotel Privileges */}
          <div className="mt-16 rounded-2xl border border-slate-200 bg-white p-6 sm:p-8">
            <h3 className="font-display text-lg font-bold text-navy-900">FRCC Riverfront Hospitality Privileges</h3>
            <p className="text-xs text-slate-500 mt-1">Included with every room and suite reservation at Vijayawada campus.</p>
            <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs font-medium text-slate-700">
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100">
                <span className="font-bold text-navy-900 block mb-1">Club Swimming Pool</span>
                Full campus pool access for registered guests
              </div>
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100">
                <span className="font-bold text-navy-900 block mb-1">Complimentary Breakfast</span>
                Daily breakfast buffet at Krishna dining hall
              </div>
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100">
                <span className="font-bold text-navy-900 block mb-1">High-Speed WiFi</span>
                Fiber internet across all rooms &amp; lounges
              </div>
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100">
                <span className="font-bold text-navy-900 block mb-1">Attended Parking</span>
                Complimentary parking space with 24x7 security
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------------------
  // Stay Booking Flow Mode
  // -------------------------------------------------------------------------
  return (
    <FlowShell
      service="stay"
      title="Book your stay"
      steps={STEPS}
      currentStep={step}
      onStepClick={(i) => {
        if (i < step && step < 5) setStep(i);
      }}
      summary={staySummary}
    >
      <div>
        {/* Step 1: Dates */}
        {step === 0 && (
          <Card>
            <p className="eyebrow">Step 1 · Stay Dates</p>
            <h2 className="h-sub mt-1">Select location and travel dates</h2>
            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-slate-600">
              <span>Choose your check-in and check-out dates (minimum 1, maximum 30 nights).</span>
              <LocationTrigger locationId="vja-hotel" className="text-xs text-navy-900 font-medium hover:text-gold-600 inline-flex">
                Vijayawada Campus · View on map
              </LocationTrigger>
            </div>

            <div className="mt-6 space-y-6">
              {/* Area selector — preselected and read-only while only one exists */}
              <div>
                <label className="label">Campus Location</label>
                <div className="mt-1.5 flex items-center justify-between rounded-xl border border-slate-200 bg-slate-100/90 px-4 py-3 text-sm font-semibold text-slate-800">
                  <div className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full bg-emerald-500"></span>
                    <span>Vijayawada Campus</span>
                  </div>
                  <span className="text-xs text-slate-500 font-normal">Preselected · Single location</span>
                </div>
              </div>

              {/* Dates Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <Input
                    label="Check-in Date (DD/MM/YYYY) *"
                    type="date"
                    min={getTodayISO()}
                    value={draft.checkin}
                    onChange={(e) => handleCheckinChange(e.target.value)}
                  />
                  {draft.checkin && (
                    <p className="text-[11px] text-slate-500 mt-1">Check-in: {formatDMY(draft.checkin)}</p>
                  )}
                </div>
                <div>
                  <Input
                    label="Check-out Date (DD/MM/YYYY) *"
                    type="date"
                    min={draft.checkin ? new Date(new Date(draft.checkin).getTime() + 86400000).toISOString().split('T')[0] : getTomorrowISO()}
                    value={draft.checkout}
                    onChange={(e) => updateDraft({ checkout: e.target.value })}
                  />
                  {draft.checkout && (
                    <p className="text-[11px] text-slate-500 mt-1">Check-out: {formatDMY(draft.checkout)}</p>
                  )}
                </div>
              </div>

              {/* Duration info & inline error */}
              <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-3.5 flex items-center justify-between text-sm">
                <span className="text-slate-600 font-medium">Calculated Stay Duration:</span>
                <span className="font-bold text-navy-900">
                  {nights} {nights === 1 ? 'night' : 'nights'}
                </span>
              </div>

              {step1Error && (
                <p role="alert" className="text-xs text-rose-600 font-semibold">{step1Error}</p>
              )}
            </div>

            <div className="mt-8 flex justify-end border-t border-slate-100 pt-5">
              <Button
                variant="primary"
                disabled={!isStep1Valid}
                onClick={() => setStep(1)}
                className="px-7 py-2.5 inline-flex items-center gap-1.5"
              >
                Next: Guests <ArrowRightIcon className="h-4 w-4" />
              </Button>
            </div>
          </Card>
        )}

        {/* Step 2: Guests */}
        {step === 1 && (
          <Card>
            <p className="eyebrow">Step 2 · Guests</p>
            <h2 className="h-sub mt-1">Party size &amp; room count</h2>
            <p className="mt-1 text-sm text-slate-600">Specify adults, children, and how many rooms you require.</p>

            <div className="mt-6 space-y-6 max-w-xl">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                <div>
                  <Select
                    label="Adults (1 to 10) *"
                    value={draft.adults}
                    onChange={(e) => updateDraft({ adults: e.target.value })}
                    options={Array.from({ length: 10 }, (_, i) => ({
                      value: String(i + 1),
                      label: `${i + 1} Adult${i > 0 ? 's' : ''}`,
                    }))}
                  />
                  {step2Errors.adults && (
                    <p className="text-[11px] text-rose-600 mt-1">{step2Errors.adults}</p>
                  )}
                </div>
                <div>
                  <Select
                    label="Children (0 to 6)"
                    value={draft.children}
                    onChange={(e) => updateDraft({ children: e.target.value })}
                    options={Array.from({ length: 7 }, (_, i) => ({
                      value: String(i),
                      label: `${i} Child${i !== 1 ? 'ren' : ''}`,
                    }))}
                  />
                  {step2Errors.children && (
                    <p className="text-[11px] text-rose-600 mt-1">{step2Errors.children}</p>
                  )}
                </div>
                <div>
                  <Select
                    label="Rooms (1 to 5) *"
                    value={draft.roomsCount}
                    onChange={(e) => updateDraft({ roomsCount: e.target.value })}
                    options={Array.from({ length: 5 }, (_, i) => ({
                      value: String(i + 1),
                      label: `${i + 1} Room${i > 0 ? 's' : ''}`,
                    }))}
                  />
                  {step2Errors.rooms && (
                    <p className="text-[11px] text-rose-600 mt-1">{step2Errors.rooms}</p>
                  )}
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs text-slate-600 space-y-1">
                <p className="font-semibold text-navy-900">
                  Total Party: {Number(draft.adults)} Adult{Number(draft.adults) > 1 ? 's' : ''}{Number(draft.children) > 0 ? `, ${draft.children} Child${Number(draft.children) > 1 ? 'ren' : ''}` : ''} across {draft.roomsCount} {Number(draft.roomsCount) > 1 ? 'Rooms' : 'Room'}
                </p>
                <p>Ensure chosen room fits your party size. Room capacity will be verified in Step 3.</p>
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
                Next: Choose Room <ArrowRightIcon className="h-4 w-4" />
              </Button>
            </div>
          </Card>
        )}

        {/* Step 3: Choose Room */}
        {step === 2 && (
          <Card>
            <p className="eyebrow">Step 3 · Choose Room</p>
            <h2 className="h-sub mt-1">Available rooms for your stay</h2>
            <p className="mt-1 text-sm text-slate-600">
              Showing availability for {formatDMY(draft.checkin)} to {formatDMY(draft.checkout)} ({nights} {nights === 1 ? 'night' : 'nights'}) · {draft.roomsCount} {Number(draft.roomsCount) > 1 ? 'rooms' : 'room'}.
            </p>

            {/* Category tabs */}
            <div className="mt-4 flex flex-wrap gap-2 text-xs font-semibold">
              {[
                { id: 'all', label: 'All' },
                { id: 'normal', label: 'Normal rooms' },
                { id: 'suite', label: 'Suites' },
              ].map((f) => {
                const active = categoryFilter === f.id;
                return (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setCategoryFilter(f.id)}
                    className={`rounded-xl px-4 py-2 border transition ${
                      active
                        ? 'border-navy-900 bg-navy-900 text-white shadow-sm'
                        : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                    }`}
                  >
                    {f.label}
                  </button>
                );
              })}
            </div>

            {/* Capacity Warning Banner */}
            {!fitsParty && selectedRoom && (
              <div className="mt-4 rounded-xl border border-amber-300 bg-amber-50 p-4 text-xs font-semibold text-amber-900">
                ⚠️ The selected &ldquo;{selectedRoom.name}&rdquo; fits up to {maxRoomCapacity} guests ({selectedMaxGuests} per room × {draft.roomsCount} room{Number(draft.roomsCount) > 1 ? 's' : ''}), but your party has {totalPartySize} guests ({draft.adults} adults{Number(draft.children) > 0 ? `, ${draft.children} children` : ''}). Please choose a larger room or add more rooms in Step 2.
              </div>
            )}

            {/* Availability / Submission Error Banner */}
            {submitError && (
              <div role="alert" className="mt-4 rounded-xl border border-rose-300 bg-rose-50 p-4 text-xs font-semibold text-rose-800">
                ⚠️ {submitError}
              </div>
            )}

            {availabilityLoading ? (
              <div className="py-12 text-center text-sm text-slate-500">Checking room availability…</div>
            ) : (
              <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
                {filteredStep3Rooms.map((room) => {
                  const isSelected = draft.selectedRoomId === room.id;
                  const availableCount = room.available ?? 1;
                  const isSoldOut = availableCount === 0;
                  const roomPricePerNight = room.price_per_night || room.pricePerNight || 2500;
                  const roomStayTotal = roomPricePerNight * nights * Number(draft.roomsCount || 1);
                  const roomMaxGuests = (room.max_guests || room.maxGuests || 2) * Number(draft.roomsCount || 1);
                  const roomFitsParty = totalPartySize <= roomMaxGuests;

                  return (
                    <div
                      key={room.id}
                      onClick={() => {
                        if (!isSoldOut) {
                          updateDraft({ selectedRoomId: room.id });
                          setSubmitError('');
                        }
                      }}
                      className={`rounded-2xl border p-4 transition ${
                        isSoldOut
                          ? 'border-slate-200 bg-slate-100/80 opacity-60 cursor-not-allowed'
                          : isSelected
                          ? 'cursor-pointer border-2 border-gold-500 bg-gold-50/20 shadow-sm ring-1 ring-gold-500/40'
                          : 'cursor-pointer border-slate-200 bg-white hover:border-gold-500/50'
                      }`}
                    >
                      <div>
                        <div className="h-40 overflow-hidden rounded-xl bg-slate-100">
                          <SmartImage
                            image={{
                              ...roomSlot(room.id),
                              slot: `room-${room.id}`,
                              name: room.name,
                              alt: room.name,
                            }}
                            aspect="16 / 10"
                            sizes="300px"
                          />
                        </div>

                        <div className="mt-3 flex items-start justify-between gap-2">
                          <h3 className="font-display text-base font-bold text-navy-900">{room.name}</h3>
                          {isSoldOut ? (
                            <span className="text-[10px] bg-slate-300 text-slate-700 font-bold px-2 py-0.5 rounded uppercase">
                              Sold out
                            </span>
                          ) : isSelected ? (
                            <span className="tag tag-gold !px-2 !py-0.5 !text-[10px]">Selected</span>
                          ) : null}
                        </div>

                        <p className="mt-1 text-xs text-slate-500">
                          {room.bed_type || room.bedType} · {room.view} · {room.size_sqft || room.sizeSqft} sq ft · Max {room.max_guests || room.maxGuests} guests/room
                        </p>

                        {!roomFitsParty && !isSoldOut && (
                          <p className="mt-1 text-[11px] font-semibold text-amber-700">
                            Fits max {roomMaxGuests} guests ({totalPartySize} needed)
                          </p>
                        )}

                        <div className="mt-2 flex flex-wrap gap-1">
                          {(room.amenities || []).slice(0, 3).map((am, idx) => (
                            <span key={idx} className="bg-slate-100 text-slate-600 text-[10px] px-2 py-0.5 rounded-md font-medium">
                              {am}
                            </span>
                          ))}
                        </div>
                      </div>

                      <div className="mt-4 flex items-baseline justify-between border-t border-slate-100 pt-3">
                        <span className={`text-xs font-semibold ${isSoldOut ? 'text-slate-400' : 'text-emerald-700'}`}>
                          {isSoldOut ? 'Sold out' : `${availableCount} ${availableCount === 1 ? 'room' : 'rooms'} left`}
                        </span>
                        <div className="text-right">
                          <div className="font-display font-bold text-navy-900">
                            {formatInr(roomStayTotal)}
                          </div>
                          <div className="text-[11px] text-slate-500">
                            {formatInr(roomPricePerNight)}/night · {nights}N · {draft.roomsCount}R
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

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
                Next: Guest Details <ArrowRightIcon className="h-4 w-4" />
              </Button>
            </div>
          </Card>
        )}

        {/* Step 4: Guest Details */}
        {step === 3 && (
          <Card>
            <p className="eyebrow">Step 4 · Guest Details</p>
            <h2 className="h-sub mt-1">Primary guest information</h2>
            <p className="mt-1 text-sm text-slate-600">Provide contact details for booking confirmation and check-in verification.</p>

            <div className="mt-6 max-w-xl space-y-5">
              <Input
                label="Full Name (as per government photo ID) *"
                value={draft.name}
                onChange={(e) => updateDraft({ name: e.target.value })}
                placeholder="e.g. Ramesh Kumar"
              />

              {/* Mobile with +91 indicator */}
              <div>
                <label className="label">Mobile Number *</label>
                <div className="mt-1.5 flex rounded-xl border border-slate-300 bg-white shadow-xs focus-within:border-gold-500 focus-within:ring-2 focus-within:ring-gold-500/20">
                  <span className="inline-flex items-center px-3.5 border-r border-slate-200 bg-slate-50 text-sm font-semibold text-slate-700 select-none rounded-l-xl">
                    +91
                  </span>
                  <input
                    type="tel"
                    value={draft.mobile}
                    onChange={(e) => updateDraft({ mobile: e.target.value.replace(/\D/g, '').slice(0, 10) })}
                    placeholder="9876543210"
                    maxLength={10}
                    className="block w-full rounded-r-xl border-0 py-2.5 px-3.5 text-sm text-navy-950 placeholder-slate-400 focus:outline-none focus:ring-0"
                  />
                </div>
                <p className="mt-1 text-[11px] text-slate-500">10-digit Indian mobile number</p>
              </div>

              <Input
                label="Email Address *"
                type="email"
                value={draft.email}
                onChange={(e) => updateDraft({ email: e.target.value })}
                placeholder="ramesh@example.com"
              />

              {/* Special Request */}
              <div>
                <div className="flex justify-between items-center">
                  <label className="label">Special Request (Optional)</label>
                  <span className={`text-[11px] font-medium ${(draft.specialRequest || '').length > 300 ? 'text-rose-600' : 'text-slate-500'}`}>
                    {(draft.specialRequest || '').length}/300 characters
                  </span>
                </div>
                <textarea
                  value={draft.specialRequest || ''}
                  onChange={(e) => updateDraft({ specialRequest: e.target.value.slice(0, 300) })}
                  maxLength={300}
                  placeholder="e.g. Early check-in preference, quiet high-floor room, extra towels"
                  rows={3}
                  className="input mt-1.5 resize-none text-sm"
                />
              </div>

              {/* Photo ID Note */}
              <div className="rounded-xl border border-blue-200 bg-blue-50/70 p-4 flex items-start gap-3 text-xs text-blue-900">
                <span className="text-base select-none">📌</span>
                <div>
                  <p className="font-semibold text-blue-950">Photo ID is checked at check-in</p>
                  <p className="mt-0.5 text-blue-800/90">
                    Photo ID is checked at check-in. FRCC does not collect government ID or Aadhaar numbers online.
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-8 flex justify-between border-t border-slate-100 pt-5">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="btn-base border border-slate-300 bg-white text-navy-900 hover:bg-slate-50 px-5 py-2.5 inline-flex items-center gap-1.5 cursor-pointer"
              >
                <ChevronLeftIcon className="h-4 w-4" /> Back
              </button>
              <Button
                variant="primary"
                disabled={!isStep4Valid}
                onClick={() => setStep(4)}
                className="px-7 py-2.5 inline-flex items-center gap-1.5 cursor-pointer"
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
            <h2 className="h-sub mt-1">Review reservation and payment</h2>
            <p className="mt-1 text-sm text-slate-600">Confirm stay details, review discounts, and complete reservation.</p>

            <div className="mt-6 max-w-xl space-y-6">
              {/* Summary of the Stay */}
              <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-5 space-y-3 text-sm">
                <h3 className="font-display font-bold text-navy-900 text-base border-b border-slate-200/80 pb-2">
                  Stay Summary
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <span className="text-xs text-slate-500 block">Room</span>
                    <span className="font-semibold text-navy-900">{selectedRoom.name}</span>
                  </div>
                  <div>
                    <span className="text-xs text-slate-500 block">Location</span>
                    <span className="font-semibold text-navy-900">Vijayawada Campus</span>
                  </div>
                  <div>
                    <span className="text-xs text-slate-500 block">Stay Dates</span>
                    <span className="font-semibold text-navy-900">
                      {formatDMY(draft.checkin)} – {formatDMY(draft.checkout)} ({nights} {nights === 1 ? 'night' : 'nights'})
                    </span>
                  </div>
                  <div>
                    <span className="text-xs text-slate-500 block">Rooms &amp; Guests</span>
                    <span className="font-semibold text-navy-900">
                      {draft.roomsCount} {Number(draft.roomsCount) > 1 ? 'Rooms' : 'Room'} · {draft.adults} Adults{Number(draft.children) > 0 ? `, ${draft.children} Children` : ''}
                    </span>
                  </div>
                  <div className="sm:col-span-2">
                    <span className="text-xs text-slate-500 block">Primary Guest</span>
                    <span className="font-semibold text-navy-900">{draft.name} · +91 {draft.mobile} · {draft.email}</span>
                  </div>
                  {draft.specialRequest && (
                    <div className="sm:col-span-2">
                      <span className="text-xs text-slate-500 block">Special Request</span>
                      <span className="text-slate-700 italic">&ldquo;{draft.specialRequest}&rdquo;</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Price lines */}
              <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-3 text-sm">
                <h3 className="font-display font-bold text-navy-900 text-base border-b border-slate-100 pb-2">
                  Price Breakdown
                </h3>
                <div className="flex justify-between items-center text-slate-700">
                  <span>
                    Room Rate ({formatInr(pricePerNight)} × {nights} {nights === 1 ? 'night' : 'nights'} × {draft.roomsCount} {Number(draft.roomsCount) > 1 ? 'rooms' : 'room'})
                  </span>
                  <span className="font-semibold text-navy-900">{formatInr(basePrice)}</span>
                </div>

                {memberDiscount > 0 && (
                  <div className="flex justify-between items-center text-emerald-700">
                    <span className="flex items-center gap-1.5">
                      <span className="inline-block h-2 w-2 rounded-full bg-emerald-500" />
                      Member Discount (30% Active FRCC Membership)
                    </span>
                    <span className="font-semibold">− {formatInr(memberDiscount)}</span>
                  </div>
                )}

                {couponDiscount > 0 && (
                  <div className="flex justify-between items-center text-emerald-700">
                    <span className="flex items-center gap-1.5">
                      <span className="inline-block h-2 w-2 rounded-full bg-emerald-500" />
                      Coupon Discount ({appliedCoupon?.code})
                    </span>
                    <span className="font-semibold">− {formatInr(couponDiscount)}</span>
                  </div>
                )}

                <div className="flex justify-between items-center border-t border-slate-200 pt-3 text-base font-bold text-navy-900">
                  <span>Total Payable</span>
                  <span className="text-lg text-navy-950 font-display">{formatInr(total)}</span>
                </div>
              </div>

              {/* Coupon: reuse existing test coupon */}
              {COUPON_ENABLED && (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50/60 p-4">
                  {appliedCoupon ? (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center rounded-lg bg-emerald-100 px-2.5 py-1 text-xs font-bold text-emerald-800">
                          ✓ {appliedCoupon.code}
                        </span>
                        <span className="text-xs text-slate-600">
                          {appliedCoupon.percent_off}% discount applied (−{formatInr(couponDiscount)})
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={handleRemoveCoupon}
                        className="text-xs font-semibold text-rose-600 hover:text-rose-800 cursor-pointer"
                      >
                        Remove
                      </button>
                    </div>
                  ) : showCouponInput ? (
                    <div className="space-y-2">
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={couponInput}
                          onChange={(e) => {
                            setCouponInput(e.target.value.toUpperCase());
                            setCouponError('');
                            setSubmitError('');
                          }}
                          placeholder="Enter coupon code (e.g. FRCC-TEST-100)"
                          className="input text-sm uppercase flex-1"
                          disabled={validatingCoupon}
                          autoFocus
                        />
                        <button
                          type="button"
                          onClick={handleApplyCoupon}
                          disabled={validatingCoupon || !couponInput.trim()}
                          className="btn-base px-4 py-2 bg-navy-900 text-white text-xs font-semibold hover:bg-navy-800 disabled:opacity-50 cursor-pointer"
                        >
                          {validatingCoupon ? 'Checking…' : 'Apply'}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setShowCouponInput(false);
                            setCouponError('');
                          }}
                          className="px-2 text-xs text-slate-500 hover:text-navy-900 cursor-pointer"
                        >
                          Cancel
                        </button>
                      </div>
                      {couponError && (
                        <p className="text-xs text-rose-600 font-medium">{couponError}</p>
                      )}
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setShowCouponInput(true)}
                      className="text-sm font-semibold text-gold-700 hover:text-gold-800 underline underline-offset-4 cursor-pointer"
                    >
                      Have a coupon?
                    </button>
                  )}
                </div>
              )}

              {/* Cancellation Policy */}
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs text-slate-600 space-y-1">
                <p className="font-semibold text-navy-900">Cancellation Policy</p>
                <p>{cancellationPolicy}</p>
              </div>

              {/* Required Terms Checkbox */}
              <label className="flex items-start gap-3 cursor-pointer select-none">
                <input
                  type="checkbox"
                  id="accept-terms"
                  checked={termsAccepted}
                  onChange={(e) => setTermsAccepted(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-slate-300 text-gold-500 focus:ring-gold-500"
                />
                <span className="text-xs text-slate-700 font-medium leading-relaxed">
                  I accept the booking terms
                </span>
              </label>

              {/* Error banner if submission fails */}
              {submitError && (
                <div role="alert" className="rounded-xl border border-rose-300 bg-rose-50 p-4 text-sm text-rose-800">
                  <p className="font-semibold">Booking Error</p>
                  <p className="text-xs text-rose-700 mt-0.5">{submitError}</p>
                </div>
              )}

              {/* Payment Methods */}
              {total === 0 ? (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-4 text-xs text-emerald-900">
                  <p className="font-semibold">No payment required</p>
                  <p className="mt-0.5 text-emerald-800">
                    100% discount applied. Click &ldquo;Confirm booking&rdquo; below to complete your reservation.
                  </p>
                </div>
              ) : (
                <div>
                  <label className="label">Select Payment Method *</label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-2">
                    {[
                      { id: 'upi', label: 'UPI / QR', desc: 'Google Pay, PhonePe, Paytm' },
                      { id: 'card', label: 'Credit / Debit Card', desc: 'Visa, Mastercard, RuPay' },
                      { id: 'netbanking', label: 'Net Banking', desc: 'All major Indian banks' },
                    ].map((m) => {
                      const isSelected = draft.paymentMethod === m.id;
                      return (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => updateDraft({ paymentMethod: m.id })}
                          className={`p-3.5 rounded-xl border text-left transition cursor-pointer ${
                            isSelected
                              ? 'border-2 border-gold-500 bg-gold-50/30 shadow-xs ring-1 ring-gold-500/30'
                              : 'border-slate-200 bg-white hover:border-slate-300'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-sm text-navy-950">{m.label}</span>
                            <span className={`h-4 w-4 rounded-full border flex items-center justify-center ${isSelected ? 'border-gold-500 bg-gold-500' : 'border-slate-300'}`}>
                              {isSelected && <span className="h-1.5 w-1.5 rounded-full bg-white" />}
                            </span>
                          </div>
                          <p className="mt-1 text-[11px] text-slate-500">{m.desc}</p>
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
                onClick={() => setStep(3)}
                className="btn-base border border-slate-300 bg-white text-navy-900 hover:bg-slate-50 px-5 py-2.5 inline-flex items-center gap-1.5 cursor-pointer"
              >
                <ChevronLeftIcon className="h-4 w-4" /> Back
              </button>
              <LoadingButton
                variant={total === 0 ? 'primary' : 'gold'}
                loading={paying}
                loadingLabel={total === 0 ? 'Confirming booking…' : 'Processing payment…'}
                disabled={!termsAccepted || paying}
                onClick={handlePay}
                className="px-8 py-2.5 font-semibold cursor-pointer"
              >
                {total === 0 ? 'Confirm booking' : `Pay now · ${formatInr(total)}`}
              </LoadingButton>
            </div>
          </Card>
        )}

        {/* Step 6: Confirmation */}
        {step === 5 && confirmedBooking && (
          <Card id="stay-confirmation-card" className="text-center !p-8 sm:!p-10 max-w-xl mx-auto">
            <style>{`
              @media print {
                body * {
                  visibility: hidden !important;
                }
                #stay-confirmation-card, #stay-confirmation-card * {
                  visibility: visible !important;
                }
                #stay-confirmation-card {
                  position: absolute !important;
                  left: 0 !important;
                  top: 0 !important;
                  width: 100% !important;
                  margin: 0 !important;
                  padding: 24px !important;
                  border: 1px solid #e2e8f0 !important;
                  box-shadow: none !important;
                  background: #ffffff !important;
                }
                .no-print {
                  display: none !important;
                }
              }
            `}</style>

            <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-emerald-50 text-emerald-600">
              <CheckCircleIcon className="h-10 w-10" />
            </div>
            <h2 className="font-display text-2xl font-bold text-navy-900 mt-4">Room Booked Successfully</h2>
            <p className="mt-1 text-sm text-slate-600">
              Booking ID: <span className="font-mono font-bold text-navy-900">{confirmedBooking.bookingRef || confirmedBooking.id}</span>
            </p>

            {confirmedBooking.is_test && (
              <div className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-0.5 text-xs font-bold text-amber-900">
                <span>Test Booking (Coupon)</span>
              </div>
            )}

            {/* QR Code */}
            <div className="mt-6 flex flex-col items-center justify-center p-4 rounded-2xl border border-slate-200 bg-white shadow-xs max-w-xs mx-auto">
              <QRCodeSVG
                value={`FRCC:STAY:${confirmedBooking.bookingRef || confirmedBooking.id}`}
                size={140}
                level="M"
                includeMargin={true}
              />
              <span className="mt-2 text-[11px] font-mono text-slate-500">
                FRCC:STAY:{confirmedBooking.bookingRef || confirmedBooking.id}
              </span>
              <span className="text-[10px] text-slate-400 mt-0.5">Show QR at reception for express check-in</span>
            </div>

            {/* Stay Details Summary */}
            <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50/80 p-5 text-left text-sm space-y-2.5">
              <div className="flex justify-between">
                <span className="text-slate-500">Room</span>
                <span className="font-semibold text-navy-900">{confirmedBooking.roomName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Dates</span>
                <span className="font-semibold text-navy-900">
                  {formatDMY(confirmedBooking.checkin)} – {formatDMY(confirmedBooking.checkout)} ({confirmedBooking.nights} {confirmedBooking.nights === 1 ? 'night' : 'nights'})
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Guests</span>
                <span className="font-semibold text-navy-900">{confirmedBooking.guests}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Check-in / Check-out</span>
                <span className="font-semibold text-navy-900">{checkInTime} / {checkOutTime}</span>
              </div>
              <div className="flex justify-between border-t border-slate-200 pt-2 font-bold">
                <span className="text-navy-900">Total Paid</span>
                <span className="text-navy-900">{formatInr(confirmedBooking.total)}</span>
              </div>
            </div>

            {/* Cancellation Policy */}
            <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50/50 p-3.5 text-left text-xs text-slate-600">
              <span className="font-semibold text-navy-900 block mb-0.5">Cancellation Policy</span>
              <p>{cancellationPolicy}</p>
            </div>

            {/* Action Buttons (no-print) */}
            <div className="no-print mt-6 flex flex-col sm:flex-row justify-center gap-3">
              <button
                type="button"
                onClick={() => window.print()}
                className="btn-base border border-slate-300 bg-white text-navy-900 hover:bg-slate-50 font-semibold px-6 py-2.5 inline-flex items-center justify-center gap-2 cursor-pointer"
              >
                <PrinterIcon className="h-4 w-4" /> Print / Save as PDF
              </button>
              <a
                href={waUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-base bg-emerald-600 text-white hover:bg-emerald-700 font-semibold px-6 py-2.5 inline-flex items-center justify-center gap-2"
              >
                Send to WhatsApp
              </a>
            </div>

            {/* Navigation Links (no-print) */}
            <div className="no-print mt-6 border-t border-slate-100 pt-5 flex justify-center gap-6 text-sm font-semibold">
              <Link to="/profile/bookings" className="text-navy-900 hover:text-gold-600 transition">
                My bookings →
              </Link>
              <span className="text-slate-300">·</span>
              <Link to="/stay" className="text-slate-600 hover:text-navy-900 transition">
                Back to Stay
              </Link>
            </div>
          </Card>
        )}
      </div>
    </FlowShell>
  );
}

export default HotelPage;