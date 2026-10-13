import { cx } from '../utils/helpers.js';
import { SmartImage } from './ui/media.jsx';
import { IMAGES } from '../config/images.js';

// ---------------------------------------------------------------------------
// HeroImage — full-bleed photo-only hero for page tops.
//
// Props: slot ("hero-home" etc.), size ("large" | "compact").
//   · large ≈ 85vh (landing /, signed-in home) · compact ≈ 40vh (sections)
//   · photo only: object-cover, NO text, NO buttons, NO chips on the image
//   · only a soft dark gradient at the top (navbar) and at the bottom
//   · SmartImage with the slot, eager loading + high fetch priority
//   · no animations
// ---------------------------------------------------------------------------

const HEIGHTS = {
  large: 'min-h-[85svh]',
  compact: 'min-h-[40svh]',
};

export function HeroImage({ slot, size = 'large', sizes = '100vw', className }) {
  const image = Object.values(IMAGES).find((entry) => entry && entry.slot === slot) || null;
  return (
    <section
      aria-label={image?.name || slot}
      className={cx('relative overflow-hidden bg-navy-950', HEIGHTS[size] || HEIGHTS.large, className)}
    >
      <SmartImage fill image={image} priority sizes={sizes} />
      {/* Soft dark gradient at the top (navbar) and bottom — nothing else on the photo */}
      <span aria-hidden className="absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-navy-950/70 to-transparent" />
      <span aria-hidden className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-navy-950/60 to-transparent" />
    </section>
  );
}

export default HeroImage;
