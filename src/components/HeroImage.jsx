import { localFor, REMOTE } from "../config/images.js";

export function HeroImage({ slot, size = "large", children }) {
  const src = localFor(slot) || REMOTE[slot] || null;
  const compact = size === "compact";
  return (
    <section className={compact ? "hero hero--compact" : "hero"}>
      {src && (
        <img
          src={src}
          alt=""
          loading="eager"
          decoding="async"
          className="hero__img"
        />
      )}
      <div className="hero__shade" />
      {children}
    </section>
  );
}

export default HeroImage;
