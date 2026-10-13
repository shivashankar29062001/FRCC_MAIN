import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useApp } from '../../app/store/AppContext.jsx';
import { Toasts } from '../ui/feedback.jsx';
import { PhotoCard } from '../ui/explore.jsx';
import { cx, initialsOf } from '../../utils/helpers.js';
import { SITE_INFO, getAddressLines, getActiveSocialLinks } from '../../config/siteInfo.js';
import { MEMBER_PROMO_NOTE } from '../../config/pricing.js';
import { NAV_MENUS } from '../../config/navMenus.js';
import {
  UserIcon,
  LogOutIcon,
  MenuIcon,
  XIcon,
  ChevronDownIcon,
  PhoneIcon,
  MailIcon,
  MapPinIcon,
  CalendarIcon,
  MembershipIcon,
  InstagramIcon,
  LinkedinIcon,
  YoutubeIcon,
} from '../ui/icons.jsx';

// ---------------------------------------------------------------------------
// Site chrome: the two-level navigation (utility strip + main bar), the mobile
// menu, the footer and the app shell.
//
// Navigation rules
// · Utility strip  — slim, navy, desktop only: phone, Help, and the member
//                    offer that already lives in /config/pricing.js.
// · Main bar       — white, sticky, one hairline under it. Logo left, the six
//                    links centred, account + gold "Book now" on the right.
// · Mega-menus     — Stay / Halls / Activities / Parking open a photo panel
//                    (3–4 photo cards + "View all") on hover or click. They
//                    close on outside click and Esc, and are fully keyboard
//                    operable. Nothing animates: no slide, no fade, ever.
// · Mobile         — hamburger opens a full-height panel with the same links as
//                    an accordion list. Same content, no animation.
// ---------------------------------------------------------------------------

function Logo({ to = '/' }) {
  return (
    <Link to={to} className="flex items-center gap-2.5" aria-label="FRCC home">
      <span aria-hidden className="grid h-10 w-10 place-items-center rounded-xl bg-navy-900 font-display text-lg font-bold text-gold-500">
        F
      </span>
      <span className="leading-tight">
        <span className="block font-display font-bold text-lg text-navy-900">FRCC</span>
        <span className="block text-[11px] uppercase tracking-[0.18em] text-slate-500">Club · Resort · Society</span>
      </span>
    </Link>
  );
}

/**
 * The one gold call-to-action. The link itself carries the button styling, so
 * there is a single tab stop and no button nested inside an anchor.
 */
function GoldCta({ to, size = 'sm', className, onClick, children }) {
  const sizes = { sm: 'px-4 py-2 text-sm', md: 'px-5 py-2.5 text-sm sm:text-base' };
  return (
    <Link
      to={to}
      onClick={onClick}
      className={cx('btn-base bg-gold-500 text-navy-950 hover:bg-gold-400', sizes[size], className)}
    >
      {children}
    </Link>
  );
}

function OutlineCta({ to, size = 'sm', className, onClick, state, children }) {
  const sizes = { sm: 'px-4 py-2 text-sm', md: 'px-5 py-2.5 text-sm sm:text-base' };
  return (
    <Link
      to={to}
      state={state}
      onClick={onClick}
      className={cx('btn-base border border-gold-500 bg-transparent text-gold-600 hover:bg-gold-50', sizes[size], className)}
    >
      {children}
    </Link>
  );
}

// Footer service list (label + link only).
const SERVICES = [
  { to: '/book/hotel', label: 'Hotel' },
  { to: '/book/hall', label: 'Halls' },
  { to: '/book/parking', label: 'Parking' },
  { to: '/book/activities', label: 'Activities / Games' },
  { to: '/membership', label: 'Membership' },
];

// The four links that carry a photo mega-menu, in the order asked for.
const MENU_LINKS = [
  { key: 'stay', label: 'Stay', to: '/book/hotel' },
  { key: 'hall', label: 'Halls', to: '/book/hall' },
  { key: 'activities', label: 'Activities', to: '/book/activities' },
  { key: 'parking', label: 'Parking', to: '/book/parking' },
];

