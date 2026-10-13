import { useEffect, useRef, useState } from 'react';
import { XIcon, ChevronLeftIcon, ChevronRightIcon } from './icons.jsx';
import { cx } from '../../utils/helpers.js';

// ---------------------------------------------------------------------------
// Lightbox — the photo viewer behind the landing-page gallery.
//
// Controlled by the page: pass the photo list, the current index and the two
// callbacks. `index` of null (or no photos) renders nothing.
//
// · No animation: it appears and disappears instantly.
// · Keyboard: Esc closes, ArrowLeft / ArrowRight move between photos, Tab is
//   kept inside the dialog.
// · Clicking the backdrop or the close button closes it.
// · The photo that opened it gets focus back on close.
// ---------------------------------------------------------------------------

/**
 * @param {{ images?: Array<{src: string, srcSet?: string, alt?: string, caption?: string}>,
 *   index?: number|null, onClose?: () => void, onNavigate?: (step: number) => void,
 *   label?: string }} props
 */
export function Lightbox({ images = [], index = null, onClose, onNavigate, label = 'Photo viewer' }) {
  const dialogRef = useRef(null);
  const restoreRef = useRef(null);
  // Latest callbacks in a ref so the key handler below never goes stale while
  // the dialog stays open.
  const handlers = useRef({ onClose, onNavigate });
  handlers.current = { onClose, onNavigate };

  const open = index !== null && index >= 0 && index < images.length;

  useEffect(() => {
    if (!open) return undefined;
    restoreRef.current = document.activeElement;
    dialogRef.current?.focus();

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    function onKey(e) {
      if (e.key === 'Escape') {
        e.preventDefault();
        handlers.current.onClose?.();
        return;
      }
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        handlers.current.onNavigate?.(-1);
        return;
      }
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        handlers.current.onNavigate?.(1);
        return;
      }
      if (e.key !== 'Tab') return;
      const nodes = dialogRef.current?.querySelectorAll('button');
      if (!nodes || nodes.length === 0) return;
      const first = nodes[0];
      const last = nodes[nodes.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }

    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = previousOverflow;
      if (restoreRef.current instanceof HTMLElement) restoreRef.current.focus();
    };
  }, [open]);

  if (!open) return null;

  const current = images[index];
  const many = images.length > 1;

  return (
    <div
      ref={dialogRef}
      tabIndex={-1}
      role="dialog"
      aria-modal="true"
      aria-label={label}
      className="fixed inset-0 z-50 flex items-center justify-center bg-navy-950/95 p-4 focus:outline-none"
    >
      {/* Backdrop — clicking outside the photo closes the viewer */}
      <button
        type="button"
        aria-label="Close photo viewer"
        onClick={() => handlers.current.onClose?.()}
        className="absolute inset-0"
      />

      {many && (
        <button
          type="button"
          aria-label="Previous photo"
          onClick={() => handlers.current.onNavigate?.(-1)}
          className="absolute left-2 z-10 grid h-12 w-12 place-items-center rounded-full border border-white/25 bg-navy-950/70 text-white transition-colors duration-150 hover:border-gold-500/60 hover:text-gold-400 focus-visible:border-gold-500/60 sm:left-4"
        >
          <ChevronLeftIcon className="h-6 w-6" />
        </button>
      )}

      <figure className="relative z-10 flex max-h-[85vh] max-w-[92vw] flex-col items-center">
        {current.src ? (
          <img
            src={current.src}
            srcSet={current.srcSet}
            sizes="92vw"
            alt={current.alt || ''}
            className="max-h-[78vh] w-auto max-w-full rounded-xl object-contain"
          />
        ) : (
          <div
            role="img"
            aria-label={current.caption || current.alt}
            className="grid max-h-[78vh] w-[min(92vw,640px)] place-items-center rounded-xl border border-gold-500/70 px-6 py-16 text-center"
            style={{ background: 'linear-gradient(135deg, #0b1a33 0%, #12305a 100%)', aspectRatio: '4 / 3' }}
          >
            <span className="text-xs font-semibold uppercase tracking-[0.2em] text-white/90">
              {current.caption || current.alt}
            </span>
          </div>
        )}
        <figcaption className="mt-3 text-center text-sm text-slate-200">
          {current.caption || current.alt}
        </figcaption>
        <p className="mt-1 text-xs text-slate-400">
          {index + 1} / {images.length}
          <span className="sr-only"> — press Escape to close, arrow keys to move between photos</span>
        </p>
      </figure>

      <button
        type="button"
        aria-label="Close photo viewer"
        onClick={() => handlers.current.onClose?.()}
        className="absolute right-2 top-2 z-10 grid h-11 w-11 place-items-center rounded-full border border-white/25 bg-navy-950/70 text-white transition-colors duration-150 hover:border-gold-500/60 hover:text-gold-400 focus-visible:border-gold-500/60 sm:right-4 sm:top-4"
      >
        <XIcon className="h-5 w-5" />
      </button>
    </div>
  );
}

export default Lightbox;

/** LightboxImage — a clickable thumbnail that opens the lightbox. */
export function LightboxImage({ image, index, images, className }) {
  const [open, setOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(index);

  return (
    <>
      <button
        type="button"
        onClick={() => { setLightboxIndex(index); setOpen(true); }}
        className={cx('group relative block overflow-hidden rounded-2xl border border-navy-900/10 focus:outline-none focus:ring-2 focus:ring-gold-500', className)}
        aria-label={`View ${image.alt}`}
      >
        <img
          src={image.src}
          srcSet={image.srcSet}
          sizes="(min-width: 1024px) 23vw, 46vw"
          alt={image.alt}
          loading="lazy"
          decoding="async"
          className="absolute inset-0 h-full w-full object-cover transition-transform duration-150 group-hover:scale-[1.02]"
        />
        <span aria-hidden className="absolute inset-0 bg-gradient-to-t from-navy-950/60 to-transparent opacity-0 transition-opacity duration-150 group-hover:opacity-100" />
        <span className="absolute inset-x-0 bottom-0 p-3 text-xs font-semibold text-white opacity-0 transition-opacity duration-150 group-hover:opacity-100">
          {image.caption || image.alt}
        </span>
      </button>
      <Lightbox
        images={images}
        index={open ? lightboxIndex : null}
        onClose={() => setOpen(false)}
        onNavigate={(step) => setLightboxIndex((i) => (i + step + images.length) % images.length)}
      />
    </>
  );
}
