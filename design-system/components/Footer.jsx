import { Logo } from '../../src/components/Logo.jsx';

// Standalone Footer — same address/phone/email/social/quick links as the main site.
const QUICK_LINKS = [
  { href: '/home', label: 'Homepage / Hub' },
  { href: '/book/activities', label: 'Book an activity' },
  { href: '/membership', label: 'Membership' },
  { href: '/profile', label: 'My profile' },
  { href: '/support', label: 'Contact / Support' },
];

const SERVICES = [
  { href: '/book/hotel', label: 'Hotel' },
  { href: '/book/hall', label: 'Halls' },
  { href: '/book/parking', label: 'Parking' },
  { href: '/book/activities', label: 'Activities / Games' },
  { href: '/membership', label: 'Membership' },
];

export function Footer() {
  return (
    <footer className="mt-16 border-t border-white/10 bg-navy-950 text-slate-300">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 grid gap-10 py-14 sm:grid-cols-2 lg:grid-cols-4">
        <div className="sm:col-span-2 lg:col-span-1">
          <Logo variant="lockup" size={120} />
          <p className="mt-4 text-sm leading-relaxed text-slate-400">
            Film Recreation &amp; Cultural Centre
          </p>
          <div className="mt-5 flex gap-2">
            {['Instagram', 'LinkedIn', 'YouTube'].map((s) => (
              <a key={s} href="#" aria-label={`FRCC on ${s}`} className="grid h-10 w-10 place-items-center rounded-xl border border-white/15 text-slate-400">{s.slice(0, 2)}</a>
            ))}
          </div>
        </div>
        <nav aria-label="Footer quick links">
          <p className="text-sm font-semibold text-white">Quick links</p>
          <ul className="mt-4 space-y-2 text-sm">
            {QUICK_LINKS.map((l) => (
              <li key={l.href}><a className="hover:text-gold-400" href={l.href}>{l.label}</a></li>
            ))}
          </ul>
        </nav>
        <nav aria-label="Footer services">
          <p className="text-sm font-semibold text-white">Services</p>
          <ul className="mt-4 space-y-2 text-sm">
            {SERVICES.map((s) => (
              <li key={s.href}><a className="hover:text-gold-400" href={s.href}>{s.label}</a></li>
            ))}
          </ul>
        </nav>
        <div>
          <p className="text-sm font-semibold text-white">Contact</p>
          <ul className="mt-4 space-y-3 text-sm text-slate-400">
            <li>Lakeview Road, FRCC Campus</li>
            <li><a href="tel:+919000000000" className="hover:text-gold-400">+91 90000 00000</a></li>
            <li><a href="mailto:hello@frcc.club" className="hover:text-gold-400">hello@frcc.club</a></li>
          </ul>
          <p className="mt-4 text-xs text-slate-500">Front desk open 6 AM – 11 PM daily</p>
        </div>
      </div>
      <div className="border-t border-white/10">
        <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 flex flex-col items-center justify-between gap-3 py-4 text-xs text-slate-500 sm:flex-row">
          <p>© 2026 FRCC · Phase 1 mock front-end skeleton (no backend).</p>
          <ul className="flex flex-wrap items-center justify-center gap-x-5 gap-y-1">
            {['Privacy Policy', 'Accessibility', 'Sitemap'].map((label) => (
              <li key={label}><a href="#" className="hover:text-gold-400">{label}</a></li>
            ))}
          </ul>
        </div>
      </div>
    </footer>
  );
}
