// Activities booking page template for the booking team.
// Same Navbar, Footer, PageHeader, Button, Input, Card and Badge as the main
// site, so the booking page matches. The main site links here with
// ?game=<id> (see ACTIVITIES_BOOKING_URL in /src/config/redirects.js) — read
// the selected game from the query string and pre-select it in the form.
import { Navbar } from './components/Navbar.jsx';
import { Footer } from './components/Footer.jsx';
import { PageHeader } from './components/PageHeader.jsx';
import { Card } from './components/Card.jsx';
import { Badge } from './components/Badge.jsx';
import { Button } from './components/Button.jsx';
import { Input } from './components/Input.jsx';

export function ActivitiesBookingTemplate({ user = null, isMember = false, gameName = 'Badminton Court' }) {
  return (
    <div className="min-h-screen flex flex-col bg-cream text-slate-800">
      <Navbar user={user} isMember={isMember} />
      <main className="flex-1">
        <PageHeader
          eyebrow="Activities Booking"
          title={`Book ${gameName}`}
          description="Date, slot and payment steps live on this page — same header, tags and CTA language as the main site."
          breadcrumbs={[
            { label: 'Home', href: '/home' },
            { label: 'Activities / Games', href: '/book/activities' },
            { label: 'Booking' },
          ]}
        >
          <Badge tone="gold">{gameName}</Badge>
          <Badge tone="onDark">Mock payment</Badge>
        </PageHeader>

        <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 py-14 grid gap-6 lg:grid-cols-[1fr_minmax(0,360px)]">
          <Card hover>
            <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-gold-600">Booking steps</p>
            <h2 className="font-display text-2xl text-navy-900 mt-1">Date, slot and payment go here</h2>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <Input label="Date" name="date" type="date" />
              <Input label="Players" name="players" placeholder="How many playing?" />
            </div>
            <div className="mt-5 flex gap-3">
              <Button variant="primary">Confirm booking</Button>
              <Button variant="outline">Back</Button>
            </div>
          </Card>

          <Card>
            <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-gold-600">Summary</p>
            <h2 className="font-display text-2xl text-navy-900 mt-1">{gameName}</h2>
            <p className="mt-2 text-sm text-slate-600">Sticky booking summary panel (collapsible on mobile).</p>
            <div className="mt-4">
              <Badge tone="navy">Selected</Badge>
            </div>
          </Card>
        </div>
      </main>
      <Footer />
    </div>
  );
}

export default ActivitiesBookingTemplate;
