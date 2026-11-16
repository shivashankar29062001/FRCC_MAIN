// ---------------------------------------------------------------------------
// /src/features/parking/slot/components/BookingForm.jsx
// Merged from the FRCC Parking Slot team's app.
// Steps: 1. Vehicle Details (Location + Vehicle), 2. Select Slot, 3. Schedule, 4. Payment
// ---------------------------------------------------------------------------

import { MapPin, Calendar, Clock, Car } from 'lucide-react';
import ParkingBlock from './ParkingBlock.jsx';
import SlotLegend from './SlotLegend.jsx';
import {
  isValidVehicleNumber,
  cleanVehicleNumber,
  VEHICLE_NUMBER_ERROR_MESSAGE,
} from '../../../../utils/vehicle.js';
import './BookingForm.css';

export default function BookingForm({
  formData,
  errors = {},
  onChange,
  onError,
  selectedSlot,
  slots,
  onSelectSlot,
  amount = 0,
  numberOfDays = 1,
  onConfirmBooking,
  onProceedToSlots,
  isSubmitting = false
}) {
  const handleInputChange = (field, value) => {
    const next = {
      ...formData,
      [field]: value
    };
    if (field === 'date') {
      const days = Number(next.days) || 1;
      if (value) next.endDate = addDaysIso(value, days - 1);
      else next.endDate = '';
    } else if (field === 'days') {
      const days = value ? Number(value) : '';
      next.days = days;
      if (next.date && days) next.endDate = addDaysIso(next.date, days - 1);
    } else if (field === 'endDate') {
      if (next.date && value) {
        const diffDays = Math.round((new Date(`${value}T00:00:00+05:30`).getTime() - new Date(`${next.date}T00:00:00+05:30`).getTime()) / 86400000) + 1;
        if (diffDays < 1) {
          next.days = 1;
          next.endDate = next.date;
        } else if (diffDays > 7) {
          next.days = 7;
          next.endDate = addDaysIso(next.date, 6);
        } else {
          next.days = diffDays;
        }
      }
    }
    onChange(next);
  };

  const handleVehicleNumberChange = (e) => {
    const raw = cleanVehicleNumber(e.target.value);
    handleInputChange('vehicleNumber', raw);
  };

  const handleVehicleNumberBlur = () => {
    if (formData.vehicleNumber && formData.vehicleNumber.trim().length > 0 && !isValidVehicleNumber(formData.vehicleNumber)) {
      if (typeof onError === 'function') {
        onError('vehicleNumber', VEHICLE_NUMBER_ERROR_MESSAGE);
      }
    }
  };

  const formatDisplayDate = (dateStr) => {
    if (!dateStr) return '—';
    try {
      const parts = dateStr.split('-');
      if (parts.length === 3) {
        const [year, month, day] = parts;
        return `${day}-${month}-${year}`;
      }
      return dateStr;
    } catch {
      return dateStr;
    }
  };

  const formatDisplayTime = (timeStr) => {
    if (!timeStr) return '—';
    try {
      const [hStr, mStr] = timeStr.split(':');
      const h = parseInt(hStr, 10);
      const ampm = h >= 12 ? 'PM' : 'AM';
      const displayH = h % 12 || 12;
      return `${displayH.toString().padStart(2, '0')}:${mStr} ${ampm}`;
    } catch {
      return timeStr;
    }
  };

  const todayStr = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
  const minTime = new Date(Date.now() + 60000).toLocaleTimeString('en-GB', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit' });
  const addDaysIso = (dateStr, days) => {
    const [y, m, d] = String(dateStr || '').split('-').map(Number);
    if (!y || !m || !d) return dateStr || '';
    const dt = new Date(Date.UTC(y, m - 1, d + (Number(days) || 0)));
    return dt.toISOString().split('T')[0];
  };
  const effectiveCity = formData.city || (formData.campus_id === 'hyd' ? 'Hyderabad' : 'Vijayawada');
  const campusLabel = effectiveCity === 'Hyderabad' ? 'Hyderabad Campus' : 'Vijayawada Campus';
  const isVehicleValid = isValidVehicleNumber(formData.vehicleNumber);

  return (
    <div className="booking-forms-wrapper">
      {/* STEP 1: VEHICLE DETAILS & LOCATION */}
      <div className="booking-row-1-grid" id="step-vehicle-details">
        {/* CARD 1: LOCATION */}
        <div className="slot-booking-card location-card" id="city-selection-card">
          <div className="slot-booking-card-header">
            <MapPin size={18} className="card-header-icon" />
            <h3 className="slot-booking-card-title">Location</h3>
          </div>
          <div className="slot-booking-card-body">
            <div className="form-field-group">
              <label className="field-label" htmlFor="city-select">
                City <span className="req-star">*</span>
              </label>
              <div className="city-input-wrapper select-wrapper">
                <input
                  type="text"
                  id="city-select"
                  className="form-input read-only-input read-only-city-input"
                  value={effectiveCity}
                  readOnly
                  disabled
                  aria-readonly="true"
                  tabIndex={-1}
                />
              </div>
              <p className="field-info-text text-xs text-slate-500 mt-1.5 flex items-center gap-1">
                <span>Automatically set from your selected parking zone.</span>
              </p>
            </div>
          </div>
        </div>

        {/* CARD 2: VEHICLE DETAILS */}
        <div className="slot-booking-card vehicle-details-card" id="vehicle-details-section">
          <div className="slot-booking-card-header">
            <Car size={18} className="card-header-icon" />
            <h3 className="slot-booking-card-title">Vehicle Details</h3>
          </div>
          <div className="slot-booking-card-body">
            <div className="vehicle-details-row">
              <div className="form-field-group">
                <label className="field-label" htmlFor="vehicle-type-select">
                  Vehicle Type <span className="req-star">*</span>
                </label>
                <div className="select-wrapper">
                  <select
                    id="vehicle-type-select"
                    className={`form-select ${errors.vehicleType ? 'input-error' : ''}`}
                    value={formData.vehicleType || ''}
                    onChange={(e) => handleInputChange('vehicleType', e.target.value)}
                    disabled={isSubmitting}
                  >
                    <option value="">Select vehicle type</option>
                    <option value="Four Wheeler">CAR (Four Wheeler)</option>
                    <option value="Two Wheeler">BIKE (Two Wheeler)</option>
                  </select>
                </div>
                {errors.vehicleType && <span className="field-error-text">{errors.vehicleType}</span>}
              </div>

              <div className="form-field-group">
                <label className="field-label" htmlFor="vehicle-number">
                  Vehicle Number <span className="req-star">*</span>
                </label>
                <input
                  type="text"
                  id="vehicle-number"
                  className={`form-input ${errors.vehicleNumber ? 'input-error' : ''}`}
                  placeholder="Enter vehicle number (e.g. AP39AB1234)"
                  value={formData.vehicleNumber || ''}
                  onChange={handleVehicleNumberChange}
                  onBlur={handleVehicleNumberBlur}
                  disabled={isSubmitting}
                  maxLength={10}
                  aria-invalid={Boolean(errors.vehicleNumber)}
                  aria-describedby={errors.vehicleNumber ? 'vehicle-number-error' : undefined}
                />
                {errors.vehicleNumber && (
                  <span id="vehicle-number-error" className="field-error-text">
                    {errors.vehicleNumber}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* STEP 2: SELECT SLOT */}
      <div id="step-select-slot" className="mt-8">
        <div className="campus-slot-banner mb-3 flex flex-wrap items-center justify-between gap-2">
          <div>
            <div className="text-sm font-semibold text-navy-900">
              Select Parking Slot — {campusLabel}{' '}
              {formData.date
                ? `(${formatDisplayDate(formData.date)}${formData.time ? ` · ${formatDisplayTime(formData.time)}` : ''})`
                : '(150 Total Slots)'}
            </div>
            {!formData.date && (
              <p className="text-xs text-amber-700 mt-0.5 font-medium">
                Select your Booking Date, Booking Time, and No. of Days in Schedule below to view live slot availability.
              </p>
            )}
          </div>
          {selectedSlot && (
            <div className="text-xs font-semibold px-2.5 py-1 rounded bg-gold-500/20 text-navy-900 border border-gold-500/40">
              Selected: Slot {selectedSlot}
            </div>
          )}
        </div>

        {/* SLOT STATUS LEGEND */}
        <div className="slot-legend-wrapper" id="parking-slot-legend">
          <SlotLegend />
        </div>

        {/* THREE PARKING BLOCKS (A, B, C) SIDE BY SIDE */}
        <div className="booking-row-2-grid" id="parking-slot-selection-card">
          <ParkingBlock
            blockName="Parking Block A"
            blockPrefix="A"
            slots={slots}
            selectedSlot={selectedSlot}
            onSelectSlot={onSelectSlot}
            disabled={isSubmitting}
          />
          <ParkingBlock
            blockName="Parking Block B"
            blockPrefix="B"
            slots={slots}
            selectedSlot={selectedSlot}
            onSelectSlot={onSelectSlot}
            disabled={isSubmitting}
          />
          <ParkingBlock
            blockName="Parking Block C"
            blockPrefix="C"
            slots={slots}
            selectedSlot={selectedSlot}
            onSelectSlot={onSelectSlot}
            disabled={isSubmitting}
          />
        </div>

        {errors.slot && (
          <div className="slot-selection-error-container">
            <span className="field-error-text">{errors.slot}</span>
          </div>
        )}
      </div>

      {/* STEP 3: SCHEDULE */}
      <div id="step-schedule" className="mt-8">
        <div className="slot-booking-card date-time-card" id="date-time-card">
          <div className="slot-booking-card-header">
            <Calendar size={18} className="card-header-icon" />
            <h3 className="slot-booking-card-title">Schedule</h3>
          </div>
          <div className="slot-booking-card-body">
            <div className="date-time-inputs-row">
              <div className="form-field-group">
                <label className="field-label" htmlFor="booking-date-input">
                  Booking Start Date <span className="req-star">*</span>
                </label>
                <div className="input-with-icon">
                  <input
                    type="date"
                    id="booking-date-input"
                    className={`form-input date-picker-field ${errors.date ? 'input-error' : ''}`}
                    value={formData.date || ''}
                    min={todayStr}
                    placeholder="DD-MM-YYYY"
                    onChange={(e) => handleInputChange('date', e.target.value)}
                    disabled={isSubmitting}
                    aria-invalid={Boolean(errors.date)}
                    aria-describedby={errors.date ? 'booking-date-error' : undefined}
                  />
                  <Calendar size={18} className="input-right-icon pointer-events-none" aria-hidden="true" />
                </div>
                {errors.date && (
                  <span id="booking-date-error" className="field-error-text">
                    {errors.date}
                  </span>
                )}
              </div>

              <div className="form-field-group">
                <label className="field-label" htmlFor="booking-end-date-input">
                  Booking End Date <span className="req-star">*</span>
                </label>
                <div className="input-with-icon">
                  <input
                    type="date"
                    id="booking-end-date-input"
                    className={`form-input date-picker-field ${errors.endDate ? 'input-error' : ''}`}
                    value={formData.endDate || ''}
                    min={formData.date || todayStr}
                    max={formData.date ? addDaysIso(formData.date, 6) : undefined}
                    placeholder="DD-MM-YYYY"
                    onChange={(e) => handleInputChange('endDate', e.target.value)}
                    disabled={isSubmitting}
                    aria-invalid={Boolean(errors.endDate)}
                    aria-describedby={errors.endDate ? 'booking-end-date-error' : undefined}
                  />
                  <Calendar size={18} className="input-right-icon pointer-events-none" aria-hidden="true" />
                </div>
                {errors.endDate && (
                  <span id="booking-end-date-error" className="field-error-text">
                    {errors.endDate}
                  </span>
                )}
              </div>

              <div className="form-field-group">
                <label className="field-label" htmlFor="booking-time-input">
                  Booking Time <span className="req-star">*</span>
                </label>
                <div className="input-with-icon">
                  <input
                    type="time"
                    id="booking-time-input"
                    className={`form-input ${errors.time ? 'input-error' : ''}`}
                    value={formData.time || ''}
                    min={formData.date === todayStr ? minTime : undefined}
                    placeholder="HH:MM"
                    onChange={(e) => handleInputChange('time', e.target.value)}
                    disabled={isSubmitting}
                    aria-invalid={Boolean(errors.time)}
                    aria-describedby={errors.time ? 'booking-time-error' : undefined}
                  />
                  <Clock size={18} className="input-right-icon pointer-events-none" aria-hidden="true" />
                </div>
                {errors.time && (
                  <span id="booking-time-error" className="field-error-text">
                    {errors.time}
                  </span>
                )}
              </div>

              <div className="form-field-group">
                <label className="field-label" htmlFor="booking-end-time-input">
                  Booking End Time <span className="req-star">*</span>
                </label>
                <div className="input-with-icon">
                  <input
                    type="time"
                    id="booking-end-time-input"
                    className={`form-input ${errors.endTime ? 'input-error' : ''}`}
                    value={formData.endTime || ''}
                    min={formData.time || (formData.date === todayStr ? minTime : undefined)}
                    placeholder="HH:MM"
                    onChange={(e) => handleInputChange('endTime', e.target.value)}
                    disabled={isSubmitting}
                    aria-invalid={Boolean(errors.endTime)}
                    aria-describedby={errors.endTime ? 'booking-end-time-error' : undefined}
                  />
                  <Clock size={18} className="input-right-icon pointer-events-none" aria-hidden="true" />
                </div>
                {errors.endTime && (
                  <span id="booking-end-time-error" className="field-error-text">
                    {errors.endTime}
                  </span>
                )}
              </div>

              <div className="form-field-group duration-field-group">
                <label className="field-label" htmlFor="days-select">
                  No. of Days <span className="req-star">*</span>
                </label>
                <div className="select-wrapper">
                  <select
                    id="days-select"
                    className={`form-select ${errors.days ? 'input-error' : ''}`}
                    value={formData.days || ''}
                    onChange={(e) => handleInputChange('days', e.target.value ? Number(e.target.value) : '')}
                    disabled={isSubmitting}
                    aria-invalid={Boolean(errors.days)}
                    aria-describedby={errors.days ? 'booking-days-error' : undefined}
                  >
                    <option value="">Select Duration</option>
                    <option value="1">1 Day</option>
                    <option value="2">2 Days</option>
                    <option value="3">3 Days</option>
                    <option value="4">4 Days</option>
                    <option value="5">5 Days</option>
                    <option value="6">6 Days</option>
                    <option value="7">7 Days</option>
                  </select>
                </div>
                {errors.days && (
                  <span id="booking-days-error" className="field-error-text">
                    {errors.days}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* STEP 4: PAYMENT / REVIEW */}
      <div id="step-payment" className="mt-8">
        <div className="slot-booking-card review-pay-card" id="review-pay-section">
          <div className="slot-booking-card-header">
            <span className="review-badge-icon" aria-hidden="true">
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                <rect width="16" height="16" rx="3" fill="#0B1833" />
                <line x1="3.5" y1="5" x2="12.5" y2="5" stroke="#FFFFFF" strokeWidth="1.6" strokeLinecap="round" />
                <line x1="3.5" y1="8" x2="12.5" y2="8" stroke="#FFFFFF" strokeWidth="1.6" strokeLinecap="round" />
                <line x1="3.5" y1="11" x2="12.5" y2="11" stroke="#FFFFFF" strokeWidth="1.6" strokeLinecap="round" />
              </svg>
            </span>
            <h3 className="slot-booking-card-title">Payment &amp; Review</h3>
          </div>
          <div className="slot-booking-card-body">
            <div className="review-details-table-grid">
              {/* Left Column Box */}
              <div className="review-table-col">
                <div className="review-table-row">
                  <div className="review-table-cell label-cell">City</div>
                  <div className="review-table-cell value-cell">{effectiveCity}</div>
                </div>
                <div className="review-table-row">
                  <div className="review-table-cell label-cell">Campus</div>
                  <div className="review-table-cell value-cell">{campusLabel}</div>
                </div>
                <div className="review-table-row">
                  <div className="review-table-cell label-cell">Booking Date</div>
                  <div className="review-table-cell value-cell">{formData.date ? formatDisplayDate(formData.date) : '—'}</div>
                </div>
                <div className="review-table-row">
                  <div className="review-table-cell label-cell">Booking Time</div>
                  <div className="review-table-cell value-cell">{formData.time ? formatDisplayTime(formData.time) : '—'}</div>
                </div>
                <div className="review-table-row">
                  <div className="review-table-cell label-cell">No. of Days</div>
                  <div className="review-table-cell value-cell">
                    {formData.days ? `${formData.days} Day${formData.days > 1 ? 's' : ''}` : '—'}
                  </div>
                </div>
              </div>

              {/* Right Column Box */}
              <div className="review-table-col">
                <div className="review-table-row">
                  <div className="review-table-cell label-cell">Parking Slot</div>
                  <div className="review-table-cell value-cell font-semibold text-navy-900">{selectedSlot || '—'}</div>
                </div>
                <div className="review-table-row">
                  <div className="review-table-cell label-cell">Vehicle Type</div>
                  <div className="review-table-cell value-cell">{formData.vehicleType || '—'}</div>
                </div>
                <div className="review-table-row">
                  <div className="review-table-cell label-cell">Vehicle Number</div>
                  <div className="review-table-cell value-cell font-mono">{formData.vehicleNumber || '—'}</div>
                </div>
                <div className="review-table-row">
                  <div className="review-table-cell label-cell">Parking Charges</div>
                  <div className="review-table-cell value-cell text-emerald-700 font-semibold">Complimentary (Free)</div>
                </div>
              </div>
            </div>

            {errors.payment && (
              <p className="field-error-text mt-3 block" role="alert">
                {errors.payment}
              </p>
            )}

            <button
              type="button"
              className="btn-confirm-booking-wide"
              onClick={onConfirmBooking}
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Processing...' : 'Confirm Parking Booking'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
