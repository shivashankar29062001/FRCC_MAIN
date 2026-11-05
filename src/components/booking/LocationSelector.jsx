import { useMemo } from 'react';

/**
 * Reusable Location Selector matching the Halls booking flow pattern:
 * - City Dropdown: "-- Select City --"
 * - Venue Dropdown: "-- Select Venue --"
 */
export function LocationSelector({
  locations = [],
  cityId = '',
  venueId = '',
  onCityChange,
  onVenueChange,
  cityLabel = 'Select City',
  venueLabel = 'Select Venue / Campus',
  className = '',
}) {
  const selectedCity = useMemo(
    () => locations.find((c) => String(c.id) === String(cityId)) || null,
    [locations, cityId]
  );

  const venues = useMemo(() => {
    return selectedCity && Array.isArray(selectedCity.venues) ? selectedCity.venues : [];
  }, [selectedCity]);

  return (
    <div className={`flex flex-col sm:flex-row gap-4 mb-6 ${className}`}>
      {/* City Dropdown */}
      <div className="flex-1">
        <label className="block text-xs font-semibold text-slate-700 mb-1">
          {cityLabel} <span className="text-red-500">*</span>
        </label>
        <select
          className="border border-slate-300 rounded-xl p-2.5 w-full text-sm bg-white font-medium text-navy-950 focus:border-navy-900 focus:ring-1 focus:ring-navy-900 transition shadow-xs"
          value={cityId}
          onChange={(e) => {
            const nextCityId = e.target.value;
            const foundCity = locations.find((c) => String(c.id) === String(nextCityId)) || null;
            const firstVenue = foundCity?.venues?.[0] || null;
            onCityChange?.(nextCityId, foundCity, firstVenue);
          }}
        >
          <option value="">-- Select City --</option>
          {locations.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      {/* Venue Dropdown */}
      <div className="flex-1">
        <label className="block text-xs font-semibold text-slate-700 mb-1">
          {venueLabel} <span className="text-red-500">*</span>
        </label>
        <select
          className="border border-slate-300 rounded-xl p-2.5 w-full text-sm bg-white font-medium text-navy-950 focus:border-navy-900 focus:ring-1 focus:ring-navy-900 disabled:opacity-50 disabled:bg-slate-50 transition shadow-xs"
          value={venueId}
          disabled={!cityId || venues.length === 0}
          onChange={(e) => {
            const nextVenueId = e.target.value;
            const foundVenue = venues.find((v) => String(v.id) === String(nextVenueId)) || null;
            onVenueChange?.(nextVenueId, foundVenue);
          }}
        >
          <option value="">-- Select Venue --</option>
          {venues.map((v) => (
            <option key={v.id} value={v.id}>
              {v.displayName || `${v.name} — ${v.areaName || ''}`}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

export default LocationSelector;

