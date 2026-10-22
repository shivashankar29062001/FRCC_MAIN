import { useState } from 'react';
import { useApp } from '../app/store/AppContext.jsx';
import { Input, Select, TextArea, LoadingButton } from '../components/ui/controls.jsx';
import { Card, SectionHeading } from '../components/ui/feedback.jsx';
import { IconTile, Accordion } from '../components/ui/sections.jsx';
import { Reveal } from '../components/ui/motion.jsx';
import { HeroImage } from '../components/HeroImage.jsx';
import { TypeWriter } from '../components/TypeWriter.jsx';
import { SERVICE_HERO_DATA } from '../data/serviceHero.js';
import { SITE_INFO, getActiveSocialLinks, getAddressLines } from '../config/siteInfo.js';
import {
  PhoneIcon,
  MailIcon,
  MapPinIcon,
  ClockIcon,
  InstagramIcon,
  LinkedinIcon,
  YoutubeIcon,
  ArrowRightIcon,
  CheckIcon,
} from '../components/ui/icons.jsx';
import { LocationTrigger } from '../components/location/LocationTrigger.jsx';

// FAQ shown on the support page.
const FAQ = [
  {
    q: 'Where can I see my bookings?',
    a: 'Open My Profile and pick the My Bookings tab — every confirmed activity shows its booking ID, date and status tag there.',
  },
  {
    q: 'A slot I picked disappeared — what now?',
    a: 'Slots are held only while you are on the payment step. If it lapses, go back to the slot step and pick another available time, or raise a ticket and we will hold it for you.',
  },
  {
    q: 'How do I update my Member ID details?',
    a: 'Membership changes are handled by the membership team. Raise a ticket under “Membership / QR” and they will confirm the update within a working day.',
  },
  {
    q: 'How do I reach the Vijayawada campus front desk directly?',
    a: 'Our front desk phone (+91 78936 16262) is active 24/7. Registered members can also connect via WhatsApp for instant concierge support.',
  },
  {
    q: 'Can non-members book facilities at FRCC?',
    a: 'Yes, our stay suites, dining venues, and convention halls are open for public reservations, while active FRCC members receive an exclusive 30% discount on all bookings.',
  },
];

