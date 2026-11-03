import { localFor, REMOTE, FALLBACK, getObjectPosition } from "../config/images.js";
import { SmartImage } from "./ui/media.jsx";
import { HeroSlider } from "./HeroSlider.jsx";

export function HeroImage({ slot, size = "large", children }) {
  if (slot === 'hero-home' || slot === 'hero-hub') {
    return (
      <HeroSlider slotsKey={slot === 'hero-home' ? 'home' : 'hub'}>
        {children}
      </HeroSlider>
    );
  }

  const src = localFor(slot) || REMOTE[slot] || FALLBACK[slot] || null;
  const objectPosition = getObjectPosition(slot);
  return (
    <section className="hero">
      {src ? (
        <img
          src={src}
          alt=""
          loading="eager"
          decoding="async"
          className="hero__img"
          style={{ objectPosition }}
        />
      ) : (
        <SmartImage image={{ src: null, slot }} fill priority />
      )}
      <div className="hero__shade" />
      {children}
    </section>
  );
}

export default HeroImage;
