import { useEffect, useRef, useState } from 'react';
import { prefersReducedMotion } from '../../utils/helpers.js';

// ---------------------------------------------------------------------------
// Subtle motion helpers: scroll reveal + animated counters.
// Both honour prefers-reduced-motion (content is never hidden or delayed then).
// ---------------------------------------------------------------------------

/**
 * Fade/slide-in on scroll. Falls back to "always visible" when
 * IntersectionObserver is unavailable or motion is reduced.
 * @param {{ as?: string, delay?: number, className?: string, children: any }} props
 */
export function Reveal({ as: Tag = 'div', delay = 0, className = '', children, ...rest }) {
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    if (prefersReducedMotion() || typeof IntersectionObserver === 'undefined') {
      el.classList.add('is-visible');
      return undefined;
    }
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: '0px 0px -40px 0px' },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <Tag
      ref={ref}
      className={`reveal ${className}`}
      style={delay ? { '--reveal-delay': `${delay}ms` } : undefined}
      {...rest}
    >
      {children}
    </Tag>
  );
}

/**
 * Counts up to `end` once it scrolls into view (e.g. 1240 → "1,240").
 * @param {{ end: number, prefix?: string, suffix?: string, duration?: number,
 *           decimals?: number, className?: string }} props
 */
export function Counter({ end, prefix = '', suffix = '', duration = 1500, decimals = 0, className = '' }) {
  const ref = useRef(null);
  const [value, setValue] = useState(() => (prefersReducedMotion() ? end : 0));

  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    if (prefersReducedMotion()) {
      setValue(end);
      return undefined;
    }

    let frame = 0;
    let started = false;

    const run = () => {
      const start = performance.now();
      const tick = (now) => {
        const t = Math.min(1, (now - start) / duration);
        const eased = 1 - Math.pow(1 - t, 3);
        setValue(end * eased);
        if (t < 1) frame = requestAnimationFrame(tick);
      };
      frame = requestAnimationFrame(tick);
    };

    if (typeof IntersectionObserver === 'undefined') {
      setValue(end);
      return undefined;
    }

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !started) {
            started = true;
            run();
            io.disconnect();
          }
        });
      },
      { threshold: 0.4 },
    );
    io.observe(el);

    return () => {
      io.disconnect();
      cancelAnimationFrame(frame);
    };
  }, [end, duration]);

  const display = Number.isInteger(end) && decimals === 0
    ? Math.round(value).toLocaleString('en-IN')
    : value.toFixed(decimals);

  return (
    <span ref={ref} className={className}>
      {prefix}
      {display}
      {suffix}
    </span>
  );
}
