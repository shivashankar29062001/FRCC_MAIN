import { useState, useEffect, useRef, useCallback } from 'react';
import { inr } from '../utils/format';

const FALLBACK = '/images/placeholder.svg';

// Build webp/jpg pair for a given local image path ending in .jpg
export function imagePair(src) {
  if (!src || !src.startsWith('/images/')) return { src, webp: null };
  const webp = src.replace(/\.jpg$/, '.webp');
  return { src, webp };
}

export function SmartImage({ src, alt, className = '', imgClassName = '', sizes = '(max-width: 768px) 100vw, 33vw', eager = false, onError: onErrorProp }) {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);
  const imgRef = useRef(null);
  const { src: jpg, webp } = imagePair(src);

  useEffect(() => {
    const img = imgRef.current;
    if (!img) return;
    // New source handed to us — clear an error left over from the previous one
    setError(false);
    // If image is already cached and complete, mark as loaded immediately
    if (img.complete && img.naturalWidth > 0) {
      setLoaded(true);
      return;
    }
    // Otherwise wait for load
    const onLoad = () => { setLoaded(true); setError(false); };
    const onErr = () => { setError(true); setLoaded(true); if (onErrorProp) onErrorProp(); };
    img.addEventListener('load', onLoad);
    img.addEventListener('error', onErr);
    return () => {
      img.removeEventListener('load', onLoad);
      img.removeEventListener('error', onErr);
    };
  }, [src, onErrorProp]);

  return (
    <div className={`relative overflow-hidden ${className}`}>
      {error && <div className="absolute inset-0 bg-stone-100 flex items-center justify-center" aria-hidden="true">
        <span className="text-xs text-stone-500">Photo coming soon</span>
      </div>}
      <picture>
        {webp && !error && <source srcSet={webp} type="image/webp" />}
        <img
          ref={imgRef}
          src={error ? FALLBACK : jpg}
          alt={alt}
          loading={eager ? 'eager' : 'lazy'}
          decoding="async"
          sizes={sizes}
          className={`w-full h-full object-cover transition-opacity duration-300 ${loaded && !error ? 'opacity-100' : 'opacity-0'} ${imgClassName}`}
        />
      </picture>
    </div>
  );
}

export default function HallCard({ hall, onSelect, selected, actionLabel = 'Select', eager = false, guests = 0 }) {
  const [idx, setIdx] = useState(0);
  // Tracks images that failed to load, so the dots only count the ones that loaded
  const [failed, setFailed] = useState({});
  // Use images array directly (already full URLs from API)
  const imgs = hall.images && hall.images.length ? hall.images : [FALLBACK];
  const cap = hall.capacity;
  const guestsNum = Number(guests) || 0;
  const countActive = guestsNum >= 30;
  const tooSmall = countActive && cap < guestsNum;
  const fits = countActive && !tooSmall;
  const handleImgError = useCallback(() => setFailed(f => ({ ...f, [idx]: true })), [idx]);
  const loadedCount = imgs.reduce((n, _, i) => n + (failed[i] ? 0 : 1), 0);
  return (
    <div className={`bg-white rounded-lg shadow overflow-hidden border-2 transition ${tooSmall ? 'opacity-60' : ''} ${selected ? 'border-gold' : 'border-transparent'}`}>
      <div className="relative">
        <SmartImage
          src={imgs[idx]}
          alt={hall.imageAlts && hall.imageAlts[idx] ? hall.imageAlts[idx] : `${hall.name} – photo ${idx + 1} of ${imgs.length}`}
          className="aspect-video"
          eager={eager}
          onError={handleImgError}
        />
        {loadedCount > 1 && (
          <div className="flex justify-center gap-1 py-1">
            {imgs.map((im, i) => failed[i] ? null : (
              <button key={im} onClick={() => setIdx(i)} aria-label={`Show photo ${i + 1} of ${hall.name}`}
                className={`w-2.5 h-2.5 rounded-full ${i === idx ? 'bg-gold' : 'bg-navy/40 hover:bg-navy/60'}`} />
            ))}
          </div>
        )}
        <span className="absolute top-2 left-2 bg-gold text-navy text-xs font-semibold rounded px-2 py-0.5">
          {hall.type === 'NON_AC' ? 'Non-AC' : hall.type === 'BOARD_ROOM' ? 'Board Room' : 'AC'}
        </span>
        {fits && (
          <span className="absolute top-2 right-2 bg-green-700 text-white text-xs font-semibold rounded px-2 py-0.5">✓ Fits your group</span>
        )}
      </div>
      <div className="p-4">
        <h3 className="text-lg font-bold">{hall.name}</h3>
        <p className="text-sm text-gray-600">{hall.venueName || hall.areaName || hall.area} • {hall.cityName || hall.city || ''} • Capacity: up to {cap.toLocaleString('en-IN')} guests</p>
        {tooSmall && <p className="mt-1 text-xs font-semibold text-red-600">Max {cap.toLocaleString('en-IN')} guests</p>}
        <p className="mt-1 font-semibold text-navy">
          {hall.displayPricePerHour || inr(hall.pricePerHour)} <span className="text-gray-500 font-normal">• {hall.displayPricePerDay || inr(hall.pricePerDay)}</span>
        </p>
        <div className="flex flex-wrap gap-1 mt-2">
          {hall.amenities.slice(0, 4).map(a => <span key={a} className="text-xs bg-navy-100 text-navy rounded-full px-2 py-0.5">{a}</span>)}
        </div>
        {onSelect && (
          <button onClick={() => onSelect(hall)} disabled={tooSmall}
            className={`mt-3 w-full rounded py-2 font-semibold ${tooSmall ? 'bg-gray-300 text-gray-500 cursor-not-allowed' : selected ? 'bg-gold text-navy' : 'bg-navy text-gold hover:bg-navy-800'}`}>
            {tooSmall ? `Max ${cap.toLocaleString('en-IN')} guests` : selected ? '✓ Selected' : actionLabel}
          </button>
        )}
      </div>
    </div>
  );
}