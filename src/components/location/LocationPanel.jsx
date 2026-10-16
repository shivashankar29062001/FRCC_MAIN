import { useState, useEffect, useRef, useCallback } from 'react';
import { useLocationModal } from '../../app/context/LocationModalContext.jsx';
import { useApp } from '../../app/store/AppContext.jsx';
import { Button } from '../ui/controls.jsx';
import {
  MapPinIcon,
  PhoneIcon,
  ClockIcon,
  XIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  ArrowRightIcon,
} from '../ui/icons.jsx';
import {
  loadGoogleMaps,
  hasGoogleMapsKey,
  getEmbedMapUrl,
  getGoogleMapsDirectionsUrl,
  calculateRoute,
  getPlaceSuggestions,
  getUserLocation,
} from '../../services/maps.js';

// Travel mode tabs definition
const TRAVEL_MODES = [
  { id: 'DRIVING', label: 'Driving', icon: '🚗' },
  { id: 'TWO_WHEELER', label: 'Two-wheeler', icon: '🛵' },
  { id: 'WALKING', label: 'Walking', icon: '🚶' },
  { id: 'TRANSIT', label: 'Transit', icon: '🚌' },
];

export function LocationPanel() {
  const { isOpen, activeLocation, closeLocation } = useLocationModal();
  const { pushToast } = useApp();

  const modalRef = useRef(null);
  const mapContainerRef = useRef(null);
  const inputRef = useRef(null);
  const directionsRendererRef = useRef(null);
  const googleMapInstanceRef = useRef(null);

  // Map & loading state
  const [mapLoading, setMapLoading] = useState(true);
  const [useJsApi, setUseJsApi] = useState(false);

  // Directions state
  const [startPoint, setStartPoint] = useState('');
  const [originCoords, setOriginCoords] = useState(null);
  const [travelMode, setTravelMode] = useState('DRIVING');
  const [calculating, setCalculating] = useState(false);
  const [locatingUser, setLocatingUser] = useState(false);
  const [geoError, setGeoError] = useState(null);
  const [routeResult, setRouteResult] = useState(null);
  const [routeError, setRouteError] = useState(null);
  const [showSteps, setShowSteps] = useState(false);

  // Suggestions state
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Reset state when opening a new location
  useEffect(() => {
    if (isOpen) {
      setStartPoint('');
      setOriginCoords(null);
      setRouteResult(null);
      setRouteError(null);
      setGeoError(null);
      setShowSteps(false);
      setShowSuggestions(false);
      setMapLoading(true);
    }
  }, [isOpen, activeLocation?.id]);

  // Lock body scroll and handle keyboard Esc
  useEffect(() => {
    if (!isOpen) return;

    function handleKeyDown(e) {
      if (e.key === 'Escape') {
        closeLocation();
      }
      // Focus trap inside modal
      if (e.key === 'Tab' && modalRef.current) {
        const focusable = modalRef.current.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (focusable.length > 0) {
          const first = focusable[0];
          const last = focusable[focusable.length - 1];
          if (e.shiftKey && document.activeElement === first) {
            e.preventDefault();
            last.focus();
          } else if (!e.shiftKey && document.activeElement === last) {
            e.preventDefault();
            first.focus();
          }
        }
      }
    }

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, closeLocation]);

  // Initialize Map (Google Maps JS API if key present, else fallback)
  useEffect(() => {
    if (!isOpen || !activeLocation) return;
    let isMounted = true;

    async function init() {
      setMapLoading(true);

      if (hasGoogleMapsKey()) {
        try {
          const googleMaps = await loadGoogleMaps();
          if (googleMaps && mapContainerRef.current && isMounted) {
            setUseJsApi(true);

            const map = new googleMaps.Map(mapContainerRef.current, {
              center: { lat: activeLocation.lat, lng: activeLocation.lng },
              zoom: 15,
              mapTypeControl: false,
              fullscreenControl: false,
              streetViewControl: false,
              zoomControl: true,
              styles: [
                {
                  featureType: 'poi.business',
                  stylers: [{ visibility: 'on' }],
                },
              ],
            });

            googleMapInstanceRef.current = map;

            // Add destination marker
            new googleMaps.Marker({
              position: { lat: activeLocation.lat, lng: activeLocation.lng },
              map,
              title: activeLocation.name,
              animation: googleMaps.Animation.DROP,
            });

            // Initialize DirectionsRenderer
            directionsRendererRef.current = new googleMaps.DirectionsRenderer({
              map,
              suppressMarkers: false,
              polylineOptions: {
                strokeColor: '#C9A227',
                strokeWeight: 5,
              },
            });

            setMapLoading(false);
            return;
          }
        } catch (err) {
          console.warn('Google Maps JS API failed; falling back to embed.', err);
        }
      }

      // Fallback
      if (isMounted) {
        setUseJsApi(false);
        setMapLoading(false);
      }
    }

    init();

    return () => {
      isMounted = false;
    };
  }, [isOpen, activeLocation]);

  // Autocomplete place suggestions
  const handleInputChange = async (e) => {
    const val = e.target.value;
    setStartPoint(val);
    setOriginCoords(null);
    setRouteError(null);

    if (val.trim().length > 1) {
      const results = await getPlaceSuggestions(val);
      setSuggestions(results);
      setShowSuggestions(true);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  };

  const handleSelectSuggestion = (suggestion) => {
    setStartPoint(suggestion.name);
    setShowSuggestions(false);
    triggerRouteCalculation(suggestion.name);
  };

  // Get User's Current Location via browser Geolocation API
  const handleUseCurrentLocation = async () => {
    setLocatingUser(true);
    setGeoError(null);
    setRouteError(null);

    try {
      const coords = await getUserLocation();
      setOriginCoords(coords);
      setStartPoint('My Current Location');
      setShowSuggestions(false);
      triggerRouteCalculation(coords);
      pushToast('Acquired your current location');
    } catch (err) {
      console.warn('Geolocation error:', err);
      setGeoError(
        'Location permission was denied or unavailable. Please enter your starting point in the search box below.'
      );
    } finally {
      setLocatingUser(false);
    }
  };

  // Trigger Route Calculation
  const triggerRouteCalculation = useCallback(
    async (originOverride, modeOverride) => {
      const originToUse = originOverride !== undefined ? originOverride : originCoords || startPoint;
      const modeToUse = modeOverride || travelMode;

      if (!originToUse || (typeof originToUse === 'string' && !originToUse.trim())) {
        return;
      }

      setCalculating(true);
      setRouteError(null);

      try {
        const result = await calculateRoute({
          origin: originToUse,
          destination: activeLocation,
          travelMode: modeToUse,
        });

        setRouteResult(result);

        // If Google Maps JS API is active, render route polyline on map
        if (result.isGoogleRoute && directionsRendererRef.current) {
          directionsRendererRef.current.setDirections(result.googleResponse);
        }
      } catch (err) {
        console.error('Route calculation error:', err);
        setRouteError(
          'Unable to calculate directions for the selected mode. You can still open full navigation directly in Google Maps.'
        );
      } finally {
        setCalculating(false);
      }
    },
    [originCoords, startPoint, travelMode, activeLocation]
  );

  // Handle travel mode change
  const handleModeChange = (newMode) => {
    setTravelMode(newMode);
    if (originCoords || startPoint.trim()) {
      triggerRouteCalculation(undefined, newMode);
    }
  };

  // Action Button: Copy Address
  const handleCopyAddress = () => {
    if (!activeLocation?.address) return;
    navigator.clipboard
      .writeText(activeLocation.address)
      .then(() => {
        pushToast('Address copied to clipboard');
      })
      .catch(() => {
        pushToast('Failed to copy address', 'error');
      });
  };

  // Action Button: Share Location
  const handleShareLocation = async () => {
    if (!activeLocation) return;
    const gmapsUrl = getGoogleMapsDirectionsUrl({
      destination: activeLocation,
      origin: typeof startPoint === 'string' && startPoint !== 'My Current Location' ? startPoint : undefined,
      travelMode,
    });

    if (navigator.share) {
      try {
        await navigator.share({
          title: activeLocation.name,
          text: `${activeLocation.name}\n${activeLocation.address}`,
          url: gmapsUrl,
        });
        return;
      } catch (err) {
        if (err.name !== 'AbortError') {
          console.warn('Share error:', err);
        }
      }
    }

    // Fallback: Copy link
    navigator.clipboard
      .writeText(gmapsUrl)
      .then(() => pushToast('Location link copied to clipboard'))
      .catch(() => pushToast('Unable to share location', 'error'));
  };

  if (!isOpen || !activeLocation) return null;

  const gmapsDirectionsUrl = getGoogleMapsDirectionsUrl({
    destination: activeLocation,
    origin: typeof startPoint === 'string' && startPoint !== 'My Current Location' ? startPoint : undefined,
    travelMode,
  });

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="location-panel-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 lg:p-6 bg-navy-950/70 backdrop-blur-sm animate-fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) closeLocation();
      }}
    >
      <div
        ref={modalRef}
        className="relative flex flex-col lg:flex-row w-full h-full sm:h-auto sm:max-h-[92vh] max-w-6xl bg-white sm:rounded-2xl shadow-lift overflow-hidden border border-slate-200"
      >
        {/* Close Button on Mobile / Top Right */}
        <button
          type="button"
          onClick={closeLocation}
          aria-label="Close location panel"
          className="absolute top-4 right-4 z-30 p-2.5 rounded-full bg-white/90 text-navy-900 hover:bg-slate-100 hover:text-navy-950 shadow-sm border border-slate-200 focus:outline-none focus:ring-2 focus:ring-gold-500 transition-colors"
        >
          <XIcon className="h-5 w-5" />
        </button>

        {/* ------------------------------------------------------------- */}
        {/* Left Column: Interactive Map Display (Embed or JS API)         */}
        {/* ------------------------------------------------------------- */}
        <div className="relative w-full lg:w-7/12 h-64 sm:h-80 lg:h-auto min-h-[260px] bg-slate-100 flex flex-col justify-between overflow-hidden">
          {mapLoading && (
            <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-slate-100 text-slate-500 gap-2">
              <span className="h-6 w-6 animate-spin rounded-full border-2 border-gold-500 border-t-transparent" />
              <span className="text-xs font-semibold">Loading Map &amp; Routes…</span>
            </div>
          )}

          {/* Google Maps JS API target or Embed fallback */}
          {useJsApi ? (
            <div ref={mapContainerRef} className="w-full h-full" />
          ) : (
            <iframe
              title={`Map of ${activeLocation.name}`}
              src={getEmbedMapUrl({ lat: activeLocation.lat, lng: activeLocation.lng, zoom: 15 })}
              className="w-full h-full border-0"
              loading="lazy"
              allowFullScreen
              onLoad={() => setMapLoading(false)}
            />
          )}

          {/* Facility Location Tag Overlay */}
          <div className="absolute top-4 left-4 z-10 pointer-events-none flex flex-wrap gap-2">
            <span className="tag tag-gold shadow-sm font-semibold">{activeLocation.area}</span>
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-navy-950/85 text-white text-[11px] font-semibold backdrop-blur shadow-sm">
              <MapPinIcon className="h-3 w-3 text-gold-400" />
              {activeLocation.name}
            </span>
          </div>
        </div>

        {/* ------------------------------------------------------------- */}
        {/* Right Column: Facility Details & Turn-by-Turn Directions       */}
        {/* ------------------------------------------------------------- */}
        <div className="flex-1 flex flex-col overflow-y-auto p-5 sm:p-7 lg:p-8 max-h-[calc(100vh-260px)] lg:max-h-[92vh]">
          {/* Header Title */}
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs uppercase tracking-wider font-semibold text-gold-600">
                {activeLocation.area} Location
              </span>
            </div>
            <h2
              id="location-panel-title"
              className="font-display text-xl sm:text-2xl font-bold text-navy-900 mt-1"
            >
              {activeLocation.name}
            </h2>
          </div>

          {/* Facility Key Details Card */}
          <div className="mt-4 p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2.5 text-xs sm:text-sm text-slate-700">
            <div className="flex items-start gap-2.5">
              <MapPinIcon className="mt-0.5 h-4 w-4 shrink-0 text-gold-600" />
              <address className="not-italic leading-relaxed text-slate-800">
                {activeLocation.address}
              </address>
            </div>

            {activeLocation.landmark && (
              <div className="flex items-center gap-2.5 text-slate-600">
                <span className="font-semibold text-navy-900 shrink-0">Landmark:</span>
                <span>{activeLocation.landmark}</span>
              </div>
            )}

            {activeLocation.phone && (
              <div className="flex items-center gap-2.5">
                <PhoneIcon className="h-4 w-4 shrink-0 text-gold-600" />
                <a
                  href={`tel:${activeLocation.phone.replace(/\s/g, '')}`}
                  className="font-semibold text-navy-900 hover:text-gold-600 underline-offset-2 hover:underline"
                >
                  {activeLocation.phone}
                </a>
              </div>
            )}

            {activeLocation.openingHours && (
              <div className="flex items-center gap-2.5 text-slate-600">
                <ClockIcon className="h-4 w-4 shrink-0 text-gold-600" />
                <span>{activeLocation.openingHours}</span>
              </div>
            )}

            {activeLocation.parkingInfo && (
              <div className="pt-2 border-t border-slate-200/60 text-xs text-slate-600 flex items-start gap-1.5">
                <span className="font-semibold text-navy-900 shrink-0">Parking:</span>
                <span>{activeLocation.parkingInfo}</span>
              </div>
            )}
          </div>

          {/* Quick Action Buttons */}
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-2">
            <a
              href={gmapsDirectionsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-base bg-gold-500 text-navy-950 hover:bg-gold-400 py-2 text-xs sm:text-sm font-semibold justify-center inline-flex items-center gap-1.5"
            >
              Open in Google Maps
              <ArrowRightIcon className="h-3.5 w-3.5" />
            </a>

            <button
              type="button"
              onClick={handleCopyAddress}
              className="btn-base border border-slate-300 bg-white text-navy-900 hover:bg-slate-50 py-2 text-xs sm:text-sm font-medium justify-center"
            >
              Copy Address
            </button>

            <button
              type="button"
              onClick={handleShareLocation}
              className="btn-base border border-slate-300 bg-white text-navy-900 hover:bg-slate-50 py-2 text-xs sm:text-sm font-medium justify-center"
            >
              Share Location
            </button>
          </div>

          {/* ----------------------------------------------------------- */}
          {/* Directions & Routing Engine Section                         */}
          {/* ----------------------------------------------------------- */}
          <div className="mt-6 pt-5 border-t border-slate-200">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-navy-900 text-sm sm:text-base">Get Directions</h3>
              <button
                type="button"
                onClick={handleUseCurrentLocation}
                disabled={locatingUser}
                className="text-xs font-semibold text-gold-600 hover:text-gold-700 underline inline-flex items-center gap-1 disabled:opacity-50"
              >
                {locatingUser ? 'Locating you…' : '📍 Use my current location'}
              </button>
            </div>

            {/* Geolocation Privacy Notice */}
            <p className="mt-1 text-[11px] text-slate-500">
              Your location is used only in your browser to calculate routes and is never stored or transmitted.
            </p>

            {/* Geolocation Error Alert */}
            {geoError && (
              <div className="mt-2.5 p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-xs leading-normal">
                {geoError}
              </div>
            )}

            {/* Search Input with Autocomplete */}
            <div className="relative mt-3">
              <label htmlFor="origin-input" className="sr-only">
                Enter starting point
              </label>
              <div className="relative">
                <input
                  id="origin-input"
                  ref={inputRef}
                  type="text"
                  value={startPoint}
                  onChange={handleInputChange}
                  onFocus={() => {
                    if (suggestions.length > 0) setShowSuggestions(true);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      setShowSuggestions(false);
                      triggerRouteCalculation();
                    }
                  }}
                  placeholder="Enter starting point (e.g. Airport, Railway Station)…"
                  className="field pr-20 text-xs sm:text-sm"
                />

                <button
                  type="button"
                  onClick={() => {
                    setShowSuggestions(false);
                    triggerRouteCalculation();
                  }}
                  disabled={!startPoint.trim() || calculating}
                  className="absolute right-1.5 top-1.5 bottom-1.5 px-3 rounded-lg bg-navy-900 text-white text-xs font-semibold hover:bg-navy-800 disabled:opacity-40 transition-colors"
                >
                  {calculating ? 'Routing…' : 'Route'}
                </button>
              </div>

              {/* Suggestions Dropdown */}
              {showSuggestions && suggestions.length > 0 && (
                <ul
                  role="listbox"
                  className="absolute top-full left-0 right-0 z-30 mt-1 max-h-52 overflow-y-auto rounded-xl border border-slate-200 bg-white p-1.5 shadow-lg text-xs"
                >
                  {suggestions.map((item, idx) => (
                    <li
                      key={idx}
                      role="option"
                      aria-selected={false}
                      onClick={() => handleSelectSuggestion(item)}
                      className="cursor-pointer rounded-lg p-2 hover:bg-slate-100 transition-colors flex flex-col"
                    >
                      <span className="font-semibold text-navy-900">{item.name}</span>
                      {item.description && (
                        <span className="text-[11px] text-slate-500 truncate">{item.description}</span>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Travel Mode Selector Tabs */}
            <div
              className="mt-3 grid grid-cols-4 gap-1 p-1 bg-slate-100 rounded-xl"
              role="tablist"
              aria-label="Travel Mode"
            >
              {TRAVEL_MODES.map((mode) => {
                const isActive = travelMode === mode.id;
                return (
                  <button
                    key={mode.id}
                    type="button"
                    role="tab"
                    aria-selected={isActive}
                    onClick={() => handleModeChange(mode.id)}
                    className={`py-1.5 px-2 rounded-lg text-xs font-semibold transition-colors duration-150 flex items-center justify-center gap-1 ${
                      isActive
                        ? 'bg-white text-navy-900 shadow-sm'
                        : 'text-slate-600 hover:text-navy-900 hover:bg-white/60'
                    }`}
                  >
                    <span>{mode.icon}</span>
                    <span className="hidden sm:inline">{mode.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Calculating Route Indicator */}
            {calculating && (
              <div className="mt-4 flex items-center justify-center gap-2 p-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-600 text-xs">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-gold-500 border-t-transparent" />
                <span>Calculating fastest route…</span>
              </div>
            )}

            {/* Route Error Alert */}
            {routeError && (
              <div className="mt-3 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs">
                <p className="font-semibold">{routeError}</p>
                <a
                  href={gmapsDirectionsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-1.5 inline-block font-semibold text-gold-700 underline"
                >
                  View full route on Google Maps &rarr;
                </a>
              </div>
            )}

            {/* Calculated Route Summary & Turn-by-Turn Directions */}
            {routeResult && !calculating && (
              <div className="mt-4 rounded-xl border border-gold-500/30 bg-gold-50/20 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs uppercase tracking-wider font-semibold text-slate-500">
                      Estimated Travel
                    </span>
                    <div className="flex items-baseline gap-2 mt-0.5">
                      <span className="font-display text-2xl font-bold text-navy-900">
                        {routeResult.duration}
                      </span>
                      <span className="text-sm font-semibold text-slate-600">
                        ({routeResult.distance})
                      </span>
                    </div>
                  </div>

                  <a
                    href={gmapsDirectionsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-base bg-navy-900 text-white hover:bg-navy-800 px-3.5 py-1.5 text-xs font-semibold"
                  >
                    Start Navigation
                  </a>
                </div>

                {/* Turn-by-turn collapsible trigger */}
                {routeResult.steps && routeResult.steps.length > 0 && (
                  <div className="border-t border-gold-500/20 pt-2.5">
                    <button
                      type="button"
                      onClick={() => setShowSteps((s) => !s)}
                      className="flex items-center justify-between w-full text-xs font-semibold text-navy-900 hover:text-gold-600"
                    >
                      <span>
                        {showSteps ? 'Hide' : 'Show'} Turn-by-Turn Steps ({routeResult.steps.length})
                      </span>
                      {showSteps ? (
                        <ChevronUpIcon className="h-4 w-4" />
                      ) : (
                        <ChevronDownIcon className="h-4 w-4" />
                      )}
                    </button>

                    {showSteps && (
                      <ol className="mt-3 space-y-2.5 text-xs text-slate-700 list-decimal list-inside pl-1">
                        {routeResult.steps.map((step, idx) => (
                          <li key={idx} className="leading-relaxed">
                            <span className="font-medium text-navy-950">{step.instruction}</span>
                            {step.distance && (
                              <span className="ml-1 text-[11px] text-slate-500">
                                ({step.distance})
                              </span>
                            )}
                          </li>
                        ))}
                      </ol>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default LocationPanel;
