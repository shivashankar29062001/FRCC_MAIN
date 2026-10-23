import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useApp } from '../app/store/AppContext.jsx';
import { supabase } from '../services/supabase.js';
import * as membershipService from '../services/membershipService.js';
import { Card, EmptyState, LoadingState, SkeletonGrid, ErrorState, StatusTag } from '../components/ui/feedback.jsx';
import { Breadcrumbs } from '../components/ui/sections.jsx';
import { Reveal } from '../components/ui/motion.jsx';
import { healthCardDiscountPercent } from '../config/site.js';
import {
  MembershipIdCard,
  HealthCard,
  downloadBothCards,
  downloadSvgAsPng,
} from '../features/membership/MembershipCards.jsx';
import {
  AwardIcon,
  MembershipIcon,
  QrIcon,
  ArrowRightIcon,
  CheckIcon,
} from '../components/ui/icons.jsx';
import { LocationTrigger } from '../components/location/LocationTrigger.jsx';
import { formatDMY } from '../utils/dates.js';
import { downloadOfficialApplicationForm } from '../utils/downloadForm.js';

// ---------------------------------------------------------------------------
// /membership/dashboard — Shows both membership cards for a stored membership.
// Compact navy header with serif title + gold accent and member name (no hero image).
// ---------------------------------------------------------------------------

const BENEFITS = [
  '30% discount on every booking (stay, halls, games, gym, pool)',
  `FRCC Health Card: ${healthCardDiscountPercent}% discount at collaborating diagnostic centres`,
  'Complimentary parking privilege across all club visits',
  'Priority sports slots & pool access reserved for members',
];

const OFFERS = [
  { title: '30% off every booking', desc: 'Member discount on luxury stay & event venues', tag: 'Rooms & Halls' },
  { title: `${healthCardDiscountPercent}% off diagnostic centres`, desc: 'Health card savings with authorized partner labs', tag: 'Health' },
  { title: 'Priority sports slots', desc: 'Courts & swimming pool held exclusively for members', tag: 'Sports' },
];

