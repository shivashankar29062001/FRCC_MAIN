// ---------------------------------------------------------------------------
// BookingStepper — THE ONE reusable stepper for booking flows: numbered steps,
// progress bar, Back/Next discipline (click back to revisit, never skip ahead).
// Validation lives with the parent: it calls onNext only when the step passes.
// ---------------------------------------------------------------------------

import { cx } from '../../utils/helpers.js';
import { CheckIcon } from '../ui/icons.jsx';

/**
 * @param {{ steps: Array<{ id: string, title: string }>, current: number,
 *   onStepClick?: (index: number) => void }} props
 */
export function BookingStepper({ steps = [], current = 0, onStepClick }) {
  const pct = steps.length > 1 ? Math.round((current / (steps.length - 1)) * 100) : 0;
  return (
    <nav aria-label="Booking progress" className="card !p-4 sm:!p-5">
      <ol className="flex items-start gap-1 sm:gap-2">
        {steps.map((s, i) => {
          const done = i < current;
          const active = i === current;
          const reachable = i <= current;
          return (
            <li key={s.id} className="flex min-w-0 flex-1 items-start gap-2">
              <button
                type="button"
                disabled={!reachable}
                onClick={() => onStepClick?.(i)}
                aria-current={active ? 'step' : undefined}
                aria-label={`Step ${i + 1}: ${s.title}${done ? ' (completed)' : ''}`}
                className={cx(
                  'flex min-w-0 flex-1 items-center gap-2 rounded-xl p-1.5 text-left transition-colors duration-150',
                  reachable ? 'cursor-pointer' : 'cursor-not-allowed',
                  active && 'bg-navy-50/70',
                )}
              >
                <span
                  aria-hidden
                  className={cx(
                    'grid h-7 w-7 shrink-0 place-items-center rounded-full text-xs font-bold transition-colors duration-150',
                    done ? 'bg-navy-900 text-gold-400' : active ? 'bg-gold-500 text-navy-950' : 'border border-slate-400 bg-white text-slate-600',
                  )}
                >
                  {done ? <CheckIcon className="h-3.5 w-3.5" /> : i + 1}
                </span>
                <span className="hidden min-w-0 sm:block">
                  <span className={cx('block truncate text-xs font-semibold', active ? 'text-navy-900' : 'text-slate-600')}>
                    {s.title}
                  </span>
                </span>
              </button>
              {i < steps.length - 1 && (
                <span aria-hidden className={cx('mt-4 h-0.5 w-3 shrink-0 rounded sm:w-6', i < current ? 'bg-navy-900' : 'bg-slate-300')} />
              )}
            </li>
          );
        })}
      </ol>
      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-200" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="Booking progress">
        <div className="h-full rounded-full bg-gold-500" style={{ width: `${pct}%` }} />
      </div>
      <p className="caption mt-2">Step {Math.min(current + 1, steps.length)} of {steps.length} · {steps[current]?.title}</p>
    </nav>
  );
}
