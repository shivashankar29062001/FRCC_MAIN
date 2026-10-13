// Standalone Badge — same .tag tones as the main site.
const TONES = {
  gold: 'border-gold-500/40 bg-gold-50 text-gold-600',
  navy: 'border-navy-900/15 bg-navy-50 text-navy-800',
  green: 'border-green-600/30 bg-green-50 text-green-700',
  amber: 'border-amber-500/40 bg-amber-50 text-amber-700',
  red: 'border-red-600/30 bg-red-50 text-red-700',
  slate: 'border-slate-300 bg-slate-100 text-slate-600',
  onDark: 'border-white/25 bg-white/10 text-white',
};

export function Badge({ tone = 'slate', className = '', ...props }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider ${TONES[tone] || TONES.slate} ${className}`}
      {...props}
    />
  );
}
