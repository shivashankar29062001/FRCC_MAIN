// Standalone Input (+ Select) — same .label / .field / .field-error roles.
export function Input({ label, id, error, hint, ...props }) {
  const inputId = id || props.name;
  return (
    <div>
      {label && <label htmlFor={inputId} className="label">{label}</label>}
      <input id={inputId} className="field" aria-invalid={!!error} {...props} />
      {hint && !error && <p className="text-xs text-slate-500 mt-1">{hint}</p>}
      {error && <p role="alert" className="field-error">{error}</p>}
    </div>
  );
}

export function Select({ label, id, error, options = [], placeholder = 'Select…', ...props }) {
  const selectId = id || props.name;
  return (
    <div>
      {label && <label htmlFor={selectId} className="label">{label}</label>}
      <select id={selectId} className="field appearance-none" aria-invalid={!!error} {...props}>
        <option value="">{placeholder}</option>
        {options.map((o) => (typeof o === 'string'
          ? <option key={o} value={o}>{o}</option>
          : <option key={o.value} value={o.value}>{o.label}</option>))}
      </select>
      {error && <p role="alert" className="field-error">{error}</p>}
    </div>
  );
}
