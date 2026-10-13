import { useState } from 'react';
import { Link } from 'react-router-dom';
import { cx } from '../../utils/helpers.js';
import { Reveal, Counter } from './motion.jsx';
import { SmartImage } from './media.jsx';
import { ChevronRightIcon, StarIcon } from './icons.jsx';

// ---------------------------------------------------------------------------
// Shared structural blocks: breadcrumbs, the photo page header, icon tiles,
// the FAQ accordion, star ratings and a stats strip.
// All built from the existing navy / gold / cream tokens only.
//
// The Gallery lightbox that used to live here was removed — the signed-out
// landing page renders its own static six-photo grid instead.
// ---------------------------------------------------------------------------

/** Breadcrumb trail. items: [{ label, to? }] — last item has no link. */
export function Breadcrumbs({ items = [], light = false }) {
  if (items.length === 0) return null;
  return (
    <nav aria-label="Breadcrumb" className={cx('text-xs font-semibold', light ? 'text-white/70' : 'text-slate-500')}>
      <ol className="flex flex-wrap items-center gap-1.5">
        {items.map((item, i) => {
          const last = i === items.length - 1;
          return (
            <li key={`${item.label}-${i}`} className="flex items-center gap-1.5">
              {item.to && !last ? (
                <Link to={item.to} className={cx('transition-colors duration-150', light ? 'text-white/70 hover:text-gold-400' : 'hover:text-navy-900')}>
                  {item.label}
                </Link>
              ) : (
                <span aria-current={last ? 'page' : undefined} className={light ? 'text-white' : 'text-navy-900'}>
                  {item.label}
                </span>
              )}
              {!last && <ChevronRightIcon className={cx('h-3.5 w-3.5', light ? 'text-white/40' : 'text-slate-400')} />}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

/**
 * Photo header used on every inner page: the page title sits over a real photo
 * with a navy gradient overlay so it stays readable. No illustration, no grid
 * texture, no animation.
 *
 * `reserveBottom` leaves a taller band of photo under the copy so a booking bar
 * can straddle the bottom edge of the header without covering the text.
 *
 * @param {{ title: string, description?: string,
 *   breadcrumbs?: Array<{ label: string, to?: string }>, image?: object,
 *   reserveBottom?: boolean }} props
 */
export function PageHeader({ title, description, breadcrumbs = [], image, reserveBottom = false }) {
  return (
    <section className="relative overflow-hidden bg-navy-950 text-white">
      {image && <SmartImage fill image={image} priority sizes="100vw" />}
      {/* Navy gradient overlays — left-to-right scrim + a bottom fade. */}
      <span aria-hidden className="absolute inset-0 bg-gradient-to-r from-navy-950 via-navy-950/80 to-navy-950/30" />
      <span aria-hidden className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-navy-950/95 via-navy-950/40 to-transparent" />

      <div
        className={cx(
          'container-x relative flex flex-col justify-end pt-12 sm:pt-16',
          reserveBottom
            ? 'min-h-[300px] pb-32 sm:min-h-[400px] sm:pb-40'
            : 'min-h-[240px] pb-12 sm:min-h-[320px] sm:pb-16',
        )}
      >
        {breadcrumbs.length > 0 && <Breadcrumbs items={breadcrumbs} light />}
        <h1 className="h-hero mt-3 max-w-3xl">{title}</h1>
        {description && <p className="mt-3 max-w-2xl leading-relaxed text-slate-200">{description}</p>}
      </div>
    </section>
  );
}

/** Rounded icon tile (navy or gold tint) used in feature grids. */
export function IconTile({ icon: Icon, tone = 'navy', className = '' }) {
  const tones = {
    navy: 'bg-navy-900/5 text-navy-800 border-navy-900/10',
    gold: 'bg-gold-50 text-gold-600 border-gold-500/30',
    white: 'bg-white/10 text-gold-400 border-white/15',
  };
  return (
    <span
      aria-hidden
      className={cx('grid h-11 w-11 shrink-0 place-items-center rounded-xl border', tones[tone] || tones.navy, className)}
    >
      <Icon className="h-5 w-5" />
    </span>
  );
}

/** FAQ accordion — one panel open at a time, fully keyboard accessible. */
export function Accordion({ items = [], idPrefix = 'faq' }) {
  const [open, setOpen] = useState(0);
  if (items.length === 0) return null;

  return (
    <div className="divide-y divide-slate-200 overflow-hidden rounded-2xl border border-slate-200 bg-white">
      {items.map((item, i) => {
        const isOpen = open === i;
        const panelId = `${idPrefix}-panel-${i}`;
        const buttonId = `${idPrefix}-button-${i}`;
        return (
          <div key={item.q}>
            <h3>
              <button
                id={buttonId}
                type="button"
                aria-expanded={isOpen}
                aria-controls={panelId}
                onClick={() => setOpen(isOpen ? -1 : i)}
                className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left transition-colors duration-150 hover:bg-navy-50/60"
              >
                <span className="font-semibold text-navy-900">{item.q}</span>
                <ChevronRightIcon
                  className={cx('h-4 w-4 shrink-0 text-gold-600', isOpen && 'rotate-90')}
                />
              </button>
            </h3>
            <div
              id={panelId}
              role="region"
              aria-labelledby={buttonId}
              hidden={!isOpen}
              className="px-5 pb-5 text-sm leading-relaxed text-slate-600"
            >
              {item.a}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/** 0–5 star rating row (supports halves by rounding). */
export function Stars({ value = 0, className = '' }) {
  const full = Math.round(value);
  return (
    <span
      className={cx('inline-flex items-center gap-0.5', className)}
      role="img"
      aria-label={`${value} out of 5 stars`}
    >
      {[0, 1, 2, 3, 4].map((i) => (
        <StarIcon
          key={i}
          className={cx('h-4 w-4', i < full ? 'text-gold-500' : 'text-slate-300')}
        />
      ))}
    </span>
  );
}

/** Row of statistic counters (dark or light band). */
export function StatStrip({ items = [], dark = false }) {
  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
      {items.map((s, i) => (
        <Reveal key={s.label} delay={i * 90} className="text-center sm:text-left">
          <p className={cx('font-display text-4xl sm:text-5xl tracking-tight', dark ? 'text-white' : 'text-navy-900')}>
            <Counter end={s.value} prefix={s.prefix} suffix={s.suffix} decimals={s.decimals || 0} />
          </p>
          <p className={cx('mt-1 text-sm font-semibold', dark ? 'text-gold-400' : 'text-gold-600')}>
            {s.label}
          </p>
          {s.hint && <p className={cx('caption mt-0.5', dark && 'text-slate-400')}>{s.hint}</p>}
        </Reveal>
      ))}
    </div>
  );
}
