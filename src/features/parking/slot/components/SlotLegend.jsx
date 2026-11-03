import { Car, Check } from 'lucide-react';
import './SlotLegend.css';

export default function SlotLegend() {
  return (
    <div className="slot-legend" role="list" aria-label="Parking slot status legend">
      <div className="slot-legend-item">
        <span className="slot-legend-indicator slot-legend-available" aria-hidden="true">
          <Car size={12} />
        </span>
        <span className="slot-legend-label">Available</span>
      </div>
      <div className="slot-legend-item">
        <span className="slot-legend-indicator slot-legend-selected" aria-hidden="true">
          <Check size={12} />
        </span>
        <span className="slot-legend-label">Selected</span>
      </div>
      <div className="slot-legend-item">
        <span className="slot-legend-indicator slot-legend-booked" aria-hidden="true">
          <Car size={12} />
        </span>
        <span className="slot-legend-label">Booked</span>
      </div>
    </div>
  );
}