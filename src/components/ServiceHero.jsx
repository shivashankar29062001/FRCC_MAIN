import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { HeroImage } from './HeroImage.jsx';
import { HeroSlider } from './HeroSlider.jsx';
import { BookingCard } from './BookingPanel.jsx';
import { TypeWriter } from './TypeWriter.jsx';
import { SmartImage } from './ui/media.jsx';
import { ArrowRightIcon, CalendarIcon, UsersIcon } from './ui/icons.jsx';
import { MEMBER_DISCOUNT_PERCENT } from '../config/pricing.js';
import { SERVICE_HERO_DATA } from '../data/serviceHero.js';
import { OFFERS_DATA } from '../data/offers.js';
import { IMAGES, heroSrc } from '../config/images.js';
import { HERO_CARD } from '../data/membership.js';
import { venues } from '../data/dining.js';
import { todayISO } from '../utils/helpers.js';
import { formatDMY } from '../utils/dates.js';

function DiningHeroCard() {
  const navigate = useNavigate();
  const [venue, setVenue] = useState('restaurant');
  const [date, setDate] = useState(() => formatDMY(todayISO()));
  const [guests, setGuests] = useState('2');

  function handleSubmit(e) {
    e.preventDefault();
    const params = new URLSearchParams();
    if (venue) params.set('venue', venue);
    if (date) params.set('date', date);
    if (guests) params.set('guests', guests);
    navigate(`/dining/book?${params.toString()}`);
  }

  return (
    <div className="booking-card booking-card--compact">
      <p className="booking-eyebrow">TABLE RESERVATION</p>
      <h2 className="booking-title font-display">Reserve your table</h2>
      <p className="mt-1 text-xs text-slate-300">Reserve a table at any of our campus dining venues</p>
      <form onSubmit={handleSubmit} className="mt-3 flex flex-col gap-3">
        <div>
          <label htmlFor="hero-dining-venue" className="booking-label">Venue</label>
          <select
            id="hero-dining-venue"
            value={venue}
            onChange={(e) => setVenue(e.target.value)}
            className="booking-field w-full text-sm"
          >
            {venues.map((v) => (
              <option key={v.id} value={v.id} className="text-navy-950 bg-white">
                {v.name}
              </option>
            ))}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label htmlFor="hero-dining-date" className="booking-label">Date (DD/MM/YYYY)</label>
            <input
              id="hero-dining-date"
              type="text"
              placeholder="DD/MM/YYYY"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="booking-field w-full text-sm"
            />
          </div>
          <div>
            <label htmlFor="hero-dining-guests" className="booking-label">Guests</label>
            <select
              id="hero-dining-guests"
              value={guests}
              onChange={(e) => setGuests(e.target.value)}
              className="booking-field w-full text-sm"
            >
              {[1, 2, 3, 4, 5, 6, 8, 10, 12].map((g) => (
                <option key={g} value={String(g)} className="text-navy-950 bg-white">
                  {g} {g === 1 ? 'Guest' : 'Guests'}
                </option>
              ))}
            </select>
          </div>
        </div>
        <button
          type="submit"
          className="btn-base bg-gold-500 text-navy-950 hover:bg-gold-400 w-full justify-center py-2.5 text-sm font-semibold inline-flex items-center gap-1.5 mt-1 transition"
        >
          <span>Find a table</span>
          <ArrowRightIcon className="h-4 w-4" />
        </button>
      </form>
    </div>
  );
}

function getSlot(service) {
  if (service === 'hall') return 'hero-halls';
  if (service === 'hub') return 'hero-hub';
  return `hero-${service}`;
}

