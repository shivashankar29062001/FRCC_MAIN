// ---------------------------------------------------------------------------
// /src/features/parking/slot/components/BookingForm.jsx
// Merged from the FRCC Parking Slot team's app. The card classes were renamed
// booking-card → slot-booking-card (and its -header/-title/-body variants) so
// they never collide with FRCC_MAIN's own dark hero card (.booking-card in /src/index.css).
// ---------------------------------------------------------------------------

import { MapPin, Calendar, Clock, Car } from 'lucide-react';
import ParkingBlock from './ParkingBlock.jsx';
import SlotLegend from './SlotLegend.jsx';
import './BookingForm.css';

export default function BookingForm({
  formData,
  errors = {},
  onChange,
  selectedSlot,
  slots,
  onSelectSlot,
  amount = 40,
  numberOfDays = 1,
  onConfirmBooking,
  isSubmitting = false
}) {
  const handleInputChange = (field, value) => {
    onChange({
      ...formData,
      [field]: value
    });
  };

  const handleVehicleNumberChange = (e) => {
    const raw = e.target.value.toUpperCase().replace(/\s+/g, '');
    handleInputChange('vehicleNumber', raw);
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

  const todayStr = new Date().toISOString().split('T')[0];

  return (
    <div className="booking-forms-wrapper">
      {/* ROW 1: SELECT LOCATION & SELECT DATE & TIME (side by side) */}
      <div className="booking-row-1-grid">
        {/* CARD 1: SELECT LOCATION */}
        <div className="slot-booking-card location-card" id="city-selection-card">
          <div className="slot-booking-card-header">
            <MapPin size={18} className="card-header-icon" />
            <h3 className="slot-booking-card-title">Select Location</h3>
          </div>
          <div className="slot-booking-card-body">
            <div className="form-field-group">
              <label className="field-label" htmlFor="city-select">
                City <span className="req-star">*</span>
              </label>
              <div className="select-wrapper">
                <select
                  id="city-select"
                  className={`form-select ${errors.city ? 'input-error' : ''}`}
                  value={formData.city || ''}
                  onChange={(e) => handleInputChange('city', e.target.value)}
                  disabled={isSubmitting}
                >
                  <option value="">Select City</option>
                  <option value="Vijayawada">Vijayawada</option>
                  <option value="Hyderabad">Hyderabad</option>
                </select>
              </div>
              {errors.city && <span className="field-error-text">{errors.city}</span>}
            </div>
          </div>
        </div>

        {/* CARD 2: SELECT DATE & TIME */}
        <div className="slot-booking-card date-time-card" id="date-time-card">
          <div className="slot-booking-card-header">
            <Calendar size={18} className="card-header-icon" />
            <h3 className="slot-booking-card-title">Select Date & Time</h3>
          </div>
          <div className="slot-booking-card-body">
            <div className="date-time-inputs-row">
              <div className="form-field-group">
                <label className="field-label">
                  Booking Date <span className="req-star">*</span>
                </label>
                <div className="input-with-icon">
                  <input
                    type="date"
                    id="booking-date-input"
                    className={`form-input ${errors.date ? 'input-error' : ''}`}
                    value={formData.date || ''}
                    min={todayStr}
                    onChange={(e) => handleInputChange('date', e.target.value)}
                    disabled={isSubmitting}
                  />
                  <Calendar size={16} className="input-right-icon" />
                </div>
                {errors.date && <span className="field-error-text">{errors.date}</span>}
              </div>

              <div className="form-field-group">
                <label className="field-label">
                  Booking Time <span className="req-star">*</span>
                </label>
                <div className="input-with-icon">
                  <input
                    type="time"
                    id="booking-time-input"
                    className={`form-input ${errors.time ? 'input-error' : ''}`}
                    value={formData.time || ''}
                    onChange={(e) => handleInputChange('time', e.target.value)}
                    disabled={isSubmitting}
                  />
                  <Clock size={16} className="input-right-icon" />
                </div>
                {errors.time && <span className="field-error-text">{errors.time}</span>}
              </div>
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
              {errors.days && <span className="field-error-text">{errors.days}</span>}
            </div>
          </div>
        </div>
      </div>

      {/* SLOT STATUS LEGEND */}
      <div className="slot-legend-wrapper" id="parking-slot-legend">
        <SlotLegend />
      </div>

      {/* ROW 2: THREE PARKING BLOCKS (A, B, C) SIDE BY SIDE */}
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

      {/* ROW 3: VEHICLE DETAILS (full width) */}
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
                  <option value="Four Wheeler">Four Wheeler</option>
                  <option value="Two Wheeler">Two Wheeler</option>
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
                disabled={isSubmitting}
              />
              {errors.vehicleNumber && <span className="field-error-text">{errors.vehicleNumber}</span>}
            </div>
          </div>
        </div>
      </div>

      {/* ROW 4: REVIEW & PAY (full width) */}
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
          <h3 className="slot-booking-card-title">Review</h3>
        </div>
        <div className="slot-booking-card-body">
          <div className="review-details-table-grid">
            {/* Left Column Box */}
            <div className="review-table-col">
              <div className="review-table-row">
                <div className="review-table-cell label-cell">City</div>
                <div className="review-table-cell value-cell">{formData.city || '—'}</div>
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
                <div className="review-table-cell value-cell">{selectedSlot || '—'}</div>
              </div>
              <div className="review-table-row">
                <div className="review-table-cell label-cell">Vehicle Type</div>
                <div className="review-table-cell value-cell">{formData.vehicleType || '—'}</div>
              </div>
              <div className="review-table-row">
                <div className="review-table-cell label-cell">Vehicle Number</div>
                <div className="review-table-cell value-cell">{formData.vehicleNumber || '—'}</div>
              </div>
            </div>
          </div>

          <button
            type="button"
            className="btn-confirm-booking-wide"
            onClick={onConfirmBooking}
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Processing...' : 'Confirm Booking'}
          </button>
        </div>
      </div>
    </div>
  );
}