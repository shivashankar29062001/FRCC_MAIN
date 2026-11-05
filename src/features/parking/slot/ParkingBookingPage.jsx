// ---------------------------------------------------------------------------
// /src/features/parking/slot/ParkingBookingPage.jsx
// The FRCC Parking Slot team's booking flow, merged into FRCC_MAIN as the
// parking booking page (/parking/book & /book/parking). Self-contained: its own 5-step stepper,
// independent campus slot grid (Blocks A–C, slots 01–50 per campus), vehicle details,
// schedule, review/payment and confirmation.
// ---------------------------------------------------------------------------

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useApp } from '../../../app/store/AppContext.jsx';
import { cancelBooking } from '../../../services/cancellationService.js';
import './ParkingBookingPage.css';
import BookingForm from './components/BookingForm.jsx';
import BookingConfirmation, { getMaskedContactDetails } from './components/BookingConfirmation.jsx';
import { isValidVehicleNumber, cleanVehicleNumber, VEHICLE_NUMBER_ERROR_MESSAGE } from '../../../utils/vehicle.js';
import {
  createBooking,
  generateBookingReference,
  submitBookingToAdmin,
  isBookingApiConfigured,
  BOOKING_STATUS,
  BOOKING_STATUS_CODE,
  cancelBookingToAdmin,
  isBookingCancelApiConfigured,
  fetchBookedSlotsFromSupabase,
  fetchParkingAvailability
} from './services/bookingService.js';

const generateInitialSlots = () => {
  const slots = [];
  const blocks = ['A', 'B', 'C'];
  blocks.forEach(block => {
    for (let i = 1; i <= 50; i++) {
      const num = i.toString().padStart(2, '0');
      slots.push({ id: `${block}${num}`, status: 'available' });
    }
  });
  return slots;
};

const INITIAL_SLOTS = generateInitialSlots();

const PARKING_CAMPUS_STORAGE_KEY = 'frcc_parking_selected_campus';
const BASE_CONFIRMED_BOOKINGS_STORAGE_KEY = 'frcc_parking_confirmed_bookings_v1';
const LEGACY_CONFIRMED_BOOKINGS_STORAGE_KEY = 'frcc:confirmedBookings';

// Remove legacy un-namespaced keys on startup
try {
  if (typeof window !== 'undefined' && window.sessionStorage) {
    window.sessionStorage.removeItem(LEGACY_CONFIRMED_BOOKINGS_STORAGE_KEY);
  }
} catch (_) {}

const getConfirmedBookingsKey = (userId = null) =>
  userId ? `${BASE_CONFIRMED_BOOKINGS_STORAGE_KEY}.${userId}` : BASE_CONFIRMED_BOOKINGS_STORAGE_KEY;

const retainConfirmedBooking = (booking, userId = null) => {
  try {
    const key = getConfirmedBookingsKey(userId);
    const raw = (typeof window !== 'undefined' && window.localStorage) ? window.localStorage.getItem(key) : null;
    const existing = raw ? JSON.parse(raw) : [];
    const updated = [...existing, booking];
    if (typeof window !== 'undefined') {
      if (window.localStorage) {
        window.localStorage.setItem(key, JSON.stringify(updated));
        window.localStorage.setItem('frcc_parking_bookings', JSON.stringify(updated));
      }
      if (window.sessionStorage) {
        window.sessionStorage.setItem(key, JSON.stringify(updated));
      }
      window.dispatchEvent(new CustomEvent('frcc:parking-bookings-changed', { detail: booking }));
    }
  } catch (_) {
    // Storage unavailable
  }
};

