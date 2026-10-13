// LocationContext - Manages selected location across the app
// Persists selection in localStorage

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { getLocation } from '../../services/dataService.js';

const LocationContext = createContext(null);

const STORAGE_KEY = 'frcc.selectedLocation.v1';

export function LocationProvider({ children }) {
  const [location, setLocationState] = useState(() => {
    // Initialize from localStorage or default
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) return saved;
    } catch {
      // localStorage unavailable
    }
    return 'hyd'; // Default fallback
  });

  const [locationData, setLocationData] = useState(null);
  const [loading, setLoading] = useState(true);

  // Load location data when location changes
  useEffect(() => {
    let mounted = true;
    async function loadLocationData() {
      setLoading(true);
      try {
        const data = await getLocation(location);
        if (mounted) {
          setLocationData(data);
        }
      } catch (err) {
        console.error('Failed to load location data:', err);
        if (mounted) {
          setLocationData(null);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }
    loadLocationData();
    return () => {
      mounted = false;
    };
  }, [location]);

  // Persist location selection
  const setLocation = useCallback((newLocationId) => {
    try {
      localStorage.setItem(STORAGE_KEY, newLocationId);
    } catch {
      // Ignore storage errors
    }
    setLocationState(newLocationId);
  }, []);

  const value = {
    locationId: location,
    location: locationData,
    loading,
    setLocation,
    isDefault: location === 'hyd',
  };

  return (
    <LocationContext.Provider value={value}>
      {children}
    </LocationContext.Provider>
  );
}

export function useLocationContext() {
  const context = useContext(LocationContext);
  if (!context) {
    throw new Error('useLocationContext must be used within a LocationProvider');
  }
  return context;
}