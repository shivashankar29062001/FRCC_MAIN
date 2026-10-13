import { useMemo } from 'react';
import { useApp } from '../app/store/AppContext.jsx';
import { useMockQuery } from '../app/hooks/useMockQuery.js';
import { Card, EmptyState, LoadingState, SkeletonGrid, ErrorState } from '../components/ui/feedback.jsx';
import { PageHeader } from '../components/ui/sections.jsx';
import { Reveal } from '../components/ui/motion.jsx';
import { SmartImage } from '../components/ui/media.jsx';
import { IMAGES } from '../config/images.js';
import { MEMBERSHIP_URL } from '../config/redirects.js';
import {
  AwardIcon,
  MembershipIcon,
  QrIcon,
  ArrowRightIcon,
  CheckIcon,
} from '../components/ui/icons.jsx';

// ---------------------------------------------------------------------------
// /membership/dashboard — ONLY for users with an active membership.
// Data comes from the membership team later. No membership → locked state with
// benefit highlights + "Get Membership" (redirects via MEMBERSHIP_URL).
// ---------------------------------------------------------------------------

/** Deterministic QR-looking placeholder (no new dependency). */
function QrPlaceholder({ seed = 'frcc' }) {
  const SIZE = 9;
  const cells = useMemo(() => {
    let h = 2166136261;
    for (let i = 0; i < seed.length; i += 1) {
      h ^= seed.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    const out = [];
    for (let i = 0; i < SIZE * SIZE; i += 1) {
      h = Math.imul(h ^ (h >>> 15), 2246822507);
      out.push(((h >>> (i % 24)) & 3) !== 0);
    }
    return out;
  }, [seed]);

  const finders = [[0, 0], [0, SIZE - 3], [SIZE - 3, 0]];
  const inFinder = (r, c) => finders.some(([r0, c0]) => r >= r0 && r < r0 + 3 && c >= c0 && c < c0 + 3);

  return (
    <div
      role="img"
      aria-label="Member QR code placeholder"
      className="grid h-24 w-24 shrink-0 gap-[2px] rounded-lg bg-white p-2 shadow-card"
      style={{ gridTemplateColumns: `repeat(${SIZE}, minmax(0, 1fr))` }}
    >
      {cells.map((on, i) => {
        const r = Math.floor(i / SIZE);
        const c = i % SIZE;
        const dark = inFinder(r, c) ? !(r % 3 === 1 && c % 3 === 1) : on;
        return <span key={i} className={dark ? 'rounded-[1px] bg-navy-950' : 'rounded-[1px] bg-navy-50'} />;
      })}
    </div>
  );
}

/** Hyatt-style member ID card: plan name, member since, validity/status, QR. */
function MemberIdCard({ user, membership }) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-navy-900/10 bg-navy-950 p-6 text-white shadow-lift">
      <SmartImage fill image={IMAGES.memberCardBg} zoom={false} sizes="(min-width: 1024px) 45vw, 100vw" />
      <span aria-hidden className="absolute inset-0 bg-gradient-to-br from-navy-950/95 via-navy-950/90 to-navy-900/80" />
      <span aria-hidden className="absolute inset-0 bg-grid-gold bg-[size:28px_28px] opacity-40" />
      <span aria-hidden className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-gold-500/15 blur-3xl" />
      <div className="relative flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="eyebrow-on-dark">FRCC Member ID</p>
          <p className="mt-2 truncate font-display text-2xl text-white">{membership?.name || user?.name || 'Member'}</p>
          <p className="mt-1 font-mono text-sm text-gold-400">{membership?.memberId || 'Not issued yet'}</p>
        </div>
        <QrPlaceholder seed={membership?.memberId || user?.userId || 'frcc'} />
      </div>
      <dl className="relative mt-6 grid grid-cols-3 gap-3 border-t border-white/10 pt-4 text-xs">
        <div>
          <dt className="text-slate-400">Plan</dt>
          <dd className="mt-1 font-semibold text-white">{membership?.planName || '—'}</dd>
        </div>
        <div>
          <dt className="text-slate-400">Member since</dt>
          <dd className="mt-1 font-semibold text-white">{membership?.since || '2026'}</dd>
        </div>
        <div>
          <dt className="text-slate-400">Validity</dt>
          <dd className="mt-1 font-semibold text-white">{membership?.validity || 'Lifetime'}</dd>
        </div>
      </dl>
      <p className="relative mt-4">
        <span className="tag tag-green">Active</span>
      </p>
    </div>
  );
}