export function MembershipDashboardPage() {
  const { user, isMember: appIsMember, membership: appMembership, refreshUserData } = useApp();

  // All hooks declared unconditionally at the top level
  const [membership, setMembership] = useState(() => appMembership || null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [retryCount, setRetryCount] = useState(0);
  const [pdfError, setPdfError] = useState(null);
  const [pdfBusy, setPdfBusy] = useState(false);

  // Fetch membership data safely from Supabase with fallbacks
  useEffect(() => {
    let isMounted = true;

    async function loadMembership() {
      setLoading(true);
      setError(null);
      try {
        // 1. Wait for Supabase auth session to be ready
        const { data: sessionData, error: sessionErr } = await supabase.auth.getSession();
        if (sessionErr) {
          console.error('[MembershipDashboardPage] Supabase auth session error:', sessionErr);
        }

        const currentUserId = sessionData?.session?.user?.id || user?.id || null;

        let data = null;

        // Query by user_id if logged in
        if (currentUserId) {
          data = await membershipService.getUserMembership(currentUserId);
        }

        // Fallback: query by member_id from context or local storage
        if (!data && appMembership?.memberId) {
          data = await membershipService.getUserMembership(null, appMembership.memberId);
        }

        // Fallback: use context membership if remote lookup returned nothing
        if (!data && appMembership) {
          data = appMembership;
        }

        if (isMounted) {
          setMembership(data);
        }
      } catch (err) {
        console.error('[MembershipDashboardPage] Failed to fetch membership from Supabase:', err);
        if (isMounted) {
          setError(err?.message || 'Failed to load membership details. Please try again.');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    loadMembership();

    return () => {
      isMounted = false;
    };
  }, [user?.id, appMembership?.memberId, retryCount]);

  const handleRetry = useCallback(() => {
    setRetryCount((c) => c + 1);
    if (typeof refreshUserData === 'function') {
      refreshUserData();
    }
  }, [refreshUserData]);

  // Safe defaults with optional chaining everywhere
  const currentMembership = membership || appMembership || null;
  const memberId = currentMembership?.memberCode || currentMembership?.member_code || currentMembership?.memberId || currentMembership?.member_id || '';
  const memberName = currentMembership?.name || currentMembership?.fullName || user?.name || 'Member';
  const planName = currentMembership?.planName || currentMembership?.plan_name || currentMembership?.plan || 'FRCC Membership';
  const memberStatus = currentMembership?.status || (appIsMember ? 'Active' : 'Pending');
  const rawDate = currentMembership?.createdAt || currentMembership?.created_at || currentMembership?.valid_from;
  const joinDate = rawDate ? formatDMY(rawDate) : formatDMY(new Date().toISOString());

  async function handleDownloadForm() {
    setPdfError(null);
    setPdfBusy(true);
    try {
      await downloadOfficialApplicationForm();
    } catch (err) {
      console.error('[MembershipDashboardPage] PDF download error:', err);
      setPdfError(err?.message || 'Failed to download application form. Please try again.');
    } finally {
      setPdfBusy(false);
    }
  }

  async function handleSendWhatsApp() {
    setPdfError(null);
    setPdfBusy(true);
    try {
      const { sendMembershipToWhatsApp } = await import('../lib/applicationForm.js');
      await sendMembershipToWhatsApp(currentMembership || {});
    } catch (err) {
      console.error('[MembershipDashboardPage] WhatsApp PDF send error:', err);
      setPdfError(err?.message || 'Failed to prepare application form for WhatsApp. Please try again.');
    } finally {
      setPdfBusy(false);
    }
  }

  async function handleDownloadIdCard() {
    try {
      const cleanId = String(memberId).replace(/[^a-zA-Z0-9_-]/g, '');
      const idSvg = document.getElementById('frcc-membership-id-card');
      if (idSvg) {
        await downloadSvgAsPng(idSvg, cleanId ? `FRCC-ID-${cleanId}.png` : 'FRCC-ID.png');
      }
    } catch (err) {
      console.error('[MembershipDashboardPage] Error downloading ID card:', err);
    }
  }

  async function handleDownloadHealthCard() {
    try {
      const cleanId = String(memberId).replace(/[^a-zA-Z0-9_-]/g, '');
      const healthSvg = document.getElementById('frcc-health-card');
      if (healthSvg) {
        await downloadSvgAsPng(healthSvg, cleanId ? `FRCC-Health-${cleanId}.png` : 'FRCC-Health.png');
      }
    } catch (err) {
      console.error('[MembershipDashboardPage] Error downloading Health card:', err);
    }
  }

  // 1. Loading state (skeleton/spinner)
  if (loading) {
    return (
      <div>
        <header className="bg-navy-950 text-white py-5 sm:py-6 border-b border-navy-900">
          <div className="container-x flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1.5">
            <h1 className="font-display text-2xl sm:text-3xl tracking-tight text-white">
              Membership <span className="text-gold-400">Dashboard</span>
            </h1>
            {memberName && (
              <span className="text-sm sm:text-base font-medium text-slate-300">
                {memberName}
              </span>
            )}
          </div>
        </header>
        <div className="container-x pt-6 pb-14 space-y-6">
          <LoadingState label="Loading your membership…" rows={2} />
          <SkeletonGrid count={3} className="sm:grid-cols-2 lg:grid-cols-3" />
        </div>
      </div>
    );
  }

  // 2. Error state (friendly message with Retry inside dashboard, not ErrorBoundary)
  if (error && !currentMembership) {
    return (
      <div>
        <header className="bg-navy-950 text-white py-5 sm:py-6 border-b border-navy-900">
          <div className="container-x">
            <h1 className="font-display text-2xl sm:text-3xl tracking-tight text-white">
              Membership <span className="text-gold-400">Dashboard</span>
            </h1>
          </div>
        </header>
        <div className="container-x pt-6 pb-14 max-w-2xl">
          <ErrorState message={error} onRetry={handleRetry} />
        </div>
      </div>
    );
  }

  // 3. Empty state: when no membership exists, safely render without crashing
  if (!currentMembership) {
    return (
      <div>
        {/* Compact Header on Navy: Page Title (serif + gold accent) and Member Name */}
        <header className="bg-navy-950 text-white py-5 sm:py-6 border-b border-navy-900">
          <div className="container-x flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1.5">
            <h1 className="font-display text-2xl sm:text-3xl tracking-tight text-white">
              Membership <span className="text-gold-400">Dashboard</span>
            </h1>
            {user?.name && (
              <span className="text-sm sm:text-base font-medium text-slate-300">
                {user.name}
              </span>
            )}
          </div>
        </header>

        <div className="container-x pt-5 pb-14 sm:pt-6 sm:pb-16">
          <Breadcrumbs items={[{ label: 'Home', to: '/home' }, { label: 'Membership Dashboard' }]} />
          <h2 className="h-section mt-3">You don&apos;t have a membership yet</h2>
          <p className="mt-1 text-slate-600">Join once, belong for life — Member ID card and Health Card issued instantly on enrollment.</p>
          <div className="mt-8 grid gap-6 lg:grid-cols-2">
            <Reveal>
              <Card className="h-full">
                <p className="eyebrow">Why become a member</p>
                <h2 className="h-sub mt-1">Every facility, one card</h2>
                <ul className="mt-5 space-y-2.5">
                  {BENEFITS.map((b) => (
                    <li key={b} className="flex items-start gap-3 text-sm text-slate-700">
                      <span aria-hidden className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-gold-50 text-[11px] font-bold text-gold-600">
                        <CheckIcon className="h-3 w-3" />
                      </span>
                      {b}
                    </li>
                  ))}
                </ul>
                <Link
                  to="/membership/join"
                  className="btn-base mt-6 w-full px-5 py-3 bg-gold-500 text-navy-950 hover:bg-gold-400 font-semibold"
                >
                  Join Membership <ArrowRightIcon className="h-4 w-4" />
                </Link>
              </Card>
            </Reveal>
            <Reveal delay={100}>
              <EmptyState
                title="No active membership found"
                body="Your Membership ID card, Health card, validity, and club privileges will appear here once you join FRCC."
                icon={AwardIcon}
                action={
                  <Link
                    to="/membership/join"
                    className="btn-base inline-flex items-center gap-2 px-5 py-2.5 bg-navy-900 text-white hover:bg-navy-800 text-sm font-semibold rounded-xl"
                  >
                    Join Membership <ArrowRightIcon className="h-4 w-4" />
                  </Link>
                }
              />
            </Reveal>
          </div>
        </div>
      </div>
    );
  }

  // 4. Active state — starts right below compact navy header with minimal top spacing
  return (
    <div>
      {/* Compact Header on Navy: Page Title (serif, gold accent) and Member Name */}
      <header className="bg-navy-950 text-white py-5 sm:py-6 border-b border-navy-900">
        <div className="container-x flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1.5">
          <h1 className="font-display text-2xl sm:text-3xl tracking-tight text-white">
            Membership <span className="text-gold-400">Dashboard</span>
          </h1>
          {memberName && (
            <span className="text-sm sm:text-base font-medium text-slate-300">
              {memberName}
            </span>
          )}
        </div>
      </header>

      {/* Dashboard Content — begins right below header with compact top spacing */}
      <div className="container-x pt-5 pb-14 sm:pt-6 sm:pb-16">
        <Breadcrumbs items={[{ label: 'Home', to: '/home' }, { label: 'Membership Dashboard' }]} />

        {/* Member Summary Strip */}
        <div className="mt-4 p-4 sm:p-5 rounded-2xl bg-white border border-slate-200/80 shadow-sm grid grid-cols-2 sm:grid-cols-5 gap-4 text-left">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Membership ID</p>
            <p className="mt-1 font-mono font-bold text-navy-950 text-sm sm:text-base">{memberId || '—'}</p>
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Member Name</p>
            <p className="mt-1 font-bold text-navy-950 text-sm sm:text-base truncate">{memberName}</p>
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Plan</p>
            <p className="mt-1 font-bold text-navy-950 text-sm sm:text-base truncate">{planName}</p>
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Status</p>
            <div className="mt-1">
              <StatusTag status={memberStatus} className="!text-[11px] font-semibold" />
            </div>
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Join Date</p>
            <p className="mt-1 font-semibold text-slate-700 text-sm sm:text-base">{joinDate}</p>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-slate-500 text-xs sm:text-sm">
          <span>Lifetime Active Membership · Film Recreation &amp; Cultural Centre</span>
          <span>·</span>
          <LocationTrigger
            locationId="vja-membership"
            className="text-slate-600 hover:text-navy-950 font-medium"
          >
            Vijayawada Campus · Member Desk
          </LocationTrigger>
        </div>

        {/* Digital Privilege Cards Section */}
        <section aria-label="Official FRCC Cards" className="mt-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
            <div>
              <p className="eyebrow">Digital Privilege Cards</p>
              <h2 className="h-sub">Your FRCC Membership &amp; Health Cards</h2>
            </div>
            <div className="flex flex-wrap items-center gap-2.5 self-start sm:self-auto">
              <button
                type="button"
                onClick={handleDownloadIdCard}
                className="btn-base border-2 border-navy-900 bg-white text-navy-900 hover:bg-navy-50 px-3.5 py-2 font-semibold text-xs sm:text-sm rounded-xl transition shadow-sm inline-flex items-center gap-1.5"
                title="Download Membership ID Card PNG"
              >
                Download ID Card
              </button>
              <button
                type="button"
                onClick={handleDownloadHealthCard}
                className="btn-base border-2 border-navy-900 bg-white text-navy-900 hover:bg-navy-50 px-3.5 py-2 font-semibold text-xs sm:text-sm rounded-xl transition shadow-sm inline-flex items-center gap-1.5"
                title="Download Health Card PNG"
              >
                Download Health Card
              </button>
              <button
                type="button"
                onClick={() => downloadBothCards(memberId)}
                className="btn-base border-2 border-navy-900 bg-navy-50 text-navy-950 hover:bg-navy-100 px-3.5 py-2 font-semibold text-xs sm:text-sm rounded-xl transition shadow-sm inline-flex items-center gap-1.5"
                title="Download both cards as PNG"
              >
                Download both cards
              </button>
              <button
                type="button"
                disabled={pdfBusy}
                onClick={handleDownloadForm}
                className="btn-base bg-navy-900 text-white hover:bg-navy-800 disabled:opacity-60 px-3.5 py-2 font-semibold text-xs sm:text-sm rounded-xl transition shadow-sm inline-flex items-center gap-1.5"
              >
                {pdfBusy ? 'Generating PDF…' : 'Download application form'}
              </button>
              <button
                type="button"
                disabled={pdfBusy}
                onClick={handleSendWhatsApp}
                className="btn-base bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-60 px-3.5 py-2 font-semibold text-xs sm:text-sm rounded-xl transition shadow-sm inline-flex items-center gap-1.5"
              >
                Send to WhatsApp
              </button>
            </div>
          </div>

          {pdfError && (
            <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 flex items-center justify-between">
              <span>{pdfError}</span>
              <button
                type="button"
                onClick={() => setPdfError(null)}
                className="text-xs font-semibold text-red-800 hover:underline ml-3"
              >
                Dismiss
              </button>
            </div>
          )}

          <div className="grid gap-6 lg:grid-cols-2">
            <Reveal>
              <div className="flex flex-col">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-navy-900">
                    Membership ID Card
                  </span>
                  <span className="tag tag-green !text-[11px]">Verified Active</span>
                </div>
                <MembershipIdCard id="frcc-membership-id-card" member={currentMembership} />
              </div>
            </Reveal>

            <Reveal delay={100}>
              <div className="flex flex-col">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-navy-900">
                    FRCC Health Card
                  </span>
                  <span className="tag tag-gold !text-[11px]">{healthCardDiscountPercent}% Diagnostics Pass</span>
                </div>
                <HealthCard id="frcc-health-card" member={currentMembership} />
              </div>
            </Reveal>
          </div>
        </section>

        {/* Benefits & Privileges */}
        <div className="mt-10 grid gap-6 lg:grid-cols-2">
          <Reveal>
            <Card className="h-full">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="eyebrow">Benefits</p>
                  <h2 className="h-sub mt-1">Included in your membership</h2>
                </div>
                <span aria-hidden className="grid h-11 w-11 place-items-center rounded-xl border border-navy-900/10 bg-navy-50 text-navy-800">
                  <QrIcon className="h-5 w-5" />
                </span>
              </div>
              <ul className="mt-5 space-y-3">
                {BENEFITS.map((b) => (
                  <li key={b} className="panel-tint flex items-start gap-2.5 p-3.5 text-sm text-slate-700">
                    <CheckIcon className="mt-0.5 h-4 w-4 shrink-0 text-gold-600" />
                    <span>{b}</span>
                  </li>
                ))}
              </ul>
            </Card>
          </Reveal>

          <Reveal delay={100}>
            <Card className="h-full flex flex-col justify-between">
              <div>
                <p className="eyebrow">Member Support</p>
                <h2 className="h-sub mt-1">Need help with your cards?</h2>
                <p className="mt-3 text-sm text-slate-600 leading-relaxed">
                  Present your digital Membership ID Card or FRCC Health Card at the club reception or collaborating diagnostic centres. You can download crisp PNG copies anytime using the buttons above.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                <span>{memberId ? `Member ID: ${memberId}` : ''}</span>
                <span className="font-medium text-emerald-600">Status: {memberStatus}</span>
              </div>
            </Card>
          </Reveal>
        </div>

        {/* Member-only Offers */}
        <section className="mt-12" aria-label="Member-only offers">
          <div className="flex items-center gap-3">
            <span aria-hidden className="grid h-10 w-10 place-items-center rounded-xl bg-gold-50 text-gold-600">
              <MembershipIcon className="h-5 w-5" />
            </span>
            <div>
              <p className="eyebrow">Member-only privileges</p>
              <h2 className="h-sub">Active privileges for you</h2>
            </div>
          </div>
          <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {OFFERS.map((o, i) => (
              <Reveal key={o.title} delay={i * 80}>
                <Card className="card-hover h-full">
                  <span className="tag tag-gold">{o.tag}</span>
                  <h3 className="h-card mt-3">{o.title}</h3>
                  <p className="p-muted mt-1 text-sm">{o.desc}</p>
                </Card>
              </Reveal>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

export default MembershipDashboardPage;
