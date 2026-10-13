// Standalone Card — rounded, soft shadow, hover lift (same as main site).
export function Card({ className = '', hover = false, ...props }) {
  return (
    <div className={`bg-white rounded-2xl shadow-card border border-slate-200/70 p-5 ${hover ? 'transition duration-300 hover:-translate-y-1 hover:shadow-lift' : ''} ${className}`} {...props} />
  );
}
