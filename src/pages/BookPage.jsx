import { Link } from 'react-router-dom';
import { BookingBar } from '../components/BookingPanel.jsx';
import { HeroImage } from '../components/HeroImage.jsx';
import { Breadcrumbs } from '../components/ui/sections.jsx';
import { SmartImage } from '../components/ui/media.jsx';
import { PhotoTile, SectionLink } from '../components/ui/explore.jsx';
import { IMAGES } from '../config/images.js';
import { ArrowRightIcon } from '../components/ui/icons.jsx';

// Five showcase cards for the booking hub
const CARDS = [
  {
    to: '/book/hotel',
    label: 'Stay',
    desc: '36 rooms across two wings — member rates from tonight.',
    image: IMAGES.serviceHotel,
  },
  {
    to: '/book/hall',
    label: 'Halls',
    desc: '4 venues seating 40 to 600 — weddings, conferences, celebrations.',
    image: IMAGES.serviceHall,
  },
  {
    to: '/book/parking',
    label: 'Parking',
    desc: '3 zoned areas — reserve by the hour before you arrive.',
    image: IMAGES.serviceParking,
  },
  {
    to: '/book/activities',
    label: 'Activities',
    desc: '11 games across courts, grounds, pool and play zones.',
    image: IMAGES.serviceActivities,
  },
  {
    to: '/membership',
    label: 'Membership',
    desc: 'One lifetime fee, member rates across the whole campus.',
    image: IMAGES.serviceMembership,
  },
];

export function BookPage() {
  return (
    <div>
      {/* 1 · HERO — photo only */}
      <HeroImage slot="hero-book" />

      {/* 2 · Booking bar — starts below the hero */}
      <div id="booking" className="container-x py-8 scroll-mt-24">
        <BookingBar />
      </div>

      <div className="container-x pb-14 sm:pb-16 lg:pb-20">
        <Breadcrumbs items={[{ label: 'Home', to: '/home' }, { label: 'Book' }]} />
        <h1 className="h-section mt-3">Book anything on campus</h1>
        <p className="mt-3 max-w-2xl text-slate-600">Pick a service and start your booking — your choices carry through to the booking page.</p>
        {/* 3 · Five large photo cards — one per service */}
        <section aria-label="Booking options" className="mt-12">
          <h2 className="h-section">Five ways to spend the day</h2>
          <div className="mt-7 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5 lg:gap-4">
            {CARDS.map((c) => (
              <PhotoTile
                key={c.label}
                to={c.to}
                image={c.image}
                label={c.label}
                detail={c.desc}
                aspect="4 / 3"
                sizes="(min-width: 1024px) 19vw, (min-width: 640px) 46vw, 92vw"
              />
            ))}
          </div>
        </section>

        {/* 4 · How it works — three compact steps */}
        <section className="mt-16" aria-label="How booking works">
          <h2 className="h-section">How it works</h2>
          <div className="mt-7 grid gap-6 sm:grid-cols-3">
            {[
              { icon: '📅', title: 'Choose', line: 'Pick a service, date and slot in the panel above.' },
              { icon: '✓', title: 'Confirm', line: 'Review the details and confirm on the booking page.' },
              { icon: '🛡️', title: 'Enjoy', line: 'Show your booking ID or member QR at the venue.' },
            ].map((s, i) => (
              <div key={s.title} className="flex items-start gap-4 p-5 rounded-2xl border border-navy-900/10 bg-white">
                <span aria-hidden className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-navy-50 text-navy-900 text-xl">{s.icon}</span>
                <div>
                  <h3 className="h-card">{s.title}</h3>
                  <p className="mt-1 text-sm text-slate-600">{s.line}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* 5 · Need help — compact CTA */}
        <section className="mt-16">
          <div className="rounded-2xl border border-navy-900/10 bg-navy-50/70 p-6 sm:p-8">
            <h2 className="h-sub">Not sure where to start?</h2>
            <p className="mt-2 text-sm text-slate-600">The front desk plans stays, weddings and game evenings every day.</p>
            <Link to="/support" className="mt-4 inline-block">
              <button type="button" className="btn-base border border-navy-900/20 bg-white text-navy-900 px-5 py-2.5 hover:bg-navy-50">
                Talk to us <ArrowRightIcon className="h-4 w-4" />
              </button>
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}

export default BookPage;