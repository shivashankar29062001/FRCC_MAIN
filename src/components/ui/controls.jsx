import { useState } from 'react';
import { cx } from '../../utils/helpers.js';
import { EyeIcon, EyeOffIcon, SearchIcon, ChevronDownIcon } from './icons.jsx';

// Unified button system: one base, three sizes, brand variants only.
export function Button({ variant = 'primary', size = 'md', className, ...props }) {
  const base = 'btn-base';
  const sizes = { sm: 'px-3 py-1.5 text-sm', md: 'px-5 py-2.5 text-sm sm:text-base', lg: 'px-7 py-3.5 text-base' };
  const variants = {
    // Hover is a colour change only — the site has no animations.
    primary: 'bg-navy-900 text-white hover:bg-navy-800',
    gold: 'bg-gold-500 text-navy-950 hover:bg-gold-400',
    outline: 'border border-navy-900/20 bg-white text-navy-900 hover:border-navy-900/50 hover:bg-navy-50/60',
    ghost: 'text-navy-900 hover:bg-navy-900/5',
    light: 'border border-white/30 bg-white/5 text-white hover:bg-white/15 hover:border-white/60',
    danger: 'bg-red-600 text-white hover:bg-red-700',
  };
  return <button className={cx(base, sizes[size], variants[variant], className)} {...props} />;
}

/** Button that shows a spinner-ish label while `loading` (keeps its width). */
export function LoadingButton({ loading = false, loadingLabel = 'Please wait…', children, ...props }) {
  return (
    <Button aria-busy={loading} disabled={loading} {...props}>
      {loading && (
        <span
          aria-hidden
          className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"
        />
      )}
      {loading ? loadingLabel : children}
    </Button>
  );
}

export function Input({ label, id, error, hint, ...props }) {
  const inputId = id || props.name;
  return (
    <div>
      {label && <label htmlFor={inputId} className="label">{label}</label>}
      <input id={inputId} className="field" aria-invalid={!!error} aria-describedby={error ? `${inputId}-err` : undefined} {...props} />
      {hint && !error && <p className="text-xs text-slate-500 mt-1">{hint}</p>}
      {error && <p id={`${inputId}-err`} role="alert" className="field-error">{error}</p>}
    </div>
  );
}

export function Select({ label, id, error, options = [], placeholder = 'Select…', ...props }) {
  const selectId = id || props.name;
  return (
    <div>
      {label && <label htmlFor={selectId} className="label">{label}</label>}
      <div className="relative">
        <select
          id={selectId}
          className="field appearance-none pr-10"
          aria-invalid={!!error}
          aria-describedby={error ? `${selectId}-err` : undefined}
          {...props}
        >
          <option value="">{placeholder}</option>
          {options.map((o) => (typeof o === 'string' ? <option key={o} value={o}>{o}</option> : <option key={o.value} value={o.value}>{o.label}</option>))}
        </select>
        <ChevronDownIcon className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
      </div>
      {error && <p id={`${selectId}-err`} role="alert" className="field-error">{error}</p>}
    </div>
  );
}

export function DatePicker({ label, id, error, ...props }) {
  return <Input label={label} id={id} error={error} type="date" {...props} />;
}

/** Password input with an accessible show/hide toggle. */
export function PasswordInput({ label, id, error, hint, name, ...props }) {
  const inputId = id || name;
  const [visible, setVisible] = useState(false);
  return (
    <div>
      {label && <label htmlFor={inputId} className="label">{label}</label>}
      <div className="relative">
        <input
          id={inputId}
          name={name}
          type={visible ? 'text' : 'password'}
          className="field pr-12"
          aria-invalid={!!error}
          aria-describedby={error ? `${inputId}-err` : undefined}
          {...props}
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-pressed={visible}
          aria-label={visible ? 'Hide password' : 'Show password'}
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-navy-900"
        >
          {visible ? <EyeOffIcon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}
        </button>
      </div>
      {hint && !error && <p className="text-xs text-slate-500 mt-1">{hint}</p>}
      {error && <p id={`${inputId}-err`} role="alert" className="field-error">{error}</p>}
    </div>
  );
}

/** Search box with a leading icon (payments table, booking lists…). */
export function SearchInput({ id, label, className, ...props }) {
  const inputId = id || props.name;
  return (
    <div className={className}>
      {label && <label htmlFor={inputId} className="label">{label}</label>}
      <div className="relative">
        <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input id={inputId} type="search" className="field pl-9" {...props} />
      </div>
    </div>
  );
}

export function TextArea({ label, id, error, ...props }) {
  const tid = id || props.name;
  return (
    <div>
      {label && <label htmlFor={tid} className="label">{label}</label>}
      <textarea id={tid} className="field min-h-[110px]" aria-invalid={!!error} {...props} />
      {error && <p role="alert" className="field-error">{error}</p>}
    </div>
  );
}