export function SupportPage() {
  const { pushToast } = useApp();
  const [headlineDone, setHeadlineDone] = useState(false);
  const [contact, setContact] = useState({ name: '', email: '', message: '' });
  const [ticket, setTicket] = useState({ category: '', priority: 'Normal', subject: '', details: '' });
  const [contactErr, setContactErr] = useState({});
  const [ticketErr, setTicketErr] = useState({});
  const [busy, setBusy] = useState({ contact: false, ticket: false });
  const [activeFormTab, setActiveFormTab] = useState('ticket');

  const heroData = SERVICE_HERO_DATA.support || {
    eyebrow: '24/7 MEMBER CONCIERGE & DESK',
    headline: 'Here for you, always',
    phrases: [
      '24/7 campus front desk concierge.',
      'Direct WhatsApp & phone assistance.',
      'Fast ticket resolution within 1 day.',
      'Campus visits, directions & bookings.',
    ],
    linkText: 'Reach our teams below',
    linkTarget: '#content',
  };

  function sendContact(e) {
    e.preventDefault();
    const found = {};
    if (!contact.name.trim()) found.name = 'Please tell us your name.';
    if (contact.email && !/^\S+@\S+\.\S+$/.test(contact.email) && !/^\d{10}$/.test(contact.email.replace(/\D/g, ''))) {
      found.email = 'Enter a valid email address or phone number.';
    }
    if (!contact.message.trim()) found.message = 'Write a short message so we can help.';
    setContactErr(found);
    if (Object.keys(found).length > 0) {
      pushToast('Please fix the highlighted fields.', 'error');
      return;
    }
    setBusy((b) => ({ ...b, contact: true }));
    import('../services/supportService.js')
      .then(({ sendContactMessage }) => sendContactMessage(contact))
      .then(() => {
        setBusy((b) => ({ ...b, contact: false }));
        pushToast('Thank you! Your message has been sent to the front desk.');
        setContact({ name: '', email: '', message: '' });
      })
      .catch((err) => {
        setBusy((b) => ({ ...b, contact: false }));
        pushToast(err?.message || 'Failed to send message. Please try again.', 'error');
      });
  }

  function raiseTicket(e) {
    e.preventDefault();
    const found = {};
    if (!ticket.category) found.category = 'Choose a category.';
    if (!ticket.subject.trim()) found.subject = 'Add a short subject.';
    setTicketErr(found);
    if (Object.keys(found).length > 0) {
      pushToast('Please fix the highlighted fields.', 'error');
      return;
    }
    setBusy((b) => ({ ...b, ticket: true }));
    import('../services/supportService.js')
      .then(({ createTicket }) => createTicket(ticket))
      .then((created) => {
        setBusy((b) => ({ ...b, ticket: false }));
        pushToast(`Ticket raised: #${created.ticket_id} (${ticket.category})`);
        setTicket({ category: '', priority: 'Normal', subject: '', details: '' });
      })
      .catch((err) => {
        setBusy((b) => ({ ...b, ticket: false }));
        pushToast(err?.message || 'Failed to raise ticket. Please try again.', 'error');
      });
  }

  return (
    <div className="bg-slate-50 min-h-screen">
      {/* 1 · HERO SECTION (Matching all other landing pages) */}
      <div className="landing-hero-wrap">
        <HeroImage slot="hero-contact">
          <div className="landing-hero-overlay" aria-hidden="true" />
          <div className="container-x relative z-10 h-full flex items-center">
            <div className="landing-hero-text max-w-[540px] text-white py-12 lg:py-0">
              <p className="landing-hero-eyebrow font-semibold uppercase tracking-wider text-gold-400">
                {heroData.eyebrow}
              </p>

              <h1 className="landing-hero-headline font-display text-white mt-2">
                <TypeWriter
                  text={heroData.headline}
                  speed={55}
                  caretFadeDelay={1500}
                  onComplete={() => setHeadlineDone(true)}
                />
              </h1>

              <p className="landing-hero-subline text-slate-200 mt-3 min-h-[2.5rem]">
                <TypeWriter
                  phrases={heroData.phrases}
                  speed={55}
                  holdTime={1600}
                  loop
                />
              </p>

              {/* Stat row + scroll anchor */}
              <div
                className={`landing-hero-fade-group mt-6 ${
                  headlineDone ? 'opacity-100' : 'opacity-0 pointer-events-none'
                }`}
              >
                <div className="landing-hero-stat-row">
                  <span className="landing-hero-stat-number text-gold-400 font-display">24/7</span>
                  <div className="landing-hero-stat-divider bg-gold-400" aria-hidden="true" />
                  <div className="flex flex-col justify-center">
                    <span className="landing-hero-stat-title font-medium text-white">Front Desk Concierge</span>
                    <span className="landing-hero-stat-subtitle text-slate-300">Fast live desk assistance</span>
                  </div>
                </div>

                <div className="mt-5">
                  <a
                    href="#content"
                    onClick={(e) => {
                      e.preventDefault();
                      document.getElementById('content')?.scrollIntoView({ behavior: 'smooth' });
                    }}
                    className="landing-hero-member-link inline-flex items-center gap-1.5 text-gold-400 hover:text-gold-300 font-semibold text-sm transition cursor-pointer"
                  >
                    <span>{heroData.linkText}</span>
                    <ArrowRightIcon className="h-4 w-4" />
                  </a>
                </div>
              </div>
            </div>
          </div>
        </HeroImage>

        {/* Floating compact glassmorphic card on right */}
        <div id="booking" className="landing-hero-card-wrap scroll-mt-24">
          <div className="booking-card booking-card--compact">
            <p className="booking-eyebrow">FAST ASSISTANCE</p>
            <h2 className="booking-title font-display">Message the desk</h2>
            <p className="mt-1 text-xs text-slate-300">
              Direct note to our campus front desk
            </p>

            <form onSubmit={sendContact} className="mt-3 flex flex-col gap-3">
              <div>
                <label htmlFor="hero-contact-name" className="booking-label">Your Name</label>
                <input
                  id="hero-contact-name"
                  type="text"
                  placeholder="Full name"
                  value={contact.name}
                  onChange={(e) => setContact({ ...contact, name: e.target.value })}
                  className="booking-field w-full text-sm"
                />
                {contactErr.name && <p className="text-[11px] text-rose-300 mt-0.5">{contactErr.name}</p>}
              </div>

              <div>
                <label htmlFor="hero-contact-email" className="booking-label">Email or Phone</label>
                <input
                  id="hero-contact-email"
                  type="text"
                  placeholder="name@example.com"
                  value={contact.email}
                  onChange={(e) => setContact({ ...contact, email: e.target.value })}
                  className="booking-field w-full text-sm"
                />
                {contactErr.email && <p className="text-[11px] text-rose-300 mt-0.5">{contactErr.email}</p>}
              </div>

              <div>
                <label htmlFor="hero-contact-msg" className="booking-label">Your Query / Message</label>
                <textarea
                  id="hero-contact-msg"
                  rows={2}
                  placeholder="How can we assist you today?"
                  value={contact.message}
                  onChange={(e) => setContact({ ...contact, message: e.target.value })}
                  className="booking-field w-full text-sm !h-16 py-2 resize-none"
                />
                {contactErr.message && <p className="text-[11px] text-rose-300 mt-0.5">{contactErr.message}</p>}
              </div>

              <LoadingButton
                type="submit"
                loading={busy.contact}
                loadingLabel="Sending…"
                className="btn-base bg-gold-500 text-navy-950 hover:bg-gold-400 w-full justify-center py-2.5 text-sm font-semibold inline-flex items-center gap-1.5 mt-1 transition cursor-pointer"
              >
                <span>Send message</span>
                <ArrowRightIcon className="h-4 w-4" />
              </LoadingButton>

              <div className="pt-2 flex items-center justify-between text-[11px] text-slate-300 border-t border-white/10">
                <span>Hotline: {SITE_INFO.phone}</span>
                {SITE_INFO.whatsappLink && (
                  <a
                    href={SITE_INFO.whatsappLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-gold-400 hover:text-gold-300 font-medium inline-flex items-center gap-1"
                  >
                    WhatsApp &rarr;
                  </a>
                )}
              </div>
            </form>
          </div>
        </div>
      </div>

      {/* 2 · QUICK CHANNELS STRIP */}
      <div id="content" className="bg-cream/40 border-b border-slate-200/60 py-10 sm:py-12 scroll-mt-24">
        <div className="container-x">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {/* Phone */}
            <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm transition hover:shadow-md hover:border-gold-500/60 flex flex-col justify-between">
              <div>
                <div className="h-10 w-10 rounded-xl bg-gold-50 border border-gold-200 flex items-center justify-center text-gold-600 mb-3">
                  <PhoneIcon className="h-5 w-5" />
                </div>
                <h3 className="font-display text-base font-bold text-navy-900">Phone Support</h3>
                <p className="mt-1 text-xs text-slate-500">24/7 dedicated front desk hotline</p>
              </div>
              {SITE_INFO.phone && (
                <a
                  href={`tel:${SITE_INFO.phone.replace(/\s/g, '')}`}
                  className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-navy-900 hover:text-gold-600 transition"
                >
                  <span>{SITE_INFO.phone}</span>
                  <ArrowRightIcon className="h-3.5 w-3.5" />
                </a>
              )}
            </div>

            {/* WhatsApp */}
            <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm transition hover:shadow-md hover:border-gold-500/60 flex flex-col justify-between">
              <div>
                <div className="h-10 w-10 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 mb-3">
                  <PhoneIcon className="h-5 w-5" />
                </div>
                <h3 className="font-display text-base font-bold text-navy-900">WhatsApp Concierge</h3>
                <p className="mt-1 text-xs text-slate-500">Instant chat &amp; booking coordination</p>
              </div>
              {SITE_INFO.whatsappLink && (
                <a
                  href={SITE_INFO.whatsappLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 hover:text-emerald-800 transition"
                >
                  <span>Chat on WhatsApp</span>
                  <ArrowRightIcon className="h-3.5 w-3.5" />
                </a>
              )}
            </div>

            {/* Raise Ticket */}
            <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm transition hover:shadow-md hover:border-gold-500/60 flex flex-col justify-between">
              <div>
                <div className="h-10 w-10 rounded-xl bg-navy-50 border border-navy-200 flex items-center justify-center text-navy-800 mb-3">
                  <MailIcon className="h-5 w-5" />
                </div>
                <h3 className="font-display text-base font-bold text-navy-900">Issue Tickets</h3>
                <p className="mt-1 text-xs text-slate-500">Tracked resolution within 1 working day</p>
              </div>
              <a
                href="#tickets"
                onClick={(e) => {
                  e.preventDefault();
                  setActiveFormTab('ticket');
                  document.getElementById('tickets')?.scrollIntoView({ behavior: 'smooth' });
                }}
                className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-navy-900 hover:text-gold-600 transition cursor-pointer"
              >
                <span>Raise a ticket</span>
                <ArrowRightIcon className="h-3.5 w-3.5" />
              </a>
            </div>

            {/* Campus Front Desk */}
            <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm transition hover:shadow-md hover:border-gold-500/60 flex flex-col justify-between">
              <div>
                <div className="h-10 w-10 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 mb-3">
                  <MapPinIcon className="h-5 w-5" />
                </div>
                <h3 className="font-display text-base font-bold text-navy-900">Campus Locations</h3>
                <p className="mt-1 text-xs text-slate-500">Vijayawada &amp; Hyderabad offices</p>
              </div>
              <LocationTrigger
                locationId="vja-club"
                className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-navy-900 hover:text-gold-600 transition"
              >
                <span>View campus map</span>
                <ArrowRightIcon className="h-3.5 w-3.5" />
              </LocationTrigger>
            </div>
          </div>
        </div>
      </div>

      {/* 3 · MAIN INTERACTIVE CONTENT */}
      <div className="container-x py-12 sm:py-16 space-y-12">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,340px)_1fr] lg:gap-12 items-start">
          {/* Left: Contact details panel */}
          <Reveal>
            <div className="space-y-6 lg:sticky lg:top-24">
              <Card className="shadow-lift">
                <p className="eyebrow">Direct Desk</p>
                <h2 className="h-sub mt-1">FRCC front desk</h2>
                <p className="text-xs text-slate-500 mt-0.5">Reach out via any of our official channels</p>

                <ul className="mt-5 space-y-4 text-sm">
                  {SITE_INFO.phone && (
                    <li className="flex items-start gap-3">
                      <IconTile icon={PhoneIcon} tone="gold" />
                      <span>
                        <span className="block text-xs font-semibold text-slate-500">Phone</span>
                        <a href={`tel:${SITE_INFO.phone.replace(/\s/g, '')}`} className="font-semibold text-navy-900 underline-offset-4 hover:underline">
                          {SITE_INFO.phone}
                        </a>
                      </span>
                    </li>
                  )}
                  {SITE_INFO.whatsappLink && (
                    <li className="flex items-start gap-3">
                      <IconTile icon={PhoneIcon} tone="gold" />
                      <span>
                        <span className="block text-xs font-semibold text-slate-500">WhatsApp Support</span>
                        <a
                          href={SITE_INFO.whatsappLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-semibold text-navy-900 underline-offset-4 hover:underline"
                        >
                          +{SITE_INFO.whatsappNumber}
                        </a>
                      </span>
                    </li>
                  )}
                  {SITE_INFO.email && (
                    <li className="flex items-start gap-3">
                      <IconTile icon={MailIcon} tone="gold" />
                      <span>
                        <span className="block text-xs font-semibold text-slate-500">Email</span>
                        <a href={`mailto:${SITE_INFO.email}`} className="font-semibold text-navy-900 underline-offset-4 hover:underline">
                          {SITE_INFO.email}
                        </a>
                      </span>
                    </li>
                  )}
                  {SITE_INFO.locations && SITE_INFO.locations.length > 0 ? (
                    SITE_INFO.locations.map((loc) => (
                      <li key={loc.id} className="flex items-start gap-3">
                        <IconTile icon={MapPinIcon} />
                        <div className="space-y-0.5">
                          <span className="block text-xs font-semibold text-slate-500">{loc.title}</span>
                          <LocationTrigger
                            locationId={loc.id === 'vja' ? 'vja-club' : 'hyd-office'}
                            address={loc.fullAddress}
                            className="font-semibold text-navy-900 not-italic text-sm hover:text-gold-600 block"
                            showIcon={true}
                            iconClassName="mt-0.5 h-3.5 w-3.5 shrink-0 text-gold-500"
                          >
                            <address className="not-italic inline">{loc.fullAddress}</address>
                          </LocationTrigger>
                          {loc.phone && (
                            <div className="flex items-center gap-1.5 text-xs text-navy-900 mt-1">
                              <PhoneIcon className="h-3 w-3 shrink-0 text-gold-600" />
                              <a href={`tel:${loc.phone.replace(/\s/g, '')}`} className="font-semibold underline-offset-4 hover:underline">
                                {loc.phone}
                              </a>
                            </div>
                          )}
                        </div>
                      </li>
                    ))
                  ) : getAddressLines().length > 0 && (
                    <li className="flex items-start gap-3">
                      <IconTile icon={MapPinIcon} />
                      <div>
                        <span className="block text-xs font-semibold text-slate-500">Address</span>
                        <LocationTrigger
                          locationId="vja-club"
                          address={getAddressLines().join(', ')}
                          className="font-semibold text-navy-900 not-italic text-sm hover:text-gold-600 block"
                          showIcon={true}
                          iconClassName="mt-0.5 h-3.5 w-3.5 shrink-0 text-gold-500"
                        >
                          <address className="not-italic inline">{getAddressLines().join(', ')}</address>
                        </LocationTrigger>
                      </div>
                    </li>
                  )}
                  {SITE_INFO.hours && (
                    <li className="flex items-start gap-3">
                      <IconTile icon={ClockIcon} tone="gold" />
                      <span>
                        <span className="block text-xs font-semibold text-slate-500">Hours</span>
                        <span className="font-semibold text-navy-900">{SITE_INFO.hours}</span>
                      </span>
                    </li>
                  )}
                </ul>

                <div className="mt-6 border-t border-slate-100 pt-5">
                  <p className="eyebrow">Follow the club</p>
                  <div className="mt-3 flex gap-2">
                    {getActiveSocialLinks().map((s) => (
                      <a
                        key={s.key}
                        href={s.url}
                        aria-label={`FRCC on ${s.label}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="grid h-10 w-10 place-items-center rounded-xl border border-slate-200 text-slate-500 transition hover:border-navy-900/30 hover:bg-navy-50 hover:text-navy-900"
                      >
                        {s.key === 'instagram' && <InstagramIcon className="h-4 w-4" />}
                        {s.key === 'linkedin' && <LinkedinIcon className="h-4 w-4" />}
                        {s.key === 'youtube' && <YoutubeIcon className="h-4 w-4" />}
                        {s.key === 'twitter' && <span className="text-[14px]">𝕏</span>}
                        {s.key === 'facebook' && <span className="text-[14px]">f</span>}
                      </a>
                    ))}
                  </div>
                </div>
              </Card>

              {/* Member priority escalation badge */}
              <div className="rounded-2xl bg-navy-900 text-white p-5 shadow-sm border border-navy-800">
                <div className="flex items-center gap-2 text-gold-400 font-semibold text-xs tracking-wider uppercase">
                  <CheckIcon className="h-4 w-4" />
                  <span>Member Priority Desk</span>
                </div>
                <p className="mt-2 text-xs text-slate-300 leading-relaxed">
                  Active FRCC club members receive escalated ticketing and dedicated front desk assistance.
                </p>
              </div>
            </div>
          </Reveal>

          {/* Right: Helpdesk & Contact Center */}
          <div id="tickets" className="space-y-8 scroll-mt-28">
            <Reveal>
              <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-lift">
                {/* Form Tabs */}
                <div className="flex items-center gap-2 border-b border-slate-100 pb-4 mb-6">
                  <button
                    type="button"
                    onClick={() => setActiveFormTab('ticket')}
                    className={`px-4 py-2 text-xs sm:text-sm font-semibold rounded-xl transition ${
                      activeFormTab === 'ticket'
                        ? 'bg-navy-900 text-white shadow-sm'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    Raise a Support Ticket
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveFormTab('contact')}
                    className={`px-4 py-2 text-xs sm:text-sm font-semibold rounded-xl transition ${
                      activeFormTab === 'contact'
                        ? 'bg-navy-900 text-white shadow-sm'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    Send Direct Message
                  </button>
                </div>

                {activeFormTab === 'ticket' ? (
                  <div>
                    <div className="mb-5">
                      <p className="eyebrow">Tracked Helpdesk</p>
                      <h2 className="font-display text-xl sm:text-2xl font-bold text-navy-900 mt-1">
                        Submit a support ticket
                      </h2>
                      <p className="text-xs text-slate-500 mt-1">
                        Booking, billing, QR card, or facility issues — routed immediately to the department in charge.
                      </p>
                    </div>

                    <form onSubmit={raiseTicket} className="space-y-4" noValidate>
                      <div className="grid gap-4 sm:grid-cols-2">
                        <Select
                          label="Category *"
                          name="t-cat"
                          value={ticket.category}
                          onChange={(e) => setTicket({ ...ticket, category: e.target.value })}
                          options={['Booking issue', 'Payment issue', 'Membership / QR', 'Facility feedback', 'Dining query', 'Other']}
                          error={ticketErr.category}
                        />
                        <Select
                          label="Priority level"
                          name="t-pri"
                          value={ticket.priority}
                          onChange={(e) => setTicket({ ...ticket, priority: e.target.value })}
                          options={['Low', 'Normal', 'High', 'Urgent']}
                        />
                      </div>
                      <Input
                        label="Subject *"
                        name="t-sub"
                        value={ticket.subject}
                        onChange={(e) => setTicket({ ...ticket, subject: e.target.value })}
                        error={ticketErr.subject}
                        placeholder="Brief summary of your query or issue"
                      />
                      <TextArea
                        label="Detailed description"
                        name="t-det"
                        rows={4}
                        value={ticket.details}
                        onChange={(e) => setTicket({ ...ticket, details: e.target.value })}
                        placeholder="Please include details such as Booking ID, date, or member code if applicable."
                      />
                      <LoadingButton
                        type="submit"
                        variant="gold"
                        className="w-full justify-center py-3 text-sm font-semibold"
                        loading={busy.ticket}
                        loadingLabel="Submitting ticket…"
                      >
                        Submit support ticket
                      </LoadingButton>
                    </form>
                  </div>
                ) : (
                  <div>
                    <div className="mb-5">
                      <p className="eyebrow">Front Desk Inquiries</p>
                      <h2 className="font-display text-xl sm:text-2xl font-bold text-navy-900 mt-1">
                        Send a message
                      </h2>
                      <p className="text-xs text-slate-500 mt-1">
                        Questions about campus amenities, event packages, or club tour bookings.
                      </p>
                    </div>

                    <form onSubmit={sendContact} className="space-y-4" noValidate>
                      <div className="grid gap-4 sm:grid-cols-2">
                        <Input
                          label="Your Name *"
                          name="c-name"
                          autoComplete="name"
                          value={contact.name}
                          onChange={(e) => setContact({ ...contact, name: e.target.value })}
                          error={contactErr.name}
                        />
                        <Input
                          label="Email or Phone"
                          name="c-email"
                          type="text"
                          value={contact.email}
                          onChange={(e) => setContact({ ...contact, email: e.target.value })}
                          error={contactErr.email}
                          hint="So our concierge can reply directly."
                        />
                      </div>
                      <TextArea
                        label="Message *"
                        name="c-msg"
                        rows={4}
                        value={contact.message}
                        onChange={(e) => setContact({ ...contact, message: e.target.value })}
                        error={contactErr.message}
                        placeholder="Hi, I would like to inquire about…"
                      />
                      <LoadingButton
                        type="submit"
                        className="w-full justify-center py-3 text-sm font-semibold"
                        loading={busy.contact}
                        loadingLabel="Sending message…"
                      >
                        Send message to desk
                      </LoadingButton>
                    </form>
                  </div>
                )}
              </div>
            </Reveal>

            {/* Common FAQs Section */}
            <Reveal delay={90}>
              <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm">
                <SectionHeading
                  eyebrow="Quick Answers"
                  title="Frequently asked questions"
                  sub="Find answers to common questions about bookings, memberships, and campus visits."
                />
                <div className="mt-6">
                  <Accordion items={FAQ} idPrefix="support-faq" />
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </div>
    </div>
  );
}

export default SupportPage;
