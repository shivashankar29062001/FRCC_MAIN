import { cx } from '../../utils/helpers.js';
import { Button } from './controls.jsx';
import { InboxIcon } from './icons.jsx';

export function Card({ className, children, ...props }) {
  return <div className={cx('card p-5 sm:p-6', className)} {...props}>{children}</div>;
}

/**
 * Status pill used across bookings, payments and memberships.
 * Adds `tone` to the standard tag system (green / amber / red / navy / slate).
 */
export function StatusTag({ status = '', className }) {
  const key = String(status).toLowerCase();
  const tone =
    key.includes('confirm') || key.includes('success') || key.includes('active') || key.includes('paid')
      ? 'tag-green'
      : key.includes('pend') || key.includes('process') || key.includes('draft')
        ? 'tag-amber'
        : key.includes('cancel') || key.includes('fail') || key.includes('error')
          ? 'tag-red'
          : 'tag-slate';
  return <span className={cx('tag', tone, className)}>{status}</span>;
}

export function SectionHeading({ eyebrow, title, sub, align = 'left' }) {
  return (
    <div className={cx('max-w-2xl', align === 'center' && 'mx-auto text-center')}>
      {eyebrow && <p className="eyebrow">{eyebrow}</p>}
      <h2 className="h-section mt-2">{title}</h2>
      {sub && <p className="p-muted mt-2">{sub}</p>}
    </div>
  );
}

export function EmptyState({ title = 'Nothing here yet', body = 'Try a different filter or come back later.', action, icon: Icon = InboxIcon }) {
  return (
    <div className="card p-8 sm:p-10 text-center">
      <div aria-hidden className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl border border-navy-900/10 bg-navy-50 text-navy-800">
        <Icon className="h-6 w-6" />
      </div>
      <h3 className="font-display text-xl text-navy-900">{title}</h3>
      <p className="p-muted mt-1.5 text-sm mx-auto max-w-md">{body}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function LoadingState({ label = 'Loading…', rows = 3 }) {
  return (
    <div className="card p-6" role="status" aria-live="polite" aria-label={label}>
      <div className="skeleton h-5 w-1/3" />
      <div className="skeleton h-4 w-full mt-3" />
      <div className="skeleton h-4 w-2/3 mt-2" />
      {rows > 0 && <div className="skeleton h-4 w-1/2 mt-2" />}
      <div className="skeleton h-10 w-40 mt-4" />
      <span className="sr-only">{label}</span>
    </div>
  );
}

/** Skeleton card grid — shown while a section's data is loading. */
export function SkeletonGrid({ count = 3, className }) {
  return (
    <div className={cx('grid gap-4', className)} role="status" aria-live="polite" aria-label="Loading content">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="card p-5">
          <div className="skeleton h-11 w-11 rounded-xl" />
          <div className="skeleton h-4 w-2/3 mt-4" />
          <div className="skeleton h-3 w-full mt-2" />
          <div className="skeleton h-3 w-3/4 mt-1.5" />
        </div>
      ))}
      <span className="sr-only">Loading…</span>
    </div>
  );
}

export function ErrorState({ message = 'Something went wrong.', onRetry }) {
  return (
    <div className="card p-6 border-red-200 bg-red-50" role="alert">
      <h3 className="font-semibold text-red-800">Error</h3>
      <p className="text-sm text-red-700 mt-1">{message}</p>
      {onRetry && <Button variant="outline" size="sm" className="mt-3" onClick={onRetry}>Try again</Button>}
    </div>
  );
}

export function Modal({ open, onClose, title, children }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 grid place-items-center p-4" role="dialog" aria-modal="true" aria-label={title}>
      <button aria-label="Close dialog" onClick={onClose} className="absolute inset-0 bg-navy-950/60" />
      <div className="relative card p-6 w-full max-w-md">
        <h3 className="font-display text-xl text-navy-900">{title}</h3>
        <div className="mt-3">{children}</div>
        <Button variant="outline" size="sm" className="mt-4" onClick={onClose}>Close</Button>
      </div>
    </div>
  );
}

export function Toasts({ items }) {
  return (
    <div className="fixed bottom-4 right-4 z-[60] flex flex-col gap-2" aria-live="polite">
      {items.map((t) => (
        <div
          key={t.id}
          className={`max-w-xs rounded-xl px-4 py-3 text-sm font-medium shadow-lift border ${
            t.kind === 'error' ? 'bg-red-600 text-white border-red-600' : 'bg-navy-900 text-white border-navy-900'
          }`}
        >
          {t.message}
        </div>
      ))}
    </div>
  );
}
