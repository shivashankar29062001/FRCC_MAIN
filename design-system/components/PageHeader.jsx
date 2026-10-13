// Standalone PageHeader — breadcrumb banner, same as the main site.
// Breadcrumbs: [{ label, href }]. No router dependency (plain anchors).
export function PageHeader({ eyebrow, title, description, breadcrumbs = [], children }) {
  return (
    <section className="relative overflow-hidden bg-navy-950 text-white">
      <div aria-hidden className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-gold-500/10 blur-3xl" />
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 relative py-10 sm:py-14">
        {breadcrumbs.length > 0 && (
          <nav aria-label="Breadcrumb">
            <ol className="flex flex-wrap items-center gap-1.5 text-xs text-slate-400">
              {breadcrumbs.map((b, i) => (
                <li key={b.label} className="flex items-center gap-1.5">
                  {i > 0 && <span aria-hidden>/</span>}
                  {b.href
                    ? <a href={b.href} className="hover:text-gold-400">{b.label}</a>
                    : <span aria-current="page" className="text-white">{b.label}</span>}
                </li>
              ))}
            </ol>
          </nav>
        )}
        <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-gold-400 mt-4">{eyebrow}</p>
        <h1 className="font-display text-3xl sm:text-4xl lg:text-5xl leading-[1.08] tracking-tight mt-2 max-w-3xl">{title}</h1>
        {description && <p className="mt-3 max-w-2xl text-slate-300 leading-relaxed">{description}</p>}
        {children && <div className="mt-5 flex flex-wrap gap-2">{children}</div>}
      </div>
    </section>
  );
}
