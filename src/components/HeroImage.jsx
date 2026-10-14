import { localFor, REMOTE, FALLBACK, getObjectPosition } from "../config/images.js";

export function HeroImage({ slot, size = "large", children }) {
  const src = localFor(slot) || REMOTE[slot] || FALLBACK[slot] || REMOTE['hero-home'];
  const objectPosition = getObjectPosition(slot);
  return (
    <section className="hero">
      {src && (
        <img
          src={src}
          alt=""
          loading="eager"
          decoding="async"
          className="hero__img"
          style={{ objectPosition }}
        />
      )}
      <div className="hero__shade" />
      {children}
    </section>
  );
}

export default HeroImage;
