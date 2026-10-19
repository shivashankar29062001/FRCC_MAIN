import { Link } from 'react-router-dom';

export default function Landing() {
  return (
    <section className="relative min-h-[80vh] flex items-center justify-center text-center">
      <div
        className="absolute inset-0 bg-cover bg-center pointer-events-none"
        style={{
          backgroundImage: "url('https://images.unsplash.com/photo-1519167758481-83f550bb49b3?auto=format&fit=crop&w=1600&q=80')",
          filter: 'brightness(1.2) contrast(1.08) saturate(1.15)'
        }}
      />
      <div className="absolute inset-0 bg-navy-900/5 pointer-events-none" />
      <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16 w-full flex flex-col items-center justify-center text-center">
        <h1
          className="convention-hero-quote font-serif font-medium text-white text-3xl sm:text-4xl md:text-5xl lg:text-6xl leading-tight text-balance max-w-3xl"
          style={{ textShadow: '0 2px 4px rgba(0,0,0,0.6), 0 4px 24px rgba(0,0,0,0.5)' }}
        >
          <span className="md:block">Elegance for every occasion,</span>{' '}
          <span className="text-gold">scale for every dream.</span>
        </h1>
        <Link to="/convention/book" className="inline-block mt-8 bg-gold text-navy font-bold px-8 py-3 rounded shadow hover:bg-gold-light transition-colors">
          Book Convention Hall
        </Link>
      </div>
    </section>
  );
}