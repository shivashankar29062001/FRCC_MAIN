import { createContext, useContext, useState, useCallback } from 'react';
import { getLocationById } from '../../config/locations.js';

const LocationModalContext = createContext(null);

export function LocationModalProvider({ children }) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeLocation, setActiveLocation] = useState(null);

  const openLocation = useCallback((locationIdOrData) => {
    if (!locationIdOrData) {
      setActiveLocation(getLocationById('vja-club'));
      setIsOpen(true);
      return;
    }

    if (typeof locationIdOrData === 'string') {
      const loc = getLocationById(locationIdOrData);
      setActiveLocation(loc);
      setIsOpen(true);
      return;
    }

    if (typeof locationIdOrData === 'object') {
      if (locationIdOrData.id && !locationIdOrData.lat) {
        const full = getLocationById(locationIdOrData.id);
        setActiveLocation({ ...full, ...locationIdOrData });
      } else {
        // Fallback default coordinates if not set
        const resolved = getLocationById(locationIdOrData.address || locationIdOrData.name || 'vja');
        setActiveLocation({
          ...resolved,
          ...locationIdOrData,
          lat: locationIdOrData.lat || resolved.lat,
          lng: locationIdOrData.lng || resolved.lng,
        });
      }
      setIsOpen(true);
    }
  }, []);

  const closeLocation = useCallback(() => {
    setIsOpen(false);
  }, []);

  const value = {
    isOpen,
    activeLocation,
    openLocation,
    closeLocation,
  };

  return (
    <LocationModalContext.Provider value={value}>
      {children}
    </LocationModalContext.Provider>
  );
}

export function useLocationModal() {
  const context = useContext(LocationModalContext);
  if (!context) {
    throw new Error('useLocationModal must be used within a LocationModalProvider');
  }
  return context;
}

export default LocationModalContext;
