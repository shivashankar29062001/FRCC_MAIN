// Standalone Navbar — same links, logo and logged-in states as the main site.
// Props: user (null = logged out, { name } = logged in), isMember (bool).
// Plain anchors so the other team can use it without react-router.
const SERVICES = [
  { href: '/book/hotel', label: 'Hotel' },
  { href: '/book/hall', label: 'Halls' },
  { href: '/book/parking', label: 'Parking' },
  { href: '/book/activities', label: 'Activities / Games' },
  { href: '/membership', label: 'Membership' },
];

export function Navbar({ user = null, isMember = false }) {
  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/70 bg-white/90 backdrop-blur">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-3 h-16">
        <a href="/" className="flex items-center gap-2.5" aria-label="FRCC home">
          <span aria-hidden className="grid place-items-center rounded-xl bg-navy-900 text-gold-500 font-bold h-10 w-10 text-lg">F</span>
          <span className="leading-tight">
            <span className="block font-bold text-navy-900 text-lg">FRCC</span>
            <span className="block text-[11px] uppercase tracking-[0.18em] text-slate-500">Club · Resort · Society</span>
          </span>
        </a>
        <nav className="hidden lg:flex items-center gap-1 text-sm font-medium" aria-label="Primary">
          {!user ? (
            <>
              <a href="/" className="px-3 py-2 rounded-lg text-slate-600 hover:bg-slate-100">Landing</a>
              <a href="/support" className="px-3 py-2 rounded-lg text-slate-600 hover:bg-slate-100">Support</a>
              <a href="/signin" className="px-3 py-1.5 text-sm text-navy-900">Sign in</a>
              <a href="/signup" className="px-3 py-1.5 text-sm rounded-xl bg-navy-900 text-white">Sign up</a>
            </>
          ) : (
            <>
              <a href="/home" className="px-3 py-2 rounded-lg text-slate-600 hover:bg-slate-100">Home</a>
              {SERVICES.map((s) => (
                <a key={s.href} href={s.href} className="px-3 py-2 rounded-lg text-slate-600 hover:bg-slate-100">{s.label}</a>
              ))}
              <a href="/support" className="px-3 py-2 rounded-lg text-slate-600 hover:bg-slate-100">Support</a>
              <span className="ml-2 flex items-center gap-2 rounded-full border border-slate-200 py-1 pl-1 pr-3">
                <span aria-hidden className="grid h-8 w-8 place-items-center rounded-full bg-navy-900 text-sm font-bold text-gold-400">
                  {(user.name || 'M').slice(0, 1).toUpperCase()}
                </span>
                <span className="max-w-[110px] truncate text-sm font-semibold text-navy-900">{user.name}</span>
                {isMember && (
                  <span className="inline-flex items-center rounded-full border border-gold-500/40 bg-gold-50 text-gold-600 px-2 py-0.5 text-[10px] font-bold uppercase">Member</span>
                )}
              </span>
            </>
          )}
        </nav>
        {/* Logged-in avatar menu items (render as a dropdown in your app):
            My Profile → /profile · My Bookings → /profile/bookings ·
            {isMember ? Membership Dashboard → /membership/dashboard : Become a Member → /membership} ·
            Support → /support · Logout → / */}
      </div>
    </header>
  );
}
