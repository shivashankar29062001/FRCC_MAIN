// ---------------------------------------------------------------------------
// /src/components/HeroSlider.jsx — Hero photo slider with swipe, loop & autoplay
// ---------------------------------------------------------------------------

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { HERO_SLIDES } from '../data/heroSlides.js';
import { localFor, REMOTE, FALLBACK, getObjectPosition } from '../config/images.js';
import { ChevronLeftIcon, ChevronRightIcon } from './ui/icons.jsx';

export function HeroSlider({ slotsKey = 'home', interval = 6000, children }) {
  // Resolve slides for the chosen key
  const slides = useMemo(() => {
    const slotNames = HERO_SLIDES[slotsKey] || HERO_SLIDES.home || [];
    return slotNames
      .map((slot) => {
        const src = localFor(slot) || REMOTE[slot] || FALLBACK[slot] || null;
        if (!src) return null;
        return {
          slot,
          src,
          objectPosition: getObjectPosition(slot),
        };
      })
      .filter(Boolean);
  }, [slotsKey]);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [isTouching, setIsTouching] = useState(false);
  const [isTabHidden, setIsTabHidden] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  const touchStartXRef = useRef(null);
  const sliderRef = useRef(null);

  // Check prefers-reduced-motion
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);

    function handleChange(e) {
      setPrefersReducedMotion(e.matches);
    }

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  // Listen for tab visibility changes
  useEffect(() => {
    if (typeof document === 'undefined') return;

    function handleVisibility() {
      setIsTabHidden(document.hidden);
    }

    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, []);

  const totalSlides = slides.length;
  const hasMultiple = totalSlides >= 2;

  const goToNext = useCallback(() => {
    if (!hasMultiple) return;
    setCurrentIndex((prev) => (prev + 1) % totalSlides);
  }, [hasMultiple, totalSlides]);

  const goToPrev = useCallback(() => {
    if (!hasMultiple) return;
    setCurrentIndex((prev) => (prev - 1 + totalSlides) % totalSlides);
  }, [hasMultiple, totalSlides]);

  const goToSlide = useCallback((idx) => {
    if (!hasMultiple) return;
    setCurrentIndex(idx);
  }, [hasMultiple]);

  // Autoplay management
  const shouldPause = isPaused || isHovered || isFocused || isTouching || isTabHidden || prefersReducedMotion;

  useEffect(() => {
    if (!hasMultiple || shouldPause) return;
    const timer = setInterval(() => {
      goToNext();
    }, interval);
    return () => clearInterval(timer);
  }, [hasMultiple, shouldPause, interval, goToNext]);

  // Preload the next slide
  useEffect(() => {
    if (!hasMultiple || typeof window === 'undefined') return;
    const nextIdx = (currentIndex + 1) % totalSlides;
    const nextSrc = slides[nextIdx]?.src;
    if (nextSrc) {
      const img = new Image();
      img.src = nextSrc;
    }
  }, [currentIndex, hasMultiple, totalSlides, slides]);

  // Keyboard navigation
  function handleKeyDown(e) {
    if (!hasMultiple) return;
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      goToPrev();
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      goToNext();
    }
  }

  // Touch handlers
  function handleTouchStart(e) {
    touchStartXRef.current = e.touches[0].clientX;
    setIsTouching(true);
  }

  function handleTouchEnd(e) {
    setIsTouching(false);
    if (touchStartXRef.current === null) return;
    const touchEndX = e.changedTouches[0].clientX;
    const diff = touchStartXRef.current - touchEndX;
    if (Math.abs(diff) > 40) {
      if (diff > 0) {
        goToNext();
      } else {
        goToPrev();
      }
    }
    touchStartXRef.current = null;
  }

  const sliderTrack = (
    <div
      ref={sliderRef}
      role="region"
      aria-roledescription="carousel"
      aria-label="Hero carousel"
      tabIndex={0}
      onKeyDown={handleKeyDown}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onFocus={() => setIsFocused(true)}
      onBlur={() => setIsFocused(false)}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      className="absolute inset-0 overflow-hidden focus:outline-none"
    >
      {/* Sliding Track */}
      <div
        className="flex h-full w-full"
        style={{
          transform: `translateX(-${currentIndex * 100}%)`,
          transition: prefersReducedMotion ? 'none' : 'transform 700ms ease-in-out',
        }}
      >
        {slides.map((slide, idx) => (
          <div
            key={slide.slot}
            role="group"
            aria-roledescription="slide"
            aria-label={`${idx + 1} of ${totalSlides}`}
            className="relative h-full w-full shrink-0"
          >
            <img
              src={slide.src}
              alt=""
              loading={idx === 0 ? 'eager' : 'lazy'}
              fetchPriority={idx === 0 ? 'high' : 'auto'}
              decoding="async"
              className="hero__img"
              style={{ objectPosition: slide.objectPosition }}
            />
          </div>
        ))}
      </div>

      {/* Navigation arrows (shown only when 2 or more slides exist) */}
      {hasMultiple && (
        <>
          <button
            type="button"
            aria-label="Previous slide"
            onClick={(e) => {
              e.stopPropagation();
              goToPrev();
            }}
            className="absolute left-3 top-1/2 -translate-y-1/2 z-20 flex h-11 w-11 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-xs transition hover:bg-black/60 focus:outline-none focus:ring-2 focus:ring-gold-500 cursor-pointer"
          >
            <ChevronLeftIcon className="h-6 w-6" />
          </button>

          <button
            type="button"
            aria-label="Next slide"
            onClick={(e) => {
              e.stopPropagation();
              goToNext();
            }}
            className="absolute right-3 top-1/2 -translate-y-1/2 z-20 flex h-11 w-11 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-xs transition hover:bg-black/60 focus:outline-none focus:ring-2 focus:ring-gold-500 cursor-pointer"
          >
            <ChevronRightIcon className="h-6 w-6" />
          </button>

          {/* Dots Indicator — bottom centre */}
          <div className="absolute bottom-3 sm:bottom-6 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2">
            {slides.map((slide, idx) => {
              const isActive = idx === currentIndex;
              return (
                <button
                  key={slide.slot}
                  type="button"
                  aria-label={`Go to slide ${idx + 1}`}
                  aria-current={isActive ? 'true' : undefined}
                  onClick={(e) => {
                    e.stopPropagation();
                    goToSlide(idx);
                  }}
                  className={`h-2 rounded-full cursor-pointer transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-gold-500 ${
                    isActive
                      ? 'w-6 bg-gold-500'
                      : 'w-2 bg-white/50 hover:bg-white/80'
                  }`}
                />
              );
            })}
          </div>
        </>
      )}
    </div>
  );

  // If children are passed, wrap in .hero; otherwise return just the slider track
  if (children !== undefined) {
    return (
      <section className="hero">
        {sliderTrack}
        {children}
      </section>
    );
  }

  return sliderTrack;
}

export default HeroSlider;