const updateRetainedBookingStatus = (booking, userId = null) => {
  try {
    const key = getConfirmedBookingsKey(userId);
    const raw = (typeof window !== 'undefined' && window.localStorage) ? window.localStorage.getItem(key) : null;
    const existing = raw ? JSON.parse(raw) : [];
    const reference = booking.bookingReference || booking.bookingId;
    const updated = existing.map((b) => {
      const ref = b.bookingReference || b.bookingId;
      if (ref === reference) {
        return {
          ...b,
          bookingStatus: BOOKING_STATUS.CANCELLED,
          bookingStatusCode: BOOKING_STATUS_CODE.CANCELLED,
          status: 'Cancelled',
          cancelledAt: new Date().toISOString()
        };
      }
      return b;
    });
    if (typeof window !== 'undefined') {
      if (window.localStorage) {
        window.localStorage.setItem(key, JSON.stringify(updated));
        window.localStorage.setItem('frcc_parking_bookings', JSON.stringify(updated));
      }
      if (window.sessionStorage) {
        window.sessionStorage.setItem(key, JSON.stringify(updated));
      }
      window.dispatchEvent(new CustomEvent('frcc:parking-bookings-changed', { detail: { bookingId: reference, status: 'CANCELLED' } }));
    }
  } catch (_) {
    // Storage unavailable
  }
};

const getInitialCampusInfo = (searchParams) => {
  const paramCampus = searchParams ? (searchParams.get('campus') || searchParams.get('campus_id')) : null;
  const paramCity = searchParams ? searchParams.get('city') : null;

  if (paramCampus) {
    const campusId = paramCampus.toLowerCase().includes('hyd') ? 'hyd' : 'vja';
    const city = campusId === 'hyd' ? 'Hyderabad' : 'Vijayawada';
    try {
      if (typeof window !== 'undefined' && window.sessionStorage) {
        window.sessionStorage.setItem(PARKING_CAMPUS_STORAGE_KEY, JSON.stringify({ campusId, city }));
      }
    } catch (_) {}
    return { campusId, city };
  }

  if (paramCity) {
    const campusId = paramCity.toLowerCase().includes('hyd') ? 'hyd' : 'vja';
    const city = campusId === 'hyd' ? 'Hyderabad' : 'Vijayawada';
    try {
      if (typeof window !== 'undefined' && window.sessionStorage) {
        window.sessionStorage.setItem(PARKING_CAMPUS_STORAGE_KEY, JSON.stringify({ campusId, city }));
      }
    } catch (_) {}
    return { campusId, city };
  }

  try {
    if (typeof window !== 'undefined' && window.sessionStorage) {
      const saved = window.sessionStorage.getItem(PARKING_CAMPUS_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed?.campusId && parsed?.city) return parsed;
      }
    }
  } catch (_) {}

  return { campusId: 'vja', city: 'Vijayawada' };
};

// 5 Active Workflow Steps as requested
const STEP_VEHICLE = 1;
const STEP_SLOT = 2;
const STEP_SCHEDULE = 3;
const STEP_PAYMENT = 4;
const STEP_CONFIRMATION = 5;
const STEP_DATE_TIME = STEP_SCHEDULE;

const getInitialCampusData = () => {
  let initialCity = 'Vijayawada';
  let initialCampusId = 'vja';
  let initialZoneId = 'vja-multi-level';
  let initialCampusKey = 'vijayawada';
  try {
    if (typeof window !== 'undefined') {
      const sp = new URLSearchParams(window.location.search);
      const campusParam = sp.get('campus') || sp.get('campus_id') || sp.get('city');
      const zoneParam = sp.get('zone_id');
      if (campusParam) {
        if (campusParam.toLowerCase().includes('hyd')) {
          initialCity = 'Hyderabad';
          initialCampusId = 'hyd';
          initialCampusKey = 'hyderabad';
          initialZoneId = zoneParam || 'hyd-multi-level';
        } else {
          initialCity = 'Vijayawada';
          initialCampusId = 'vja';
          initialCampusKey = 'vijayawada';
          initialZoneId = zoneParam || 'vja-multi-level';
        }
      } else {
        const savedCampus = window.sessionStorage?.getItem('frcc_parking_selected_campus');
        if (savedCampus) {
          const parsed = JSON.parse(savedCampus);
          if (parsed.city) initialCity = parsed.city;
          if (parsed.campusId) initialCampusId = parsed.campusId;
          if (parsed.campus) initialCampusKey = parsed.campus;
          if (parsed.zoneId) initialZoneId = parsed.zoneId;
        } else {
          const savedCity = window.sessionStorage?.getItem('frcc_parking_selected_city');
          if (savedCity === 'Hyderabad') {
            initialCity = 'Hyderabad';
            initialCampusId = 'hyd';
            initialCampusKey = 'hyderabad';
            initialZoneId = 'hyd-multi-level';
          }
        }
      }
    }
  } catch (_) {}
  return {
    city: initialCity,
    campusId: initialCampusId,
    campus: initialCampusKey,
    zoneId: initialZoneId
  };
};