export function ServiceHero({ service = 'stay' }) {
  const [headlineDone, setHeadlineDone] = useState(false);
  const data = SERVICE_HERO_DATA[service] || SERVICE_HERO_DATA.stay;
  const slot = getSlot(service);
  const isHub = service === 'hub';
  const offers = OFFERS_DATA[service] || null;

  function handleScroll(e) {
    e.preventDefault();
    const targetId = (data.linkTarget || '#content').replace(/^#/, '');
    const el = document.getElementById(targetId);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  return (
    <div>
      <div className="service-hero-wrap">
        <HeroImage slot={slot}>
          <div className="landing-hero-overlay" aria-hidden="true" />
          <div className="container-x relative z-10 h-full flex items-center">
            <div className="landing-hero-text max-w-[520px] text-white">
              {/* 3a · Small gold label */}
              <p className="landing-hero-eyebrow">{data.eyebrow}</p>

              {/* 3b · Serif headline */}
              <h1 className="landing-hero-headline">
                <TypeWriter
                  text={data.headline}
                  speed={55}
                  caretFadeDelay={1500}
                  onComplete={() => setHeadlineDone(true)}
                />
              </h1>

              {/* 3c · Second line typing loop */}
              <p className="landing-hero-subline">
                <TypeWriter
                  phrases={data.phrases}
                  speed={55}
                  holdTime={1600}
                  loop
                />
              </p>

              {/* 4 · Stat row and link with fade-in after headline */}
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
                    <span className="landing-hero-stat-subtitle">{data.statSuffix || 'on every stay'}</span>
                  </div>
                </div>

                <div className="mt-[18px]">
                  <a
                    href={data.linkTarget || '#content'}
                    onClick={handleScroll}
                    className="landing-hero-member-link inline-flex items-center gap-1.5"
                  >
                    <span>{data.linkText}</span>
                    <ArrowRightIcon className="h-4 w-4" />
                  </a>
                </div>
              </div>
            </div>
          </div>
        </HeroImage>

        {/* 5 · Right side: service mode or compact Join FRCC card */}
        <div id="booking" className="service-hero-card-wrap scroll-mt-24">
          {service === 'membership' ? (
            <div className="booking-card booking-card--compact">
              <p className="booking-eyebrow">{HERO_CARD.eyebrow}</p>
              <h2 className="booking-title font-display">{HERO_CARD.title}</h2>
              <p className="mt-2 text-sm text-slate-300 leading-relaxed">
                {HERO_CARD.description}
              </p>
              <div className="mt-6">
                <Link
                  to={HERO_CARD.buttonLink}
                  className="btn-base bg-gold-500 text-navy-950 hover:bg-gold-400 w-full justify-center py-3 text-sm font-semibold inline-flex items-center"
                >
                  {HERO_CARD.buttonText}
                </Link>
              </div>
            </div>
          ) : service === 'dining' ? (
            <DiningHeroCard />
          ) : service === 'events' ? (
            <div className="booking-card booking-card--compact">
              <p className="booking-eyebrow">FRCC EVENTS</p>
              <h2 className="booking-title font-display">Experience the Culture</h2>
              <p className="mt-2 text-sm text-slate-300 leading-relaxed">
                Screenings, workshops, discussions, and cultural evenings celebrating cinema and arts.
              </p>
              <div className="mt-6">
                <a
                  href="#content"
                  className="btn-base bg-gold-500 text-navy-950 hover:bg-gold-400 w-full justify-center py-3 text-sm font-semibold inline-flex items-center"
                >
                  Explore events
                </a>
              </div>
            </div>
          ) : (
            <BookingCard compact service={isHub ? null : service} />
          )}
        </div>
      </div>

      {/* Offers section below each ServiceHero */}
      {offers && offers.length > 0 && (
        <section className="band-cream border-b border-slate-200/60 py-10 sm:py-12" aria-label="Offers">
          <div className="container-x">
            <h2 className="h-section">Offers</h2>
            <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {offers.map((offer) => {
                const img = IMAGES[offer.imageSlot] || {
                  slot: offer.imageSlot,
                  src: heroSrc(offer.imageSlot),
                  alt: offer.title,
                };
                return (
                  <article
                    key={offer.id || offer.title}
                    className="flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-white transition-colors duration-150 hover:border-gold-500"
                  >
                    <SmartImage
                      image={img}
                      aspect="16 / 10"
                      sizes="(min-width: 1024px) 30vw, (min-width: 640px) 45vw, 92vw"
                    />
                    <div className="flex flex-1 flex-col p-5">
                      <h3 className="font-display text-lg text-navy-900">{offer.title}</h3>
                      <p className="mt-1.5 flex-1 text-sm text-slate-600 leading-relaxed">{offer.line}</p>
                      <div className="mt-4 pt-1">
                        <Link
                          to={offer.link}
                          className="inline-flex items-center gap-1 text-sm font-semibold text-navy-900 transition-colors duration-150 hover:text-gold-600"
                        >
                          <span>View</span>
                          <ArrowRightIcon className="h-3.5 w-3.5" />
                        </Link>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}

export default ServiceHero;
