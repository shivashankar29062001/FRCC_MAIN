import { localFor, REMOTE, getObjectPosition } from "../config/images.js";
import { SmartImage } from "./ui/media.jsx";

export function HeroImage({ slot, size = "large", children }) {
  const src = localFor(slot) || REMOTE[slot] || null;
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