export default function ParkingBookingPage() {
  const { user, pushToast, addBooking } = useApp();
  const [searchParams] = useSearchParams();
  const [confirmedBooking, setConfirmedBooking] = useState(null);

  const initialCampus = useMemo(() => getInitialCampusInfo(searchParams), [searchParams]);
  const [campusInfo, setCampusInfo] = useState(initialCampus);

  const [formData, setFormData] = useState(() => {
    const initCampus = getInitialCampusData();
    const info = getInitialCampusInfo(searchParams);
    const resolvedCity = info.city || initCampus.city;
    const resolvedCampusId = info.campusId || initCampus.campusId;
    const resolvedCampus = resolvedCampusId === 'hyd' ? 'hyderabad' : 'vijayawada';
    const resolvedZoneId = resolvedCampusId === 'hyd' ? 'hyd-multi-level' : 'vja-multi-level';

    let initDate = searchParams ? (searchParams.get('date') || '') : '';
    let initTime = searchParams ? (searchParams.get('time') || '') : '';
    let initDays = searchParams ? (searchParams.get('duration') || searchParams.get('days') || '') : '';

    return {
      city: resolvedCity,
      campus: resolvedCampus,
      campusId: resolvedCampusId,
      campus_id: resolvedCampusId,
      zoneId: resolvedZoneId,
      zone_id: resolvedZoneId,
      date: initDate,
      time: initTime,
      days: initDays,
      vehicleType: '',
      vehicleNumber: ''
    };
  });

  // Track searchParams changes if URL changes while on page
  useEffect(() => {
    const paramCampus = searchParams?.get('campus') || searchParams?.get('campus_id');
    const paramCity = searchParams?.get('city');
    if (paramCampus || paramCity) {
      const info = getInitialCampusInfo(searchParams);
      setCampusInfo(info);
      const isHyd = (info.campusId || '').includes('hyd') || (info.city || '').includes('Hyderabad');
      setFormData((prev) => ({
        ...prev,
        city: info.city,
        campus: isHyd ? 'hyderabad' : 'vijayawada',
        campusId: info.campusId,
        campus_id: info.campusId,
        zoneId: isHyd ? 'hyd-multi-level' : 'vja-multi-level',
        zone_id: isHyd ? 'hyd-multi-level' : 'vja-multi-level'
      }));
    }
  }, [searchParams]);

  // Slot statuses tracked independently per campus (Vijayawada and Hyderabad).
  // Each campus has its own 150-slot inventory (Blocks A-C, slots 01-50).
  const [slotStatuses, setSlotStatuses] = useState(() => ({
    vja: generateInitialSlots(),
    hyd: generateInitialSlots(),
  }));

  const effectiveCampus = (formData.campus_id || formData.campusId || campusInfo.campusId || 'vja').toLowerCase().includes('hyd') ? 'hyd' : 'vja';
  const effectiveCity = effectiveCampus === 'hyd' ? 'Hyderabad' : 'Vijayawada';
  const effectiveCampusName = effectiveCampus === 'hyd' ? 'Hyderabad Campus' : 'Vijayawada Campus';

  // Derive the currently displayed slots based on the selected campus.
  const slots = useMemo(
    () => slotStatuses[effectiveCampus] || slotStatuses.vja,
    [slotStatuses, effectiveCampus]
  );

  const [selectedSlot, setSelectedSlot] = useState(null);
  const [step, setStep] = useState(STEP_VEHICLE);

  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionState, setSubmissionState] = useState({ status: 'idle', error: '' });
  const [isCancelling, setIsCancelling] = useState(false);
  const [cancelSyncState, setCancelSyncState] = useState({ status: 'idle', error: '' });

  const submittingRef = useRef(false);
  const cancelInFlightRef = useRef(false);
  const pendingBookingRef = useRef(null);

  const apiConfigured = isBookingApiConfigured();

  // Preload selected campus from URL if navigated from /parking zone cards or sessionStorage
  useEffect(() => {
    try {
      const campusData = getInitialCampusData();
      setFormData((prev) => ({
        ...prev,
        city: campusData.city,
        campus: campusData.campus,
        campusId: campusData.campusId,
        campus_id: campusData.campusId,
        zoneId: campusData.zoneId,
        zone_id: campusData.zoneId
      }));
      window.sessionStorage?.setItem('frcc_parking_selected_city', campusData.city);
      window.sessionStorage?.setItem('frcc_parking_selected_campus', JSON.stringify(campusData));
    } catch (_) {}
  }, []);

  // Persist selected campus to sessionStorage
  useEffect(() => {
    if (formData.city) {
      try {
        window.sessionStorage?.setItem('frcc_parking_selected_city', formData.city);
        const campusId = formData.city.toLowerCase().includes('hyd') ? 'hyd' : 'vja';
        const campus = campusId === 'hyd' ? 'hyderabad' : 'vijayawada';
        window.sessionStorage?.setItem('frcc_parking_selected_campus', JSON.stringify({
          campusId,
          campus,
          city: formData.city,
          zoneId: formData.zoneId
        }));
      } catch (_) {}
    }
  }, [formData.city, formData.zoneId]);

  // Reset confirmation receipt if active user changes or logs out
  useEffect(() => {
    if (confirmedBooking) {
      const matches = user?.id && (confirmedBooking.userId === user.id || confirmedBooking.user_id === user.id || confirmedBooking.userId === user.userId);
      if (!matches) {
        setConfirmedBooking(null);
        setStep(STEP_VEHICLE);
      }
    }
  }, [user?.id, user?.userId, confirmedBooking]);

  // Advance / track stepper progress reactively based on completed steps
  useEffect(() => {
    if (confirmedBooking) {
      setStep(STEP_CONFIRMATION);
    } else if (!formData.vehicleType || !formData.vehicleNumber || formData.vehicleNumber.trim().length < 4) {
      setStep(STEP_VEHICLE);
    } else if (!selectedSlot) {
      setStep(STEP_SLOT);
    } else if (!formData.date || !formData.time || !formData.days) {
      setStep(STEP_SCHEDULE);
    } else {
      setStep(STEP_PAYMENT);
    }
  }, [
    confirmedBooking,
    formData.vehicleType,
    formData.vehicleNumber,
    selectedSlot,
    formData.date,
    formData.time,
    formData.days
  ]);

  // Synchronize slot occupancy dynamically from Database & Backend API per campus
  const refreshSlots = useCallback(() => {
    const cityKey = (formData.city || effectiveCampus || '').toLowerCase().includes('hyd') ? 'hyd' : 'vja';
    const campus = cityKey === 'hyd' ? 'hyderabad' : 'vijayawada';
    const activeDate = formData.date ? formData.date.trim() : '';
    const activeTime = formData.time ? formData.time.trim() : '';
    const activeDays = formData.days ? Number(formData.days) : '';

    fetchParkingAvailability(campus, activeDate, activeTime, activeDays).then((slotData) => {
      if (slotData && slotData.length > 0) {
        const bookedSet = new Set(slotData.filter((s) => s.status === 'booked').map((s) => s.id));
        setSlotStatuses((prev) => ({
          ...prev,
          [cityKey]: generateInitialSlots().map((s) => ({
            ...s,
            status: bookedSet.has(s.id) ? 'booked' : 'available',
          }))
        }));
      } else {
        setSlotStatuses((prev) => ({
          ...prev,
          [cityKey]: generateInitialSlots()
        }));
      }
    });
  }, [formData.city, formData.date, formData.time, formData.days, effectiveCampus]);

  useEffect(() => {
    refreshSlots();
  }, [refreshSlots]);

  // Clear selected slot when switching campus, date, time, or duration
  useEffect(() => {
    setSelectedSlot(null);
  }, [effectiveCampus, formData.city, formData.date, formData.time, formData.days]);

  const pricePerDay = 0;
  const numberOfDays = Number(formData.days) || 0;
  const amount = 0;

  const handleProceedToSlots = () => {
    const validationErrors = {};
    if (!formData.date || !formData.date.trim()) {
      validationErrors.date = 'Please select a booking date.';
    }
    if (!formData.time || !formData.time.trim()) {
      validationErrors.time = 'Please select a booking arrival time.';
    }
    if (!formData.days) {
      validationErrors.days = 'Please select number of days.';
    }

    if (Object.keys(validationErrors).length > 0) {
      setErrors((prev) => ({ ...prev, ...validationErrors }));
      const dtCard = document.getElementById('date-time-card');
      if (dtCard) {
        dtCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      return;
    }

    setErrors((prev) => {
      const next = { ...prev };
      delete next.date;
      delete next.time;
      delete next.days;
      return next;
    });

    setStep(STEP_SLOT);
    const slotEl = document.getElementById('parking-slot-selection-card');
    if (slotEl) {
      slotEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const handleSelectSlot = (slotId) => {
    if (confirmedBooking) return;

    // Validate that Date, Time, and Days are selected before allowing slot selection
    const missingErrors = {};
    if (!formData.date || !formData.date.trim()) {
      missingErrors.date = 'Please select a booking date.';
    }
    if (!formData.time || !formData.time.trim()) {
      missingErrors.time = 'Please select a booking arrival time.';
    }
    if (!formData.days) {
      missingErrors.days = 'Please select number of days.';
    }

    if (Object.keys(missingErrors).length > 0) {
      setErrors((prev) => ({ ...prev, ...missingErrors }));
      const dtElement = document.getElementById('date-time-card');
      if (dtElement) {
        dtElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      return;
    }

    if (!slotId) {
      setSelectedSlot(null);
      return;
    }

    const targetSlot = slots.find((s) => s.id === slotId);
    if (!targetSlot || targetSlot.status === 'booked') return;

    if (selectedSlot === slotId) {
      setSelectedSlot(null);
    } else {
      setSelectedSlot(slotId);
      if (errors.slot) {
        setErrors((prev) => ({ ...prev, slot: '' }));
      }
    }
  };

  const handleFormChange = (newFormData) => {
    setFormData(newFormData);
    const updatedErrors = { ...errors };

    // If vehicleNumber became valid, remove the validation error immediately
    if (newFormData.vehicleNumber && isValidVehicleNumber(newFormData.vehicleNumber)) {
      delete updatedErrors.vehicleNumber;
    } else if (newFormData.vehicleNumber && newFormData.vehicleNumber.length === 10 && !isValidVehicleNumber(newFormData.vehicleNumber)) {
      updatedErrors.vehicleNumber = VEHICLE_NUMBER_ERROR_MESSAGE;
    } else if (!newFormData.vehicleNumber) {
      delete updatedErrors.vehicleNumber;
    }

    Object.keys(newFormData).forEach((key) => {
      if (key !== 'vehicleNumber' && newFormData[key] && updatedErrors[key]) {
        delete updatedErrors[key];
      }
    });
    setErrors(updatedErrors);
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.vehicleType) {
      newErrors.vehicleType = 'Please select Two Wheeler or Four Wheeler.';
    }

    if (!formData.vehicleNumber || !formData.vehicleNumber.trim()) {
      newErrors.vehicleNumber = VEHICLE_NUMBER_ERROR_MESSAGE;
    } else {
      const clean = cleanVehicleNumber(formData.vehicleNumber);
      if (!isValidVehicleNumber(clean)) {
        newErrors.vehicleNumber = VEHICLE_NUMBER_ERROR_MESSAGE;
      }
    }

    if (!selectedSlot) {
      newErrors.slot = 'Please select an available parking slot from A01 to C50.';
    }

    if (!formData.date || !formData.date.trim()) {
      newErrors.date = 'Please select a booking date.';
    }

    if (!formData.time || !formData.time.trim()) {
      newErrors.time = 'Please select a booking arrival time.';
    }

    if (!formData.days) {
      newErrors.days = 'Please select number of days.';
    } else {
      const d = Number(formData.days);
      if (!d || d < 1 || d > 7) {
        newErrors.days = 'Please select the number of days (1 to 7).';
      }
    }

    return newErrors;
  };

  const commitConfirmedBooking = (booking) => {
    const campusKey = (booking.campus_id || booking.campus || booking.city || formData.city || effectiveCampus || '').toLowerCase().includes('hyd') ? 'hyd' : 'vja';

    setSlotStatuses((prevStatuses) => {
      const campusSlots = prevStatuses[campusKey] || [];
      const updatedSlots = campusSlots.map(
        (s) => (s.id === booking.parkingSlot ? { ...s, status: 'booked' } : s)
      );
      return {
        ...prevStatuses,
        [campusKey]: updatedSlots,
      };
    });

    retainConfirmedBooking(booking, user?.id);
    setConfirmedBooking(booking);
    setIsSubmitting(false);
    submittingRef.current = false;
    pendingBookingRef.current = null;
    setStep(STEP_CONFIRMATION);
    refreshSlots();

    const confirmationRecord = {
      ...booking,
      id: booking.bookingReference || booking.bookingId,
      bookingId: booking.bookingReference || booking.bookingId,
      bookingRef: booking.bookingReference || booking.bookingId,
      category: 'parking',
      title: `Parking Slot ${booking.parkingSlot}`,
      slot: booking.parkingSlot,
      parkingSlot: booking.parkingSlot,
      date: booking.bookingDateISO || booking.bookingDate,
      time: booking.arrivalTime || booking.bookingTime,
      areaName: booking.city?.toLowerCase().includes('hyd') ? 'Hyderabad Campus' : 'Vijayawada Campus',
      details: {
        vehicleType: booking.vehicleType,
        vehicleNumber: booking.vehicleNumber,
        vehicleModel: booking.vehicleModel,
        city: booking.city,
        durationDays: booking.numberOfDays,
      },
      amount: 0,
      total: 0,
      status: 'Confirmed',
      payment: {
        method: 'Complimentary Pass',
        amount: 0,
      },
    };
    if (addBooking) {
      addBooking(confirmationRecord).catch(() => {});
    }

    // Show booking confirmation notification with user's dynamic contact details
    if (typeof pushToast === 'function') {
      const { message } = getMaskedContactDetails(user, null, booking);
      pushToast(message);
    }

    setTimeout(() => {
      const el = document.getElementById('booking-confirmation-section');
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 100);
  };

  const finalizeBooking = (transactionId) => {
    if (submittingRef.current || confirmedBooking) return;

    const booking = createBooking({
      bookingReference: generateBookingReference(),
      userId: user?.id || user?.userId || null,
      user_id: user?.id || null,
      campus: formData.campus || (effectiveCampus === 'hyd' ? 'hyderabad' : 'vijayawada'),
      campus_id: effectiveCampus,
      zone_id: effectiveCampus === 'hyd' ? 'hyd-multi-level' : 'vja-multi-level',
      campusName: effectiveCampusName,
      location_id: effectiveCampus,
      city: formData.city || effectiveCity,
      parkingSlot: selectedSlot,
      vehicleType: formData.vehicleType,
      vehicleNumber: formData.vehicleNumber.trim(),
      numberOfDays,
      pricePerDay: 0,
      totalAmount: 0,
      bookingDate: formData.date,
      bookingTime: formData.time,
      paymentMethod: 'Demo',
      transactionId: transactionId || 'DEMO-TXN-' + Date.now()
    });

    pendingBookingRef.current = booking;
    submittingRef.current = true;
    setIsSubmitting(true);
    setSubmissionState({ status: 'submitting', error: '' });

    submitBookingToAdmin(booking)
      .then((res) => {
        setSubmissionState({ status: 'success', error: '' });
        commitConfirmedBooking({ ...booking, id: res?.data?.id || booking.bookingReference });
      })
      .catch((err) => {
        setIsSubmitting(false);
        submittingRef.current = false;
        if (err && (err.code === 'SLOT_TAKEN' || err.message?.includes('SLOT_TAKEN'))) {
          setErrors((prev) => ({ ...prev, slot: 'This slot was just booked' }));
          setSelectedSlot(null);
          setStep(STEP_SLOT);
          refreshSlots();
          setTimeout(() => {
            const slotEl = document.getElementById('parking-slot-selection-card');
            if (slotEl) slotEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }, 100);
          return;
        }
        const message = err && err.message ? err.message : 'Could not confirm booking with database.';
        setSubmissionState({ status: 'error', error: message });
        setErrors((prev) => ({ ...prev, payment: message }));
      });
  };

  const handleConfirmBooking = () => {
    if (confirmedBooking) return;

    const validationErrors = validateForm();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      const firstErrorKey = Object.keys(validationErrors)[0];
      let targetElement = null;
      if (firstErrorKey === 'vehicleType') {
        targetElement = document.getElementById('vehicle-type-select');
      } else if (firstErrorKey === 'vehicleNumber') {
        targetElement = document.getElementById('vehicle-number');
      } else if (firstErrorKey === 'slot') {
        targetElement = document.getElementById('parking-slot-selection-card');
      } else if (firstErrorKey === 'date' || firstErrorKey === 'time' || firstErrorKey === 'days') {
        targetElement = document.getElementById('date-time-card');
      }
      if (targetElement) {
        targetElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      return;
    }

    setErrors({});
    finalizeBooking('DEMO-TXN-' + Date.now());
  };

  const handleCancelBooking = () => {
    if (cancelInFlightRef.current || !confirmedBooking) return;
    if (
      confirmedBooking.bookingStatusCode === BOOKING_STATUS_CODE.CANCELLED ||
      confirmedBooking.bookingStatus === BOOKING_STATUS.CANCELLED
    ) {
      return;
    }

    cancelInFlightRef.current = true;
    setIsCancelling(true);

    const booking = confirmedBooking;
    const campusKey = (booking.campus_id || booking.campus || booking.city || formData.city || effectiveCampus || '').toLowerCase().includes('hyd') ? 'hyd' : 'vja';
    const releasedSlot = booking.parkingSlot;

    setSlotStatuses((prevStatuses) => {
      const campusSlots = prevStatuses[campusKey] || [];
      const updatedCampusSlots = campusSlots.map(
        (s) => (s.id === releasedSlot ? { ...s, status: 'available' } : s)
      );
      return {
        ...prevStatuses,
        [campusKey]: updatedCampusSlots,
      };
    });

    const cancelledBooking = {
      ...booking,
      bookingStatus: BOOKING_STATUS.CANCELLED,
      bookingStatusCode: BOOKING_STATUS_CODE.CANCELLED,
      cancelledAt: new Date().toISOString()
    };
    setConfirmedBooking(cancelledBooking);
    updateRetainedBookingStatus(cancelledBooking, user?.id);
    cancelBooking({
      bookingType: 'parking',
      bookingId: booking.bookingReference || booking.bookingId,
      bookingRef: booking.bookingReference,
    }).catch(() => {});

    setCancelSyncState({ status: 'syncing', error: '' });
    cancelBookingToAdmin(cancelledBooking)
      .then((res) => {
        setCancelSyncState({ status: res?.configured ? 'synced' : 'not_configured', error: '' });
        refreshSlots();
      })
      .catch((err) => {
        const message = err && err.message ? err.message : 'Could not reach the admin dashboard.';
        setCancelSyncState({ status: 'error', error: message });
      })
      .finally(() => {
        setIsCancelling(false);
        cancelInFlightRef.current = false;
        refreshSlots();
      });
  };

  const handleResetForm = () => {
    const campusData = getInitialCampusData();
    setFormData((prev) => ({
      city: prev.city || effectiveCity || campusData.city,
      campus: prev.campus || (effectiveCampus === 'hyd' ? 'hyderabad' : 'vijayawada'),
      campusId: prev.campusId || effectiveCampus,
      campus_id: prev.campus_id || effectiveCampus,
      zoneId: prev.zoneId || (effectiveCampus === 'hyd' ? 'hyd-multi-level' : 'vja-multi-level'),
      zone_id: prev.zone_id || (effectiveCampus === 'hyd' ? 'hyd-multi-level' : 'vja-multi-level'),
      date: '',
      time: '',
      days: '',
      vehicleType: '',
      vehicleNumber: ''
    }));
    setSelectedSlot(null);
    setErrors({});
    setConfirmedBooking(null);
    setSubmissionState({ status: 'idle', error: '' });
    pendingBookingRef.current = null;
    submittingRef.current = false;
    setIsSubmitting(false);
    setCancelSyncState({ status: 'idle', error: '' });
    setIsCancelling(false);
    cancelInFlightRef.current = false;
    setStep(STEP_VEHICLE);
  };

  const handleDone = () => {
    handleResetForm();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleBookAnotherSlot = () => {
    handleResetForm();
    setTimeout(() => {
      const el = document.getElementById('step-vehicle-details');
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      } else {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    }, 100);
  };

  return (
    <div className="booking-page">
      {/* 1. HERO SECTION */}
      <div className="hero-section">
        <div className="hero-content">
          <div className="hero-breadcrumb">
            <span>Home</span> &gt; <span>Parking Slot</span> &gt; <span>Booking</span>
          </div>
          <div className="hero-label">VEHICLE PARKING</div>
          <h1 className="hero-heading">Parking Slot Booking</h1>
          <p className="hero-description">Select parking slot, vehicle details, schedule, payment and confirmation.</p>
          <p className="hero-description">Quick and easy booking experience across campuses.</p>
        </div>
      </div>

      {/* 2. FIVE-STEP PROGRESS INDICATOR & CONTENT CONTAINER */}
      <div className="booking-main-container">
        <div className="stepper-section">
          <div className="stepper-row">
            <div className={`stepper-item ${step === 1 ? 'active' : step > 1 ? 'completed' : ''}`}>
              <div className="stepper-circle">1</div>
              <span className="stepper-label">Vehicle Details</span>
            </div>
            <div className={`stepper-line ${step > 1 ? 'completed' : ''}`} />

            <div className={`stepper-item ${step === 2 ? 'active' : step > 2 ? 'completed' : ''}`}>
              <div className="stepper-circle">2</div>
              <span className="stepper-label">Select Slot</span>
            </div>
            <div className={`stepper-line ${step > 2 ? 'completed' : ''}`} />

            <div className={`stepper-item ${step === 3 ? 'active' : step > 3 ? 'completed' : ''}`}>
              <div className="stepper-circle">3</div>
              <span className="stepper-label">Schedule</span>
            </div>
            <div className={`stepper-line ${step > 3 ? 'completed' : ''}`} />

            <div className={`stepper-item ${step === 4 ? 'active' : step > 4 ? 'completed' : ''}`}>
              <div className="stepper-circle">4</div>
              <span className="stepper-label">Payment</span>
            </div>
            <div className={`stepper-line ${step > 4 ? 'completed' : ''}`} />

            <div className={`stepper-item ${step === 5 ? 'active' : ''}`}>
              <div className="stepper-circle">5</div>
              <span className="stepper-label">Confirmation</span>
            </div>
          </div>
        </div>

        {/* 3. CONTENT AREA */}
        <div className="booking-content-area">
          {confirmedBooking ? (
            <BookingConfirmation
              booking={confirmedBooking}
              user={user}
              apiStatus={submissionState.status}
              onDone={handleDone}
              onBookAnother={handleBookAnotherSlot}
              onCancelBooking={handleCancelBooking}
              isCancelling={isCancelling}
              cancelSyncState={cancelSyncState}
              isDemoPayment={true}
            />
          ) : (
            <BookingForm
              formData={formData}
              errors={errors}
              onChange={handleFormChange}
              onError={(field, msg) => setErrors((prev) => ({ ...prev, [field]: msg }))}
              selectedSlot={selectedSlot}
              slots={slots}
              onSelectSlot={handleSelectSlot}
              amount={amount}
              numberOfDays={numberOfDays}
              onConfirmBooking={handleConfirmBooking}
              onProceedToSlots={handleProceedToSlots}
              isSubmitting={isSubmitting}
            />
          )}
        </div>
      </div>
    </div>
  );
}
