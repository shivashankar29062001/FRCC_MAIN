import { useEffect, useCallback, useState } from 'react';
import { SmartImage } from './HallCard';

export default function ImageCarousel({ images, alt, alts }) {
  const [idx, setIdx] = useState(0);
  const [lightbox, setLightbox] = useState(false);
  const list = images && images.length ? images : ['/images/placeholder.svg'];

  const go = useCallback((d) => setIdx(i => (i + d + list.length) % list.length), [list.length]);

  // Arrow keys work on desktop in the lightbox (and on the carousel when focused)
  useEffect(() => {
    if (!lightbox) return;
    const onKey = (e) => {
      if (e.key === 'ArrowRight') go(1);
      if (e.key === 'ArrowLeft') go(-1);
      if (e.key === 'Escape') setLightbox(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [lightbox, go]);

  // Swipe on mobile
  const [touchX, setTouchX] = useState(null);
  const onTouchStart = (e) => setTouchX(e.touches[0].clientX);
  const onTouchEnd = (e) => {
    if (touchX == null) return;
    const dx = e.changedTouches[0].clientX - touchX;
    if (Math.abs(dx) > 40) go(dx < 0 ? 1 : -1);
    setTouchX(null);
  };

  return (
    <div>
      {/* Main image — fixed 16:9 for detail view */}
      <div className="relative" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
        <SmartImage
          src={list[idx]}
          alt={alts && alts[idx] ? alts[idx] : `${alt} – view ${idx + 1} of ${list.length}`}
          className="w-full aspect-video cursor-zoom-in"
          sizes="(max-width: 768px) 100vw, 66vw"
          imgClassName="rounded-lg"
        />
        <button onClick={() => go(-1)} aria-label="Previous image"
          className="absolute left-2 top-1/2 -translate-y-1/2 bg-navy/70 text-gold rounded-full w-10 h-10 text-xl">‹</button>
        <button onClick={() => go(1)} aria-label="Next image"
          className="absolute right-2 top-1/2 -translate-y-1/2 bg-navy/70 text-gold rounded-full w-10 h-10 text-xl">›</button>
        <button onClick={() => setLightbox(true)} aria-label="View fullscreen"
          className="absolute bottom-2 right-2 bg-navy/70 text-gold rounded px-3 py-1 text-sm">⛶ Fullscreen</button>
        <span className="absolute top-2 left-2 bg-navy/70 text-gold text-xs rounded px-2 py-0.5">{idx + 1}/{list.length}</span>
      </div>

      {/* Thumbnails */}
      {list.length > 1 && (
        <div className="flex gap-2 mt-3 overflow-x-auto pb-1">
          {list.map((im, i) => (
            <button key={im} onClick={() => setIdx(i)} aria-label={`Show image ${i + 1} of ${alt}`}
              className={`shrink-0 rounded overflow-hidden border-2 ${i === idx ? 'border-gold' : 'border-transparent'}`}>
              <SmartImage src={im} alt={`${alt} thumbnail ${i + 1}`} className="w-24 h-16" sizes="96px" />
            </button>
          ))}
        </div>
      )}

      {/* Fullscreen lightbox */}
      {lightbox && (
        <div className="fixed inset-0 bg-navy-900/95 z-50 flex items-center justify-center"
          onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
          <button onClick={() => setLightbox(false)} aria-label="Close fullscreen"
            className="absolute top-4 right-4 text-gold text-3xl">×</button>
          <button onClick={() => go(-1)} aria-label="Previous image"
            className="absolute left-4 text-gold text-5xl">‹</button>
          <img src={list[idx]} alt={`${alt} – fullscreen view ${idx + 1}`} className="max-h-[85vh] max-w-[90vw] object-contain" />
          <button onClick={() => go(1)} aria-label="Next image"
            className="absolute right-4 text-gold text-5xl">›</button>
          <span className="absolute bottom-6 text-gold text-sm">{idx + 1} / {list.length} · ← → to navigate, Esc to close</span>
        </div>
      )}
    </div>
  );
}
