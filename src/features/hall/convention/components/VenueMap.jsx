import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Custom gold pin
const makeIcon = () => L.divIcon({
  html: `<div style="background:#c9a227;width:26px;height:26px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);border:3px solid #1e243b;box-shadow:0 2px 8px rgba(0,0,0,.4)"></div>`,
  className: '', iconSize: [26, 26], iconAnchor: [13, 26],
});

export default function VenueMap({ lat, lng, name, address }) {
  const ref = useRef(null);
  const mapRef = useRef(null);

  useEffect(() => {
    if (!ref.current || mapRef.current) return;
    const map = L.map(ref.current, { scrollWheelZoom: false }).setView([lat, lng], 15);
    mapRef.current = map;

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '© OpenStreetMap contributors',
    }).addTo(map);

    L.marker([lat, lng], { icon: makeIcon() }).addTo(map)
      .bindPopup(`<strong>${name}</strong><br>${address}`).openPopup();

    return () => { map.remove(); mapRef.current = null; };
  }, [lat, lng, name, address]);

  return (
    <div className="relative">
      <div ref={ref} className="h-72 sm:h-80 w-full rounded-lg z-0" role="application" aria-label={`Map showing ${name}`} />
      {mapRef.current === null && (
        <a href={`https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=17/${lat}/${lng}`}
          target="_blank" rel="noreferrer"
          className="absolute inset-0 flex items-center justify-center bg-navy/5 rounded-lg text-navy underline">
          Open in OpenStreetMap
        </a>
      )}
      <p className="text-xs text-gray-500 mt-1">Map data © OpenStreetMap contributors.</p>
    </div>
  );
}
