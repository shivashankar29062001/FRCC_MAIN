import { useState, useEffect, useRef, useMemo } from 'react';
import { Breadcrumbs } from '../components/ui/sections.jsx';
import { XIcon, ChevronLeftIcon, ChevronRightIcon } from '../components/ui/icons.jsx';
import { galleryItems as baseGalleryItems } from '../data/gallery.js';

// ---------------------------------------------------------------------------
// /gallery — FRCC Public Gallery
// Chips: All, Launch event, Posters
// Masonry layout (columns-1 md:columns-2 lg:columns-3) with natural image ratio (no cropping)
// Full-screen viewer with zoom (buttons, double-click, pinch), swipe, counter, focus trap
// Pagination: 12 items first + "Load more"
// ---------------------------------------------------------------------------

const CATEGORY_TABS = [
  { id: 'all', label: 'All' },
  { id: 'Launch event', label: 'Launch event' },
  { id: 'Posters', label: 'Posters' },
];

const PAGE_SIZE = 12;

function GalleryTile({ item, onClick }) {
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      }}
      className="group block w-full rounded-[14px] overflow-hidden border-2 border-transparent hover:border-gold-500 hover:-translate-y-1 transition-all duration-200 cursor-pointer bg-navy-950 focus:outline-none focus:ring-2 focus:ring-gold-500 break-inside-avoid mb-4 shadow-sm"
      aria-label={`View photo: ${item.title || item.caption}`}
    >
      {failed ? (
        <div
          className="relative w-full aspect-[3/4] flex flex-col items-center justify-center p-6 text-center border border-gold-500/40 rounded-[12px]"
          style={{ background: 'linear-gradient(135deg, #0b1a33 0%, #12305a 100%)' }}
          role="img"
          aria-label={item.title || item.caption}
        >
          <span className="block text-xs font-semibold uppercase tracking-[0.2em] text-gold-400">
            {item.caption || 'FRCC Gallery'}
          </span>
          <span className="mt-2 block text-sm font-medium text-slate-300">
            {item.title || item.caption}
          </span>
        </div>
      ) : (
        <div className="relative w-full bg-navy-900/40">
          {!loaded && (
            <div
              className="w-full aspect-[3/4] bg-navy-900/80 animate-pulse rounded-[12px] flex items-center justify-center min-h-[220px]"
              aria-hidden="true"
            >
              <div className="h-6 w-6 rounded-full border-2 border-gold-500/40 border-t-gold-400 animate-spin" />
            </div>
          )}
          <img
            src={item.src}
            alt={item.alt || item.title || item.caption}
            loading="lazy"
            decoding="async"
            onLoad={() => setLoaded(true)}
            onError={() => setFailed(true)}
            className={`w-full h-auto block rounded-[12px] object-contain transition-opacity duration-300 ${
              loaded ? 'opacity-100' : 'opacity-0 absolute inset-0'
            }`}
          />
        </div>
      )}
    </div>
  );
}

