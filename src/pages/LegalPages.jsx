import { Link } from 'react-router-dom';
import { Card } from '../components/ui/feedback.jsx';
import { ROUTES } from '../config/routes.js';
import {
  CalendarIcon,
  ShieldIcon,
  UserIcon,
  MembershipIcon,
  ArrowRightIcon,
} from '../components/ui/icons.jsx';

function SampleDisclaimer() {
  return (
    <div
      role="note"
      className="mb-8 rounded-xl border border-amber-300 bg-amber-50/90 p-4 text-xs font-semibold text-amber-900 shadow-xs"
    >
      <span className="uppercase tracking-wider font-bold">Disclaimer:</span> SAMPLE: replace with text approved by FRCC&apos;s lawyer
    </div>
  );
}

/**
 * /cookie-policy
 */
export function CookiePolicyPage() {
  return (
    <div className="container-x py-10 sm:py-14 max-w-4xl">
      <nav aria-label="Breadcrumb" className="mb-4 text-xs text-slate-500">
        <Link to="/" className="hover:text-navy-900">Home</Link>
        <span className="mx-2 text-slate-300">/</span>
        <span className="text-navy-900 font-medium">Cookie Policy</span>
      </nav>

      <h1 className="font-display text-3xl sm:text-4xl font-bold text-navy-950 mb-3">
        Cookie Policy
      </h1>
      <p className="text-sm text-slate-600 mb-6">
        Last updated: November 2026
      </p>

      <SampleDisclaimer />

      <Card className="prose prose-slate max-w-none text-sm leading-relaxed text-slate-700 space-y-6 p-6 sm:p-8">
        <section>
          <h2 className="text-lg font-bold text-navy-900 mb-2">1. What Are Cookies?</h2>
          <p>
            Cookies and related local storage technologies are small text files or key-value entries placed on your browser or device when you visit our website. They allow the website to recognize your browser, remember your active preferences, and keep you securely logged into your account during your session.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-navy-900 mb-2">2. What Cookies We Use &amp; Why</h2>
          <div className="space-y-4">
            <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4">
              <h3 className="font-semibold text-navy-900 text-sm mb-1">Essential &amp; Session Cookies (Strictly Necessary)</h3>
              <p className="text-xs text-slate-600">
                These cookies and browser storage keys are required for the basic operation and security of the FRCC portal. They include:
              </p>
              <ul className="list-disc list-inside mt-2 space-y-1 text-xs text-slate-600">
                <li><strong>Authentication &amp; Session State:</strong> Keeps you signed in securely to your member account across pages and prevents unauthorized access.</li>
                <li><strong>Campus &amp; Location Preference:</strong> Stores your active campus selection (Vijayawada or Hyderabad) so facility availability reflects your preferred location.</li>
                <li><strong>Booking Flow Continuity:</strong> Temporarily retains selected room dates, dining slots, or activity details while proceeding through multi-step reservation forms.</li>
              </ul>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4">
              <h3 className="font-semibold text-navy-900 text-sm mb-1">Performance &amp; Analytics Cookies (If Enabled)</h3>
              <p className="text-xs text-slate-600">
                These help us understand how visitors interact with our services by gathering anonymous telemetry such as page response times, error occurrences, and overall site traffic. This information is used strictly to optimize site performance and improve user experience.
              </p>
            </div>
          </div>
        </section>

        <section>
          <h2 className="text-lg font-bold text-navy-900 mb-2">3. Why We Use Cookies</h2>
          <ul className="list-disc list-inside space-y-1.5 text-xs sm:text-sm text-slate-600">
            <li>To verify your identity and maintain authorized member access.</li>
            <li>To safeguard booking transactions, preventing session hijacking and fraudulent activity.</li>
            <li>To remember your viewing preferences and provide a seamless navigation experience across sports, stay, and dining venues.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-bold text-navy-900 mb-2">4. How to Control and Manage Cookies in Your Browser</h2>
          <p className="mb-3">
            You have the right to accept, refuse, or remove cookies at any time via your browser settings. Please note that if you disable essential cookies, key features such as logging in, booking verification, and member reservations may not function properly.
          </p>
          <div className="grid gap-3 sm:grid-cols-2 text-xs">
            <div className="rounded-lg border border-slate-200 p-3">
              <span className="font-semibold text-navy-900 block mb-1">Google Chrome</span>
              <p className="text-slate-600">Settings &gt; Privacy and security &gt; Third-party cookies &gt; Clear or block cookies.</p>
            </div>
            <div className="rounded-lg border border-slate-200 p-3">
              <span className="font-semibold text-navy-900 block mb-1">Mozilla Firefox</span>
              <p className="text-slate-600">Settings &gt; Privacy &amp; Security &gt; Cookies and Site Data &gt; Manage Data.</p>
            </div>
            <div className="rounded-lg border border-slate-200 p-3">
              <span className="font-semibold text-navy-900 block mb-1">Apple Safari</span>
              <p className="text-slate-600">Preferences &gt; Privacy &gt; Manage Website Data or Block all cookies.</p>
            </div>
            <div className="rounded-lg border border-slate-200 p-3">
              <span className="font-semibold text-navy-900 block mb-1">Microsoft Edge</span>
              <p className="text-slate-600">Settings &gt; Cookies and site permissions &gt; Manage and delete cookies.</p>
            </div>
          </div>
        </section>

        <section className="border-t border-slate-200 pt-6">
          <h2 className="text-lg font-bold text-navy-900 mb-1">Contact Us</h2>
          <p className="text-xs sm:text-sm text-slate-600">
            If you have questions about our use of cookies or privacy practices, please contact the FRCC Concierge Desk at <a href="mailto:support@frcc.org.in" className="text-navy-900 font-semibold underline">support@frcc.org.in</a> or visit our <Link to="/support" className="text-navy-900 font-semibold underline">Support Page</Link>.
          </p>
        </section>
      </Card>
    </div>
  );
}

