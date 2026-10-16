// ---------------------------------------------------------------------------
// BookingSummary — sticky booking summary panel (desktop) collapsible on
// mobile. Renders live rows + price lines + total; the parent computes them
// so this component stays reusable across booking flows.
// ---------------------------------------------------------------------------

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useApp } from '../../app/store/AppContext.jsx';
import { cx } from '../../utils/helpers.js';
import { ChevronDownIcon } from '../ui/icons.jsx';
import { formatINR } from '../../features/activities/games.config.js';
import { calculateTotal } from '../../utils/pricing.js';
import { MEMBER_DISCOUNT_LABEL, MEMBER_PROMO_NOTE } from '../../config/pricing.js';
import { MEMBERSHIP_REDIRECT_URL } from '../../config/services.js';
import { LocationTrigger } from '../location/LocationTrigger.jsx';

/**
 * @param {{ rows?: Array<{label: string, value: string}>,
 *   lines?: Array<{label: string, value: number}>, total?: number,
 *   subtotal?: number, isMember?: boolean,
 *   footnote?: string, collapsibleLabel?: string }} props
 */
export function BookingSummary({
  rows = [],
  total,
  subtotal,
  lines = [],
  isMember: propIsMember,
  footnote = '',
  collapsibleLabel = 'Booking summary',
}) {
  const [open, setOpen] = useState(false);
  const { isMember: contextIsMember } = useApp();
  const isMember = propIsMember !== undefined ? Boolean(propIsMember) : Boolean(contextIsMember);

  // If subtotal is passed directly or lines need calculating, calculateTotal ensures consistency
  const effectiveSubtotal = subtotal !== undefined
    ? subtotal
    : lines.find((l) => l.label.toLowerCase() === 'subtotal')?.value ?? (total || 0);

  const pricing = calculateTotal(effectiveSubtotal, isMember);

  // Determine lines: use provided lines if they contain subtotal/discount or synthesize them
  const displayLines = lines.length > 0
    ? lines
    : [
        { label: 'Subtotal', value: pricing.subtotal },
        ...(isMember && pricing.discount > 0 ? [{ label: MEMBER_DISCOUNT_LABEL, value: -pricing.discount }] : []),
      ];

  const finalTotal = total !== undefined ? total : pricing.total;

  return (
    <aside aria-label={collapsibleLabel} className="card !p-0 overflow-hidden lg:sticky lg:top-24">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-3 p-5 text-left lg:cursor-default"
      >
        <span>
          <span className="eyebrow">{collapsibleLabel}</span>
          <span className="mt-1 block font-display text-xl text-navy-900">{formatINR(finalTotal)}</span>
        </span>
        <ChevronDownIcon className={cx('h-4 w-4 text-slate-500 lg:hidden', open && 'rotate-180')} />
      </button>
      <div className={cx('border-t border-slate-100', !open && 'hidden lg:block')}>
        <dl className="space-y-3 p-5 text-sm">
          {rows.map((r) => {
            const isLoc = /location|venue|campus|address|area/i.test(r.label);
            return (
              <div key={r.label} className="flex items-start justify-between gap-3">
                <dt className="text-slate-500">{r.label}</dt>
                <dd className="text-right font-medium text-navy-900">
                  {isLoc ? (
                    <LocationTrigger
                      locationId={r.locationId || r.value}
                      className="text-navy-900 hover:text-gold-600 font-medium inline-flex text-right"
                      showIcon={true}
                      iconClassName="mt-0.5 h-3 w-3 shrink-0 text-gold-500"
                    >
                      <span>{r.value}</span>
                    </LocationTrigger>
                  ) : (
                    r.value
                  )}
                </dd>
              </div>
            );
          })}
        </dl>
        {displayLines.length > 0 && (
          <div className="border-t border-slate-100 px-5 py-4">
            <dl className="space-y-2 text-sm">
              {displayLines.map((l) => (
                <div key={l.label} className="flex items-start justify-between gap-3">
                  <dt className="text-slate-500">{l.label}</dt>
                  <dd className={cx('font-medium tabular-nums', l.value < 0 ? 'text-green-700' : 'text-navy-900')}>
                    {formatINR(l.value)}
                  </dd>
                </div>
              ))}
            </dl>
            <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3">
              <span className="text-sm font-semibold text-navy-900">Total</span>
              <span className="font-display text-xl text-navy-900">{formatINR(finalTotal)}</span>
            </div>
          </div>
        )}
        {!isMember && (
          <div className="border-t border-slate-100 px-5 py-3.5 bg-gold-50/60">
            <p className="text-xs text-slate-700 flex items-center justify-between gap-2">
              <span>{MEMBER_PROMO_NOTE}</span>
              {MEMBERSHIP_REDIRECT_URL.startsWith('http') ? (
                <a
                  href={MEMBERSHIP_REDIRECT_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="shrink-0 font-semibold text-gold-700 underline hover:text-gold-800"
                >
                  Join now →
                </a>
              ) : (
                <Link
                  to={MEMBERSHIP_REDIRECT_URL}
                  className="shrink-0 font-semibold text-gold-700 underline hover:text-gold-800"
                >
                  Join now →
                </Link>
              )}
            </p>
          </div>
        )}
        {footnote && <p className="m-5 mt-0 rounded-xl bg-navy-50 p-3 text-xs leading-relaxed text-slate-600">{footnote}</p>}
      </div>
    </aside>
  );
}
