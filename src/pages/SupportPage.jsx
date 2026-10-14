import { useState } from 'react';
import { useApp } from '../app/store/AppContext.jsx';
import { Input, Select, TextArea, LoadingButton } from '../components/ui/controls.jsx';
import { Card, SectionHeading } from '../components/ui/feedback.jsx';
import { IconTile, Accordion } from '../components/ui/sections.jsx';
import { Reveal } from '../components/ui/motion.jsx';
import { HeroImage } from '../components/HeroImage.jsx';
import { SITE_INFO, getActiveSocialLinks, getAddressLines } from '../config/siteInfo.js';
import {
  PhoneIcon,
  MailIcon,
  MapPinIcon,
  ClockIcon,
  InstagramIcon,
  LinkedinIcon,
  YoutubeIcon,
} from '../components/ui/icons.jsx';

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
];

export function SupportPage() {
  const { pushToast } = useApp();
  const [contact, setContact] = useState({ name: '', email: '', message: '' });
  const [ticket, setTicket] = useState({ category: '', priority: 'Normal', subject: '', details: '' });
  const [contactErr, setContactErr] = useState({});
  const [ticketErr, setTicketErr] = useState({});
  const [busy, setBusy] = useState({ contact: false, ticket: false });

  function sendContact(e) {
    e.preventDefault();
    const found = {};
    if (!contact.name.trim()) found.name = 'Please tell us your name.';
    if (contact.email && !/^\S+@\S+\.\S+$/.test(contact.email)) found.email = 'That email address looks incomplete.';
    if (!contact.message.trim()) found.message = 'Write a short message so we can help.';
    setContactErr(found);
    if (Object.keys(found).length > 0) {
      pushToast('Please fix the highlighted fields.', 'error');
      return;
    }
    setBusy((b) => ({ ...b, contact: true }));
    // TODO(Phase 2): POST /api/support/contact — surface API errors in contactErr.
    setTimeout(() => {
      setBusy((b) => ({ ...b, contact: false }));
      pushToast('Message sent');
      setContact({ name: '', email: '', message: '' });
    }, 600);
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
    // TODO(Phase 2): POST /api/support/tickets + attachment upload.
    setTimeout(() => {
      setBusy((b) => ({ ...b, ticket: false }));
      pushToast(`Ticket raised: ${ticket.category}`);
      setTicket({ category: '', priority: 'Normal', subject: '', details: '' });
    }, 600);
  }

  return (
    <div>
      {/* Photo hero — full-bleed photo only */}
      <HeroImage slot="hero-facilities" />

      <div className="container-x section-top">
        <h1 className="h-section">How can we help?</h1>
        <p className="mt-3 max-w-2xl text-slate-600">Message the front desk or raise a ticket — we'll get back to you within one working day.</p>
        <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,320px)_1fr] lg:gap-10">
          {/* Contact details panel ------------------------------------- */}
          <Reveal>
            <Card className="lg:sticky lg:top-24">
              <p className="eyebrow">Reach us</p>
              <h2 className="h-sub mt-1.5">FRCC front desk</h2>

              <ul className="mt-5 space-y-4 text-sm">
                {SITE_INFO.phone && (
                  <li className="flex items-start gap-3">
                    <IconTile icon={PhoneIcon} />
                    <span>
                      <span className="block text-xs font-semibold text-slate-500">Phone</span>
                      <a href={`tel:${SITE_INFO.phone.replace(/\s/g, '')}`} className="font-semibold text-navy-900 underline-offset-4 hover:underline">
                        {SITE_INFO.phone}
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
                {getAddressLines().length > 0 && (
                  <li className="flex items-start gap-3">
                    <IconTile icon={MapPinIcon} />
                    <span>
                      <span className="block text-xs font-semibold text-slate-500">Address</span>
                      <address className="font-semibold text-navy-900 not-italic">{getAddressLines().join(', ')}</address>
                    </span>
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
          </Reveal>

          {/* Forms -------------------------------------------------------- */}
          <div className="space-y-6">
            <Reveal>
              <Card>
                <p className="eyebrow">Message</p>
                <h2 className="h-sub mt-1.5">Contact form</h2>
                <p className="p-muted mt-1 text-sm">Questions about facilities, events or member rates.</p>
                <form onSubmit={sendContact} className="mt-5 space-y-4" noValidate>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Input
                      label="Name"
                      name="c-name"
                      autoComplete="name"
                      value={contact.name}
                      onChange={(e) => setContact({ ...contact, name: e.target.value })}
                      error={contactErr.name}
                    />
                    <Input
                      label="Email"
                      name="c-email"
                      type="email"
                      autoComplete="email"
                      value={contact.email}
                      onChange={(e) => setContact({ ...contact, email: e.target.value })}
                      error={contactErr.email}
                      hint="Optional — so we can reply by mail."
                    />
                  </div>
                  <TextArea
                    label="Message"
                    name="c-msg"
                    value={contact.message}
                    onChange={(e) => setContact({ ...contact, message: e.target.value })}
                    error={contactErr.message}
                    placeholder="Hi, I'd like to know about…"
                  />
                  <LoadingButton type="submit" className="w-full" loading={busy.contact} loadingLabel="Sending…">
                    Send message
                  </LoadingButton>
                </form>
              </Card>
            </Reveal>

            <Reveal delay={90}>
              <Card>
                <p className="eyebrow">Helpdesk</p>
                <h2 className="h-sub mt-1.5">Raise a ticket</h2>
                <p className="p-muted mt-1 text-sm">Booking, payment or membership issues — routed to the right team.</p>
                <form onSubmit={raiseTicket} className="mt-5 space-y-4" noValidate>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Select
                      label="Category"
                      name="t-cat"
                      value={ticket.category}
                      onChange={(e) => setTicket({ ...ticket, category: e.target.value })}
                      options={['Booking issue', 'Payment issue', 'Membership / QR', 'Facility feedback', 'Other']}
                      error={ticketErr.category}
                    />
                    <Select
                      label="Priority"
                      name="t-pri"
                      value={ticket.priority}
                      onChange={(e) => setTicket({ ...ticket, priority: e.target.value })}
                      options={['Low', 'Normal', 'High', 'Urgent']}
                    />
                  </div>
                  <Input
                    label="Subject"
                    name="t-sub"
                    value={ticket.subject}
                    onChange={(e) => setTicket({ ...ticket, subject: e.target.value })}
                    error={ticketErr.subject}
                    placeholder="Short summary of the issue"
                  />
                  <TextArea
                    label="Details"
                    name="t-det"
                    value={ticket.details}
                    onChange={(e) => setTicket({ ...ticket, details: e.target.value })}
                    placeholder="What happened? Include booking IDs if you have them."
                  />
                  <LoadingButton type="submit" variant="gold" className="w-full" loading={busy.ticket} loadingLabel="Raising…">
                    Raise ticket
                  </LoadingButton>
                </form>
              </Card>
            </Reveal>
          </div>
        </div>

        {/* FAQ ------------------------------------------------------------ */}
        <section className="mt-12 grid gap-6 lg:grid-cols-[minmax(0,320px)_1fr] lg:gap-10" aria-label="Support FAQ">
          <Reveal>
            <SectionHeading
              eyebrow="Before you write"
              title="Common questions"
              sub="Most tickets are answered here — quick answers first, then the helpdesk."
            />
          </Reveal>
          <Reveal delay={90}>
            <Accordion items={FAQ} idPrefix="support-faq" />
          </Reveal>
        </section>
      </div>
    </div>
  );
}
