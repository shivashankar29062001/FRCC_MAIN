import { useApp } from '../app/store/AppContext.jsx';
import { useMockQuery } from '../app/hooks/useMockQuery.js';
import { Card, EmptyState, LoadingState, SkeletonGrid, ErrorState } from '../components/ui/feedback.jsx';
import { Breadcrumbs } from '../components/ui/sections.jsx';
import { HeroImage } from '../components/HeroImage.jsx';
import { Reveal } from '../components/ui/motion.jsx';
import { MEMBERSHIP_URL } from '../config/redirects.js';
import {
  MembershipIdCard,
  HealthCard,
  downloadBothCards,
} from '../features/membership/MembershipCards.jsx';
import {
  AwardIcon,
  MembershipIcon,
  QrIcon,
  ArrowRightIcon,
  CheckIcon,
} from '../components/ui/icons.jsx';

// ---------------------------------------------------------------------------
// /membership/dashboard — Shows both membership cards for a stored membership.
// Safely falls back to a locked benefits view if no membership exists (no crash).
// ---------------------------------------------------------------------------

const BENEFITS = [
  '30% discount on every booking (stay, halls, games, gym, pool)',
  'FRCC Health Card: 20% discount at collaborating diagnostic centres',
  'Complimentary parking privilege across all club visits',
  'Priority sports slots & pool access reserved for members',
];

const OFFERS = [
  { title: '30% off every booking', desc: 'Member discount on luxury stay & event venues', tag: 'Rooms & Halls' },
  { title: '20% off diagnostic centres', desc: 'Health card savings with authorized partner labs', tag: 'Health' },
  { title: 'Priority sports slots', desc: 'Courts & swimming pool held exclusively for members', tag: 'Sports' },
];

export function MembershipDashboardPage() {
  const { isMember, membership } = useApp();
  const { loading, error, retry } = useMockQuery(() => ({ ready: true }));

  if (loading) {
    return (
      <div className="container-x section space-y-6">
        <LoadingState label="Loading your membership…" rows={2} />
        <SkeletonGrid count={3} className="sm:grid-cols-2 lg:grid-cols-3" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="container-x section max-w-2xl">
        <ErrorState message={error} onRetry={retry} />
      </div>
    );
  }

  // Locked state — when no membership exists, safely render without crashing
  if (!isMember || !membership) {
    return (
      <div>
        <HeroImage slot="hero-profile" />
        <div className="container-x section-top">
          <Breadcrumbs items={[{ label: 'Home', to: '/home' }, { label: 'Membership Dashboard' }]} />
          <h1 className="h-section mt-3">You don&apos;t have a membership yet</h1>
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
                <a href={MEMBERSHIP_URL} className="btn-base mt-6 w-full px-5 py-3 bg-gold-500 text-navy-950 hover:bg-gold-400">
                  Get Membership <ArrowRightIcon className="h-4 w-4" />
                </a>
              </Card>
            </Reveal>
            <Reveal delay={100}>
              <EmptyState
                title="No active membership found"
                body="Your Membership ID card, Health card, validity, and club privileges will appear here once you join FRCC."
                icon={AwardIcon}
              />
            </Reveal>
          </div>
        </div>
      </div>
    );
  }

  // Active state — shows both cards for the stored membership
  const memberId = membership?.memberId || 'FRCC-MEMBER';

  return (
    <div>
      <HeroImage slot="hero-profile" />
      <div className="container-x section-top">
        <Breadcrumbs items={[{ label: 'Home', to: '/home' }, { label: 'Membership Dashboard' }]} />
        <h1 className="h-section mt-3">{`${membership?.planName || 'FRCC Membership'} · ${memberId}`}</h1>
        <p className="mt-1 text-slate-600">Lifetime Active Membership · Film Recreation &amp; Cultural Centre</p>

        {/* Digital Privilege Cards Section: shows both cards */}
        <section aria-label="Official FRCC Cards" className="mt-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
            <div>
              <p className="eyebrow">Digital Privilege Cards</p>
              <h2 className="h-sub">Your FRCC Membership &amp; Health Cards</h2>
            </div>
            <button
              type="button"
              onClick={() => downloadBothCards(memberId)}
              className="btn-base border-2 border-navy-900 bg-white text-navy-900 hover:bg-navy-50 px-5 py-2.5 font-semibold text-sm rounded-xl transition shadow-sm inline-flex items-center gap-2 self-start sm:self-auto"
            >
              Download cards
            </button>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <Reveal>
              <div className="flex flex-col">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-navy-900">
                    Membership ID Card
                  </span>
                  <span className="tag tag-green !text-[11px]">Verified Active</span>
                </div>
                <MembershipIdCard id="frcc-membership-id-card" member={membership} />
              </div>
            </Reveal>

            <Reveal delay={100}>
              <div className="flex flex-col">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-navy-900">
                    FRCC Health Card
                  </span>
                  <span className="tag tag-gold !text-[11px]">20% Diagnostics Pass</span>
                </div>
                <HealthCard id="frcc-health-card" member={membership} />
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
                  Present your digital Membership ID Card or FRCC Health Card at the club reception or collaborating diagnostic centres. You can download crisp PNG copies anytime using the button above.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                <span>Member ID: {memberId}</span>
                <span className="font-medium text-emerald-600">Status: Active Lifetime</span>
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
