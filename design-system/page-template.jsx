// Blank inner page template for the other team.
// Copy this file, keep Navbar → PageHeader → content → Footer order.
import { Navbar } from './components/Navbar.jsx';
import { Footer } from './components/Footer.jsx';
import { PageHeader } from './components/PageHeader.jsx';
import { Card } from './components/Card.jsx';
import { Badge } from './components/Badge.jsx';
import { Button } from './components/Button.jsx';

export function TeamPageTemplate({ user = null, isMember = false }) {
  return (
    <div className="min-h-screen flex flex-col bg-cream text-slate-800">
      <Navbar user={user} isMember={isMember} />
      <main className="flex-1">
        <PageHeader
          eyebrow="Team page"
          title="Page title"
          description="One-line intro. Breadcrumb banner, tags and CTA follow the main-site pattern."
          breadcrumbs={[{ label: 'Home', href: '/home' }, { label: 'Page title' }]}
        >
          <Badge tone="navy">Info</Badge>
        </PageHeader>

        <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 py-14">
          <Card hover>
            <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-gold-600">Section</p>
            <h2 className="font-display text-2xl text-navy-900 mt-1">Content goes here</h2>
            <p className="mt-2 text-slate-600">Replace with the team&apos;s booking/registration flow.</p>
            <div className="mt-5 flex gap-3">
              <Button variant="primary">Primary action</Button>
              <Button variant="outline">Secondary</Button>
            </div>
          </Card>
        </div>
      </main>
      <Footer />
    </div>
  );
}

export default TeamPageTemplate;
