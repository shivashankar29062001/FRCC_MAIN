import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useApp } from '../../app/store/AppContext.jsx';
import { isAdmin } from '../../api/events.js';
import { Toasts } from '../ui/feedback.jsx';
import { PhotoCard } from '../ui/explore.jsx';
import { cx, initialsOf } from '../../utils/helpers.js';
import { SITE_INFO, getAddressLines, getActiveSocialLinks } from '../../config/siteInfo.js';
import { MEMBER_PROMO_NOTE } from '../../config/pricing.js';
import { diningLabel, registration } from '../../config/site.js';
import { registrationNo } from '../../config/organization.js';
import { NAV_MENUS } from '../../config/navMenus.js';
import { ROUTES } from '../../config/routes.js';
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
import { Logo } from '../Logo.jsx';
import { LocationTrigger } from '../location/LocationTrigger.jsx';
import { LocationPanel } from '../location/LocationPanel.jsx';

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

function BrandLogo({ to = '/' }) {
  return (
    <Link to={to} className="flex items-center gap-2.5" aria-label="FRCC home">
      <Logo variant="emblem" size={52} />
      <span className="flex flex-col leading-tight">
        <span className="block font-display font-bold text-lg text-navy-900">FRCC</span>
        <span className="block text-[11px] tracking-[0.08em] text-slate-500">Film Recreation &amp; Cultural Centre</span>
        <span className="mt-0.5 block text-[10px] font-medium tracking-[0.08em] text-slate-500 leading-none">
          Regd. No. {registrationNo}
        </span>
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
  { to: ROUTES.stay, label: 'Stay' },
  { to: ROUTES.dining, label: diningLabel },
  { to: ROUTES.halls, label: 'Halls' },
  { to: ROUTES.activities, label: 'Activities' },
  { to: ROUTES.parking, label: 'Parking' },
  { to: ROUTES.membership, label: 'Membership' },
  { to: ROUTES.events, label: 'Events' },
  { to: ROUTES.gallery, label: 'Gallery' },
];

// Primary service links (plain links, no mega-menus)
const MENU_LINKS = [
  { key: 'stay', label: 'Stay', to: ROUTES.stay },
  { key: 'dining', label: diningLabel, to: ROUTES.dining },
  { key: 'hall', label: 'Halls', to: ROUTES.halls },
  { key: 'activities', label: 'Activities', to: ROUTES.activities },
  { key: 'parking', label: 'Parking', to: ROUTES.parking },
  { key: 'membership', label: 'Membership', to: ROUTES.membership },
  { key: 'events', label: 'Events', to: ROUTES.events },
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
  const [isAdminUser, setIsAdminUser] = useState(false);

  useEffect(() => {
    let active = true;
    if (user) {
      isAdmin()
        .then((res) => {
          if (active) setIsAdminUser(Boolean(res));
        })
        .catch(() => {
          if (active) setIsAdminUser(false);
        });
    } else {
      setIsAdminUser(false);
    }
    return () => {
      active = false;
    };
  }, [user]);

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
  const underline = 'relative after:absolute after:inset-x-2.5 after:-bottom-0.5 after:h-0.5 after:rounded-full after:bg-gold-500';
  const navLink = ({ isActive }) =>
    cx(
      'rounded-lg px-2 py-1.5 transition-colors duration-150 whitespace-nowrap',
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
          {isMember ? (
            <li>
              <Link role="menuitem" to="/membership/dashboard" onClick={onNavigate} className={rowLink}>
                <MembershipIcon className="h-4 w-4 text-gold-600" /> Membership dashboard
              </Link>
            </li>
          ) : (
            <li>
              <Link role="menuitem" to="/membership" onClick={onNavigate} className={rowLink}>
                <MembershipIcon className="h-4 w-4 text-gold-600" /> Become a member
              </Link>
            </li>
          )}
          {isAdminUser && (
            <li>
              <Link role="menuitem" to="/admin/events" onClick={onNavigate} className={rowLink}>
                <span className="flex h-4 w-4 items-center justify-center rounded text-[11px] font-bold text-gold-600">★</span> Admin
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
      <div className="hidden border-b border-white/10 bg-navy-950 min-[1200px]:block">
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
            <Link to={ROUTES.support} className="transition-colors duration-150 hover:text-gold-400">Help</Link>
          </div>
          {/* Member offer — read from /config/pricing.js, so the % is never
              restated here and always matches the real discount. */}
          <div className="flex items-center gap-4">
            {MEMBER_PROMO_NOTE && <p className="text-gold-400">{MEMBER_PROMO_NOTE}</p>}
            <div className="flex items-center gap-3 border-l border-white/20 pl-3">
              <NavLink to={ROUTES.gallery} className="transition-colors duration-150 hover:text-gold-400">Gallery</NavLink>
              <NavLink to={ROUTES.leadership} className="transition-colors duration-150 hover:text-gold-400">Leadership</NavLink>
            </div>
          </div>
        </div>
      </div>

      {/* 2 · Main bar — white, sticky, one hairline */}
      <div className="border-b border-slate-200 bg-white">
        <div className="container-x grid h-16 grid-cols-[auto_1fr_auto] items-center gap-2">
          <BrandLogo to={user ? ROUTES.homeHub : ROUTES.home} />

          {/* Centre · the primary links */}
          <nav className="hidden items-center justify-center gap-0.5 text-[13px] font-medium min-[1200px]:flex" aria-label="Primary">
            <NavLink to={ROUTES.stay} onClick={() => { if (import.meta.env.DEV) console.info("[tile]", "Stay", ROUTES.stay); }} className={navLink}>Stay</NavLink>
            <NavLink to={ROUTES.dining} onClick={() => { if (import.meta.env.DEV) console.info("[tile]", diningLabel, ROUTES.dining); }} className={navLink}>{diningLabel}</NavLink>
            <NavLink to={ROUTES.halls} onClick={() => { if (import.meta.env.DEV) console.info("[tile]", "Halls", ROUTES.halls); }} className={navLink}>Halls</NavLink>
            <NavLink to={ROUTES.activities} onClick={() => { if (import.meta.env.DEV) console.info("[tile]", "Activities", ROUTES.activities); }} className={navLink}>Activities</NavLink>
            <NavLink to={ROUTES.parking} onClick={() => { if (import.meta.env.DEV) console.info("[tile]", "Parking", ROUTES.parking); }} className={navLink}>Parking</NavLink>
            <NavLink to={ROUTES.membership} onClick={() => { if (import.meta.env.DEV) console.info("[tile]", "Membership", ROUTES.membership); }} className={navLink}>Membership</NavLink>
            <NavLink to={ROUTES.events} onClick={() => { if (import.meta.env.DEV) console.info("[tile]", "Events", ROUTES.events); }} className={navLink}>Events</NavLink>
          </nav>

          {/* Right · account + the gold booking CTA */}
          <div className="flex items-center justify-end gap-2">
            <div className="hidden items-center gap-2 min-[1200px]:flex">
              {!user && <NavLink to={ROUTES.signin} state={signinState} className={navLink}>Sign in</NavLink>}
              {user ? (
                <GoldCta to={ROUTES.book} onClick={onBookNow}>Book now</GoldCta>
              ) : (
                <GoldCta to={ROUTES.membership} onClick={closeAll}>Become a member</GoldCta>
              )}
              {user && <AccountMenu />}
            </div>

            {/* Mobile · avatar (signed in) + hamburger */}
            <div className="flex items-center gap-2 min-[1200px]:hidden">
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

      {/* 4 · Mobile panel — full height, same links as an accordion list */}
      {open && (
        <div className="min-[1200px]:hidden">
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
                <li>
                  <NavLink to={ROUTES.stay} onClick={closeAll} className={mobileRowActive}>
                    Stay
                  </NavLink>
                </li>
                <li>
                  <NavLink to={ROUTES.dining} onClick={closeAll} className={mobileRowActive}>
                    {diningLabel}
                  </NavLink>
                </li>
                <li>
                  <NavLink to={ROUTES.halls} onClick={closeAll} className={mobileRowActive}>
                    Halls
                  </NavLink>
                </li>
                <li>
                  <NavLink to={ROUTES.activities} onClick={closeAll} className={mobileRowActive}>
                    Activities
                  </NavLink>
                </li>
                <li>
                  <NavLink to={ROUTES.parking} onClick={closeAll} className={mobileRowActive}>
                    Parking
                  </NavLink>
                </li>
                <li>
                  <NavLink to={ROUTES.membership} onClick={closeAll} className={mobileRowActive}>
                    Membership
                  </NavLink>
                </li>
                <li>
                  <NavLink to={ROUTES.events} onClick={closeAll} className={mobileRowActive}>
                    Events
                  </NavLink>
                </li>
                <li>
                  <NavLink to={ROUTES.gallery} onClick={closeAll} className={mobileRowActive}>
                    Gallery
                  </NavLink>
                </li>
                <li>
                  <NavLink to={ROUTES.leadership} onClick={closeAll} className={mobileRowActive}>
                    Leadership
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
                  <NavLink to={ROUTES.signin} state={signinState} onClick={closeAll} className={mobileRow}>
                    Sign in
                  </NavLink>
                )}
                {user ? (
                  <GoldCta to={ROUTES.book} size="md" className="mt-2 w-full" onClick={onBookNow}>Book now</GoldCta>
                ) : (
                  <GoldCta to={ROUTES.membership} size="md" className="mt-2 w-full" onClick={closeAll}>Become a member</GoldCta>
                )}
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
  { to: ROUTES.homeHub, label: 'Home' },
  { to: '/#facilities', label: 'Facilities' },
  { to: ROUTES.activities, label: 'Book an activity' },
  { to: ROUTES.membership, label: 'Membership' },
  { to: ROUTES.gallery, label: 'Gallery' },
  { to: ROUTES.leadership, label: 'Leadership' },
  { to: ROUTES.profile, label: 'My profile' },
  { to: ROUTES.support, label: 'Contact / Support' },
];

export function Footer() {
  const addressLines = getAddressLines();
  const socialLinks = getActiveSocialLinks();

  return (
    <footer className="border-t border-white/10 bg-navy-950 text-slate-300">
      <div className="container-x grid gap-10 py-14 sm:grid-cols-2 lg:grid-cols-4">
        {/* Brand */}
        <div className="sm:col-span-2 lg:col-span-1">
          <Logo variant="lockup" size={120} />
          <p className="mt-4 text-sm leading-relaxed text-slate-400">
            Film Recreation &amp; Cultural Centre
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
                <Link
                  className="transition hover:text-gold-400"
                  to={s.to}
                  onClick={() => { if (import.meta.env.DEV) console.info("[tile]", s.label, s.to); }}
                >
                  {s.label}
                </Link>
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
            {SITE_INFO.locations && SITE_INFO.locations.length > 0 ? (
              SITE_INFO.locations.map((loc) => (
                <li key={loc.id} className="space-y-0.5">
                  <span className="block font-medium text-slate-300">{loc.title}</span>
                  <LocationTrigger
                    locationId={loc.id === 'vja' ? 'vja-club' : 'hyd-office'}
                    address={loc.fullAddress}
                    iconClassName="mt-0.5 h-3.5 w-3.5 shrink-0 text-gold-400 group-hover:text-gold-300 transition-colors"
                    className="text-xs leading-relaxed text-slate-400 hover:text-gold-300"
                  >
                    <address className="not-italic">{loc.fullAddress}</address>
                  </LocationTrigger>
                  {loc.phone && (
                    <div className="flex items-center gap-1.5 text-xs text-slate-400 mt-0.5">
                      <PhoneIcon className="h-3 w-3 shrink-0 text-gold-400" />
                      <a href={`tel:${loc.phone.replace(/\s/g, '')}`} className="transition hover:text-gold-300">{loc.phone}</a>
                    </div>
                  )}
                </li>
              ))
            ) : addressLines.length > 0 && (
              <li className="space-y-0.5">
                <LocationTrigger
                  locationId="vja-club"
                  address={addressLines.join(', ')}
                  iconClassName="mt-0.5 h-3.5 w-3.5 shrink-0 text-gold-400 group-hover:text-gold-300 transition-colors"
                  className="text-xs leading-relaxed text-slate-400 hover:text-gold-300"
                >
                  <address className="not-italic">{addressLines.join(', ')}</address>
                </LocationTrigger>
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
          <p>
            {SITE_INFO.copyright}
            {registration?.id ? ` · Reg. No: ${registration.id}` : ''}
          </p>
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
  const { toasts } = useApp();
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1">{children}</main>
      <Footer />
      <LocationPanel />
      <Toasts items={toasts} />
    </div>
  );
}
