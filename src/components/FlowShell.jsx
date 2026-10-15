import { useMemo } from 'react';
import { Breadcrumbs } from './ui/sections.jsx';
import { BookingStepper } from './booking/BookingStepper.jsx';
import { SmartImage } from './ui/media.jsx';
import { useApp } from '../app/store/AppContext.jsx';
import { memberDiscountPercent } from '../config/site.js';
import { formatInr } from '../utils/pricing.js';

const SERVICE_CONFIG = {
  stay: { label: 'Stay', to: '/stay' },
  hotel: { label: 'Stay', to: '/stay' },
  hall: { label: 'Halls', to: '/halls' },
  halls: { label: 'Halls', to: '/halls' },
  activities: { label: 'Activities', to: '/activities' },
  games: { label: 'Activities', to: '/activities' },
  parking: { label: 'Parking', to: '/parking' },
  membership: { label: 'Membership', to: '/membership' },
};

function getServiceBreadcrumb(service) {
  if (typeof service === 'object' && service !== null) {
    return { label: service.label || 'Service', to: service.to || '/home' };
  }
  const key = String(service || '').toLowerCase();
  return SERVICE_CONFIG[key] || {
    label: service ? service.charAt(0).toUpperCase() + service.slice(1) : 'Service',
    to: '/home',
  };
}

