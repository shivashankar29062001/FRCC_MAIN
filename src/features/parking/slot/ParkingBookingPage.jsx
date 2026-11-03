// ---------------------------------------------------------------------------
// /src/features/parking/slot/ParkingBookingPage.jsx
// The FRCC Parking Slot team's booking flow, merged into FRCC_MAIN as the
// parking booking page (/book/parking). Self-contained: its own stepper,
// slot grid (Blocks A–C, slots 01–50), vehicle details, review and
// confirmation — all styled by ./ParkingBookingPage.css and ./components/*.
// ---------------------------------------------------------------------------

import { useState, useEffect, useRef, useMemo } from 'react';
import { useApp } from '../../../app/store/AppContext.jsx';
import './ParkingBookingPage.css';
import BookingForm from './components/BookingForm.jsx';
import BookingConfirmation, { getMaskedContactDetails } from './components/BookingConfirmation.jsx';
import {
  createBooking,
  generateBookingReference,
  submitBookingToAdmin,
  isBookingApiConfigured,
  BOOKING_STATUS,
  BOOKING_STATUS_CODE,
  cancelBookingToAdmin,
  isBookingCancelApiConfigured,
  fetchBookedSlotsFromSupabase
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

const BASE_CONFIRMED_BOOKINGS_STORAGE_KEY = 'frcc_parking_confirmed_bookings_v1';
const LEGACY_CONFIRMED_BOOKINGS_STORAGE_KEY = 'frcc:confirmedBookings';

// Remove legacy un-namespaced keys on startup
try {
  if (typeof window !== 'undefined' && window.sessionStorage) {
    window.sessionStorage.removeItem(LEGACY_CONFIRMED_BOOKINGS_STORAGE_KEY);
    window.sessionStorage.removeItem(BASE_CONFIRMED_BOOKINGS_STORAGE_KEY);
  }
} catch (_) {}

const getConfirmedBookingsKey = (userId = null) =>
  userId ? `${BASE_CONFIRMED_BOOKINGS_STORAGE_KEY}.${userId}` : BASE_CONFIRMED_BOOKINGS_STORAGE_KEY;

const retainConfirmedBooking = (booking, userId = null) => {
  try {
    const key = getConfirmedBookingsKey(userId);
    const raw = window.sessionStorage.getItem(key);
    const existing = raw ? JSON.parse(raw) : [];
    window.sessionStorage.setItem(key, JSON.stringify([...existing, booking]));
  } catch (_) {
    // Storage unavailable
  }
};

const updateRetainedBookingStatus = (booking, userId = null) => {
  try {
    const key = getConfirmedBookingsKey(userId);
    const raw = window.sessionStorage.getItem(key);
    const existing = raw ? JSON.parse(raw) : [];
    const reference = booking.bookingReference || booking.bookingId;
    const updated = existing.map((b) => {
      const ref = b.bookingReference || b.bookingId;
      if (ref === reference) {
        return {
          ...b,
          bookingStatus: BOOKING_STATUS.CANCELLED,
          bookingStatusCode: BOOKING_STATUS_CODE.CANCELLED,
          cancelledAt: new Date().toISOString()
        };
      }
      return b;
    });
    window.sessionStorage.setItem(key, JSON.stringify(updated));
  } catch (_) {
    // Storage unavailable
  }
};

const STEP_CITY = 1;
const STEP_DATE_TIME = 2;
const STEP_SLOT = 3;
const STEP_VEHICLE = 4;
const STEP_PAYMENT = 5;
const STEP_CONFIRMATION = 6;

export default function ParkingBookingPage() {
  const { user } = useApp();
  const [confirmedBooking, setConfirmedBooking] = useState(null);

  const [formData, setFormData] = useState({
    city: '',
    date: '',
    time: '',
    days: '',
    vehicleType: '',
    vehicleNumber: ''
  });

// Slot statuses tracked independently per city (Vijayawada and Hyderabad).
// Each city has its own 150-slot inventory (Blocks A-C, slots 01-50).
const [slotStatuses, setSlotStatuses] = useState(() => ({
  vja: generateInitialSlots(),
  hyd: generateInitialSlots(),
}));

// Derive the currently displayed slots based on the selected city.
// Defaults to Vijayawada ('vja') when the city is unspecified.
const slots = useMemo(
  () => {
    const cityKey = formData.city === 'Vijayawada' ? 'vja' : formData.city === 'Hyderabad' ? 'hyd' : 'vja';
    return slotStatuses[cityKey];
  },
  [slotStatuses, formData.city]
);
const [selectedSlot, setSelectedSlot] = useState(null);
  const [step, setStep] = useState(STEP_CITY);

  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionState, setSubmissionState] = useState({ status: 'idle', error: '' });
  const [isCancelling, setIsCancelling] = useState(false);
  const [cancelSyncState, setCancelSyncState] = useState({ status: 'idle', error: '' });

  const submittingRef = useRef(false);
  const cancelInFlightRef = useRef(false);
  const pendingBookingRef = useRef(null);

  const apiConfigured = isBookingApiConfigured();

  // Reset confirmation receipt if active user changes or logs out
  useEffect(() => {
    if (confirmedBooking) {
      const matches = user?.id && (confirmedBooking.userId === user.id || confirmedBooking.user_id === user.id || confirmedBooking.userId === user.userId);
      if (!matches) {
        setConfirmedBooking(null);
        setStep(STEP_CITY);
      }
    }
  }, [user?.id, user?.userId, confirmedBooking]);

  // Auto-advance step based on form completion
  useEffect(() => {
    if (step === STEP_CITY && formData.city && formData.city.trim()) {
      setStep(STEP_DATE_TIME);
    }
  }, [formData.city, step]);

  useEffect(() => {
    if (step === STEP_DATE_TIME && formData.date && formData.date.trim() && formData.time && formData.time.trim() && formData.days) {
      setStep(STEP_SLOT);
    }
  }, [formData.date, formData.time, formData.days, step]);

  // Synchronize slot occupancy dynamically from Supabase
  useEffect(() => {
    if (formData.date) {
      fetchBookedSlotsFromSupabase(formData.date).then((bookedIds) => {
        if (bookedIds && bookedIds.length > 0) {
          const bookedSet = new Set(bookedIds);
          setSlots(INITIAL_SLOTS.map((s) => ({
            ...s,
            status: bookedSet.has(s.id) ? 'booked' : 'available',
          })));
        } else {
          setSlots(INITIAL_SLOTS);
        }
      });
    }
  }, [formData.date]);

  useEffect(() => {
    if (step === STEP_SLOT && selectedSlot) {
      setStep(STEP_VEHICLE);
    }
  }, [selectedSlot, step]);

  useEffect(() => {
    if (step === STEP_VEHICLE && formData.vehicleType && formData.vehicleNumber && formData.vehicleNumber.trim().length >= 4) {
      setStep(STEP_PAYMENT);
    }
  }, [formData.vehicleType, formData.vehicleNumber, step]);

  // Clear selected slot when the city changes, since the slot inventory
  // is independent per campus. The previously selected slot belongs to
  // the old city and must not interfere with the new city's inventory.
  useEffect(() => {
    setSelectedSlot(null);
  }, [formData.city]);

  const pricePerDay =
    formData.vehicleType === 'Two Wheeler'
      ? 20
      : formData.vehicleType === 'Four Wheeler'
      ? 40
      : 0;
  const numberOfDays = Number(formData.days) || 1;
  const amount = pricePerDay * numberOfDays;

  const handleSelectSlot = (slotId) => {
    if (confirmedBooking) return;
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
    Object.keys(newFormData).forEach((key) => {
      if (newFormData[key] && updatedErrors[key]) {
        delete updatedErrors[key];
      }
    });
    setErrors(updatedErrors);
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.city || !formData.city.trim()) {
      newErrors.city = 'Please select a city.';
    }

    if (!formData.date || !formData.date.trim()) {
      newErrors.date = 'Please select a booking date.';
    }

    if (!formData.time || !formData.time.trim()) {
      newErrors.time = 'Please select a booking arrival time.';
    }

    if (!selectedSlot) {
      newErrors.slot = 'Please select an available parking slot from A01 to C50.';
    }

    if (!formData.vehicleType) {
      newErrors.vehicleType = 'Please select Two Wheeler or Four Wheeler.';
    }

    if (!formData.vehicleNumber || !formData.vehicleNumber.trim()) {
      newErrors.vehicleNumber = 'Please enter your vehicle registration number.';
    } else if (formData.vehicleNumber.trim().length < 4) {
      newErrors.vehicleNumber = 'Please enter a valid registration number (e.g., AP01AB1234).';
    } else {
      // Format validation for Indian vehicle registration numbers
      // Pattern: 2 uppercase letters + 1-2 digits + 0-2 uppercase letters + 4 digits
      // Examples: AP02AB1234, TS09CD5678
      const normalized = formData.vehicleNumber.trim().toUpperCase();
      const vehicleNumberRegex = /^[A-Z]{2}[0-9]{1,2}[A-Z]{0,2}[0-9]{4}$/;
      if (!vehicleNumberRegex.test(normalized)) {
        newErrors.vehicleNumber = 'Please enter a valid registration number (e.g., AP02AB1234).';
      }
    }

    if (!numberOfDays || numberOfDays < 1 || numberOfDays > 7) {
      newErrors.days = 'Please select the number of days (1 to 7).';
    }

    return newErrors;
  };

  const commitConfirmedBooking = (booking) => {
    setSlotStatuses((prevStatuses) => {
      // Map full city names to slotStatuses keys ('vja'/'hyd')
      const cityMap = { Vijayawada: 'vja', Hyderabad: 'hyd' };
      const city = cityMap[booking.city || formData.city] || 'vja';
      const cityStatuses = prevStatuses[city];
      const updatedCityStatuses = cityStatuses.map(
        (s) => (s.id === booking.parkingSlot ? { ...s, status: 'booked' } : s)
      );
      return {
        ...prevStatuses,
        [city]: updatedCityStatuses,
      };
    });

    retainConfirmedBooking(booking, user?.id);
    setConfirmedBooking(booking);
    setIsSubmitting(false);
    submittingRef.current = false;
    pendingBookingRef.current = null;
    setStep(STEP_CONFIRMATION);

    // Show booking confirmation notification with user's contact details
    if (!confirmedBooking && pushToast) {
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
      parkingSlot: selectedSlot,
      vehicleType: formData.vehicleType,
      vehicleNumber: formData.vehicleNumber.trim(),
      numberOfDays,
      pricePerDay,
      bookingDate: formData.date,
      bookingTime: formData.time,
      paymentMethod: 'Demo',
      transactionId: transactionId || 'DEMO-TXN-' + Date.now(),
      city: formData.city
    });

    pendingBookingRef.current = booking;
    submittingRef.current = true;
    setIsSubmitting(true);
    setSubmissionState({ status: 'submitting', error: '' });

    if (!apiConfigured) {
      setSubmissionState({ status: 'not_configured', error: '' });
      commitConfirmedBooking(booking);
      return;
    }

    submitBookingToAdmin(booking)
      .then(() => {
        setSubmissionState({ status: 'success', error: '' });
        commitConfirmedBooking(booking);
      })
      .catch((err) => {
        const message = err && err.message ? err.message : 'Could not reach the admin dashboard.';
        setSubmissionState({ status: 'error', error: message });
        setIsSubmitting(false);
        submittingRef.current = false;
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
      if (firstErrorKey === 'city') {
        targetElement = document.getElementById('city-selection-card');
      } else if (firstErrorKey === 'date' || firstErrorKey === 'time' || firstErrorKey === 'days') {
        targetElement = document.getElementById('date-time-card');
      } else if (firstErrorKey === 'slot') {
        targetElement = document.getElementById('parking-slot-selection-card');
      } else if (firstErrorKey === 'vehicleType') {
        targetElement = document.getElementById('vehicle-type-select');
      } else if (firstErrorKey === 'vehicleNumber') {
        targetElement = document.getElementById('vehicle-number');
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
    // Map full city names to slotStatuses keys ('vja'/'hyd')
    const cityMap = { Vijayawada: 'vja', Hyderabad: 'hyd' };
    const city = cityMap[booking.city || formData.city] || 'vja';
    const releasedSlot = booking.parkingSlot;

    setSlotStatuses((prevStatuses) => {
      const cityStatuses = prevStatuses[city];
      const updatedCityStatuses = cityStatuses.map(
        (s) => (s.id === releasedSlot ? { ...s, status: 'available' } : s)
      );
      return {
        ...prevStatuses,
        [city]: updatedCityStatuses,
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

    if (isBookingCancelApiConfigured()) {
      setCancelSyncState({ status: 'syncing', error: '' });
      cancelBookingToAdmin(cancelledBooking)
        .then(() => {
          setCancelSyncState({ status: 'synced', error: '' });
        })
        .catch((err) => {
          const message = err && err.message ? err.message : 'Could not reach the admin dashboard.';
          setCancelSyncState({ status: 'error', error: message });
        })
        .finally(() => {
          setIsCancelling(false);
          cancelInFlightRef.current = false;
        });
    } else {
      setCancelSyncState({ status: 'not_configured', error: '' });
      setIsCancelling(false);
      cancelInFlightRef.current = false;
    }
  };

  const handleResetForm = () => {
    setFormData({
      city: '',
      date: '',
      time: '',
      days: '',
      vehicleType: '',
      vehicleNumber: ''
    });
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
    setStep(STEP_CITY);
  };

  const handleDone = () => {
    handleResetForm();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleBookAnotherSlot = () => {
    handleResetForm();
    setTimeout(() => {
      const el = document.getElementById('city-selection-card');
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      } else {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    }, 100);
  };

  return (
    <div className="booking-page">
      {/* 1. HERO SECTION - PRESERVED UNCHANGED */}
      <div className="hero-section">
        <div className="hero-content">
          <div className="hero-breadcrumb">
            <span>Home</span> &gt; <span>Parking Slot</span> &gt; <span>Booking</span>
          </div>
          <div className="hero-label">VEHICLE PARKING</div>
          <h1 className="hero-heading">Parking Slot Booking</h1>
          <p className="hero-description">Select city, date, time, parking slot, vehicle details, payment and confirmation.</p>
          <p className="hero-description">Quick and easy booking experience.</p>
        </div>
      </div>

      {/* 2. SIX-STEP PROGRESS INDICATOR & CONTENT CONTAINER */}
      <div className="booking-main-container">
        <div className="stepper-section">
          <div className="stepper-row">
            <div className={`stepper-item ${step === 1 ? 'active' : step > 1 ? 'completed' : ''}`}>
              <div className="stepper-circle">1</div>
              <span className="stepper-label">Select Location</span>
            </div>
            <div className={`stepper-line ${step > 1 ? 'completed' : ''}`} />

            <div className={`stepper-item ${step === 2 ? 'active' : step > 2 ? 'completed' : ''}`}>
              <div className="stepper-circle">2</div>
              <span className="stepper-label">Select Date & Time</span>
            </div>
            <div className={`stepper-line ${step > 2 ? 'completed' : ''}`} />

            <div className={`stepper-item ${step === 3 ? 'active' : step > 3 ? 'completed' : ''}`}>
              <div className="stepper-circle">3</div>
              <span className="stepper-label">Select Slot</span>
            </div>
            <div className={`stepper-line ${step > 3 ? 'completed' : ''}`} />

            <div className={`stepper-item ${step === 4 ? 'active' : step > 4 ? 'completed' : ''}`}>
              <div className="stepper-circle">4</div>
              <span className="stepper-label">Vehicle Details</span>
            </div>
            <div className={`stepper-line ${step > 4 ? 'completed' : ''}`} />

            <div className={`stepper-item ${step === 5 ? 'active' : step > 5 ? 'completed' : ''}`}>
              <div className="stepper-circle">5</div>
              <span className="stepper-label">Review</span>
            </div>
            <div className={`stepper-line ${step > 5 ? 'completed' : ''}`} />

            <div className={`stepper-item ${step === 6 ? 'active' : ''}`}>
              <div className="stepper-circle">6</div>
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
              selectedSlot={selectedSlot}
              slots={slots}
              onSelectSlot={handleSelectSlot}
              amount={amount}
              numberOfDays={numberOfDays}
              onConfirmBooking={handleConfirmBooking}
              isSubmitting={isSubmitting}
            />
          )}
        </div>
      </div>
    </div>
  );
}