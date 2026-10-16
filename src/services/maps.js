// ---------------------------------------------------------------------------
// /src/services/maps.js — Map & Directions Service Provider
//
// Encapsulates Google Maps JavaScript API (with Directions and Places libraries)
// and handles zero-config fallbacks (Embed Map, Haversine routing, Places suggestions,
// and Universal Google Maps direction links).
// ---------------------------------------------------------------------------

let googleMapsScriptPromise = null;

/**
 * Check if a Google Maps API Key is provided via Vite environment variable
 */
export function hasGoogleMapsKey() {
  const key = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
  return Boolean(key && typeof key === 'string' && key.trim().length > 5 && !key.includes('YOUR_'));
}

/**
 * Lazy-load Google Maps JavaScript API with Places and Geometry libraries
 */
export function loadGoogleMaps() {
  if (typeof window === 'undefined') return Promise.resolve(null);
  if (window.google && window.google.maps) {
    return Promise.resolve(window.google.maps);
  }

  if (!hasGoogleMapsKey()) {
    return Promise.resolve(null);
  }

  if (googleMapsScriptPromise) {
    return googleMapsScriptPromise;
  }

  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY.trim();

  googleMapsScriptPromise = new Promise((resolve) => {
    // Check if script element already exists
    const existing = document.querySelector('script[data-gmaps-loader="frcc"]');
    if (existing) {
      if (window.google?.maps) {
        resolve(window.google.maps);
        return;
      }
      existing.addEventListener('load', () => resolve(window.google?.maps || null));
      existing.addEventListener('error', () => resolve(null));
      return;
    }

    const script = document.createElement('script');
    script.setAttribute('data-gmaps-loader', 'frcc');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places,geometry&loading=async`;
    script.async = true;
    script.defer = true;

    script.onload = () => {
      resolve(window.google?.maps || null);
    };

    script.onerror = (err) => {
      console.warn('Google Maps API failed to load; using fallback provider.', err);
      resolve(null);
    };

    document.head.appendChild(script);
  });

  return googleMapsScriptPromise;
}

/**
 * Generate universal Google Maps Directions URL (works on all devices without an API key)
 * @param {{ destination: { lat: number, lng: number } | string, origin?: string, travelMode?: string }} options
 */
export function getGoogleMapsDirectionsUrl({ destination, origin, travelMode = 'driving' }) {
  const destStr = typeof destination === 'object' && destination.lat && destination.lng
    ? `${destination.lat},${destination.lng}`
    : String(destination);

  let url = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destStr)}`;

  if (origin && origin.trim()) {
    url += `&origin=${encodeURIComponent(origin.trim())}`;
  }

  const modeMap = {
    driving: 'driving',
    'two-wheeler': 'two-wheeler',
    two_wheeler: 'two-wheeler',
    walking: 'walking',
    transit: 'transit',
  };

  const selectedMode = modeMap[travelMode.toLowerCase()] || 'driving';
  if (selectedMode) {
    url += `&travelmode=${selectedMode}`;
  }

  return url;
}

/**
 * Generate free interactive Google Maps embed URL
 */
export function getEmbedMapUrl({ lat, lng, zoom = 15 }) {
  return `https://maps.google.com/maps?q=${lat},${lng}&hl=en&z=${zoom}&output=embed`;
}

/**
 * Great-circle distance between two coordinates in kilometers (Haversine formula)
 */
export function calculateHaversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
}

/**
 * Estimate travel time based on distance and mode
 */
export function estimateDuration(distanceKm, mode = 'driving') {
  // Average speeds in km/h accounting for urban & regional Indian traffic
  const speeds = {
    driving: 35,
    'two-wheeler': 32,
    two_wheeler: 32,
    transit: 25,
    walking: 4.8,
  };

  const speed = speeds[mode.toLowerCase()] || speeds.driving;
  const hours = distanceKm / speed;
  const totalMinutes = Math.max(2, Math.round(hours * 60));

  if (totalMinutes < 60) {
    return `${totalMinutes} mins`;
  }

  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return m > 0 ? `${h} hr ${m} mins` : `${h} hr`;
}

/**
 * Curated place suggestions for Vijayawada, Hyderabad, Amaravati & major transit hubs
 */
const DEFAULT_SUGGESTIONS = [
  { name: 'Current Location', description: 'Your current GPS location', isGps: true },
  { name: 'Vijayawada Railway Station', description: 'Railway Station Road, Hanumanpet, Vijayawada' },
  { name: 'Pandit Nehru Bus Station (PNBS)', description: 'Beside Krishna River, Vijayawada' },
  { name: 'Vijayawada International Airport (Gannavaram)', description: 'NH 16, Gannavaram, AP' },
  { name: 'Benz Circle', description: 'M.G. Road, Vijayawada' },
  { name: 'Prakasam Barrage', description: 'Krishna River, Vijayawada' },
  { name: 'Hitec City Metro Station', description: 'Madhapur, Hyderabad, Telangana' },
  { name: 'Rajiv Gandhi International Airport (HYD)', description: 'Shamshabad, Hyderabad' },
  { name: 'Jubilee Hills Check Post', description: 'Road No 36, Jubilee Hills, Hyderabad' },
  { name: 'Inorbit Mall Madhapur', description: 'Mindspace, Madhapur, Hyderabad' },
  { name: 'Gachibowli Stadium', description: 'Old Mumbai Highway, Gachibowli, Hyderabad' },
  { name: 'Amaravati Secretariat', description: 'Velagapudi, Amaravati, Andhra Pradesh' },
  { name: 'Guntur Junction Railway Station', description: 'Station Road, Sambasiva Pet, Guntur' },
];

/**
 * Autocomplete place query with Google Places Autocomplete or local fallback
 */
export async function getPlaceSuggestions(query) {
  if (!query || !query.trim()) {
    return DEFAULT_SUGGESTIONS.slice(0, 6);
  }

  const cleanQ = query.trim().toLowerCase();

  // Try Google Places Autocomplete if available
  if (window.google?.maps?.places?.AutocompleteService) {
    try {
      const service = new window.google.maps.places.AutocompleteService();
      const predictions = await new Promise((resolve) => {
        service.getPlacePredictions(
          {
            input: query,
            componentRestrictions: { country: 'in' },
          },
          (results, status) => {
            if (status === window.google.maps.places.PlacesServiceStatus.OK && results) {
              resolve(results);
            } else {
              resolve([]);
            }
          }
        );
      });

      if (predictions && predictions.length > 0) {
        return predictions.map((p) => ({
          name: p.structured_formatting?.main_text || p.description,
          description: p.structured_formatting?.secondary_text || p.description,
          placeId: p.place_id,
        }));
      }
    } catch {
      // Fall through to local fallback
    }
  }

  // Local matching
  const matched = DEFAULT_SUGGESTIONS.filter(
    (s) => s.name.toLowerCase().includes(cleanQ) || s.description.toLowerCase().includes(cleanQ)
  );

  if (matched.length > 0) {
    return matched;
  }

  return [
    { name: query, description: `Search directions from "${query}"` },
    ...DEFAULT_SUGGESTIONS.slice(0, 4),
  ];
}

/**
 * Calculate route instructions, distance, and duration
 * @param {{ origin: string | { lat: number, lng: number }, destination: { lat: number, lng: number, address: string, name: string }, travelMode: string }} options
 */
export async function calculateRoute({ origin, destination, travelMode = 'DRIVING' }) {
  if (!origin) {
    throw new Error('Please specify a starting location.');
  }

  // 1. Try Google Maps DirectionsService if script is loaded
  if (window.google?.maps?.DirectionsService) {
    try {
      const directionsService = new window.google.maps.DirectionsService();

      let originQuery = origin;
      if (typeof origin === 'object' && origin.lat && origin.lng) {
        originQuery = new window.google.maps.LatLng(origin.lat, origin.lng);
      }

      const destQuery = new window.google.maps.LatLng(destination.lat, destination.lng);

      const modeKey = travelMode.toUpperCase();
      let googleMode = window.google.maps.TravelMode.DRIVING;

      if (modeKey === 'WALKING') googleMode = window.google.maps.TravelMode.WALKING;
      else if (modeKey === 'TRANSIT') googleMode = window.google.maps.TravelMode.TRANSIT;
      else if (modeKey === 'TWO_WHEELER' && window.google.maps.TravelMode.TWO_WHEELER) {
        googleMode = window.google.maps.TravelMode.TWO_WHEELER;
      }

      const response = await new Promise((resolve, reject) => {
        directionsService.route(
          {
            origin: originQuery,
            destination: destQuery,
            travelMode: googleMode,
          },
          (result, status) => {
            if (status === window.google.maps.DirectionsStatus.OK) {
              resolve(result);
            } else {
              reject(new Error(`Directions status: ${status}`));
            }
          }
        );
      });

      const leg = response.routes[0]?.legs[0];
      if (leg) {
        const steps = (leg.steps || []).map((step) => ({
          instruction: step.instructions ? step.instructions.replace(/<[^>]+>/g, ' ') : 'Proceed along route',
          distance: step.distance?.text || '',
          duration: step.duration?.text || '',
        }));

        return {
          isGoogleRoute: true,
          googleResponse: response,
          distance: leg.distance?.text || '',
          duration: leg.duration?.text || '',
          distanceKm: leg.distance?.value ? leg.distance.value / 1000 : 0,
          steps,
        };
      }
    } catch {
      // Fallback calculation below
    }
  }

  // 2. Intelligent offline / fallback route calculation
  let distanceKm = 10;
  if (typeof origin === 'object' && origin.lat && origin.lng) {
    distanceKm = calculateHaversineDistance(origin.lat, origin.lng, destination.lat, destination.lng);
    // Multiply by 1.25 road curvature factor
    distanceKm = Math.round(distanceKm * 1.25 * 10) / 10;
  } else {
    // Generate simulated distance based on city
    const originStr = String(origin).toLowerCase();
    if (originStr.includes('hyderabad') && destination.area === 'Vijayawada') {
      distanceKm = 275;
    } else if (originStr.includes('vijayawada') && destination.area === 'Hyderabad') {
      distanceKm = 275;
    } else if (originStr.includes('airport')) {
      distanceKm = 22;
    } else if (originStr.includes('station')) {
      distanceKm = 4.5;
    } else {
      distanceKm = 8.5;
    }
  }

  const durationStr = estimateDuration(distanceKm, travelMode);

  // Generate turn steps text alternative
  const originLabel = typeof origin === 'object' ? 'Your current location' : String(origin);
  const steps = [
    {
      instruction: `Head towards the main arterial road from ${originLabel}.`,
      distance: `${Math.max(0.5, Math.round(distanceKm * 0.1 * 10) / 10)} km`,
      duration: estimateDuration(distanceKm * 0.1, travelMode),
    },
    {
      instruction: `Follow primary corridor towards ${destination.landmark || destination.area}.`,
      distance: `${Math.round(distanceKm * 0.7 * 10) / 10} km`,
      duration: estimateDuration(distanceKm * 0.7, travelMode),
    },
    {
      instruction: `Turn into ${destination.address.split(',')[1]?.trim() || destination.address.split(',')[0]}.`,
      distance: `${Math.max(0.3, Math.round(distanceKm * 0.15 * 10) / 10)} km`,
      duration: estimateDuration(distanceKm * 0.15, travelMode),
    },
    {
      instruction: `Arrive at ${destination.name}. Parking: ${destination.parkingInfo}`,
      distance: '100 m',
      duration: '1 min',
    },
  ];

  return {
    isGoogleRoute: false,
    distance: `${distanceKm} km`,
    duration: durationStr,
    distanceKm,
    steps,
  };
}

/**
 * Ask browser for user's GPS coordinates
 */
export function getUserLocation() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation is not supported by your browser.'));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        resolve({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        });
      },
      (err) => {
        reject(err);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000,
      }
    );
  });
}

export default {
  hasGoogleMapsKey,
  loadGoogleMaps,
  getGoogleMapsDirectionsUrl,
  getEmbedMapUrl,
  calculateHaversineDistance,
  estimateDuration,
  getPlaceSuggestions,
  calculateRoute,
  getUserLocation,
};