function SelectionSummaryCard({ summary = {} }) {
  const { isMember } = useApp();
  const item = summary.item || {};
  const itemName = summary.name || item.name || summary.title || 'Selected item';
  const itemImage = summary.image || item.image || summary.thumbnail;
  const itemDetail = summary.detail || item.detail || summary.category;

  const rows = summary.details || summary.rows || [];
  const extraRows = [];
  if (summary.date && !rows.some((r) => r.label?.toLowerCase().includes('date'))) {
    extraRows.push({ label: 'Date', value: summary.date });
  }
  if (summary.slot && !rows.some((r) => r.label?.toLowerCase().includes('slot'))) {
    extraRows.push({ label: 'Slot', value: summary.slot });
  }
  if (summary.guests && !rows.some((r) => r.label?.toLowerCase().includes('guest'))) {
    extraRows.push({ label: 'Guests', value: String(summary.guests) });
  }
  const allRows = [...extraRows, ...rows];

  const isFree = Boolean(summary.isFree || (summary.price === 0 && (summary.total === undefined || summary.total === 0)));
  const price = summary.price ?? summary.subtotal;
  const rawPriceNum = typeof price === 'number'
    ? price
    : typeof price === 'string'
    ? Number(price.replace(/\D/g, '')) || 0
    : 0;

  const discount = isFree
    ? 0
    : summary.memberDiscount !== undefined
    ? summary.memberDiscount
    : (isMember && rawPriceNum > 0 ? Math.round(rawPriceNum * (memberDiscountPercent / 100)) : 0);

  const total = isFree
    ? 0
    : summary.total !== undefined
    ? summary.total
    : (price !== undefined ? Math.max(0, rawPriceNum - (Number(discount) || 0)) : undefined);

  function fmt(val) {
    if (val === undefined || val === null || val === '') return null;
    if (typeof val === 'number') return formatInr(val);
    if (typeof val === 'string' && !val.startsWith('₹') && /^-?\d+$/.test(val)) {
      return formatInr(Number(val));
    }
    return val;
  }

  return (
    <aside aria-label="Your selection" className="card !p-5 shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <p className="eyebrow">Your selection</p>
        {isFree && (
          <span className="tag tag-green !text-xs !py-0.5 !px-2 font-semibold">Free</span>
        )}
      </div>

      {/* Item preview */}
      <div className="mt-3 flex items-center gap-3">
        {itemImage ? (
          <div className="h-14 w-14 shrink-0 overflow-hidden rounded-xl border border-slate-200">
            {typeof itemImage === 'string' ? (
              <img src={itemImage} alt={itemName} className="h-full w-full object-cover" />
            ) : (
              <SmartImage image={itemImage} aspect="1 / 1" sizes="56px" />
            )}
          </div>
        ) : (
          <div className="grid h-14 w-14 shrink-0 place-items-center rounded-xl bg-navy-50 text-navy-800 font-display font-bold text-xs tracking-wider">
            FRCC
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-1">
            <h3 className="font-display text-base font-bold text-navy-900 truncate">{itemName}</h3>
          </div>
          {itemDetail && <p className="text-xs text-slate-500 truncate mt-0.5">{itemDetail}</p>}
        </div>
      </div>

      {/* Chosen details */}
      {allRows.length > 0 && (
        <dl className="mt-4 space-y-2 border-t border-slate-100 pt-3 text-xs">
          {allRows.map((r, i) => (
            <div key={i} className="flex justify-between items-start gap-2">
              <dt className="text-slate-500 shrink-0">{r.label}</dt>
              <dd className="font-semibold text-navy-900 text-right truncate">{r.value}</dd>
            </div>
          ))}
        </dl>
      )}

      {/* Price breakdown */}
      {isFree ? (
        <div className="mt-4 border-t border-slate-100 pt-3 space-y-2 text-xs">
          <div className="flex justify-between items-center text-slate-600">
            <span>Rate</span>
            <span className="font-semibold text-emerald-700">Free Pass</span>
          </div>
          <div className="border-t border-slate-200/80 pt-2.5 flex justify-between items-baseline">
            <span className="font-bold text-sm text-navy-900">Total</span>
            <span className="font-display text-lg font-bold text-emerald-700">Free (₹0)</span>
          </div>
        </div>
      ) : (price !== undefined || total !== undefined) && (
        <div className="mt-4 border-t border-slate-100 pt-3 space-y-2 text-xs">
          {price !== undefined && (
            <div className="flex justify-between items-center text-slate-600">
              <span>Price</span>
              <span className="font-semibold text-navy-900">{fmt(price)}</span>
            </div>
          )}
          {Boolean(discount > 0) && (
            <div className="flex justify-between items-center text-emerald-700 font-medium">
              <span>Member discount ({memberDiscountPercent}%)</span>
              <span className="font-semibold">-{fmt(discount)}</span>
            </div>
          )}
          <div className="border-t border-slate-200/80 pt-2.5 flex justify-between items-baseline">
            <span className="font-bold text-sm text-navy-900">Total</span>
            <div className="text-right">
              {Boolean(discount > 0) && (
                <span className="line-through text-slate-400 font-normal text-sm mr-2">
                  {fmt(rawPriceNum)}
                </span>
              )}
              <span className="font-display text-lg font-bold text-navy-900">{fmt(total)}</span>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}

/**
 * FlowShell — Universal shell for every booking and process page.
 * Renders compact navy header (Home > <Service> > Booking), stepper,
 * left card for step content, and right sticky "Your selection" summary card.
 * Does NOT render ServiceHero, HeroImage, or photo banners.
 */
export function FlowShell({
  title = 'Booking',
  service = 'stay',
  steps = [],
  currentStep = 0,
  summary = {},
  onStepClick,
  children,
}) {
  const serviceCrumb = useMemo(() => getServiceBreadcrumb(service), [service]);

  const normalizedSteps = useMemo(() => {
    if (!steps || !steps.length) return [];
    return steps.map((s, idx) => {
      if (typeof s === 'string') return { id: String(idx), title: s };
      return { id: s.id || String(idx), title: s.title || s.label || String(s) };
    });
  }, [steps]);

  return (
    <div className="min-h-screen bg-cream/30">
      {/* Compact Header: navy band about 96px */}
      <header className="bg-navy-950 text-white min-h-[96px] py-4 sm:py-5 flex flex-col justify-center border-b border-navy-900/40">
        <div className="container-x">
          <Breadcrumbs
            light
            items={[
              { label: 'Home', to: '/home' },
              serviceCrumb,
              { label: 'Booking' },
            ]}
          />
          <h1 className="mt-1.5 font-display text-2xl sm:text-3xl font-bold text-white tracking-tight">
            {title}
          </h1>
        </div>
      </header>

      {/* Stepper + Two-column Body */}
      <div className="container-x section-top pb-16">
        {normalizedSteps.length > 0 && (
          <div className="mb-6">
            <BookingStepper
              steps={normalizedSteps}
              current={currentStep}
              onStepClick={onStepClick}
            />
          </div>
        )}

        <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
          {/* Left: Step content */}
          <div className="min-w-0">
            {children}
          </div>

          {/* Right: Sticky 340px summary card */}
          <div className="w-full lg:w-[340px] lg:sticky lg:top-20">
            <SelectionSummaryCard summary={summary} />
          </div>
        </div>
      </div>
    </div>
  );
}

export default FlowShell;