/**
 * /privacy-policy
 */
export function PrivacyPolicyPage() {
  return (
    <div className="container-x py-10 sm:py-14 max-w-4xl">
      <nav aria-label="Breadcrumb" className="mb-4 text-xs text-slate-500">
        <Link to="/" className="hover:text-navy-900">Home</Link>
        <span className="mx-2 text-slate-300">/</span>
        <span className="text-navy-900 font-medium">Privacy Policy</span>
      </nav>

      <h1 className="font-display text-3xl sm:text-4xl font-bold text-navy-950 mb-3">
        Privacy Policy
      </h1>
      <p className="text-sm text-slate-600 mb-6">
        Last updated: November 2026
      </p>

      <SampleDisclaimer />

      <Card className="prose prose-slate max-w-none text-sm leading-relaxed text-slate-700 space-y-6 p-6 sm:p-8">
        <section>
          <h2 className="text-lg font-bold text-navy-900 mb-2">1. Overview</h2>
          <p>
            Film Recreation &amp; Cultural Centre (&quot;FRCC&quot;) is committed to protecting the privacy and personal data of our members, guests, and website visitors. This policy outlines how information is gathered, handled, and protected across our digital services.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-navy-900 mb-2">2. Information We Collect</h2>
          <ul className="list-disc list-inside space-y-1.5 text-xs sm:text-sm text-slate-600">
            <li><strong>Personal Contact Information:</strong> Name, phone number, email address, and postal address.</li>
            <li><strong>Membership Records:</strong> Member ID, membership tier, application data, and family or affiliated dependent information.</li>
            <li><strong>Reservation &amp; Booking Details:</strong> Stay check-in dates, dining reservations, sports activities, hall booking details, and parking slot assignments.</li>
            <li><strong>Billing &amp; Transaction Logs:</strong> Transaction identifiers, payment timestamps, and receipt references (sensitive payment card data is processed directly via authorized payment gateways).</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-bold text-navy-900 mb-2">3. How Your Information Is Used</h2>
          <ul className="list-disc list-inside space-y-1.5 text-xs sm:text-sm text-slate-600">
            <li>To process and fulfill reservations, bookings, and facility access.</li>
            <li>To verify member credentials and apply authorized club discounts.</li>
            <li>To communicate essential reservation updates, receipts, and club announcements.</li>
            <li>To maintain club safety, security, and statutory compliance.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-bold text-navy-900 mb-2">4. Data Security &amp; Retention</h2>
          <p>
            We implement strict database security controls, row-level access restrictions, and encrypted communications to safeguard your information against unauthorized disclosure or loss.
          </p>
        </section>

        <section className="border-t border-slate-200 pt-6">
          <h2 className="text-lg font-bold text-navy-900 mb-1">Contact Legal &amp; Compliance</h2>
          <p className="text-xs sm:text-sm text-slate-600">
            For privacy inquiries, data requests, or policy questions, please contact <a href="mailto:privacy@frcc.org.in" className="text-navy-900 font-semibold underline">privacy@frcc.org.in</a> or visit our <Link to="/support" className="text-navy-900 font-semibold underline">Support Page</Link>.
          </p>
        </section>
      </Card>
    </div>
  );
}

