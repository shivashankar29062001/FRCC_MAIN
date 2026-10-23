import { useState } from 'react';
import { Link } from 'react-router-dom';
import { BookingCard } from '../components/BookingPanel.jsx';
import { HeroImage } from '../components/HeroImage.jsx';
import { Breadcrumbs } from '../components/ui/sections.jsx';
import { PhotoTile } from '../components/ui/explore.jsx';
import { IMAGES } from '../config/images.js';
import { ArrowRightIcon } from '../components/ui/icons.jsx';
import { TypeWriter } from '../components/TypeWriter.jsx';
import { MEMBER_DISCOUNT_PERCENT } from '../config/pricing.js';

// Five showcase cards for the booking hub
const CARDS = [
  {
    to: '/stay',
    label: 'Stay',
    desc: '36 rooms across two wings — member rates from tonight.',
    image: IMAGES.serviceHotel,
  },
  {
    to: '/halls',
    label: 'Halls',
    desc: '4 venues seating 40 to 600 — weddings, conferences, celebrations.',
    image: IMAGES.serviceHall,
  },
  {
    to: '/parking',
    label: 'Parking',
    desc: '3 zoned areas — reserve by the hour before you arrive.',
    image: IMAGES.serviceParking,
  },
  {
    to: '/activities',
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
  const [headlineDone, setHeadlineDone] = useState(false);

  return (
    <div>
      {/* 1 · HERO — landing page style with photo, overlay, headline & booking card */}
      <div className="service-hero-wrap">
        <HeroImage slot="hero-book">
          <div className="landing-hero-overlay" aria-hidden="true" />
          <div className="container-x relative z-10 h-full flex items-center">
            <div className="landing-hero-text max-w-[520px] text-white">
              {/* 1a · Small gold label */}
              <p className="landing-hero-eyebrow">CAMPUS RESERVATIONS</p>

              {/* 1b · Serif headline */}
              <h1 className="landing-hero-headline">
                <TypeWriter
                  text="Book anything on campus"
                  speed={55}
                  caretFadeDelay={1500}
                  onComplete={() => setHeadlineDone(true)}
                />
              </h1>

              {/* 1c · Second line typing loop */}
              <p className="landing-hero-subline">
                <TypeWriter
                  phrases={[
                    '36 rooms across two wings.',
                    '4 grand celebration halls.',
                    'Zoned parking ready on arrival.',
                    '11 sports & recreational games.',
                    'Member rates on every booking.',
                  ]}
                  speed={55}
                  holdTime={1600}
                  loop
                />
              </p>

              {/* 1d · Stat row and link with fade-in after headline */}
              <div
                className={`landing-hero-fade-group ${
                  headlineDone ? 'opacity-100' : 'opacity-0 pointer-events-none'
                }`}
              >
                <div className="landing-hero-stat-row">
                  <span className="landing-hero-stat-number">{MEMBER_DISCOUNT_PERCENT}%</span>
                  <div className="landing-hero-stat-divider" aria-hidden="true" />
                  <div className="flex flex-col justify-center">
                    <span className="landing-hero-stat-title">Member savings</span>
                    <span className="landing-hero-stat-subtitle">on every booking</span>
                  </div>
                </div>

                <div className="mt-[18px]">
                  <a
                    href="#booking-options"
                    onClick={(e) => {
                      e.preventDefault();
                      document.getElementById('booking-options')?.scrollIntoView({ behavior: 'smooth' });
                    }}
                    className="landing-hero-member-link inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    <span>Explore booking options</span>
                    <ArrowRightIcon className="h-4 w-4" />
                  </a>
                </div>
              </div>
            </div>
          </div>
        </HeroImage>

        {/* 1e · Floating / compact Booking Card on the right */}
        <div id="booking" className="service-hero-card-wrap scroll-mt-24">
          <BookingCard compact />
        </div>
      </div>

      <div id="booking-options" className="container-x py-10 sm:py-14 scroll-mt-16">
        <Breadcrumbs items={[{ label: 'Home', to: '/home' }, { label: 'Book' }]} />
        <h2 className="h-section mt-4">Five ways to spend the day</h2>
        <p className="mt-2 max-w-2xl text-slate-600">Pick a service and start your booking — your choices carry through to the booking page.</p>

        {/* 2 · Five large photo cards — one per service */}
        <section aria-label="Booking options" className="mt-8">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5 lg:gap-4">
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

        {/* 3 · How it works — three compact steps */}
        <section className="mt-16" aria-label="How booking works">
          <h2 className="h-section">How it works</h2>
          <div className="mt-7 grid gap-6 sm:grid-cols-3">
            {[
              { icon: '📅', title: 'Choose', line: 'Pick a service, date and slot in the panel above.' },
              { icon: '✓', title: 'Confirm', line: 'Review the details and confirm on the booking page.' },
              { icon: '🛡️', title: 'Enjoy', line: 'Show your booking ID or member QR at the venue.' },
            ].map((s) => (
              <div key={s.title} className="flex items-start gap-4 p-5 rounded-2xl border border-navy-900/10 bg-white shadow-subtle hover:border-gold-500/40 transition">
                <span aria-hidden className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-navy-50 text-navy-900 text-xl">{s.icon}</span>
                <div>
                  <h3 className="h-card">{s.title}</h3>
                  <p className="mt-1 text-sm text-slate-600">{s.line}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* 4 · Need help — compact CTA */}
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