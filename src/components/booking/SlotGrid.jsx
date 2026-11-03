// ---------------------------------------------------------------------------
// SlotGrid — available / almost full / full / selected slot picker with legend.
// Native radio inputs = free keyboard navigation (arrows + tab) and
// screen-reader announcements. Loading skeleton + error retry included.
// ---------------------------------------------------------------------------

import { cx } from '../../utils/helpers.js';
import { ErrorState } from '../ui/feedback.jsx';
import { slotRange } from '../../features/activities/availability.service.js';

/**
 * @param {{
 *   gameId: string,
 *   slots?: Array<{ time: string, range?: string, capacity?: number, bookedCount?: number, remaining?: number, status?: string, booked: boolean }>,
 *   value?: string,
 *   onChange?: (time: string) => void,
 *   loading?: boolean,
 *   error?: string,
 *   onRetry?: () => void,
 *   dateLabel?: string,
 *   gameName?: string,
 *   isGroup?: boolean
 * }} props
 */
export function SlotGrid({
  gameId,
  slots = [],
  value = '',
  onChange,
  loading = false,
  error = '',
  onRetry,
  dateLabel = '',
  gameName = '',
  isGroup = false,
}) {
  if (loading) {
    return (
      <div role="status" aria-live="polite" aria-label="Loading slots">
        <div className="flex flex-wrap gap-2.5">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="skeleton h-[52px] w-[112px] !rounded-xl" />
          ))}
        </div>
        <span className="sr-only">Loading available slots…</span>
      </div>
    );
  }

  if (error) {
    return <ErrorState message={error} onRetry={onRetry} />;
  }

  if (slots.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-5 text-center text-sm text-slate-500" role="status">
        No slots configured for this game yet. Try another date or game.
      </div>
    );
  }

  const available = slots.filter((s) => !s.booked && (s.remaining === undefined || s.remaining > 0)).length;

  return (
    <fieldset>
      <legend className="label">
        Slots{gameName ? ` for ${gameName}` : ''}{dateLabel ? ` — ${dateLabel}` : ''} · {available} of {slots.length} available
      </legend>
      <div className="flex flex-wrap gap-2.5" role="radiogroup" aria-label="Available slots">
        {slots.map((s) => {
          const selected = value === s.time;
          const isFull = s.booked || s.status === 'full' || (s.remaining !== undefined && s.remaining <= 0);
          const isAlmost = !isFull && (s.status === 'almost_full' || (s.remaining !== undefined && s.remaining <= 3));

          let badgeText = 'Available';
          if (isFull) {
            badgeText = 'Full';
          } else if (selected) {
            badgeText = isGroup && s.remaining !== undefined ? `Selected (${s.remaining} left)` : 'Selected';
          } else if (isAlmost) {
            badgeText = isGroup && s.remaining !== undefined ? `Almost full (${s.remaining} left)` : 'Almost full';
          } else if (isGroup && s.remaining !== undefined) {
            badgeText = `Available (${s.remaining} left)`;
          }

          return (
            <label
              key={s.time}
              className={cx(
                'rounded-xl border px-3.5 py-2 text-center transition-colors duration-150 focus-within:ring-2 focus-within:ring-navy-800/30',
                isFull
                  ? 'cursor-not-allowed border-slate-300 bg-slate-100 text-slate-400'
                  : selected
                    ? 'cursor-pointer border-navy-900 bg-navy-900 text-white shadow-card'
                    : isAlmost
                      ? 'cursor-pointer border-amber-300 bg-amber-50/60 text-amber-900 hover:border-amber-400 hover:bg-amber-50'
                      : 'cursor-pointer border-slate-300 bg-white text-navy-900 hover:border-navy-900/60 hover:bg-navy-50',
              )}
            >
              <input
                type="radio"
                name="slot"
                className="sr-only"
                checked={selected}
                disabled={isFull}
                onChange={() => onChange?.(s.time)}
              />
              <span className="block text-sm font-semibold tabular-nums">{s.range || slotRange(gameId, s.time)}</span>
              <span
                className={cx(
                  'block text-[10px] font-semibold',
                  isFull
                    ? 'text-slate-400'
                    : selected
                      ? 'text-gold-400'
                      : isAlmost
                        ? 'text-amber-700'
                        : 'text-slate-500',
                )}
              >
                {badgeText}
              </span>
            </label>
          );
        })}
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-slate-500" aria-label="Slot legend">
        <span className="flex items-center gap-1.5">
          <span aria-hidden className="h-3 w-3 rounded border border-slate-400 bg-white" /> Available
        </span>
        <span className="flex items-center gap-1.5">
          <span aria-hidden className="h-3 w-3 rounded border border-amber-300 bg-amber-100" /> Almost full
        </span>
        <span className="flex items-center gap-1.5">
          <span aria-hidden className="h-3 w-3 rounded border border-slate-300 bg-slate-100" /> Full
        </span>
        <span className="flex items-center gap-1.5">
          <span aria-hidden className="h-3 w-3 rounded border border-navy-900 bg-navy-900" /> Selected
        </span>
      </div>
    </fieldset>
  );
}
