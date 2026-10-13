// Standalone Button — same variants/sizes as the main site (no router needed).
export function Button({ variant = 'primary', size = 'md', className = '', ...props }) {
  const sizes = { sm: 'px-3 py-1.5 text-sm', md: 'px-5 py-2.5 text-sm', lg: 'px-7 py-3.5 text-base' };
  const variants = {
    primary: 'bg-navy-900 text-white hover:bg-navy-800',
    gold: 'bg-gold-500 text-navy-950 hover:bg-gold-400',
    outline: 'border border-navy-900/20 bg-white text-navy-900 hover:border-navy-900/50',
    ghost: 'text-navy-900 hover:bg-navy-900/5',
    light: 'border border-white/30 bg-white/5 text-white hover:bg-white/15',
  };
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 font-semibold rounded-xl transition duration-200 ${sizes[size] || sizes.md} ${variants[variant] || variants.primary} ${className}`}
      {...props}
    />
  );
}