export function Navbar() {
  const { user, logout, isMember } = useApp();
  const navigate = useNavigate();
  const location = useLocation();
  const headerRef = useRef(null);
  const [open, setOpen] = useState(false); // mobile panel
  const [menu, setMenu] = useState(null); // open mega-menu key (desktop)
  const [mMenu, setMMenu] = useState(null); // open accordion key (mobile)
  const [avatar, setAvatar] = useState(false); // account menu

  function closeAll() {
    setOpen(false);
    setMenu(null);
    setMMenu(null);
    setAvatar(false);
  }

  // Close everything on navigation.
  useEffect(() => {
    setOpen(false);
    setMenu(null);
    setMMenu(null);
    setAvatar(false);
  }, [location.pathname]);

  // "Book now" scrolls to the booking card on the landing page and opens
  // the booking hub everywhere else.
  function onBookNow(e) {
    closeAll();
    if (location.pathname === '/') {
      e.preventDefault();
      document.getElementById('booking')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  // Esc closes whatever is open.
  useEffect(() => {
    function onKey(e) {
      if (e.key !== 'Escape') return;
      setOpen(false);
      setMenu(null);
      setMMenu(null);
      setAvatar(false);
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  // Outside click closes the mega-menu and the account menu.
  useEffect(() => {
    if (!menu && !avatar) return undefined;
    function onDown(e) {
      if (headerRef.current?.contains(e.target)) return;
      setMenu(null);
      setAvatar(false);
    }
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [menu, avatar]);

  function doLogout() {
    logout();
    closeAll();
    try {
      window.sessionStorage.removeItem('frcc.postLoginRedirect.v1');
    } catch {
      /* ignore */
    }
    navigate('/', { replace: true });
  }

  // ProtectedRoute parks logged-out visitors on "/" with state.from — forward
  // it through the sign-in links so login can return them there.
  const pendingFrom = typeof location.state?.from === 'string' ? location.state.from : null;
  const signinState = pendingFrom ? { from: pendingFrom } : undefined;

  // Anchor links scroll to a section. On the matching page we jump in place;
  // from elsewhere a normal `/#id` navigation lands on it. Jump = instant.
  function scrollToSection(e, id) {
    if (location.pathname !== '/') return;
    e.preventDefault();
    document.getElementById(id)?.scrollIntoView({ block: 'start' });
    window.history.replaceState(null, '', `/#${id}`);
    closeAll();
  }

  function scrollHome(e, id) {
    if (location.pathname !== '/home') return;
    e.preventDefault();
    document.getElementById(id)?.scrollIntoView({ block: 'start' });
    window.history.replaceState(null, '', `/home#${id}`);
    closeAll();
  }

  // Contact lines for the account block. The session holds one emailOrPhone
  // value (plus optional email/mobile once later teams add them) — show each
  // available line, never an empty one.
  const displayName = (user?.name || '').trim();
  const contactEmail = (user?.email || '').trim()
    || (user?.emailOrPhone && user.emailOrPhone.includes('@') ? user.emailOrPhone.trim() : '');
  const contactMobile = (user?.mobile || user?.phone || '').trim()
    || (user?.emailOrPhone && !user.emailOrPhone.includes('@') ? user.emailOrPhone.trim() : '');

  // Active link gets a gold underline; hover is a colour change only (150ms).
  const underline = 'relative after:absolute after:inset-x-3 after:-bottom-0.5 after:h-0.5 after:rounded-full after:bg-gold-500';
  const navLink = ({ isActive }) =>
    cx(
      'rounded-lg px-3 py-2 transition-colors duration-150',
      isActive ? cx('text-navy-900', underline) : 'text-slate-600 hover:bg-slate-100 hover:text-navy-900',
    );
  const plainLink = 'relative rounded-lg px-3 py-2 text-slate-600 transition-colors duration-150 hover:bg-slate-100 hover:text-navy-900';
  const rowLink = 'flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-slate-700 transition-colors duration-150 hover:bg-navy-50 hover:text-navy-900';
  const mobileRow = 'block rounded-xl px-3 py-2.5 font-medium text-slate-700 transition-colors duration-150 hover:bg-navy-50 hover:text-navy-900';
  const mobileRowActive = ({ isActive }) => cx(mobileRow, isActive && 'bg-navy-50 text-navy-900');

  // Details block shared by the dropdown and the mobile panel.
  function AccountDetails() {
    return (
      <div className="flex items-center gap-3 border-b border-slate-100 px-4 py-3.5">
        <span aria-hidden className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-navy-50 font-display text-sm font-bold text-navy-800 ring-1 ring-gold-500/60">
          {displayName ? initialsOf(displayName) : <UserIcon className="h-5 w-5" />}
        </span>
        <div className="min-w-0">
          <p className="flex items-center gap-2 font-semibold text-navy-900">
            <span className="truncate">{displayName || 'My Account'}</span>
            {isMember && <span className="tag tag-gold shrink-0 !px-2 !py-0.5 !text-[10px]">Member</span>}
          </p>
          {contactEmail && <p className="truncate text-xs text-slate-500">{contactEmail}</p>}
          {contactMobile && <p className="truncate text-xs text-slate-500">{contactMobile}</p>}
        </div>
      </div>
    );
  }

  // Signed-in menu: profile, bookings, the member dashboard and Logout.
  function AccountRows({ onNavigate }) {
    return (
      <>
        <ul className="p-2 text-sm">
          <li>
            <Link role="menuitem" to="/profile" onClick={onNavigate} className={rowLink}>
              <UserIcon className="h-4 w-4 text-gold-600" /> My profile
            </Link>
          </li>
          <li>
            <Link role="menuitem" to="/profile/bookings" onClick={onNavigate} className={rowLink}>
              <CalendarIcon className="h-4 w-4 text-gold-600" /> My bookings
            </Link>
          </li>
          {isMember && (
            <li>
              <Link role="menuitem" to="/membership/dashboard" onClick={onNavigate} className={rowLink}>
                <MembershipIcon className="h-4 w-4 text-gold-600" /> Membership dashboard
              </Link>
            </li>
          )}
        </ul>
        <div className="border-t border-slate-100 p-2">
          <button
            type="button"
            role="menuitem"
            onClick={doLogout}
            className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left font-medium text-red-600 transition-colors duration-150 hover:bg-red-50"
          >
            <LogOutIcon className="h-4 w-4" /> Logout
          </button>
        </div>
      </>
    );
  }

  // One circular avatar + dropdown, right end of the bar (desktop and mobile).
  function AccountMenu() {
    return (
      <div className="relative">
        <button
          type="button"
          aria-haspopup="menu"
          aria-expanded={avatar}
          aria-label="Account menu"
          onClick={() => { setAvatar((a) => !a); setMenu(null); }}
          className="grid h-9 w-9 place-items-center rounded-full bg-navy-50 font-display text-xs font-bold text-navy-800 ring-1 ring-gold-500/60 transition-colors duration-150 hover:ring-2 hover:ring-gold-500"
        >
          <span aria-hidden className="grid h-full w-full place-items-center">
            {displayName ? initialsOf(displayName) : <UserIcon className="h-4 w-4" />}
          </span>
        </button>

        {avatar && (
          <div className="absolute right-0 z-30 w-72 max-w-[calc(100vw-2rem)] pt-2">
            <div className="card overflow-hidden !p-0" role="menu" aria-label="Account menu">
              <AccountDetails />
              <AccountRows onNavigate={closeAll} />
            </div>
          </div>
        )}
      </div>
    );
  }

  // Hover menus close when the pointer leaves the header — the panel is a
  // descendant of it, so moving from a trigger down into the cards keeps the
  // menu open, and leaving the header (or the panel) closes it.
  return (
    <header ref={headerRef} className="sticky top-0 z-40" onMouseLeave={() => setMenu(null)}>
      {/* 1 · Utility strip — slim, navy, desktop only */}
      <div className="hidden border-b border-white/10 bg-navy-950 lg:block">
        <div className="container-x flex h-9 items-center justify-between gap-4 text-xs text-slate-300">
          <div className="flex items-center gap-4">
            {SITE_INFO.phone && (
              <a
                href={`tel:${SITE_INFO.phone.replace(/\s/g, '')}`}
                className="inline-flex items-center gap-1.5 transition-colors duration-150 hover:text-gold-400"
              >
                <PhoneIcon className="h-3.5 w-3.5 text-gold-400" />
                {SITE_INFO.phone}
              </a>
            )}
            <Link to="/support" className="transition-colors duration-150 hover:text-gold-400">Help</Link>
          </div>
          {/* Member offer — read from /config/pricing.js, so the % is never
              restated here and always matches the real discount. */}
          {MEMBER_PROMO_NOTE && <p className="text-gold-400">{MEMBER_PROMO_NOTE}</p>}
        </div>
      </div>

      {/* 2 · Main bar — white, sticky, one hairline */}
      <div className="border-b border-slate-200 bg-white">
        <div className="container-x grid h-16 grid-cols-[auto_1fr_auto] items-center gap-3">
          <Logo to={user ? '/home' : '/'} />

          {/* Centre · the six primary links */}
          <nav className="hidden items-center justify-center gap-1 text-sm font-medium lg:flex" aria-label="Primary">
            {MENU_LINKS.map((l) => {
              const expanded = menu === l.key;
              // On the section's own page the trigger keeps its gold underline.
              const onThisPage = location.pathname.startsWith(l.to);
              return (
                <div key={l.key} className="relative" onMouseEnter={() => setMenu(l.key)}>
                  <button
                    type="button"
                    aria-haspopup="true"
                    aria-expanded={expanded}
                    aria-controls={`mega-${l.key}`}
                    onClick={() => setMenu(expanded ? null : l.key)}
                    className={cx(
                      'flex items-center gap-1.5 rounded-lg px-3 py-2 transition-colors duration-150',
                      expanded || onThisPage
                        ? cx('text-navy-900', underline)
                        : 'text-slate-600 hover:bg-slate-100 hover:text-navy-900',
                    )}
                  >
                    {l.label}
                    <ChevronDownIcon className={cx('h-3.5 w-3.5', expanded && 'rotate-180')} />
                  </button>
                </div>
              );
            })}

            <Link
              to={user ? '/home#facilities' : '/#facilities'}
              onClick={(e) => (user ? scrollHome(e, 'facilities') : scrollToSection(e, 'facilities'))}
              className={plainLink}
            >
              Facilities
            </Link>
            <NavLink to="/membership" className={navLink}>Membership</NavLink>
          </nav>

          {/* Right · account + the gold booking CTA */}
          <div className="flex items-center justify-end gap-2">
            <div className="hidden items-center gap-2 lg:flex">
              {!user && <NavLink to="/signin" state={signinState} className={navLink}>Sign in</NavLink>}
              <GoldCta to="/book" onClick={onBookNow}>Book now</GoldCta>
              {!user && <OutlineCta to="/signup" onClick={closeAll}>Join now</OutlineCta>}
              {user && <AccountMenu />}
            </div>

            {/* Mobile · avatar (signed in) + hamburger */}
            <div className="flex items-center gap-2 lg:hidden">
              {user && <AccountMenu />}
              <button
                type="button"
                onClick={() => setOpen((o) => !o)}
                aria-expanded={open}
                aria-label={open ? 'Close menu' : 'Open menu'}
                className="grid h-10 w-10 place-items-center rounded-xl border border-slate-300 text-navy-900 transition-colors duration-150 hover:bg-slate-50"
              >
                {open ? <XIcon className="h-5 w-5" /> : <MenuIcon className="h-5 w-5" />}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 3 · Photo mega-menus — full width under the bar, instant open/close.
          (Positioned from the top of the viewport: 36px strip + 64px bar.) */}
      {MENU_LINKS.map((l) => {
        if (menu !== l.key) return null;
        const m = NAV_MENUS[l.key];
        return (
          <div
            key={l.key}
            id={`mega-${l.key}`}
            role="region"
            aria-label={`${m.label} menu`}
            className="fixed inset-x-0 top-[100px] z-30 hidden border-b border-slate-200 bg-white shadow-lift lg:block"
          >
            <div className="container-x py-6">
              <div className={cx('grid gap-3 sm:grid-cols-2', m.cards.length > 3 ? 'lg:grid-cols-4' : 'lg:grid-cols-3')}>
                {m.cards.map((c) => (
                  <PhotoCard
                    key={c.to + c.label}
                    to={c.to}
                    onClick={closeAll}
                    image={c.image}
                    label={c.label}
                    aspect="4 / 3"
                    sizes="(min-width: 1024px) 22vw, 45vw"
                  />
                ))}
              </div>
              <div className="mt-4 flex justify-end border-t border-slate-100 pt-4">
                {/* Navy text on white (≈15:1) — gold is the underline, not the
                    text, so the link stays readable. */}
                <Link
                  to={m.viewAll.to}
                  onClick={closeAll}
                  className="rounded-lg px-2 py-1 text-sm font-semibold text-navy-900 underline decoration-gold-500 decoration-2 underline-offset-4 transition-colors duration-150 hover:bg-gold-50"
                >
                  {m.viewAll.label}
                </Link>
              </div>
            </div>
          </div>
        );
      })}

      {/* 4 · Mobile panel — full height, same links as an accordion list */}
      {open && (
        <div className="lg:hidden">
          <button
            type="button"
            aria-label="Close menu"
            onClick={() => setOpen(false)}
            className="fixed inset-0 top-16 z-30 bg-navy-950/50"
          />
          <nav
            aria-label="Mobile"
            className="fixed right-0 top-0 z-40 flex h-full w-[85%] max-w-sm flex-col overflow-y-auto border-l border-slate-200 bg-white shadow-lift"
          >
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <Logo />
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close menu"
                className="grid h-9 w-9 place-items-center rounded-lg border border-slate-200 text-navy-900 transition-colors duration-150 hover:bg-slate-50"
              >
                <XIcon className="h-4 w-4" />
              </button>
            </div>

            <div className="flex-1 px-3 py-4">
              <ul className="space-y-1">
                {MENU_LINKS.map((l) => {
                  const expanded = mMenu === l.key;
                  const m = NAV_MENUS[l.key];
                  const panelId = `mobile-menu-${l.key}`;
                  return (
                    <li key={l.key}>
                      <div className="flex items-center gap-1">
                        <NavLink to={l.to} onClick={closeAll} className={cx(mobileRow, 'flex-1')}>
                          {l.label}
                        </NavLink>
                        <button
                          type="button"
                          aria-expanded={expanded}
                          aria-controls={panelId}
                          aria-label={`${expanded ? 'Hide' : 'Show'} ${l.label} links`}
                          onClick={() => setMMenu(expanded ? null : l.key)}
                          className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-slate-500 transition-colors duration-150 hover:bg-navy-50 hover:text-navy-900"
                        >
                          <ChevronDownIcon className={cx('h-4 w-4', expanded && 'rotate-180')} />
                        </button>
                      </div>
                      {expanded && (
                        <ul id={panelId} className="mt-1 space-y-1 pb-1 pl-3">
                          {m.cards.map((c) => (
                            <li key={c.to + c.label}>
                              <Link
                                to={c.to}
                                onClick={closeAll}
                                className="block rounded-xl px-3 py-2 text-sm text-slate-600 transition-colors duration-150 hover:bg-navy-50 hover:text-navy-900"
                              >
                                {c.label}
                              </Link>
                            </li>
                          ))}
                          <li>
                            <Link
                              to={m.viewAll.to}
                              onClick={closeAll}
                              className="block rounded-xl px-3 py-2 text-sm font-semibold text-navy-900 underline decoration-gold-500 decoration-2 underline-offset-4 transition-colors duration-150 hover:bg-gold-50"
                            >
                              {m.viewAll.label}
                            </Link>
                          </li>
                        </ul>
                      )}
                    </li>
                  );
                })}

                <li>
                  <Link
                    to={user ? '/home#facilities' : '/#facilities'}
                    onClick={(e) => (user ? scrollHome(e, 'facilities') : scrollToSection(e, 'facilities'))}
                    className={mobileRow}
                  >
                    Facilities
                  </Link>
                </li>
                <li>
                  <NavLink to="/membership" onClick={closeAll} className={mobileRowActive}>
                    Membership
                  </NavLink>
                </li>
              </ul>

              <div className="mt-4 border-t border-slate-100 pt-4">
                {user ? (
                  <>
                    <div className="overflow-hidden rounded-2xl border border-navy-900/10">
                      <AccountDetails />
                    </div>
                    <div className="mt-1" role="menu" aria-label="Account menu">
                      <AccountRows onNavigate={closeAll} />
                    </div>
                  </>
                ) : (
                  <>
                    <NavLink to="/signin" state={signinState} onClick={closeAll} className={mobileRow}>
                      Sign in
                    </NavLink>
                    <OutlineCta to="/signup" size="md" className="mt-2 w-full" onClick={closeAll}>Join now</OutlineCta>
                  </>
                )}
                <GoldCta to="/book" size="md" className="mt-2 w-full" onClick={onBookNow}>Book now</GoldCta>
                {MEMBER_PROMO_NOTE && (
                  <p className="mt-3 rounded-xl border border-gold-500/40 bg-gold-50 px-3 py-2 text-xs font-semibold text-navy-900">
                    {MEMBER_PROMO_NOTE}
                  </p>
                )}
              </div>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}

const FOOTER_LINKS = [
  { to: '/home', label: 'Home' },
  { to: '/book/activities', label: 'Book an activity' },
  { to: '/membership', label: 'Membership' },
  { to: '/profile', label: 'My profile' },
  { to: '/support', label: 'Contact / Support' },
];

export function Footer() {
  const addressLines = getAddressLines();
  const socialLinks = getActiveSocialLinks();

  return (
    <footer className="border-t border-white/10 bg-navy-950 text-slate-300">
      <div className="container-x grid gap-10 py-14 sm:grid-cols-2 lg:grid-cols-4">
        {/* Brand */}
        <div className="sm:col-span-2 lg:col-span-1">
          <p className="font-display text-2xl text-white">FRCC</p>
          <p className="mt-1 text-[11px] uppercase tracking-[0.18em] text-gold-400">Club · Resort · Society</p>
          <p className="mt-4 text-sm leading-relaxed text-slate-400">
            Premium club, resort &amp; society campus — hotel, halls, parking, games and lifetime membership behind a
            single login.
          </p>
          {socialLinks.length > 0 && (
            <div className="mt-5 flex gap-2">
              {socialLinks.map((s) => (
                <a
                  key={s.key}
                  href={s.url}
                  aria-label={`FRCC on ${s.label}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="grid h-10 w-10 place-items-center rounded-xl border border-white/15 text-slate-400 transition hover:border-gold-500/50 hover:text-gold-400"
                >
                  {s.key === 'instagram' && <InstagramIcon className="h-4 w-4" />}
                  {s.key === 'linkedin' && <LinkedinIcon className="h-4 w-4" />}
                  {s.key === 'youtube' && <YoutubeIcon className="h-4 w-4" />}
                  {s.key === 'twitter' && <span className="text-[14px]">𝕏</span>}
                  {s.key === 'facebook' && <span className="text-[14px]">f</span>}
                </a>
              ))}
            </div>
          )}
        </div>

        {/* Quick links */}
        <nav aria-label="Footer quick links">
          <p className="text-sm font-semibold text-white">Quick links</p>
          <ul className="mt-4 space-y-2 text-sm">
            {FOOTER_LINKS.map((l) => (
              <li key={l.to}>
                <Link className="transition hover:text-gold-400" to={l.to}>{l.label}</Link>
              </li>
            ))}
          </ul>
        </nav>

        {/* Services */}
        <nav aria-label="Footer services">
          <p className="text-sm font-semibold text-white">Services</p>
          <ul className="mt-4 space-y-2 text-sm">
            {SERVICES.map((s) => (
              <li key={s.to}>
                <Link className="transition hover:text-gold-400" to={s.to}>{s.label}</Link>
              </li>
            ))}
          </ul>
        </nav>

        {/* Contact — every value below is read from src/config/siteInfo.js.
            Edit the phone / email / address there (one file) and the footer,
            the Support page and the member home all update together. */}
        <div>
          <p className="text-sm font-semibold text-white">Contact</p>
          <ul className="mt-4 space-y-3 text-sm text-slate-400">
            {addressLines.length > 0 && (
              <li className="flex items-start gap-2.5">
                <MapPinIcon className="mt-0.5 h-4 w-4 shrink-0 text-gold-400" />
                <address className="not-italic">{addressLines.join(', ')}</address>
              </li>
            )}
            {SITE_INFO.phone && (
              <li className="flex items-center gap-2.5">
                <PhoneIcon className="h-4 w-4 shrink-0 text-gold-400" />
                <a href={`tel:${SITE_INFO.phone.replace(/\s/g, '')}`} className="transition hover:text-gold-400">{SITE_INFO.phone}</a>
              </li>
            )}
            {SITE_INFO.email && (
              <li className="flex items-center gap-2.5">
                <MailIcon className="h-4 w-4 shrink-0 text-gold-400" />
                <a href={`mailto:${SITE_INFO.email}`} className="transition hover:text-gold-400">{SITE_INFO.email}</a>
              </li>
            )}
          </ul>
          {SITE_INFO.hours && <p className="mt-4 text-xs text-slate-500">{SITE_INFO.hours}</p>}
        </div>
      </div>

      <div className="border-t border-white/10">
        <div className="container-x flex flex-col items-center justify-between gap-3 py-4 text-xs text-slate-500 sm:flex-row">
          <p>{SITE_INFO.copyright}</p>
          <ul className="flex flex-wrap items-center justify-center gap-x-5 gap-y-1">
            {['Privacy Policy', 'Accessibility', 'Sitemap'].map((label) => (
              <li key={label}>
                <span className="transition hover:text-gold-400 cursor-default">{label}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </footer>
  );
}

export function AppLayout({ children }) {
  const { toasts, isMember, setIsMember } = useApp();
  // Hidden in production builds: Vite sets import.meta.env.PROD=true during
  // `npm run build`, so the toggle never leaks to end users even if someone
  // accidentally ships with VITE_DEMO_MODE=true in the .env.
  const isDemoMode = !import.meta.env.PROD && import.meta.env.VITE_DEMO_MODE === 'true';
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1">{children}</main>
      <Footer />
      {/* Demo-only membership switch (visible only when VITE_DEMO_MODE=true) */}
      {isDemoMode && (
        <div className="fixed bottom-4 left-4 z-50 flex items-center gap-2 rounded-xl border border-navy-900/15 bg-white/95 px-3 py-2 text-xs font-semibold text-navy-900 shadow-lift backdrop-blur">
          <span className="rounded bg-gold-500/20 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-navy-900">demo</span>
          <button
            type="button"
            role="switch"
            aria-checked={isMember}
            aria-label="Toggle member discount"
            onClick={() => setIsMember((v) => !v)}
            className={`relative h-5 w-10 rounded-full transition ${isMember ? 'bg-navy-900' : 'bg-slate-300'}`}
          >
            <span aria-hidden className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all ${isMember ? 'left-[22px]' : 'left-0.5'}`} />
          </button>
          <span>{isMember ? 'Member: ON (30% off)' : 'Member: OFF'}</span>
        </div>
      )}
      <Toasts items={toasts} />
    </div>
  );
}
