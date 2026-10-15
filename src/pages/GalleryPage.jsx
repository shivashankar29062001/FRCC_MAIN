import { useState, useEffect, useRef, useMemo } from 'react';
import { HeroImage } from '../components/HeroImage.jsx';
import { Breadcrumbs } from '../components/ui/sections.jsx';
import { XIcon, ChevronLeftIcon, ChevronRightIcon } from '../components/ui/icons.jsx';
import { galleryItems } from '../data/gallery.js';

// ---------------------------------------------------------------------------
// /gallery — FRCC Public Gallery
// Image-only hero ("hero-gallery"), title and subtitle directly below it.
// Category tabs switching instantly, masonry grid (columns: 3 desk, 2 tab, 1 mob, gap 16px, rounded 14px),
// 2px gold border on hover, accessible zero-animation lightbox.
// ---------------------------------------------------------------------------

const ALL_CATEGORY_TABS = [
  { id: 'all', label: 'All' },
  { id: 'Launch event', label: 'Launch event' },
  { id: 'Posters', label: 'Posters' },
  { id: 'Cinema & Culture', label: 'Cinema & Culture' },
  { id: 'Campus', label: 'Campus' },
];

function GalleryTile({ item, onClick }) {
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
      className="group block w-full rounded-[14px] overflow-hidden border-2 border-transparent hover:border-gold-500 transition-colors duration-150 cursor-pointer bg-navy-950 focus:outline-none focus:ring-2 focus:ring-gold-500 break-inside-avoid mb-4"
      aria-label={`View photo: ${item.caption}`}
    >
      {failed ? (
        <div
          className="relative w-full aspect-[4/3] grid place-items-center border border-gold-500/70 text-center p-4 rounded-[12px]"
          style={{ background: 'linear-gradient(135deg, #0b1a33 0%, #12305a 100%)' }}
          role="img"
          aria-label={item.caption}
        >
          <span className="block text-xs font-semibold uppercase tracking-[0.2em] text-white/90">
            {item.caption}
          </span>
        </div>
      ) : (
        <img
          src={item.src}
          alt={item.alt}
          loading="lazy"
          decoding="async"
          onError={() => setFailed(true)}
          className="w-full h-auto block rounded-[12px] object-contain"
        />
      )}
    </div>
  );
}

function GalleryLightbox({ items, currentIndex, onClose, onPrev, onNext }) {
  const lightboxRef = useRef(null);
  const closeButtonRef = useRef(null);
  const currentItem = items[currentIndex];

  // Scroll lock on body + initial focus trapping
  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeButtonRef.current?.focus();

    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, []);

  // Keyboard controls: Esc, Left Arrow, Right Arrow, Focus Trap
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
      className="fixed inset-0 z-50 flex flex-col justify-between p-4 sm:p-6 bg-[#0a1730]/95"
    >
      {/* Top Bar: Counter & Close button */}
      <div className="flex items-center justify-between w-full max-w-7xl mx-auto z-10">
        <span className="text-sm font-semibold font-mono tracking-wider text-slate-300">
          {currentIndex + 1} / {items.length}
        </span>
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

      {/* Main View Area: Previous Button, Large Image, Next Button */}
      <div className="relative flex-1 flex items-center justify-center min-h-0 w-full max-w-7xl mx-auto my-2">
        {/* Previous Button */}
        <button
          type="button"
          onClick={onPrev}
          aria-label="Previous photo"
          className="absolute left-0 sm:left-2 z-10 p-2 sm:p-3 rounded-full text-white/80 hover:text-white bg-black/40 hover:bg-black/70 border border-white/10 transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-gold-500"
        >
          <ChevronLeftIcon className="h-7 w-7 sm:h-8 sm:w-8" />
        </button>

        {/* Large Image & Caption */}
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) onClose();
          }}
          className="flex flex-col items-center justify-center max-h-full max-w-full px-12 sm:px-16"
        >
          <img
            src={currentItem.src}
            alt={currentItem.alt}
            className="max-h-[82vh] max-w-full object-contain rounded-lg shadow-lift select-none"
          />
          <p className="mt-3 text-center text-sm font-medium text-slate-200 px-4 max-w-2xl">
            {currentItem.caption}
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
          onClick={onNext}
          aria-label="Next photo"
          className="absolute right-0 sm:right-2 z-10 p-2 sm:p-3 rounded-full text-white/80 hover:text-white bg-black/40 hover:bg-black/70 border border-white/10 transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-gold-500"
        >
          <ChevronRightIcon className="h-7 w-7 sm:h-8 sm:w-8" />
        </button>
      </div>

      {/* Bottom spacer for symmetry */}
      <div className="h-6 w-full" aria-hidden="true" />
    </div>
  );
}

export function GalleryPage() {
  const [activeTab, setActiveTab] = useState('all');
  const [selectedIndex, setSelectedIndex] = useState(null);

  // Filter items matching the active category tab
  const filteredItems = useMemo(() => {
    if (activeTab === 'all') return galleryItems;
    return galleryItems.filter((item) => item.category === activeTab);
  }, [activeTab]);

  // Hide tabs with no items
  const visibleTabs = useMemo(() => {
    return ALL_CATEGORY_TABS.filter((tab) => {
      if (tab.id === 'all') return galleryItems.length > 0;
      return galleryItems.some((item) => item.category === tab.id);
    });
  }, []);

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
      {/* 1. Image-only hero using slot "hero-gallery" through localFor/HeroImage */}
      <HeroImage slot="hero-gallery" />

      {/* 2. Page title & one-line subtitle starting directly below the hero */}
      <div className="container-x section-top pb-16">
        <Breadcrumbs items={[{ label: 'Home', to: '/home' }, { label: 'Gallery' }]} />

        <div className="mt-3">
          <h1 className="h-section">Gallery</h1>
          <p className="mt-1 text-slate-600">
            Reel stories, vibrant gatherings, and memorable moments at FRCC.
          </p>
        </div>

        {/* 3. Category Tabs (instant switching, hidden when no items) */}
        {visibleTabs.length > 1 && (
          <div className="mt-8 flex flex-wrap items-center gap-2" role="tablist" aria-label="Gallery categories">
            {visibleTabs.map((tab) => {
              const active = activeTab === tab.id;
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
                  {tab.label}
                </button>
              );
            })}
          </div>
        )}

        {/* 4. Masonry Grid (CSS columns: 3 desktop, 2 tablet, 1 mobile, gap 16px, rounded corners 14px) */}
        <div className="mt-8">
          {filteredItems.length === 0 ? (
            <div className="text-center py-16 text-slate-500">
              <p className="text-base font-medium">No photos found in this category.</p>
            </div>
          ) : (
            <div className="columns-1 md:columns-2 lg:columns-3 gap-4">
              {filteredItems.map((item, idx) => (
                <GalleryTile
                  key={item.file || item.url || idx}
                  item={item}
                  onClick={() => handleOpen(idx)}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 5. Zero-animation Dark Navy Lightbox */}
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