/**
 * /accessibility
 */
export function AccessibilityPage() {
  return (
    <div className="container-x py-10 sm:py-14 max-w-4xl">
      <nav aria-label="Breadcrumb" className="mb-4 text-xs text-slate-500">
        <Link to="/" className="hover:text-navy-900">Home</Link>
        <span className="mx-2 text-slate-300">/</span>
        <span className="text-navy-900 font-medium">Accessibility Statement</span>
      </nav>

      <h1 className="font-display text-3xl sm:text-4xl font-bold text-navy-950 mb-3">
        Accessibility Statement
      </h1>
      <p className="text-sm text-slate-600 mb-6">
        Last updated: November 2026
      </p>

      <SampleDisclaimer />

      <Card className="prose prose-slate max-w-none text-sm leading-relaxed text-slate-700 space-y-6 p-6 sm:p-8">
        <section>
          <h2 className="text-lg font-bold text-navy-900 mb-2">Our Commitment</h2>
          <p>
            FRCC is dedicated to ensuring digital accessibility for people of all abilities. We are continually improving the user experience for everyone and applying the relevant accessibility standards to make our booking and information portal intuitive and barrier-free.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-navy-900 mb-2">Accessibility Features</h2>
          <ul className="list-disc list-inside space-y-1.5 text-xs sm:text-sm text-slate-600">
            <li><strong>Keyboard Operability:</strong> Core navigation links, dialogs, forms, and booking pickers can be operated using standard keyboard navigation (Tab, Enter, Escape, Arrow keys).</li>
            <li><strong>Contrast &amp; Legibility:</strong> High contrast typography adhering to WCAG 2.1 AA standards across light and dark backgrounds.</li>
            <li><strong>Screen Reader Compatibility:</strong> Proper semantic HTML elements, ARIA labels, roles, and live region notifications for assistive technologies.</li>
            <li><strong>Responsive Scaling:</strong> Support for browser zooming up to 200% without loss of content or functionality.</li>
          </ul>
        </section>

        <section className="border-t border-slate-200 pt-6">
          <h2 className="text-lg font-bold text-navy-900 mb-1">Feedback &amp; Assistance</h2>
          <p className="text-xs sm:text-sm text-slate-600">
            If you encounter any accessibility barrier or require assistance booking a facility, please let us know via our <Link to="/support" className="text-navy-900 font-semibold underline">Support Page</Link> or by calling our 24/7 concierge desk at <a href="tel:+917893616262" className="text-navy-900 font-semibold underline">+91 78936 16262</a>.
          </p>
        </section>
      </Card>
    </div>
  );
}

