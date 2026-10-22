import { useState } from 'react';
import { cx } from '../../utils/helpers.js';
import { TrophyIcon } from './icons.jsx';

// ---------------------------------------------------------------------------
// SmartImage — the one way the app renders a photo.
// · responsive: srcSet + sizes (crisp but suitably sized per device)
// · lazy below the fold, eager + fetchPriority for the hero
// · fixed aspect ratio with object-fit: cover + per-image objectPosition
// · optional dark gradient overlay where text sits on the image
// · fallback (src null or failed): navy gradient tile (#0b1a33 → #12305a)
//   with a thin gold border and the item's name (games also get a simple
//   gold icon) — never the broken-image icon, alt text, or another slot's
//   photo
// · no animation: the photo appears in place — no fade-in, no hover zoom
// ---------------------------------------------------------------------------

/**
 * @param {{ image?: {src?: string, srcSet?: string, alt?: string, objectPosition?: string, slot?: string, name?: string, game?: boolean},
 *   aspect?: string, sizes?: string, priority?: boolean, overlay?: boolean,
 *   label?: string, className?: string, children?: any }} props
 */
export function SmartImage({
  image,
  aspect = '4 / 3',
  fill = false,
  sizes = '(min-width: 1024px) 40vw, (min-width: 640px) 50vw, 100vw',
  priority = false,
  overlay = false,
  label = 'Photography placeholder',
  className,
  children,
}) {
  // `failed` flips the slot to the fallback tile.
  const [failed, setFailed] = useState(false);
  const src = image?.src;
  const broken = !src || failed;
  const name = image?.name || image?.slot || label;

  return (
    <div
      className={cx('relative overflow-hidden', fill && 'absolute inset-0', className)}
      style={{
        ...(fill ? undefined : { aspectRatio: aspect }),
        background: 'linear-gradient(135deg, #0b1a33 0%, #12305a 100%)',
      }}
    >
      {broken ? (
        // Navy fallback tile — thin gold border + item name, never a broken image.
        <div className="absolute inset-0 grid place-items-center border border-gold-500/70 text-center" role="img" aria-label={name}>
          <span className="relative px-4">
            {image?.game && <TrophyIcon aria-hidden className="mx-auto mb-2 h-6 w-6 text-gold-400" />}
            <span className="block text-xs font-semibold uppercase tracking-[0.2em] text-white/90">
              {name}
            </span>
          </span>
        </div>
      ) : (
        <img
          src={src}
          srcSet={image.srcSet}
          sizes={sizes}
          alt={image.alt || ''}
          loading={priority ? 'eager' : 'lazy'}
          decoding={priority ? 'sync' : 'async'}
          fetchPriority={priority ? 'high' : 'auto'}
          onError={() => setFailed(true)}
          className="absolute inset-0 h-full w-full object-cover"
          style={{ objectPosition: image.objectPosition || 'center' }}
        />
      )}

      {/* Readability guard wherever copy sits on the photo */}
      {overlay && (
        <span
          aria-hidden
          className="absolute inset-0 bg-gradient-to-t from-navy-950/85 via-navy-950/35 to-navy-950/10 pointer-events-none"
        />
      )}
      {children}
    </div>
  );
}

/** Small caption strip that sits over the bottom of an image. */
export function ImageCaption({ children, className }) {
  return (
    <span className={cx('absolute inset-x-0 bottom-0 p-3 sm:p-4 text-white', className)}>{children}</span>
  );
}
