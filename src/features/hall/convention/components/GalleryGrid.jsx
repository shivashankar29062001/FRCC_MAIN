import { useState } from 'react';

export default function GalleryGrid({ images, columns = 'md:grid-cols-4' }) {
  const [lightbox, setLightbox] = useState(null);
  return (
    <>
      <div className={`grid grid-cols-2 ${columns} gap-3`}>
        {images.map((img, i) => (
          <button key={i} onClick={() => setLightbox(i)} className="overflow-hidden rounded shadow focus:outline-gold">
            <img src={img.src} alt={img.alt} loading="lazy" className="w-full h-40 object-cover hover:scale-105 transition" />
          </button>
        ))}
      </div>
      {lightbox !== null && (
        <div className="fixed inset-0 bg-navy-900/95 z-50 flex items-center justify-center p-4" onClick={() => setLightbox(null)}>
          <button className="absolute top-4 right-6 text-gold text-3xl" onClick={() => setLightbox(null)} aria-label="Close">×</button>
          <button className="absolute left-4 text-gold text-4xl" onClick={(e) => { e.stopPropagation(); setLightbox(i => (i - 1 + images.length) % images.length); }} aria-label="Previous">‹</button>
          <img src={images[lightbox].src} alt={images[lightbox].alt} className="max-h-[85vh] max-w-[90vw] rounded" onClick={(e) => e.stopPropagation()} />
          <button className="absolute right-4 text-gold text-4xl" onClick={(e) => { e.stopPropagation(); setLightbox(i => (i + 1) % images.length); }} aria-label="Next">›</button>
        </div>
      )}
    </>
  );
}