/**
 * /sitemap
 */
export function SitemapPage() {
  const sections = [
    {
      title: 'Main Facilities & Services',
      description: 'Book stays, dining tables, event halls, recreational sports, and parking bays.',
      links: [
        { label: 'Stay (Rooms & Suites)', to: ROUTES.stay, desc: 'Luxury riverfront rooms, standard & deluxe suites' },
        { label: 'Dining (Restaurants & Cafes)', to: ROUTES.dining, desc: 'Multi-cuisine restaurant, cafe & private dining' },
        { label: 'Halls (Convention & Banquets)', to: ROUTES.halls, desc: 'Banquet halls, executive meeting rooms & convention spaces' },
        { label: 'Activities (Sports & Recreation)', to: ROUTES.activities, desc: 'Swimming pool, badminton courts, gym & recreational games' },
        { label: 'Parking (Campus Bays)', to: ROUTES.parking, desc: 'EV charging bays and reserved vehicle parking slots' },
      ],
    },
    {
      title: 'Club & Community',
      description: 'Explore club membership, campus events, and organizational leadership.',
      links: [
        { label: 'Membership', to: ROUTES.membership, desc: 'Exclusive privileges, tier pricing and online application' },
        { label: 'Events', to: ROUTES.events, desc: 'Upcoming cultural festivals, film screenings and screenings' },
        { label: 'Gallery', to: ROUTES.gallery, desc: 'Campus photo tour, recreation facilities and architecture' },
        { label: 'Leadership', to: ROUTES.leadership, desc: 'FRCC governing body, executive committee and patron trust' },
      ],
    },
    {
      title: 'Legal & Policies',
      description: 'Official site policies, terms of service, and accessibility statements.',
      links: [
        { label: 'Privacy Policy', to: ROUTES.privacyPolicy, desc: 'Data handling, member privacy and security standards' },
        { label: 'Cookie Policy', to: ROUTES.cookiePolicy, desc: 'Browser cookies, session storage and privacy controls' },
        { label: 'Accessibility', to: ROUTES.accessibility, desc: 'WCAG compliance and assistive technology support' },
      ],
    },
  ];

  return (
    <div className="container-x py-10 sm:py-14 max-w-4xl">
      <nav aria-label="Breadcrumb" className="mb-4 text-xs text-slate-500">
        <Link to="/" className="hover:text-navy-900">Home</Link>
        <span className="mx-2 text-slate-300">/</span>
        <span className="text-navy-900 font-medium">Sitemap</span>
      </nav>

      <h1 className="font-display text-3xl sm:text-4xl font-bold text-navy-950 mb-3">
        Sitemap
      </h1>
      <p className="text-sm text-slate-600 mb-6">
        Overview of all sections, facility booking portals, and legal disclosures across FRCC.
      </p>

      <SampleDisclaimer />

      <div className="space-y-8">
        {sections.map((sec) => (
          <div key={sec.title} className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-xs">
            <h2 className="font-display text-xl font-bold text-navy-900 mb-1">
              {sec.title}
            </h2>
            <p className="text-xs text-slate-500 mb-5">{sec.description}</p>
            <div className="grid gap-3 sm:grid-cols-2">
              {sec.links.map((item) => (
                <Link
                  key={item.to}
                  to={item.to}
                  className="group flex flex-col justify-between rounded-xl border border-slate-100 bg-slate-50/60 p-4 transition hover:border-gold-300 hover:bg-gold-50/30 hover:shadow-xs"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-sm text-navy-900 group-hover:text-gold-700 transition">
                      {item.label}
                    </span>
                    <ArrowRightIcon className="h-4 w-4 text-slate-400 group-hover:text-gold-600 group-hover:translate-x-0.5 transition" />
                  </div>
                  {item.desc && (
                    <span className="mt-1 text-xs text-slate-500 leading-snug">
                      {item.desc}
                    </span>
                  )}
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