function GalleryLightbox({ items, currentIndex, onClose, onPrev, onNext }) {
  const lightboxRef = useRef(null);
  const closeButtonRef = useRef(null);
  const currentItem = items[currentIndex];

  // Zoom and pan state
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const panStartRef = useRef({ x: 0, y: 0 });

  // Touch & Swipe state
  const touchStartXRef = useRef(null);
  const touchStartYRef = useRef(null);
  const touchStartDistRef = useRef(null);
  const initialPinchZoomRef = useRef(1);

  // Check reduced motion preference
  const isReducedMotion =
    typeof window !== 'undefined' &&
    window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Reset zoom & pan when image changes
  useEffect(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, [currentIndex]);

  // Preload next and previous images
  useEffect(() => {
    if (!items || items.length === 0) return;
    const prevIdx = currentIndex > 0 ? currentIndex - 1 : items.length - 1;
    const nextIdx = currentIndex < items.length - 1 ? currentIndex + 1 : 0;
    [items[prevIdx]?.src, items[nextIdx]?.src].forEach((src) => {
      if (src) {
        const img = new Image();
        img.src = src;
      }
    });
  }, [currentIndex, items]);

  // Scroll lock + initial focus trapping
  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeButtonRef.current?.focus();

    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, []);

  // Keyboard controls & focus trap
  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        onPrev();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        onNext();
      } else if (e.key === 'Tab') {
        if (!lightboxRef.current) return;
        const focusable = lightboxRef.current.querySelectorAll(
          'button:not([disabled]), [tabindex]:not([tabindex="-1"])'
        );
        if (focusable.length === 0) return;
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

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, onPrev, onNext]);

  // Double click to toggle zoom
  function handleDoubleClick(e) {
    e.stopPropagation();
    if (zoom > 1) {
      setZoom(1);
      setPan({ x: 0, y: 0 });
    } else {
      setZoom(2);
    }
  }

  // Zoom controls
  function handleZoomIn(e) {
    e.stopPropagation();
    setZoom((z) => Math.min(3, Number((z + 0.5).toFixed(1))));
  }

  function handleZoomOut(e) {
    e.stopPropagation();
    setZoom((z) => {
      const next = Math.max(1, Number((z - 0.5).toFixed(1)));
      if (next === 1) setPan({ x: 0, y: 0 });
      return next;
    });
  }

  function handleResetZoom(e) {
    e.stopPropagation();
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }

  // Mouse pan handlers
  function handleMouseDown(e) {
    if (zoom <= 1) return;
    e.preventDefault();
    setIsDragging(true);
    dragStartRef.current = { x: e.clientX, y: e.clientY };
    panStartRef.current = { ...pan };
  }

  function handleMouseMove(e) {
    if (!isDragging || zoom <= 1) return;
    e.preventDefault();
    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;
    setPan({
      x: panStartRef.current.x + dx,
      y: panStartRef.current.y + dy,
    });
  }

  function handleMouseUp() {
    setIsDragging(false);
  }

  // Touch & Swipe handlers
  function handleTouchStart(e) {
    if (e.touches.length === 1) {
      touchStartXRef.current = e.touches[0].clientX;
      touchStartYRef.current = e.touches[0].clientY;
      if (zoom > 1) {
        panStartRef.current = { ...pan };
      }
    } else if (e.touches.length === 2) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      touchStartDistRef.current = dist;
      initialPinchZoomRef.current = zoom;
    }
  }

  function handleTouchMove(e) {
    if (e.touches.length === 2 && touchStartDistRef.current) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      const scaleFactor = dist / touchStartDistRef.current;
      const newZoom = Math.min(3, Math.max(1, Number((initialPinchZoomRef.current * scaleFactor).toFixed(2))));
      setZoom(newZoom);
      if (newZoom === 1) {
        setPan({ x: 0, y: 0 });
      }
    } else if (e.touches.length === 1 && zoom > 1 && touchStartXRef.current !== null) {
      const dx = e.touches[0].clientX - touchStartXRef.current;
      const dy = e.touches[0].clientY - touchStartYRef.current;
      setPan({
        x: panStartRef.current.x + dx,
        y: panStartRef.current.y + dy,
      });
    }
  }

  function handleTouchEnd(e) {
    if (zoom === 1 && touchStartXRef.current !== null && e.changedTouches.length === 1) {
      const deltaX = e.changedTouches[0].clientX - touchStartXRef.current;
      const deltaY = e.changedTouches[0].clientY - (touchStartYRef.current || 0);
      if (Math.abs(deltaX) > 50 && Math.abs(deltaX) > Math.abs(deltaY) * 1.5) {
        if (deltaX > 0) {
          onPrev();
        } else {
          onNext();
        }
      }
    }
    touchStartXRef.current = null;
    touchStartYRef.current = null;
    touchStartDistRef.current = null;
  }

  if (!currentItem) return null;

  return (
    <div
      ref={lightboxRef}
      role="dialog"
      aria-modal="true"
      aria-label="Photo lightbox"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
      className="fixed inset-0 z-50 flex flex-col justify-between p-4 sm:p-6 bg-[#0a1730]/95 backdrop-blur-sm select-none"
    >
      {/* Top Bar: Counter, Zoom Controls, Close Button */}
      <div className="flex items-center justify-between w-full max-w-7xl mx-auto z-20 gap-3">
        <span className="text-sm font-semibold font-mono tracking-wider text-slate-300">
          {currentIndex + 1} of {items.length}
        </span>

        {/* Zoom Controls */}
        <div className="flex items-center gap-1.5 bg-white/10 rounded-xl p-1 border border-white/10">
          <button
            type="button"
            onClick={handleZoomOut}
            disabled={zoom <= 1}
            title="Zoom out"
            aria-label="Zoom out"
            className="h-8 w-8 rounded-lg flex items-center justify-center text-slate-300 hover:text-white hover:bg-white/10 disabled:opacity-30 disabled:hover:bg-transparent transition-colors text-base font-bold focus:outline-none focus:ring-1 focus:ring-gold-500"
          >
            −
          </button>
          <button
            type="button"
            onClick={handleResetZoom}
            title="Reset zoom"
            aria-label="Reset zoom"
            className="px-2 h-8 rounded-lg text-xs font-mono font-medium text-slate-200 hover:text-white hover:bg-white/10 transition-colors focus:outline-none focus:ring-1 focus:ring-gold-500"
          >
            {Math.round(zoom * 100)}%
          </button>
          <button
            type="button"
            onClick={handleZoomIn}
            disabled={zoom >= 3}
            title="Zoom in"
            aria-label="Zoom in"
            className="h-8 w-8 rounded-lg flex items-center justify-center text-slate-300 hover:text-white hover:bg-white/10 disabled:opacity-30 disabled:hover:bg-transparent transition-colors text-base font-bold focus:outline-none focus:ring-1 focus:ring-gold-500"
          >
            +
          </button>
        </div>

        {/* Close Button */}
        <button
          ref={closeButtonRef}
          type="button"
          onClick={onClose}
          aria-label="Close lightbox"
          className="p-2 rounded-xl text-slate-300 hover:text-white hover:bg-white/10 transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-gold-500"
        >
          <XIcon className="h-6 w-6" />
        </button>
      </div>

      {/* Main View Area: Prev Button, Image, Next Button */}
      <div
        className="relative flex-1 flex items-center justify-center min-h-0 w-full max-w-7xl mx-auto my-2 overflow-hidden"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
        {/* Previous Button */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onPrev();
          }}
          aria-label="Previous photo"
          className="absolute left-0 sm:left-2 z-20 p-2 sm:p-3 rounded-full text-white/80 hover:text-white bg-black/40 hover:bg-black/70 border border-white/10 transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-gold-500"
        >
          <ChevronLeftIcon className="h-7 w-7 sm:h-8 sm:w-8" />
        </button>

        {/* Large Image & Caption */}
        <div
          className="flex flex-col items-center justify-center max-h-full max-w-full px-12 sm:px-16"
          onClick={(e) => {
            if (e.target === e.currentTarget) onClose();
          }}
        >
          <img
            src={currentItem.src}
            alt={currentItem.alt}
            onDoubleClick={handleDoubleClick}
            style={{
              transform: `scale(${zoom}) translate(${pan.x / zoom}px, ${pan.y / zoom}px)`,
              cursor: zoom > 1 ? (isDragging ? 'grabbing' : 'grab') : 'zoom-in',
              transition: isDragging || isReducedMotion ? 'none' : 'transform 150ms ease-out',
              transformOrigin: 'center center',
            }}
            className="max-h-[76vh] max-w-full object-contain rounded-lg shadow-lift select-none"
            draggable={false}
          />
          <p className="mt-3 text-center text-sm sm:text-base font-semibold text-slate-100 px-4 max-w-2xl">
            {currentItem.title || currentItem.caption}
          </p>
          {currentItem.credit && (
            <p className="mt-1 text-center text-xs text-slate-400">
              {currentItem.credit.includes('/ Unsplash')
                ? currentItem.credit
                : `Photo: ${currentItem.credit} / Unsplash`}
            </p>
          )}
        </div>

        {/* Next Button */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onNext();
          }}
          aria-label="Next photo"
          className="absolute right-0 sm:right-2 z-20 p-2 sm:p-3 rounded-full text-white/80 hover:text-white bg-black/40 hover:bg-black/70 border border-white/10 transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-gold-500"
        >
          <ChevronRightIcon className="h-7 w-7 sm:h-8 sm:w-8" />
        </button>
      </div>

      {/* Bottom hint */}
      <div className="text-center text-xs text-slate-400 z-10 py-1">
        <span>Tip: Use arrow keys, swipe, or double-click to zoom</span>
      </div>
    </div>
  );
}

