import { Link } from 'react-router-dom';

export default function Landing() {
  return (
    <section className="relative min-h-[80vh] flex items-center justify-center text-center">
      <div className="convention-hero-media absolute inset-0 pointer-events-none" />
      <div className="convention-hero-shade absolute inset-0 pointer-events-none" />
      <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16 w-full flex flex-col items-center justify-center text-center">
        <h1 className="convention-hero-quote font-serif text-balance max-w-4xl">
          <span className="block">Elegance for every occasion,</span>{' '}
          <span className="convention-hero-quote-gold block">scale for every dream.</span>
        </h1>
        <span className="convention-hero-rule" aria-hidden="true" />
        <Link to="/convention/book" className="inline-block mt-8 bg-gold text-navy font-bold px-8 py-3 rounded shadow hover:bg-gold-light transition-colors">
          Book Convention Hall
        </Link>
      </div>
    </section>
  );
}