const BENEFITS = [
  'Club, pool, gym and courts access',
  'Guest passes every month',
  'Discounted hall and hotel rates',
  'Priority booking on peak days',
];

const OFFERS = [
  { title: '20% off North Wing weekends', desc: 'Gold & Platinum · till month-end', tag: 'Rooms' },
  { title: 'Free guest pass this month', desc: 'Bring two guests to the pool', tag: 'Guests' },
  { title: 'Priority badminton slots', desc: '6–9 PM courts held for members', tag: 'Sports' },
];

export function MembershipDashboardPage() {
  const { user, isMember, membership } = useApp();
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

  // Locked state — no dashboard data, only benefit highlights + redirect.
  if (!isMember) {
    return (
      <div>
        <PageHeader
          title="You don't have a membership yet"
          description="Join once, belong for life — Member ID and QR issued on signup."
          image={IMAGES.bannerMembership}
          breadcrumbs={[{ label: 'Home', to: '/home' }, { label: 'Membership Dashboard' }]}
        />
        <div className="container-x section-top grid gap-6 lg:grid-cols-2">
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
              title="No dashboard data"
              body="Your plan name, member ID, QR, validity and offers will appear here once the membership team confirms your enrolment."
              icon={AwardIcon}
            />
          </Reveal>
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title={`${membership?.planName || 'Member'} · ${membership?.memberId || ''}`}
        description={`Member since ${membership?.since || '2026'} · ${membership?.validity || 'Lifetime · Active'}`}
        image={IMAGES.bannerMembership}
        breadcrumbs={[{ label: 'Home', to: '/home' }, { label: 'Membership Dashboard' }]}
      />

      <div className="container-x section-top">
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
          <Reveal>
            <MemberIdCard user={user} membership={membership} />
            <a href={MEMBERSHIP_URL} className="btn-base mt-4 w-full border border-navy-900/20 bg-white px-5 py-3 text-navy-900 hover:border-navy-900/50 hover:bg-navy-50/60">
              Renew / Upgrade <ArrowRightIcon className="h-4 w-4" />
            </a>
          </Reveal>

          <Reveal delay={100}>
            <Card className="h-full">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="eyebrow">Benefits</p>
                  <h2 className="h-sub mt-1">Included in {membership?.planName || 'your plan'}</h2>
                </div>
                <span aria-hidden className="grid h-11 w-11 place-items-center rounded-xl border border-navy-900/10 bg-navy-50 text-navy-800">
                  <QrIcon className="h-5 w-5" />
                </span>
              </div>
              <ul className="mt-5 grid gap-2.5 sm:grid-cols-2">
                {BENEFITS.map((b) => (
                  <li key={b} className="panel-tint flex items-start gap-2.5 p-3.5 text-sm text-slate-700">
                    <CheckIcon className="mt-0.5 h-4 w-4 shrink-0 text-gold-600" />
                    {b}
                  </li>
                ))}
              </ul>
            </Card>
          </Reveal>
        </div>

        <section className="mt-12" aria-label="Member-only offers">
          <div className="flex items-center gap-3">
            <span aria-hidden className="grid h-10 w-10 place-items-center rounded-xl bg-gold-50 text-gold-600">
              <MembershipIcon className="h-5 w-5" />
            </span>
            <div>
              <p className="eyebrow">Member-only offers</p>
              <h2 className="h-sub">This month for you</h2>
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