export function GalleryPage() {
  const [activeTab, setActiveTab] = useState('all');
  const [selectedIndex, setSelectedIndex] = useState(null);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  // Base gallery items (Launch event + Posters)
  const allItems = useMemo(() => {
    return baseGalleryItems.filter(
      (item) => item.category === 'Launch event' || item.category === 'Posters'
    );
  }, []);

  // Tab counts
  const tabCounts = useMemo(() => {
    return {
      all: allItems.length,
      'Launch event': allItems.filter((i) => i.category === 'Launch event').length,
      Posters: allItems.filter((i) => i.category === 'Posters').length,
    };
  }, [allItems]);

  // Filter items matching the active category tab
  const filteredItems = useMemo(() => {
    if (activeTab === 'all') return allItems;
    return allItems.filter((item) => item.category === activeTab);
  }, [activeTab, allItems]);

  // Reset pagination when switching tabs
  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [activeTab]);

  const displayedItems = useMemo(() => {
    return filteredItems.slice(0, visibleCount);
  }, [filteredItems, visibleCount]);

  const hasMore = visibleCount < filteredItems.length;

  function handleOpen(index) {
    setSelectedIndex(index);
  }

  function handleClose() {
    setSelectedIndex(null);
  }

  function handlePrev() {
    setSelectedIndex((prev) => (prev > 0 ? prev - 1 : filteredItems.length - 1));
  }

  function handleNext() {
    setSelectedIndex((prev) => (prev < filteredItems.length - 1 ? prev + 1 : 0));
  }

  return (
    <div>
      {/* Page title & one-line subtitle */}
      <div className="container-x section-top pb-16">
        <Breadcrumbs items={[{ label: 'Home', to: '/home' }, { label: 'Gallery' }]} />

        <div className="mt-3">
          <h1 className="h-section">Gallery</h1>
          <p className="mt-1 text-slate-600">
            Reel stories, vibrant gatherings, and memorable moments at FRCC.
          </p>
        </div>

        {/* 1. Category Tabs: All, Launch event, Posters with counts */}
        <div className="mt-8 flex flex-wrap items-center gap-2" role="tablist" aria-label="Gallery categories">
          {CATEGORY_TABS.map((tab) => {
            const active = activeTab === tab.id;
            const count = tabCounts[tab.id] ?? 0;
            return (
              <button
                key={tab.id}
                role="tab"
                aria-selected={active}
                onClick={() => setActiveTab(tab.id)}
                className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors duration-150 ${
                  active
                    ? 'bg-navy-900 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {`${tab.label} (${count})`}
              </button>
            );
          })}
        </div>

        {/* 2. Masonry Grid (CSS columns: 3 desktop, 2 tablet, 1 mobile, gap 16px, natural aspect ratio, no cropping) */}
        <div className="mt-8">
          {filteredItems.length === 0 ? (
            <div className="text-center py-16 text-slate-500 rounded-2xl border border-dashed border-slate-300 bg-white/50 p-8 my-6">
              <p className="text-base font-semibold text-navy-900">
                No photos found in this category.
              </p>
              <p className="mt-1 text-sm text-slate-500">
                Please select another category above.
              </p>
            </div>
          ) : (
            <div className="columns-1 md:columns-2 lg:columns-3 gap-4">
              {displayedItems.map((item, idx) => (
                <GalleryTile
                  key={item.id || item.file || item.url || idx}
                  item={item}
                  onClick={() => handleOpen(idx)}
                />
              ))}
            </div>
          )}
        </div>

        {/* 3. Load More button (adds 12 at a time) */}
        {hasMore && (
          <div className="mt-12 flex justify-center">
            <button
              type="button"
              onClick={() => setVisibleCount((prev) => prev + PAGE_SIZE)}
              className="btn-base border border-slate-300 bg-white text-navy-900 hover:bg-slate-50 px-6 py-2.5 text-sm font-semibold rounded-full shadow-sm hover:border-gold-500 transition-all duration-150"
            >
              Load more ({filteredItems.length - visibleCount} remaining)
            </button>
          </div>
        )}
      </div>

      {/* 4. Full-screen Lightbox with Zoom, Swipe & Counter */}
      {selectedIndex !== null && (
        <GalleryLightbox
          items={filteredItems}
          currentIndex={selectedIndex}
          onClose={handleClose}
          onPrev={handlePrev}
          onNext={handleNext}
        />
      )}
    </div>
  );
}

export default GalleryPage;
